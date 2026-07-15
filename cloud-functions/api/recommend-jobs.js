import { recommendJobs } from '../../server/index.mjs'

export default async function onRequest(context) {
  if (context.request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405)
  }

  return onRequestPost(context)
}

export async function onRequestPost(context) {
  syncEnv(context)

  try {
    const body = await context.request.json()
    const result = await recommendJobs(body)
    return json(result)
  } catch (error) {
    return jsonError(error)
  }
}

function syncEnv(context) {
  Object.assign(process.env, context?.env || {})
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  })
}

function jsonError(error) {
  const status = error.statusCode || 500
  return json(
    {
      error: error.message || 'Server error',
      setup:
        status === 401 || status === 400
          ? '请在 EdgeOne Pages 环境变量里配置 AI_API_KEY、AI_BASE_URL、AI_MODEL。'
          : undefined,
    },
    status,
  )
}
