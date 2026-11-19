/// <reference types="vite/client" />
import type { TestRecord } from './engine/types'

/** Supabase over plain REST. Off when the two env values are missing, then the app stays a local demo. */
const URL_ = import.meta.env.VITE_SUPABASE_URL as string | undefined
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined
export const cloudOn = !!(URL_ && KEY)

declare const __ADMIN_KEY__: string | null
/** Admin and content open only where the service key exists: the local dev server. A build is the student test alone. */
export const adminKey = __ADMIN_KEY__
export const studentOnly = import.meta.env.PROD

const headers = (auth = KEY!) => ({ apikey: KEY!, Authorization: `Bearer ${auth}`, 'Content-Type': 'application/json' })

export async function saveTest(rec: TestRecord) {
  const r = await fetch(`${URL_}/rest/v1/rpc/save_test`, { method: 'POST', headers: headers(), body: JSON.stringify({ rec }) })
  if (!r.ok) throw new Error(`save ${r.status}`)
}

/** All finished tests, read with the service key (local dev only). */
export async function fetchTests(): Promise<TestRecord[]> {
  if (!adminKey) throw new Error('Add SUPABASE_SERVICE_KEY to .env.local, then restart npm run dev.')
  const r = await fetch(`${URL_}/rest/v1/tests?select=data&status=eq.done&order=updated_at.desc`, { headers: { apikey: adminKey, Authorization: `Bearer ${adminKey}` } })
  if (!r.ok) throw new Error(`load ${r.status}`)
  return (await r.json()).map((x: { data: TestRecord }) => x.data)
}
