/// <reference types="vite/client" />
import type { TestRecord } from './engine/types'

/** Supabase over plain REST. Off when the two env values are missing, then the app stays a local demo. */
const URL_ = import.meta.env.VITE_SUPABASE_URL as string | undefined
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined
export const cloudOn = !!(URL_ && KEY)

const TOKEN = 'ischool.placement.token'
const get = (k: string) => { try { return localStorage.getItem(k) } catch { return null } }
const set = (k: string, v: string | null) => { try { v ? localStorage.setItem(k, v) : localStorage.removeItem(k) } catch { /* private mode */ } }
export const token = () => get(TOKEN)
export const signOut = () => set(TOKEN, null)

const headers = (auth = KEY!) => ({ apikey: KEY!, Authorization: `Bearer ${auth}`, 'Content-Type': 'application/json' })

export async function saveTest(rec: TestRecord) {
  const r = await fetch(`${URL_}/rest/v1/rpc/save_test`, { method: 'POST', headers: headers(), body: JSON.stringify({ rec }) })
  if (!r.ok) throw new Error(`save ${r.status}`)
}

export async function signIn(email: string, password: string) {
  const r = await fetch(`${URL_}/auth/v1/token?grant_type=password`, { method: 'POST', headers: headers(), body: JSON.stringify({ email, password }) })
  if (!r.ok) throw new Error('Wrong email or password.')
  set(TOKEN, (await r.json()).access_token)
}

/** All finished tests. Throws 'auth' when the sign-in has expired. */
export async function fetchTests(): Promise<TestRecord[]> {
  const t = token()
  if (!t) throw new Error('auth')
  const r = await fetch(`${URL_}/rest/v1/tests?select=data&status=eq.done&order=updated_at.desc`, { headers: headers(t) })
  if (r.status === 401 || r.status === 403) { signOut(); throw new Error('auth') }
  if (!r.ok) throw new Error(`load ${r.status}`)
  return (await r.json()).map((x: { data: TestRecord }) => x.data)
}
