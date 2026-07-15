import { getHealth } from '../../server/index.mjs'

export default function onRequest(context) {
  return onRequestGet(context)
}

export function onRequestGet(context) {
  syncEnv(context)
  return json(getHealth())
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
