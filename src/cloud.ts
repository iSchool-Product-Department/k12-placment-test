/// <reference types="vite/client" />
import type { TestRecord } from './engine/types'

/** Supabase over plain REST. Off when the two env values are missing, then the app stays a local demo. */
const URL_ = import.meta.env.VITE_SUPABASE_URL as string | undefined
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined
export const cloudOn = !!(URL_ && KEY)

declare const __ADMIN_KEY__: string | null
/** A build is the student test plus a password-locked admin. Content and the service key stay on the local dev server. */
export const adminKey = __ADMIN_KEY__
export const studentOnly = import.meta.env.PROD

const headers = (auth = KEY!) => ({ apikey: KEY!, Authorization: `Bearer ${auth}`, 'Content-Type': 'application/json' })

export async function saveTest(rec: TestRecord) {
  const r = await fetch(`${URL_}/rest/v1/rpc/save_test`, { method: 'POST', headers: headers(), body: JSON.stringify({ rec }) })
  if (!r.ok) throw new Error(`save ${r.status}`)
}

const PASS = 'ischool.placement.adminpass'
export const savedPassword = () => { try { return sessionStorage.getItem(PASS) } catch { return null } }

/** All finished tests. Local dev reads Supabase with the service key; a build asks /api/tests with the team password. */
export async function fetchTests(password = savedPassword()): Promise<TestRecord[]> {
  if (studentOnly) {
    if (!password) throw new Error('password')
    const r = await fetch('./api/tests', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password }) })
    const body = await r.json().catch(() => ({ error: `Could not load tests (${r.status}).` }))
    if (r.status === 401) { try { sessionStorage.removeItem(PASS) } catch { /* */ } throw new Error('password') }
    if (!r.ok) throw new Error(body.error)
    try { sessionStorage.setItem(PASS, password) } catch { /* private mode */ }
    return body
  }
  if (!adminKey) throw new Error('Add SUPABASE_SERVICE_KEY to .env.local, then restart npm run dev.')
  const r = await fetch(`${URL_}/rest/v1/tests?select=data&status=eq.done&order=updated_at.desc`, { headers: { apikey: adminKey, Authorization: `Bearer ${adminKey}` } })
  if (!r.ok) throw new Error(`load ${r.status}`)
  return (await r.json()).map((x: { data: TestRecord }) => x.data)
}
