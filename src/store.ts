import { useSyncExternalStore } from 'react'
import { DEFAULT_CONFIG, isExpired, seeded, simulate, startLevel } from './engine/engine'
import type { Config, TestRecord } from './engine/types'
import { BANK } from './data/ladder'
import { cloudOn, fetchTests, saveTest } from './cloud'

/**
 * Storage adapter. The demo keeps everything in this browser (localStorage).
 * To go live, swap these functions for API calls (for example Supabase tables
 * `tests` and `config`) and keep the same shapes.
 */
const KEY = 'ischool.placement.v2.tests.4'
const CFG_KEY = 'ischool.placement.v2.config'
const PENDING = 'ischool.placement.pending'

const safeGet = (k: string) => { try { return localStorage.getItem(k) } catch { return null } }
const safeSet = (k: string, v: string) => { try { localStorage.setItem(k, v) } catch { /* private mode */ } }

let tests: TestRecord[] = cloudOn ? loadLocal() ?? [] : loadLocal() ?? seed()
let config: Config = { ...DEFAULT_CONFIG, ...JSON.parse(safeGet(CFG_KEY) || '{}') }
const subs = new Set<() => void>()
const emit = () => subs.forEach(f => f())

function loadLocal(): TestRecord[] | null {
  const raw = safeGet(KEY)
  if (raw) try { return (JSON.parse(raw) as TestRecord[]).map(t => (isExpired(t) ? { ...t, status: 'expired' as const } : t)) } catch { /* fall through */ }
  return null
}
function persist() { safeSet(KEY, JSON.stringify(tests)); emit() }

/** Cloud: a finished test goes to Supabase. Ids that failed stay queued and are sent again on the next save or page load. */
let pending: string[] = JSON.parse(safeGet(PENDING) || '[]')
async function push(ids: string[]) {
  pending = [...new Set([...pending, ...ids])]; safeSet(PENDING, JSON.stringify(pending))
  for (const id of pending) {
    const rec = tests.find(t => t.id === id)
    try { if (rec) await saveTest(rec); pending = pending.filter(x => x !== id) } catch { /* offline: retry later */ }
  }
  safeSet(PENDING, JSON.stringify(pending))
}
if (cloudOn && pending.length) push([])

/** Admin, cloud mode: finished tests from every device. null until loaded. */
let remote: TestRecord[] | null = null
let merged: TestRecord[] = []
/** Remote tests plus this browser's simulated ones (Content > Simulator). Cached so React sees a stable list. */
const view = () => {
  const next = [...(remote ?? []), ...tests.filter(t => t.simulated)]
  if (next.length !== merged.length || next.some((t, i) => t !== merged[i])) merged = next
  return merged
}

export const store = {
  subscribe(f: () => void) { subs.add(f); return () => subs.delete(f) },
  tests: () => (cloudOn ? view() : tests),
  async loadRemote() { remote = await fetchTests(); emit() },
  config: () => config,
  save(rec: TestRecord) {
    const i = tests.findIndex(t => t.id === rec.id)
    tests = i >= 0 ? tests.map(t => (t.id === rec.id ? rec : t)) : [rec, ...tests]
    persist()
    if (cloudOn && !rec.simulated && rec.status === 'done') push([rec.id]) // only finished tests go to Supabase
  },
  /** PRD 6.8: the open test in this browser, if it is less than 24 hours old. */
  resumable: () => tests.find(t => t.status === 'in_progress' && !t.simulated && !isExpired(t)),
  remove(id: string) { tests = tests.filter(t => t.id !== id); persist() },
  reset() { tests = seed(); persist() },
  setConfig(c: Config) { config = c; safeSet(CFG_KEY, JSON.stringify(c)); emit() },
}

export const useTests = () => useSyncExternalStore(store.subscribe, store.tests)
export const useConfig = () => useSyncExternalStore(store.subscribe, store.config)

/** Demo data: finished tests from simulated students so the admin view is not empty. */
function seed(): TestRecord[] {
  const names = ['Omar', 'Laila', 'Youssef', 'Mariam', 'Adam', 'Nour', 'Ziad', 'Salma', 'Karim', 'Hana', 'Ali', 'Farida', 'Seif', 'Malak', 'Hamza', 'Jana', 'Tamim', 'Lina', 'Mostafa', 'Rania', 'Yassin', 'Habiba', 'Marwan', 'Dina', 'Fares', 'Sara', 'Khaled', 'Reem', 'Amr', 'Nada']
  const rng = seeded(42)
  const now = Date.now()
  return names.map((name, i) => {
    const age = 6 + Math.floor(rng() * 13)
    const ability = startLevel(age) + 0.3 + (rng() - 0.5) * 2.4
    const r = simulate(ability, age, BANK, DEFAULT_CONFIG, rng, name)
    const created = now - Math.floor(rng() * 9 * 864e5) - i * 3600e3
    let t = created
    r.answers.forEach(a => { a.sec = Math.round(9 + rng() * 55); t += a.sec * 1000 })
    const n = 1000 + Math.floor(rng() * 9000)
    return {
      ...r, id: 'demo' + i, createdAt: created, finishedAt: t, lang: (rng() > 0.6 ? 'ar' : 'en') as 'ar' | 'en',
      code: `STA-ISCHOOL-S-${400 + i}`, phone: `+20 10 ${String(n).slice(0, 2)}${i % 10} ${n}`, email: `${name.toLowerCase()}.parent@example.com`,
    }
  }).sort((a, b) => b.createdAt - a.createdAt)
}
