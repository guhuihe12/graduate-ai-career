import { polishResumeLine } from '../server/index.mjs'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  try {
    const result = await polishResumeLine(getBody(req))
    res.status(200).json(result)
  } catch (error) {
    sendError(res, error)
  }
}

function getBody(req) {
  if (!req.body) return {}
  if (typeof req.body === 'string') return JSON.parse(req.body)
  return req.body
}

function sendError(res, error) {
  const status = error.statusCode || 500
  res.status(status).json({
    error: error.message || 'Server error',
    setup:
      status === 401 || status === 400
        ? '请在 Vercel 环境变量里配置 AI_API_KEY、AI_BASE_URL、AI_MODEL。'
        : undefined,
  })
}
