/// <reference types="vite/client" />
import type { TestRecord } from './engine/types'

/** Supabase over plain REST. Off when the two env values are missing, then the app stays a local demo. */
const URL_ = import.meta.env.VITE_SUPABASE_URL as string | undefined
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined
export const cloudOn = !!(URL_ && KEY)

declare const __ADMIN_KEY__: string | null
/** A build reads results through /api/tests (open for the demo). The service key stays on the server and the local dev server. */
export const adminKey = __ADMIN_KEY__
export const studentOnly = import.meta.env.PROD

// apikey alone: the new sb_publishable_/sb_secret_ keys are not JWTs and fail as a Bearer token (401).
const headers = () => ({ apikey: KEY!, 'Content-Type': 'application/json' })

export async function saveTest(rec: TestRecord) {
  const r = await fetch(`${URL_}/rest/v1/rpc/save_test`, { method: 'POST', headers: headers(), body: JSON.stringify({ rec }) })
  if (!r.ok) throw new Error(`save ${r.status} ${await r.text()}`)
}

/** All finished tests. Local dev reads Supabase with the service key; a build asks /api/tests. */
export async function fetchTests(): Promise<TestRecord[]> {
  if (studentOnly) {
    const r = await fetch('/api/tests')
    const body = await r.json().catch(() => ({ error: `Could not load tests (${r.status}).` }))
    if (!r.ok) throw new Error(body.error)
    return body
  }
  if (!adminKey) throw new Error('Add SUPABASE_SERVICE_KEY to .env.local, then restart npm run dev.')
  const r = await fetch(`${URL_}/rest/v1/tests?select=data&status=eq.done&order=updated_at.desc`, { headers: { apikey: adminKey } })
  if (!r.ok) throw new Error(`load ${r.status}`)
  return (await r.json()).map((x: { data: TestRecord }) => x.data)
}
