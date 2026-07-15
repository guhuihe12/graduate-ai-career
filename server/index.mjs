import { createServer } from 'node:http'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const PORT = Number(process.env.PORT ?? process.env.API_PORT ?? 8787)
const HOST = process.env.API_HOST || '127.0.0.1'

loadDotEnv()

const server = createServer(async (req, res) => {
  setCors(res, req)

  if (req.method === 'OPTIONS') {
    res.writeHead(204)
    res.end()
    return
  }

  try {
    if (req.method === 'GET' && req.url === '/api/health') {
      sendJson(res, 200, { ok: true, model: process.env.AI_MODEL || null })
      return
    }

    if (req.method === 'POST' && req.url === '/api/recommend-jobs') {
      const body = await readJson(req)
      const result = await recommendJobs(body)
      sendJson(res, 200, result)
      return
    }

    if (req.method === 'POST' && req.url === '/api/polish-resume-line') {
      const body = await readJson(req)
      const result = await polishResumeLine(body)
      sendJson(res, 200, result)
      return
    }

    sendJson(res, 404, { error: 'Not found' })
  } catch (error) {
    const status = error.statusCode || 500
    sendJson(res, status, {
      error: error.message || 'Server error',
      setup:
        status === 401 || status === 400
          ? '请在项目根目录创建 .env，并配置 AI_API_KEY、AI_BASE_URL、AI_MODEL。'
          : undefined,
    })
  }
})

server.listen(PORT, HOST, () => {
  console.log(`OfferPilot API listening on http://${HOST}:${PORT}`)
})

function loadDotEnv() {
  const file = join(process.cwd(), '.env')
  if (!existsSync(file)) return

  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const index = trimmed.indexOf('=')
    if (index === -1) continue
    const key = trimmed.slice(0, index).trim()
    const value = trimmed.slice(index + 1).trim().replace(/^["']|["']$/g, '')
    if (!process.env[key]) process.env[key] = value
  }
}

function setCors(res, req) {
  const requestOrigin = req.headers.origin || ''
  const allowedOrigins = splitOrigins(process.env.CORS_ORIGIN || 'http://127.0.0.1:5173,http://localhost:5173')
  const allowAll = allowedOrigins.includes('*')
  const allowOrigin = allowAll ? '*' : allowedOrigins.includes(requestOrigin) ? requestOrigin : allowedOrigins[0]

  res.setHeader('Access-Control-Allow-Origin', allowOrigin)
  if (allowOrigin !== '*') {
    res.setHeader('Vary', 'Origin')
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
}

function splitOrigins(text) {
  return String(text || '')
    .split(/[,，\s]+/)
    .map((item) => item.trim().replace(/\/$/, ''))
    .filter(Boolean)
}

function sendJson(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' })
  res.end(JSON.stringify(data))
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let raw = ''
    req.on('data', (chunk) => {
      raw += chunk
      if (raw.length > 1_000_000) {
        reject(Object.assign(new Error('Request body too large'), { statusCode: 413 }))
      }
    })
    req.on('end', () => {
      try {
        resolve(raw ? JSON.parse(raw) : {})
      } catch {
        reject(Object.assign(new Error('Invalid JSON body'), { statusCode: 400 }))
      }
    })
    req.on('error', reject)
  })
}

async function recommendJobs(input) {
  const apiKey = process.env.AI_API_KEY
  const searchQueries = buildSearchQueries(input)
  const candidates = await collectSearchCandidates(searchQueries)

  if (!apiKey) {
    return {
      generatedAt: new Date().toISOString(),
      mode: 'free-rules',
      searchQueries,
      candidateCount: candidates.length,
      rawCandidates: candidates.slice(0, 12),
      ...buildRuleBasedRecommendation(input, candidates),
    }
  }

  const prompt = buildPrompt(input, candidates)
  const ai = await callModel(prompt)
  const parsed = parseJson(ai)
  const normalized = normalizeAiRecommendation(parsed, candidates)

  return {
    generatedAt: new Date().toISOString(),
    mode: 'ai',
    searchQueries,
    candidateCount: candidates.length,
    rawCandidates: candidates.slice(0, 12),
    ...normalized,
  }
}

async function polishResumeLine(input) {
  const raw = String(input.raw || '').trim()
  const section = String(input.section || 'project')
  const targetRole = String(input.targetRole || '目标岗位').trim()
  const profile = input.profile || {}

  if (!raw) {
    throw Object.assign(new Error('请先输入一句经历描述'), { statusCode: 400 })
  }

  if (!process.env.AI_API_KEY) {
    return {
      mode: 'free-rules',
      items: buildRuleBasedResumeLines(raw, section, targetRole),
    }
  }

  const messages = [
    {
      role: 'system',
      content:
        '你是专业中文简历顾问。把用户的一句话经历包装成应届生简历条目，必须真实、克制、可落地。只能围绕原句事实改写，不要编造不存在的公司、奖项、用户增长、业务数据、百分比或数量。原句没有数字时，输出也不能出现数字。只输出 JSON。',
    },
    {
      role: 'user',
      content: JSON.stringify({
        task: '把一句话经历改写成 2-3 条中文简历 bullet。',
        outputSchema: { items: ['简历条目1', '简历条目2'] },
        raw,
        section,
        targetRole,
        profile,
        rules: [
          '每条 28-55 个中文字符左右',
          '使用动作动词开头',
          '包含背景、动作、结果中的至少两个要素',
          '禁止新增原句没有出现过的业务结果和量化数字',
          '必须保留原句中的核心对象或动作，例如项目名、模块名、页面名、工具名',
        ],
      }),
    },
  ]

  const ai = await callModel(messages)
  const parsed = parseJson(ai)
  const items = Array.isArray(parsed.items) ? parsed.items.map(String).filter(Boolean).slice(0, 3) : []
  const safeItems = items.filter((item) => isResumeLineGrounded(item, raw))
  return {
    mode: 'ai',
    items: safeItems.length ? safeItems : buildRuleBasedResumeLines(raw, section, targetRole),
  }
}

function isResumeLineGrounded(item, raw) {
  const cleanRaw = raw.replace(/[^\p{Script=Han}a-zA-Z0-9]+/gu, ' ')
  const hasRawNumber = /\d/.test(raw)
  if (!hasRawNumber && /(?:\d|%|％|万|千|百)/.test(item)) return false
  if (containsUnsupportedDetail(item, raw)) return false

  const keywords = extractResumeKeywords(cleanRaw)
  if (!keywords.length) return true
  return keywords.some((keyword) => item.includes(keyword))
}

function containsUnsupportedDetail(item, raw) {
  const rawLower = raw.toLowerCase()
  const itemLower = item.toLowerCase()
  const details = [
    'react',
    'vue',
    'angular',
    'typescript',
    'javascript',
    'axios',
    'element',
    'antd',
    'spring',
    'mysql',
    'python',
    'java',
    'sql',
    '接口',
    '后端',
    '组件库',
    '图片上传',
    '分类选择',
    '分类筛选',
    '筛选',
    '排序',
    '分页',
    '搜索',
    '登录',
    '注册',
    '支付',
    '权限',
    '推荐算法',
    '独立设计',
    '用户增长',
    '渠道投放',
    '竞品分析',
    '用户调研',
    '留存率',
    '月活跃',
  ]

  return details.some((detail) => itemLower.includes(detail.toLowerCase()) && !rawLower.includes(detail.toLowerCase()))
}

function extractResumeKeywords(text) {
  const stopWords = new Set([
    '做过',
    '负责',
    '参与',
    '协助',
    '完成',
    '进行',
    '相关',
    '项目',
    '页面',
    '平台',
    '系统',
  ])
  const chunks = text
    .split(/\s+/)
    .flatMap((part) => {
      if (/^[a-zA-Z0-9]+$/.test(part)) return [part]
      return part.match(/[\p{Script=Han}]{2,8}/gu) || []
    })
    .filter((part) => part.length >= 2 && !stopWords.has(part))

  const expanded = []
  for (const chunk of chunks) {
    expanded.push(chunk)
    if (/[\p{Script=Han}]/u.test(chunk) && chunk.length > 4) {
      for (let index = 0; index <= chunk.length - 2; index += 2) {
        expanded.push(chunk.slice(index, index + 2))
      }
    }
  }

  return [...new Set(expanded)].slice(0, 12)
}

function buildRuleBasedResumeLines(raw, section, targetRole) {
  const clean = raw.replace(/[。；;]+$/g, '')
  const role = targetRole || '目标岗位'
  if (section === 'skills') {
    return [`熟悉${clean}，能够结合${role}岗位需求完成基础应用与持续学习。`]
  }
  if (section === 'internship') {
    return [
      `参与${clean}相关工作，协助团队完成信息整理、流程跟进与结果复盘。`,
      `围绕${role}岗位要求，沉淀工作记录和问题清单，提升任务推进效率。`,
    ]
  }
  return [
    `围绕${role}岗位要求，参与${clean}，完成核心流程梳理与功能落地。`,
    `根据项目反馈优化执行细节，沉淀复盘文档，体现学习能力和结果导向。`,
  ]
}

function buildSearchQueries(input) {
  const form = input.profileForm || {}
  const university = form.university || ''
  const major = form.major || ''
  const cities = splitTerms(input.targetCity || form.cities || '').slice(0, 3)
  const roles = splitTerms(input.targetRole || form.roles || '').slice(0, 3)
  const industries = splitTerms(form.industries || '').slice(0, 2)
  const queries = []

  for (const city of cities.length ? cities : ['']) {
    for (const role of roles.length ? roles : ['应届生']) {
      queries.push(`${city} ${role} 应届生 校招 官网 招聘`)
      queries.push(`${city} ${role} 实习生 公司官网 招聘`)
    }
  }

  if (university || major) {
    queries.push(`${university} ${major} 应届生 就业 ${roles[0] || ''} 官网招聘`)
  }

  for (const industry of industries) {
    queries.push(`${cities[0] || ''} ${industry} ${roles[0] || '应届生'} 官网招聘`)
  }

  return [...new Set(queries.map((query) => query.replace(/\s+/g, ' ').trim()).filter(Boolean))].slice(0, 8)
}

async function collectSearchCandidates(queries) {
  const seen = new Set()
  const all = []
  for (const query of queries) {
    const results = await searchBing(query)
    for (const result of results) {
      const key = simplifyUrl(result.url)
      if (seen.has(key)) continue
      seen.add(key)
      all.push({ ...result, query, officialScore: officialScore(result.url, result.title, result.snippet) })
    }
  }
  return all
    .filter((item) => item.url.startsWith('http'))
    .sort((a, b) => b.officialScore - a.officialScore)
    .slice(0, 24)
}

async function searchBing(query) {
  const url = `https://www.bing.com/search?q=${encodeURIComponent(query)}`
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 8000)

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126 Safari/537.36',
      },
    })
    if (!response.ok) return []
    const html = await response.text()
    return parseBingResults(html)
  } catch {
    return []
  } finally {
    clearTimeout(timer)
  }
}

function parseBingResults(html) {
  const results = []
  const blocks = html.match(/<li class="b_algo"[\s\S]*?<\/li>/g) || []

  for (const block of blocks.slice(0, 8)) {
    const link = block.match(/<h2[^>]*>\s*<a href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/)
    if (!link) continue
    const snippet = block.match(/<p[^>]*>([\s\S]*?)<\/p>/)
    results.push({
      title: cleanHtml(link[2]),
      url: decodeHtml(link[1]),
      snippet: cleanHtml(snippet?.[1] || ''),
    })
  }

  return results
}

function buildPrompt(input, candidates) {
  return [
    {
      role: 'system',
      content:
        '你是一个服务中国应届生的求职匹配顾问。你必须基于用户学校、专业、城市、技能和简历水平做现实匹配，不要只推荐头部大厂。只推荐具体公司，不要写“某公司”“本地软件公司”等泛称。officialUrl 必须是具体公司官网、校招官网、加入我们或招聘页面，禁止输出 Bing/Google/百度搜索结果页、BOSS直聘、猎聘、前程无忧、拉勾等第三方招聘页。不能确定官网时不要放入 jobs。只输出 JSON。',
    },
    {
      role: 'user',
      content: JSON.stringify(
        {
          task:
            '分析这个应届生适合投递哪些具体公司的官网岗位。请兼顾学校背景、专业、城市偏好、技能强弱、普通公司/区域公司/中厂机会，不要只推荐大厂。请优先从 searchCandidates 中挑选具体公司官网链接；如果候选不足，可以补充你确信存在的具体公司官网招聘页，但 officialUrl 仍必须是具体公司页面。',
          outputSchema: {
            profileSummary: '一句话画像',
            strategy: ['投递策略1', '投递策略2', '投递策略3'],
            jobs: [
              {
                company: '公司名',
                role: '建议岗位',
                city: '城市',
                officialUrl: '官网或招聘官网URL',
                sourceType: '官网/校招官网/加入我们/需复核',
                matchScore: 0,
                reason: '为什么适合',
                resumeFocus: ['简历应该突出什么'],
                missingSkills: ['缺口'],
                riskLevel: '低/中/高',
                riskSignals: ['风险或可信信号'],
                materialChecklist: ['投递材料'],
              },
            ],
          },
          user: input,
          searchCandidates: candidates,
        },
        null,
        2,
      ),
    },
  ]
}

function buildRuleBasedRecommendation(input, candidates) {
  const form = input.profileForm || {}
  const roles = splitTerms(input.targetRole || form.roles || '应届生')
  const cities = splitTerms(input.targetCity || form.cities || '')
  const major = form.major || '相关专业'
  const university = form.university || '当前学校'
  const profileSummary = `${university}${major}背景，目标${roles.slice(0, 2).join(' / ') || '应届生岗位'}，优先城市为${cities.slice(0, 3).join('、') || '不限'}。当前为免费规则筛选结果，可用于先扩大官网投递面。`

  const candidateJobs = candidates
    .filter((item) => item.officialScore >= 3 && isSpecificCompanyUrl(item.url))
    .slice(0, 10)
    .map((item, index) => candidateToJob(input, item, index))

  const jobs = candidateJobs
    .filter((item, index, list) => list.findIndex((target) => target.company === item.company && target.role === item.role) === index)
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, 8)

  return {
    profileSummary,
    strategy: [
      '先投区域中厂、软件服务商、行业数字化公司，避免只盯头部大厂。',
      jobs.length ? '下方只保留具体公司官网候选，打开后应进入公司自己的招聘页或官网页面。' : '当前没有抓到足够明确的具体公司官网，请换城市/岗位关键词或接入大模型扩大识别能力。',
      '简历按岗位方向改写项目，不同岗位使用不同标题和项目重点。',
    ],
    jobs,
  }
}

function candidateToJob(input, candidate, index) {
  const form = input.profileForm || {}
  const roles = splitTerms(input.targetRole || form.roles || '应届生')
  const cities = splitTerms(input.targetCity || form.cities || '')
  const skills = splitTerms(form.skills || '')
  const role = inferRoleName(roles, candidate.title, candidate.snippet)
  const city = inferCity(cities, candidate.title, candidate.snippet)
  const company = inferCompany(candidate.title, candidate.url, index)
  const focus = skills.slice(0, 3)
  const official = candidate.officialScore >= 4

  return {
    company,
    role,
    city,
    officialUrl: candidate.url,
    sourceType: official ? '搜索候选官网/需复核' : '搜索线索/需复核',
    matchScore: clamp(58 + candidate.officialScore * 4 + focus.length * 3 - index * 2, 48, 88),
    reason: `搜索结果与“${roles[0] || '应届生'}”“${city}”“官网招聘”相关，适合作为官网投递线索进一步确认。`,
    resumeFocus: focus.length ? focus : ['项目经历', '学习能力', '沟通协作'],
    missingSkills: inferMissingSkills(role, skills),
    riskLevel: official ? '中' : '高',
    riskSignals: official
      ? ['来自搜索候选', '需要打开官网确认岗位仍在招聘', '避免在第三方页面提交隐私信息']
      : ['无法确认是否公司官网', '需人工核验企业主体', '不要支付培训或内推费用'],
    materialChecklist: ['定制简历 PDF', '官网账号', '项目说明', '投递截图'],
  }
}

function inferRoleName(roles, title, snippet) {
  const text = `${title} ${snippet}`.toLowerCase()
  const role = roles.find((item) => text.includes(item.toLowerCase())) || roles[0] || '应届生岗位'
  if (/实习|intern/i.test(text)) return `${role}实习生`
  if (/校招|校园招聘|应届/i.test(text)) return `${role}校招岗位`
  return role
}

function inferCity(cities, title, snippet) {
  const text = `${title} ${snippet}`
  return cities.find((city) => text.includes(city)) || cities[0] || '待确认'
}

function inferCompany(title, url, index) {
  const cleaned = title
    .replace(/招聘|校招|校园招聘|社会招聘|加入我们|官网|官方网站|职位|工作机会/g, '')
    .split(/[-_|·—]/)[0]
    .trim()
  if (cleaned && cleaned.length <= 16) return cleaned
  try {
    const host = new URL(url).hostname.replace(/^www\./, '')
    return host.split('.')[0] || `候选公司${index + 1}`
  } catch {
    return `候选公司${index + 1}`
  }
}

function inferMissingSkills(role, skills) {
  const lowerSkills = skills.map((item) => item.toLowerCase())
  const roleText = role.toLowerCase()
  const expected = roleText.includes('前端')
    ? ['TypeScript', '工程化', '性能优化']
    : roleText.includes('产品')
      ? ['需求分析', '竞品分析', '数据指标']
      : roleText.includes('数据')
        ? ['SQL', 'Python', '可视化']
        : ['岗位关键词', '项目量化', '业务理解']
  return expected.filter((item) => !lowerSkills.includes(item.toLowerCase())).slice(0, 3)
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value))
}

async function callModel(messages) {
  const baseUrl = (process.env.AI_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, '')
  const model = process.env.AI_MODEL || 'gpt-4o-mini'
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.AI_API_KEY}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.35,
      response_format: { type: 'json_object' },
    }),
  })

  const text = await response.text()
  if (!response.ok) {
    throw Object.assign(new Error(`Model API failed: ${text.slice(0, 300)}`), { statusCode: response.status })
  }

  const data = JSON.parse(text)
  return data.choices?.[0]?.message?.content || '{}'
}

function parseJson(text) {
  const cleaned = text
    .trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```$/i, '')
  return JSON.parse(cleaned)
}

function normalizeAiRecommendation(parsed, candidates) {
  const candidateUrls = new Set(candidates.filter((item) => isSpecificCompanyUrl(item.url)).map((item) => simplifyUrl(item.url)))
  const jobs = Array.isArray(parsed.jobs) ? parsed.jobs : []
  const filteredJobs = jobs
    .filter((job) => job && isSpecificCompanyName(job.company) && isSpecificCompanyUrl(job.officialUrl))
    .map((job) => ({
      company: String(job.company || '').trim(),
      role: String(job.role || '应届生岗位').trim(),
      city: String(job.city || '待确认').trim(),
      officialUrl: String(job.officialUrl || '').trim(),
      sourceType: candidateUrls.has(simplifyUrl(job.officialUrl)) ? '搜索候选官网' : String(job.sourceType || '具体公司官网/需复核'),
      matchScore: clamp(Number(job.matchScore) || 65, 0, 100),
      reason: String(job.reason || '该公司和岗位方向与用户画像存在匹配。').trim(),
      resumeFocus: Array.isArray(job.resumeFocus) ? job.resumeFocus.slice(0, 4).map(String) : ['项目经历'],
      missingSkills: Array.isArray(job.missingSkills) ? job.missingSkills.slice(0, 4).map(String) : [],
      riskLevel: ['低', '中', '高'].includes(job.riskLevel) ? job.riskLevel : '中',
      riskSignals: Array.isArray(job.riskSignals) ? job.riskSignals.slice(0, 4).map(String) : ['官网链接需人工复核'],
      materialChecklist: Array.isArray(job.materialChecklist)
        ? job.materialChecklist.slice(0, 5).map(String)
        : ['定制简历 PDF', '官网账号', '投递截图'],
    }))
    .slice(0, 8)

  return {
    profileSummary: parsed.profileSummary || '已根据你的学校、专业、技能和目标城市生成具体公司官网推荐。',
    strategy: Array.isArray(parsed.strategy)
      ? parsed.strategy
      : ['优先投具体公司官网', '避开第三方招聘页直接提交隐私信息', '按岗位定制简历'],
    jobs: filteredJobs,
  }
}

function splitTerms(text) {
  return String(text || '')
    .split(/[,，、\s]+/)
    .map((item) => item.trim())
    .filter(Boolean)
}

function officialScore(url, title, snippet) {
  const lower = `${url} ${title} ${snippet}`.toLowerCase()
  let score = 0
  if (!isSpecificCompanyUrl(url)) score -= 10
  if (/career|campus|job|join|talent|hr|recruit|zhaopin|jobs/.test(lower)) score += 4
  if (/官网|官方|校园招聘|加入我们|招聘/.test(lower)) score += 3
  if (/linkedin|boss|zhipin|lagou|liepin|51job|zhaopin\.com|kanzhun/.test(lower)) score -= 6
  if (/\.com|\.cn|\.com\.cn/.test(lower)) score += 1
  return score
}

function isSpecificCompanyUrl(url) {
  try {
    const { hostname } = new URL(url)
    const host = hostname.replace(/^www\./, '').toLowerCase()
    if (
      /(^|\.)bing\.com$|(^|\.)google\.com$|(^|\.)baidu\.com$|(^|\.)sogou\.com$|(^|\.)so\.com$/.test(host) ||
      /(^|\.)linkedin\.com$|(^|\.)zhipin\.com$|(^|\.)liepin\.com$|(^|\.)51job\.com$|(^|\.)zhaopin\.com$|(^|\.)lagou\.com$|(^|\.)kanzhun\.com$/.test(host)
    ) {
      return false
    }
    return /\./.test(host)
  } catch {
    return false
  }
}

function isSpecificCompanyName(name) {
  const value = String(name || '').trim()
  if (!value) return false
  return !/某|本地|区域|候选|示例|公司\d|软件服务公司|数字化企业/.test(value)
}

function simplifyUrl(url) {
  try {
    const parsed = new URL(url)
    return `${parsed.hostname}${parsed.pathname}`.replace(/\/$/, '')
  } catch {
    return url
  }
}

function cleanHtml(html) {
  return decodeHtml(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim(),
  )
}

function decodeHtml(text) {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
}
