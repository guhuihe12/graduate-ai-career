export default async function onRequest(context) {
  const body = context.request.method === 'POST' ? await context.request.json().catch(() => ({})) : {}
  return new Response(
    JSON.stringify({
      ok: true,
      method: context.request.method,
      body,
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    },
  )
}
