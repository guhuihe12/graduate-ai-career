import {
  AlertTriangle,
  BadgeCheck,
  BriefcaseBusiness,
  Calendar,
  CheckCircle2,
  Download,
  ExternalLink,
  FileText,
  GraduationCap,
  Mail,
  MapPin,
  Palette,
  Phone,
  Plus,
  Search,
  Sparkles,
  Wand2,
} from 'lucide-react'
import {
  AlignmentType,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  TextRun,
} from 'docx'
import { type CSSProperties, type ReactNode, useMemo, useState } from 'react'
import './App.css'

type Mode = 'home' | 'resume' | 'discover'
type TemplateId = 'classic' | 'modern' | 'campus'
type ResumeSectionKey = 'projects' | 'internship' | 'skills'
type ApplicationStatus = 'Saved' | 'Applied' | 'Interview' | 'Offer'

type ResumeProfile = {
  name: string
  targetRole: string
  phone: string
  email: string
  city: string
  university: string
  major: string
  education: string
  graduation: string
}

type ResumeSections = Record<ResumeSectionKey, string[]>

type CareerProfileForm = {
  name: string
  university: string
  education: string
  graduation: string
  major: string
  salary: string
  roles: string
  cities: string
  industries: string
  skills: string
}

type RecommendedJob = {
  company: string
  role: string
  city: string
  officialUrl: string
  sourceType: string
  matchScore: number
  reason: string
  resumeFocus: string[]
  missingSkills: string[]
  riskLevel: string
  riskSignals: string[]
  materialChecklist: string[]
}

type AiRecommendation = {
  mode: 'ai' | 'free-rules'
  profileSummary: string
  strategy: string[]
  jobs: RecommendedJob[]
}

type Application = {
  id: number
  company: string
  role: string
  status: ApplicationStatus
  nextStep: string
  match: number
  deadline: string
}

const resumeTemplates: Array<{
  id: TemplateId
  name: string
  description: string
  accent: string
}> = [
  {
    id: 'classic',
    name: '经典单栏',
    description: '适合校招、国企、银行、传统行业，稳重清晰。',
    accent: '#173027',
  },
  {
    id: 'modern',
    name: '现代强调',
    description: '适合互联网、产品、运营、设计岗位，重点突出。',
    accent: '#256f5b',
  },
  {
    id: 'campus',
    name: '校园简洁',
    description: '适合经历不多的应届生，把教育和项目写清楚。',
    accent: '#8a5a12',
  },
]

const sectionLabels: Record<ResumeSectionKey, string> = {
  projects: '项目经历',
  internship: '实习 / 实践',
  skills: '技能证书',
}

const defaultResumeProfile: ResumeProfile = {
  name: '同学',
  targetRole: '前端开发工程师',
  phone: '138-0000-0000',
  email: 'student@example.com',
  city: '上海',
  university: '山东理工大学',
  major: '智能制造',
  education: '本科',
  graduation: '2027届',
}

const defaultResumeSections: ResumeSections = {
  projects: [
    '围绕前端岗位要求，参与校园二手交易平台开发，负责商品列表、发布流程和用户中心页面实现。',
    '使用 React、TypeScript 完成核心页面搭建与表单校验，提升功能可用性和交互完整度。',
  ],
  internship: ['协助整理用户反馈和运营数据，输出问题记录与周报，为产品优化提供依据。'],
  skills: ['熟悉 React、TypeScript、HTML、CSS，了解基础工程化流程。'],
}

const defaultCareerProfile =
  '山东理工大学本科，应届生，智能制造专业。做过前端项目和数据整理，想找上海、杭州、青岛的技术、产品或运营相关岗位，希望从具体公司官网投递。'

const defaultCareerForm: CareerProfileForm = {
  name: '同学',
  university: '山东理工大学',
  education: '本科',
  graduation: '2027届',
  major: '智能制造',
  salary: '不限',
  roles: '前端开发工程师, 产品助理',
  cities: '上海, 杭州, 青岛',
  industries: '互联网, 智能制造, 软件服务',
  skills: 'React, TypeScript, Excel, 数据整理',
}

const educationOptions = ['专科', '本科', '硕士', '博士']
const graduationOptions = ['2026届', '2027届', '2028届', '2029届', '已毕业']
const salaryOptions = ['不限', '4k-6k', '6k-8k', '8k-12k', '12k以上']
const cityOptions = ['北京', '上海', '广州', '深圳', '杭州', '南京', '苏州', '成都', '武汉', '西安', '青岛', '济南', '郑州', '合肥', '长沙', '重庆', '天津']
const industryOptions = ['互联网', '软件服务', '智能制造', '新能源', '汽车', '金融科技', '银行', '证券', '会计审计', '咨询', '电商', '游戏', '教育', '医疗健康', '物流供应链', '房地产', '快消', '传媒', '文旅', '政企数字化']
const roleGroups = [
  {
    title: '技术研发',
    options: ['前端开发工程师', '后端开发工程师', 'Java开发工程师', 'Python开发工程师', '测试工程师', '运维工程师', '算法工程师', '嵌入式工程师', '数据开发工程师', '网络安全工程师'],
  },
  {
    title: '产品设计',
    options: ['产品助理', '产品经理', '交互设计师', 'UI设计师', '用户研究', '项目助理'],
  },
  {
    title: '数据运营',
    options: ['数据分析师', '商业分析师', '用户运营', '内容运营', '新媒体运营', '电商运营', '市场营销', '增长运营'],
  },
  {
    title: '职能商业',
    options: ['管培生', '人力资源', '财务助理', '审计助理', '供应链专员', '销售管培生', '客户成功', '咨询顾问助理'],
  },
]

const applicationStatuses: ApplicationStatus[] = ['Saved', 'Applied', 'Interview', 'Offer']
const statusLabels: Record<ApplicationStatus, string> = {
  Saved: '已收藏',
  Applied: '已投递',
  Interview: '面试中',
  Offer: 'Offer',
}

const defaultApplications: Application[] = [
  {
    id: 1,
    company: '官网推荐结果',
    role: '等待生成',
    status: 'Saved',
    nextStep: '填写个人信息后点击筛选官网',
    match: 0,
    deadline: '待官网确认',
  },
]

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.PROD ? '' : 'http://127.0.0.1:8787')
).replace(/\/$/, '')

function apiUrl(path: string) {
  const url = `${API_BASE_URL}${path}`
  if (typeof window === 'undefined') return url

  const params = new URLSearchParams()
  const currentParams = new URLSearchParams(window.location.search)
  for (const key of ['eo_token', 'eo_time']) {
    const value = currentParams.get(key)
    if (value) params.set(key, value)
  }

  const query = params.toString()
  return query ? `${url}?${query}` : url
}

function App() {
  const [mode, setMode] = useState<Mode>('home')
  const [resumeTemplate, setResumeTemplate] = useState<TemplateId>('classic')
  const [resumeProfile, setResumeProfile] = useState<ResumeProfile>(defaultResumeProfile)
  const [resumeSections, setResumeSections] = useState<ResumeSections>(defaultResumeSections)
  const [rawLine, setRawLine] = useState('做过校园二手交易平台，负责商品列表和发布页面')
  const [targetSection, setTargetSection] = useState<ResumeSectionKey>('projects')
  const [polishing, setPolishing] = useState(false)
  const [resumeNotice, setResumeNotice] = useState('')

  const [careerProfile, setCareerProfile] = useState(defaultCareerProfile)
  const [careerForm, setCareerForm] = useState<CareerProfileForm>(defaultCareerForm)
  const [aiResult, setAiResult] = useState<AiRecommendation | null>(null)
  const [recommendLoading, setRecommendLoading] = useState(false)
  const [recommendError, setRecommendError] = useState('')
  const [applications, setApplications] = useState<Application[]>(defaultApplications)

  const activeTemplate = useMemo(
    () => resumeTemplates.find((item) => item.id === resumeTemplate) ?? resumeTemplates[0],
    [resumeTemplate],
  )

  const updateResumeProfile = (field: keyof ResumeProfile, value: string) => {
    setResumeProfile((current) => ({ ...current, [field]: value }))
  }

  const updateCareerForm = (field: keyof CareerProfileForm, value: string) => {
    setCareerForm((current) => ({ ...current, [field]: value }))
  }

  const toggleCareerTerm = (field: 'roles' | 'cities' | 'industries', value: string) => {
    setCareerForm((current) => {
      const terms = splitTerms(current[field])
      const next = terms.includes(value) ? terms.filter((item) => item !== value) : [...terms, value]
      return { ...current, [field]: next.join(', ') }
    })
  }

  const addManualLine = () => {
    if (!rawLine.trim()) return
    setResumeSections((current) => ({
      ...current,
      [targetSection]: [...current[targetSection], ...buildLocalResumeLines(rawLine, targetSection, resumeProfile.targetRole)],
    }))
    setRawLine('')
  }

  const polishLine = async () => {
    if (!rawLine.trim()) return
    setPolishing(true)
    setResumeNotice('')
    try {
      const response = await fetch(apiUrl('/api/polish-resume-line'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          raw: rawLine,
          section: targetSection,
          targetRole: resumeProfile.targetRole,
          profile: resumeProfile,
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || '生成失败')
      const items = Array.isArray(data.items) ? data.items.map(String).filter(Boolean) : []
      setResumeSections((current) => ({
        ...current,
        [targetSection]: [...current[targetSection], ...(items.length ? items : buildLocalResumeLines(rawLine, targetSection, resumeProfile.targetRole))],
      }))
      setResumeNotice(data.mode === 'ai' ? '已使用大模型包装为简历内容。' : '未检测到模型配置，已使用本地规则生成。')
      setRawLine('')
    } catch (error) {
      setResumeSections((current) => ({
        ...current,
        [targetSection]: [...current[targetSection], ...buildLocalResumeLines(rawLine, targetSection, resumeProfile.targetRole)],
      }))
      setResumeNotice(error instanceof Error ? `已用本地规则兜底：${error.message}` : '已用本地规则兜底。')
      setRawLine('')
    } finally {
      setPolishing(false)
    }
  }

  const removeResumeLine = (section: ResumeSectionKey, index: number) => {
    setResumeSections((current) => ({
      ...current,
      [section]: current[section].filter((_, itemIndex) => itemIndex !== index),
    }))
  }

  const exportWord = async () => {
    const doc = buildDocument(resumeProfile, resumeSections, activeTemplate)
    const blob = await Packer.toBlob(doc)
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${resumeProfile.name || '我的'}_${resumeProfile.targetRole || '求职'}_简历.docx`
    link.click()
    URL.revokeObjectURL(url)
  }

  const recommendJobs = async () => {
    setRecommendLoading(true)
    setRecommendError('')
    try {
      const response = await fetch(apiUrl('/api/recommend-jobs'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profile: careerProfile,
          profileForm: careerForm,
          resume: resumeSectionsToText(resumeSections),
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.setup || data.error || '推荐失败')
      setAiResult(data)
    } catch (error) {
      setRecommendError(error instanceof Error ? error.message : '推荐失败')
    } finally {
      setRecommendLoading(false)
    }
  }

  const addRecommendedJob = (job: RecommendedJob) => {
    setApplications((current) => {
      const exists = current.some((item) => item.company === job.company && item.role === job.role)
      if (exists) return current
      return [
        ...current.filter((item) => item.company !== '官网推荐结果'),
        {
          id: Date.now(),
          company: job.company,
          role: job.role,
          status: 'Saved',
          nextStep: `按官网岗位定制简历：突出 ${job.resumeFocus[0] || '匹配经历'}`,
          match: job.matchScore,
          deadline: '待官网确认',
        },
      ]
    })
  }

  const updateApplicationStatus = (id: number, status: ApplicationStatus) => {
    setApplications((current) => current.map((item) => (item.id === id ? { ...item, status } : item)))
  }

  return (
    <main className="site-shell">
      <nav className="site-nav">
        <div className="brand">
          <span className="brand-mark">
            <GraduationCap size={22} />
          </span>
          <strong>OfferPilot</strong>
        </div>
        <div className="nav-links">
          <button className={mode === 'resume' ? 'active' : ''} onClick={() => setMode('resume')} type="button">
            优化简历内容
          </button>
          <button className={mode === 'discover' ? 'active' : ''} onClick={() => setMode('discover')} type="button">
            推荐公司官网
          </button>
        </div>
      </nav>

      <section className="hero-section">
        <div className="hero-copy">
          <span className="eyebrow">
            <Sparkles size={16} />
            应届生官网投递助手
          </span>
          <h1>少一点海投，多一点真正适合你的面试机会。</h1>
          <p>填写求职画像，AI 帮你发现公司官网岗位、分析匹配度、说明推荐理由和能力差距。</p>
          <div className="hero-actions">
            <button className="primary-button" onClick={() => setMode('resume')} type="button">
              <FileText size={18} />
              优化我的简历
            </button>
            <button className="secondary-button" onClick={() => setMode('discover')} type="button">
              <Search size={18} />
              分析岗位匹配
            </button>
          </div>
        </div>
        <div className="hero-product copy-panel" aria-label="产品介绍">
          <span className="copy-kicker">为什么做这个网站</span>
          <h2>应届生缺的不是岗位信息，而是判断和下一步。</h2>
          <div className="copy-list">
            <article>
              <strong>不再只盯大厂</strong>
              <p>结合学校、专业、城市和能力，推荐更现实的公司官网机会。</p>
            </article>
            <article>
              <strong>只打开具体官网</strong>
              <p>优先输出公司官网、校招官网和加入我们页面，减少第三方信息噪音。</p>
            </article>
            <article>
              <strong>看清匹配原因</strong>
              <p>告诉你为什么适合、缺什么能力、简历应该突出哪段经历。</p>
            </article>
          </div>
          <div className="audience-strip">
            <span>适合：</span>
            <em>普通本科</em>
            <em>双非学生</em>
            <em>跨专业求职</em>
            <em>不知道投哪</em>
          </div>
        </div>
      </section>

      <section className="workspace">
        {mode === 'home' && (
          <section className="overview-section">
            <article className="overview-card">
              <div className="overview-icon">
                <FileText size={24} />
              </div>
              <h2>优化简历内容</h2>
              <p>选择简历模板，填写个人信息，用一句话生成项目、实习和技能描述，最后导出 Word 简历。</p>
              <ul>
                <li>多种简历模板可选</li>
                <li>一句话调用大模型包装</li>
                <li>一键生成 Word 文档</li>
              </ul>
              <button className="primary-button" onClick={() => setMode('resume')} type="button">
                <FileText size={18} />
                进入简历生成
              </button>
            </article>
            <article className="overview-card">
              <div className="overview-icon">
                <BriefcaseBusiness size={24} />
              </div>
              <h2>推荐公司官网</h2>
              <p>填写大学、专业、目标岗位、城市和技能，系统会推荐具体公司的官网招聘页，并分析你和岗位的匹配情况。</p>
              <ul>
                <li>具体公司官网链接</li>
                <li>岗位匹配度和推荐理由</li>
                <li>风险提示、缺口能力和投递材料</li>
              </ul>
              <button className="primary-button" onClick={() => setMode('discover')} type="button">
                <Search size={18} />
                进入岗位推荐
              </button>
            </article>
          </section>
        )}

        {mode === 'resume' && (
          <>
            <header className="tool-heading">
              <span>功能 1</span>
              <h2>选择模板并生成 Word 简历</h2>
              <p>这块只负责简历：选模板、填个人信息、用一句话生成简历条目，最后导出 Word 文档。</p>
            </header>
            <ResumeBuilder
              activeTemplate={activeTemplate}
              exportWord={exportWord}
              polishing={polishing}
              rawLine={rawLine}
              removeResumeLine={removeResumeLine}
              resumeNotice={resumeNotice}
              resumeProfile={resumeProfile}
              resumeSections={resumeSections}
              resumeTemplate={resumeTemplate}
              setRawLine={setRawLine}
              setResumeTemplate={setResumeTemplate}
              setTargetSection={setTargetSection}
              targetSection={targetSection}
              updateResumeProfile={updateResumeProfile}
              addManualLine={addManualLine}
              polishLine={polishLine}
            />
          </>
        )}

        {mode === 'discover' && (
          <>
            <header className="tool-heading">
              <span>功能 2</span>
              <h2>分析个人信息并推荐公司官网</h2>
              <p>填写你的学校、专业、目标岗位和城市，系统会推荐具体公司官网，并分析你与岗位的匹配度。</p>
            </header>
            <DiscoverPanel
              aiResult={aiResult}
              applications={applications}
              careerForm={careerForm}
              careerProfile={careerProfile}
              recommendError={recommendError}
              recommendJobs={recommendJobs}
              recommendLoading={recommendLoading}
              setCareerProfile={setCareerProfile}
              toggleCareerTerm={toggleCareerTerm}
              updateApplicationStatus={updateApplicationStatus}
              updateCareerForm={updateCareerForm}
              addRecommendedJob={addRecommendedJob}
            />
          </>
        )}
      </section>
    </main>
  )
}

function ResumeBuilder({
  activeTemplate,
  exportWord,
  polishing,
  rawLine,
  removeResumeLine,
  resumeNotice,
  resumeProfile,
  resumeSections,
  resumeTemplate,
  setRawLine,
  setResumeTemplate,
  setTargetSection,
  targetSection,
  updateResumeProfile,
  addManualLine,
  polishLine,
}: {
  activeTemplate: (typeof resumeTemplates)[number]
  exportWord: () => void
  polishing: boolean
  rawLine: string
  removeResumeLine: (section: ResumeSectionKey, index: number) => void
  resumeNotice: string
  resumeProfile: ResumeProfile
  resumeSections: ResumeSections
  resumeTemplate: TemplateId
  setRawLine: (value: string) => void
  setResumeTemplate: (value: TemplateId) => void
  setTargetSection: (value: ResumeSectionKey) => void
  targetSection: ResumeSectionKey
  updateResumeProfile: (field: keyof ResumeProfile, value: string) => void
  addManualLine: () => void
  polishLine: () => void
}) {
  return (
    <section className="resume-builder-layout">
      <aside className="resume-control-panel">
        <section className="panel-section">
          <div className="panel-heading">
            <Palette size={18} />
            <span>选择简历模板</span>
          </div>
          <div className="template-grid">
            {resumeTemplates.map((item) => (
              <button
                className={resumeTemplate === item.id ? 'template-card selected' : 'template-card'}
                key={item.id}
                onClick={() => setResumeTemplate(item.id)}
                type="button"
              >
                <i style={{ background: item.accent }} />
                <strong>{item.name}</strong>
                <small>{item.description}</small>
              </button>
            ))}
          </div>
        </section>

        <section className="panel-section">
          <div className="panel-heading">
            <FileText size={18} />
            <span>个人信息</span>
          </div>
          <div className="resume-form-grid">
            <label>
              姓名
              <input value={resumeProfile.name} onChange={(event) => updateResumeProfile('name', event.target.value)} />
            </label>
            <label>
              目标岗位
              <input value={resumeProfile.targetRole} onChange={(event) => updateResumeProfile('targetRole', event.target.value)} />
            </label>
            <label>
              手机
              <input value={resumeProfile.phone} onChange={(event) => updateResumeProfile('phone', event.target.value)} />
            </label>
            <label>
              邮箱
              <input value={resumeProfile.email} onChange={(event) => updateResumeProfile('email', event.target.value)} />
            </label>
            <label>
              城市
              <input value={resumeProfile.city} onChange={(event) => updateResumeProfile('city', event.target.value)} />
            </label>
            <label>
              学校
              <input value={resumeProfile.university} onChange={(event) => updateResumeProfile('university', event.target.value)} />
            </label>
            <label>
              专业
              <input value={resumeProfile.major} onChange={(event) => updateResumeProfile('major', event.target.value)} />
            </label>
            <label>
              学历
              <select value={resumeProfile.education} onChange={(event) => updateResumeProfile('education', event.target.value)}>
                {educationOptions.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </label>
            <label>
              毕业届别
              <select value={resumeProfile.graduation} onChange={(event) => updateResumeProfile('graduation', event.target.value)}>
                {graduationOptions.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </label>
          </div>
        </section>

        <section className="panel-section">
          <div className="panel-heading">
            <Wand2 size={18} />
            <span>一句话生成经历</span>
          </div>
          <label>
            放到哪个模块
            <select value={targetSection} onChange={(event) => setTargetSection(event.target.value as ResumeSectionKey)}>
              <option value="projects">项目经历</option>
              <option value="internship">实习 / 实践</option>
              <option value="skills">技能证书</option>
            </select>
          </label>
          <label>
            一句话描述
            <textarea value={rawLine} onChange={(event) => setRawLine(event.target.value)} />
          </label>
          <div className="button-row">
            <button className="primary-button" onClick={polishLine} disabled={polishing} type="button">
              <Sparkles size={17} />
              {polishing ? '生成中...' : 'AI 包装成简历内容'}
            </button>
            <button className="secondary-button" onClick={addManualLine} type="button">
              <Plus size={17} />
              本地生成
            </button>
          </div>
          {resumeNotice && <p className="notice">{resumeNotice}</p>}
        </section>
      </aside>

      <section className="resume-preview-panel">
        <div className="resume-preview-toolbar">
          <strong>简历预览</strong>
          <button className="export-button" onClick={exportWord} type="button">
            <Download size={18} />
            导出 Word
          </button>
        </div>
        <ResumePreview
          profile={resumeProfile}
          removeLine={removeResumeLine}
          sections={resumeSections}
          template={activeTemplate}
        />
      </section>
    </section>
  )
}

function ResumePreview({
  profile,
  sections,
  template,
  removeLine,
}: {
  profile: ResumeProfile
  sections: ResumeSections
  template: (typeof resumeTemplates)[number]
  removeLine: (section: ResumeSectionKey, index: number) => void
}) {
  return (
    <article className={`resume-preview ${template.id}`} style={{ '--accent': template.accent } as CSSProperties}>
      <header className="resume-head">
        <div>
          <h2>{profile.name}</h2>
          <p>{profile.targetRole}</p>
        </div>
        <div className="contact-list">
          <span>
            <Phone size={14} />
            {profile.phone}
          </span>
          <span>
            <Mail size={14} />
            {profile.email}
          </span>
          <span>
            <MapPin size={14} />
            {profile.city}
          </span>
        </div>
      </header>

      <ResumeBlock title="教育背景">
        <p>
          {profile.university} · {profile.education} · {profile.major} · {profile.graduation}
        </p>
      </ResumeBlock>

      {(Object.keys(sectionLabels) as ResumeSectionKey[]).map((section) => (
        <ResumeBlock title={sectionLabels[section]} key={section}>
          <ul>
            {sections[section].map((item, index) => (
              <li key={`${item}-${index}`}>
                <span>{item}</span>
                <button onClick={() => removeLine(section, index)} type="button">
                  删除
                </button>
              </li>
            ))}
          </ul>
        </ResumeBlock>
      ))}
    </article>
  )
}

function DiscoverPanel({
  aiResult,
  applications,
  careerForm,
  careerProfile,
  recommendError,
  recommendJobs,
  recommendLoading,
  setCareerProfile,
  toggleCareerTerm,
  updateApplicationStatus,
  updateCareerForm,
  addRecommendedJob,
}: {
  aiResult: AiRecommendation | null
  applications: Application[]
  careerForm: CareerProfileForm
  careerProfile: string
  recommendError: string
  recommendJobs: () => void
  recommendLoading: boolean
  setCareerProfile: (value: string) => void
  toggleCareerTerm: (field: 'roles' | 'cities' | 'industries', value: string) => void
  updateCareerForm: (field: keyof CareerProfileForm, value: string) => void
  addRecommendedJob: (job: RecommendedJob) => void
  updateApplicationStatus: (id: number, status: ApplicationStatus) => void
}) {
  const selectedRoles = splitTerms(careerForm.roles)
  const selectedCities = splitTerms(careerForm.cities)
  const selectedIndustries = splitTerms(careerForm.industries)

  return (
    <>
      <section className="profile-card">
        <div>
          <label htmlFor="career-profile">求职画像</label>
          <textarea id="career-profile" value={careerProfile} onChange={(event) => setCareerProfile(event.target.value)} />
        </div>
        <div className="stat-row">
          <article>
            <strong>{aiResult?.jobs.length ?? 0}</strong>
            <span>官网机会</span>
          </article>
          <article>
            <strong>{applications.length}</strong>
            <span>看板岗位</span>
          </article>
          <article>
            <strong>{aiResult?.mode === 'ai' ? 'AI' : '规则'}</strong>
            <span>分析模式</span>
          </article>
        </div>
      </section>

      <section className="discover-layout">
        <aside className="search-panel">
          <div className="panel-heading">
            <Search size={18} />
            <span>官网岗位 Agent</span>
          </div>
          <div className="agent-steps">
            <span>读取画像</span>
            <span>检索官网</span>
            <span>解析 JD</span>
            <span>匹配排序</span>
          </div>
          {recommendError && <p className="error-box">{recommendError}</p>}

          <div className="profile-form">
            <div className="panel-heading compact">
              <GraduationCap size={18} />
              <span>结构化信息</span>
            </div>
            <div className="compact-fields">
              <label>
                姓名
                <input value={careerForm.name} onChange={(event) => updateCareerForm('name', event.target.value)} />
              </label>
              <label>
                大学
                <input value={careerForm.university} onChange={(event) => updateCareerForm('university', event.target.value)} />
              </label>
              <label>
                学历
                <select value={careerForm.education} onChange={(event) => updateCareerForm('education', event.target.value)}>
                  {educationOptions.map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </select>
              </label>
              <label>
                毕业
                <select value={careerForm.graduation} onChange={(event) => updateCareerForm('graduation', event.target.value)}>
                  {graduationOptions.map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </select>
              </label>
              <label className="wide-field">
                专业
                <input value={careerForm.major} onChange={(event) => updateCareerForm('major', event.target.value)} />
              </label>
              <label>
                薪资
                <select value={careerForm.salary} onChange={(event) => updateCareerForm('salary', event.target.value)}>
                  {salaryOptions.map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </select>
              </label>
            </div>

            <div className="choice-block">
              <span>目标岗位</span>
              <div className="choice-groups">
                {roleGroups.map((group) => (
                  <section className="choice-group" key={group.title}>
                    <strong>{group.title}</strong>
                    <div className="choice-pills">
                      {group.options.map((item) => (
                        <button
                          className={selectedRoles.includes(item) ? 'selected' : ''}
                          key={item}
                          onClick={() => toggleCareerTerm('roles', item)}
                          type="button"
                        >
                          {item}
                        </button>
                      ))}
                    </div>
                  </section>
                ))}
              </div>
              <input value={careerForm.roles} onChange={(event) => updateCareerForm('roles', event.target.value)} />
            </div>

            <ChoicePills
              label="城市偏好"
              options={cityOptions}
              selected={selectedCities}
              onToggle={(value) => toggleCareerTerm('cities', value)}
            />
            <input value={careerForm.cities} onChange={(event) => updateCareerForm('cities', event.target.value)} />

            <ChoicePills
              label="行业偏好"
              options={industryOptions}
              selected={selectedIndustries}
              onToggle={(value) => toggleCareerTerm('industries', value)}
            />
            <input value={careerForm.industries} onChange={(event) => updateCareerForm('industries', event.target.value)} />

            <label>
              技能关键词
              <input value={careerForm.skills} onChange={(event) => updateCareerForm('skills', event.target.value)} />
            </label>

            <div className="profile-submit">
              <button className="full-button" onClick={recommendJobs} disabled={recommendLoading} type="button">
                <Sparkles size={17} />
                {recommendLoading ? '正在筛选官网...' : '筛选官网岗位'}
              </button>
              <p className="hint">配置 .env 后会调用大模型深度分析；没有配置时会使用免费规则兜底。</p>
            </div>
          </div>
        </aside>

        <div className="job-results">
          {aiResult ? (
            <section className="ai-result-block">
              <div className="panel-heading">
                <Sparkles size={18} />
                <span>{aiResult.mode === 'ai' ? '大模型深度分析结果' : '免费规则筛选结果'}</span>
              </div>
              <p className="ai-summary">{aiResult.profileSummary}</p>
              <div className="strategy-list">
                {aiResult.strategy?.map((item) => (
                  <span key={item}>{item}</span>
                ))}
              </div>
              {aiResult.jobs?.length ? (
                aiResult.jobs.map((job) => (
                  <RecommendedJobCard addRecommendedJob={addRecommendedJob} job={job} key={`${job.company}-${job.role}`} />
                ))
              ) : (
                <article className="empty-state">
                  <strong>暂时没有足够明确的公司官网</strong>
                  <p>可以换一个城市、岗位关键词，或者确认 .env 里的大模型配置后再生成。</p>
                </article>
              )}
            </section>
          ) : (
            <section className="empty-state">
              <strong>填写左侧个人信息后生成官网推荐</strong>
              <p>结果会包含具体公司、官网链接、匹配度、推荐理由、能力缺口和投递材料。</p>
            </section>
          )}

          <section className="tracker compact-tracker">
            <div className="panel-heading">
              <BriefcaseBusiness size={18} />
              <span>投递看板</span>
            </div>
            <div className="kanban">
              {applicationStatuses.map((status) => (
                <section className="kanban-column" key={status}>
                  <h2>{statusLabels[status]}</h2>
                  {applications
                    .filter((item) => item.status === status)
                    .map((item) => (
                      <article className="job-card" key={item.id}>
                        <div className="job-card-top">
                          <div>
                            <strong>{item.company}</strong>
                            <span>{item.role}</span>
                          </div>
                          <em>{item.match}%</em>
                        </div>
                        <p>{item.nextStep}</p>
                        <p className="deadline">
                          <Calendar size={14} />
                          截止 {item.deadline}
                        </p>
                        <div className="card-actions">
                          <select value={item.status} onChange={(event) => updateApplicationStatus(item.id, event.target.value as ApplicationStatus)}>
                            {applicationStatuses.map((option) => (
                              <option value={option} key={option}>
                                {statusLabels[option]}
                              </option>
                            ))}
                          </select>
                        </div>
                      </article>
                    ))}
                </section>
              ))}
            </div>
          </section>
        </div>
      </section>
    </>
  )
}

function ChoicePills({
  label,
  options,
  selected,
  onToggle,
}: {
  label: string
  options: string[]
  selected: string[]
  onToggle: (value: string) => void
}) {
  return (
    <div className="choice-block">
      <span>{label}</span>
      <div className="choice-pills">
        {options.map((item) => (
          <button className={selected.includes(item) ? 'selected' : ''} key={item} onClick={() => onToggle(item)} type="button">
            {item}
          </button>
        ))}
      </div>
    </div>
  )
}

function RecommendedJobCard({
  job,
  addRecommendedJob,
}: {
  job: RecommendedJob
  addRecommendedJob: (job: RecommendedJob) => void
}) {
  return (
    <article className="official-job-card ai-recommend-card">
      <div className="job-head">
        <div>
          <span>{job.sourceType}</span>
          <h2>{job.role}</h2>
          <p>
            {job.company} · {job.city}
          </p>
        </div>
        <strong>{job.matchScore}%</strong>
      </div>
      <p>{job.reason}</p>
      <div className="tag-group">
        {job.resumeFocus?.map((item) => (
          <span className="tag good" key={item}>
            突出 {item}
          </span>
        ))}
        {job.missingSkills?.map((item) => (
          <span className="tag warn" key={item}>
            补 {item}
          </span>
        ))}
      </div>
      <div className="risk-box">
        {job.riskLevel === '低' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
        <span>{job.riskSignals?.join(' / ') || '官网链接需要人工复核'}</span>
      </div>
      <div className="material-list">
        {job.materialChecklist?.map((item) => (
          <span key={item}>{item}</span>
        ))}
      </div>
      <div className="job-actions">
        <a href={job.officialUrl} target="_blank" rel="noreferrer">
          <ExternalLink size={16} />
          打开官网
        </a>
        <button onClick={() => addRecommendedJob(job)} type="button">
          <BadgeCheck size={16} />
          加入看板
        </button>
      </div>
    </article>
  )
}

function ResumeBlock({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="resume-block">
      <h3>{title}</h3>
      {children}
    </section>
  )
}

function splitTerms(text: string) {
  return text
    .split(/[,，、\s]+/)
    .map((item) => item.trim())
    .filter(Boolean)
}

function buildLocalResumeLines(raw: string, section: ResumeSectionKey, targetRole: string) {
  const clean = raw.replace(/[。；;]+$/g, '')
  if (section === 'skills') {
    return [`熟悉${clean}，能够结合${targetRole}岗位需求完成基础应用与持续学习。`]
  }
  if (section === 'internship') {
    return [
      `参与${clean}相关工作，协助团队完成信息整理、流程推进与结果复盘。`,
      `围绕${targetRole}岗位要求，沉淀工作记录和问题清单，提升任务推进效率。`,
    ]
  }
  return [
    `围绕${targetRole}岗位要求，参与${clean}，完成核心流程梳理与功能落地。`,
    `根据项目反馈优化执行细节，沉淀复盘文档，体现学习能力和结果导向。`,
  ]
}

function resumeSectionsToText(sections: ResumeSections) {
  return (Object.keys(sectionLabels) as ResumeSectionKey[])
    .map((section) => `${sectionLabels[section]}\n${sections[section].join('\n')}`)
    .join('\n\n')
}

function buildDocument(
  profile: ResumeProfile,
  sections: ResumeSections,
  template: (typeof resumeTemplates)[number],
) {
  const headingColor = template.accent.replace('#', '')
  const sectionChildren = (Object.keys(sectionLabels) as ResumeSectionKey[]).flatMap((section) => [
    new Paragraph({
      heading: HeadingLevel.HEADING_2,
      children: [new TextRun({ text: sectionLabels[section], bold: true, color: headingColor })],
      spacing: { before: 220, after: 80 },
    }),
    ...sections[section].map(
      (item) =>
        new Paragraph({
          bullet: { level: 0 },
          children: [new TextRun({ text: item, size: 22 })],
          spacing: { after: 80 },
        }),
    ),
  ])

  return new Document({
    sections: [
      {
        properties: {},
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: profile.name || '姓名', bold: true, size: 34, color: headingColor })],
            spacing: { after: 80 },
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: `${profile.targetRole} | ${profile.phone} | ${profile.email} | ${profile.city}`,
                size: 20,
              }),
            ],
            spacing: { after: 180 },
          }),
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            children: [new TextRun({ text: '教育背景', bold: true, color: headingColor })],
            spacing: { before: 120, after: 80 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: `${profile.university} | ${profile.education} | ${profile.major} | ${profile.graduation}`,
                size: 22,
              }),
            ],
            spacing: { after: 100 },
          }),
          ...sectionChildren,
        ],
      },
    ],
  })
}

export default App
