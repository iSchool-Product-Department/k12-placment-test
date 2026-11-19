import { useSyncExternalStore } from 'react'
import { DEFAULT_CONFIG, seeded, simulate, startLevel } from './engine/engine'
import type { Config, TestRecord } from './engine/types'
import { AVATARS, BANK } from './data/ladder'

/**
 * Storage adapter. The demo keeps everything in this browser (localStorage).
 * To go live, swap these functions for API calls (for example Supabase tables
 * `tests` and `config`) and keep the same shapes.
 */
const KEY = 'ischool.placement.v2.tests.3'
const CFG_KEY = 'ischool.placement.v2.config'

const safeGet = (k: string) => { try { return localStorage.getItem(k) } catch { return null } }
const safeSet = (k: string, v: string) => { try { localStorage.setItem(k, v) } catch { /* private mode */ } }

let tests: TestRecord[] = load()
let config: Config = { ...DEFAULT_CONFIG, ...JSON.parse(safeGet(CFG_KEY) || '{}') }
const subs = new Set<() => void>()
const emit = () => subs.forEach(f => f())

function load(): TestRecord[] {
  const raw = safeGet(KEY)
  if (raw) try { return JSON.parse(raw) } catch { /* fall through */ }
  return seed()
}
function persist() { safeSet(KEY, JSON.stringify(tests)); emit() }

export const store = {
  subscribe(f: () => void) { subs.add(f); return () => subs.delete(f) },
  tests: () => tests,
  config: () => config,
  save(rec: TestRecord) {
    const i = tests.findIndex(t => t.id === rec.id)
    tests = i >= 0 ? tests.map(t => (t.id === rec.id ? rec : t)) : [rec, ...tests]
    persist()
  },
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
    return { ...r, id: 'demo' + i, createdAt: created, finishedAt: t, avatar: AVATARS[i % AVATARS.length], lang: (rng() > 0.6 ? 'ar' : 'en') as 'ar' | 'en' }
  }).sort((a, b) => b.createdAt - a.createdAt)
}
