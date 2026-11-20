import type { Question, TestRecord } from '../engine/types'

/** One question's results across finished tests, with the reasons it may need a look. */
export type Health = { q: Question; n: number; right: number; sec: number; flags: string[] }

export const MIN_ANSWERS = 5

/** Per-question stats from finished tests. Flags need at least MIN_ANSWERS answers, so one child cannot flag a question. */
export function questionHealth(bank: Question[], tests: TestRecord[]): Health[] {
  const by = new Map<string, { n: number; ok: number; sec: number }>()
  for (const t of tests) for (const a of t.answers) {
    const s = by.get(a.qid) || { n: 0, ok: 0, sec: 0 }
    s.n++; s.ok += a.ok ? 1 : 0; s.sec += a.sec
    by.set(a.qid, s)
  }
  const rows = bank.filter(q => by.has(q.id)).map(q => {
    const s = by.get(q.id)!
    return { q, n: s.n, right: s.ok / s.n, sec: s.sec / s.n, flags: [] as string[] }
  })
  // "Slow" compares with the other questions of the same level: twice their median time.
  const median = (xs: number[]) => { const a = [...xs].sort((x, y) => x - y); return a[Math.floor(a.length / 2)] ?? 0 }
  const levelMedian = new Map<number, number>()
  for (const lv of new Set(rows.map(r => r.q.lv))) levelMedian.set(lv, median(rows.filter(r => r.q.lv === lv && r.n >= MIN_ANSWERS).map(r => r.sec)))
  for (const r of rows) {
    if (r.n < MIN_ANSWERS) continue
    const easy = r.q.d === 'Starter' || r.q.d === 'Easy'
    if (r.right < 0.25) r.flags.push('Too hard')
    else if (easy && r.right < 0.5) r.flags.push('Harder than its label')
    if (r.right >= 0.95 && r.q.d !== 'Starter') r.flags.push('Too easy')
    else if (r.q.d === 'Hard' && r.right > 0.85) r.flags.push('Easier than its label')
    const m = levelMedian.get(r.q.lv) || 0
    if (m && r.sec > 2 * m) r.flags.push('Slow')
  }
  return rows.sort((a, b) => b.flags.length - a.flags.length || a.right - b.right)
}
