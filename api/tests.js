// Vercel function: the admin's finished tests. Open for the demo (no password).
// ponytail: anyone with the link can read results; put a password back before real students take it.
// Needs SUPABASE_SERVICE_KEY and VITE_SUPABASE_URL in Vercel's environment variables. The key never leaves the server.
export async function GET() {
  const { SUPABASE_SERVICE_KEY: key, VITE_SUPABASE_URL: url } = process.env
  if (!key || !url) return Response.json({ error: 'Admin is not set up on the server.' }, { status: 500 })
  const r = await fetch(`${url}/rest/v1/tests?select=data&status=eq.done&order=updated_at.desc`, { headers: { apikey: key } })
  if (!r.ok) return Response.json({ error: `Could not load tests (${r.status}).` }, { status: 502 })
  return Response.json((await r.json()).map(x => x.data))
}
