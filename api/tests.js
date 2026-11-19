// Vercel function: the admin's finished tests, behind one team password.
// Needs ADMIN_PASSWORD and SUPABASE_SERVICE_KEY (plus VITE_SUPABASE_URL) in Vercel's environment variables.
import { timingSafeEqual } from 'node:crypto'

const same = (a, b) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b))

export async function POST(request) {
  const { ADMIN_PASSWORD: pass, SUPABASE_SERVICE_KEY: key, VITE_SUPABASE_URL: url } = process.env
  if (!pass || !key || !url) return Response.json({ error: 'Admin is not set up on the server.' }, { status: 500 })
  const { password = '' } = await request.json().catch(() => ({}))
  if (!same(String(password), pass)) {
    await new Promise(r => setTimeout(r, 1000)) // ponytail: slows guessing, add real rate limiting if the link spreads
    return Response.json({ error: 'Wrong password.' }, { status: 401 })
  }
  const r = await fetch(`${url}/rest/v1/tests?select=data&status=eq.done&order=updated_at.desc`, { headers: { apikey: key } })
  if (!r.ok) return Response.json({ error: `Could not load tests (${r.status}).` }, { status: 502 })
  return Response.json((await r.json()).map(x => x.data))
}
