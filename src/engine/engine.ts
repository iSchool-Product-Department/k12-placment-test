import type {
  AnswerValue, Config, Diff, Draw, FlagKey, OutcomeKey, Placement, Question, Slot, StepName, StepState,
  Student, TestRecord, Tier, TierResult,
} from './types'

/** Starting values from the Adaptive Rules tab. Change them in the Content view. */
export const DEFAULT_CONFIG: Config = {
  warmPass: 2, knowUp: 3, knowLow: 1, gradeUpper: 3, coreAt: 45, advAt: 75, fastSec: 3, fastCount: 4,
}

export const POINTS: Record<Diff, number> = { Starter: 1, Easy: 1, Medium: 2, Hard: 3 }

/** Which questions each step draws, in order. */
export const STEP_SLOTS: Record<'warmup' | 'know' | 'grade', Slot[]> = {
  warmup: [
    { pool: 'Starter', diffs: ['Starter'] },
    { pool: 'Logic', diffs: ['Medium'] },
    { pool: 'Logic', diffs: ['Hard'] },
  ],
  know: [
    { pool: 'Lower grade', diffs: ['Easy'] },
    { pool: 'Lower grade', diffs: ['Medium'] },
    { pool: 'Upper grade', diffs: ['Medium'] },
    { pool: 'Upper grade', diffs: ['Hard'] },
  ],
  grade: [
    { pool: 'Lower grade', diffs: ['Medium', 'Hard'] },
    { pool: 'Lower grade', diffs: ['Medium', 'Hard'] },
    { pool: 'Lower grade', diffs: ['Medium', 'Hard'] },
    { pool: 'Grade task', diffs: ['Easy', 'Medium', 'Hard'] },
  ],
}
const slotsFor = (n: StepName) => STEP_SLOTS[n === 'warmupDown' ? 'warmup' : n === 'knowUp' ? 'know' : n]

export const startLevel = (age: number) => (age <= 7 ? 1 : age <= 9 ? 2 : age <= 11 ? 3 : age <= 13 ? 4 : age <= 15 ? 5 : 6)
export const gradeOf = (lv: number, which: 'lower' | 'upper') => 2 * lv - (which === 'lower' ? 1 : 0)

export type Rng = () => number
export const seeded = (seed: number): Rng => () => {
  seed = (seed * 1664525 + 1013904223) % 4294967296
  return seed / 4294967296
}

// ---------------------------------------------------------------- drawing questions
function draw(bank: Question[], used: Set<string>, lv: number, slot: Slot, rng: Rng): Draw | null {
  const free = (q: Question) => q.lv === lv && q.pool === slot.pool && !used.has(q.id)
  let c = bank.filter(q => free(q) && slot.diffs.includes(q.d))
  let fallback = false
  if (!c.length) { c = bank.filter(free); fallback = true }
  if (!c.length) return null
  const q = c[Math.floor(rng() * c.length)]
  used.add(q.id)
  return { qid: q.id, candidates: c.length, fallback, slot }
}

function buildStep(rec: TestRecord, name: StepName, lv: number, bank: Question[], rng: Rng): StepState {
  const used = new Set(rec.used)
  const draws = slotsFor(name).map(s => draw(bank, used, lv, s, rng)).filter(Boolean) as Draw[]
  rec.used = [...used]
  return { name, lv, draws, i: 0, right: 0 }
}

export function newTest(student: Student, bank: Question[], rng: Rng = Math.random, id?: string): TestRecord {
  const start = startLevel(student.age)
  const rec: TestRecord = {
    ...student, id: id ?? Math.random().toString(36).slice(2, 10), createdAt: Date.now(), start,
    status: 'in_progress', answers: [], steps: [], flags: [], used: [],
  }
  rec.step = buildStep(rec, 'warmup', start, bank, rng)
  return rec
}

export const currentQuestion = (rec: TestRecord, byId: Map<string, Question>) =>
  rec.step ? byId.get(rec.step.draws[rec.step.i]?.qid) : undefined

// ---------------------------------------------------------------- checking answers
const letters = 'ABCD'
export const keysOf = (q: Question) => [0, 1, 2, 3].filter(i => q.o[i] !== '' && q.o[i] != null)

export function sortBoxes(q: Question): { label: string; keys: string[] }[] {
  return q.a.split('.').map(s => s.trim()).filter(Boolean).map(part => {
    const [label, list] = part.split(':')
    return { label: label.trim(), keys: (list || '').match(/[A-D]/g) || [] }
  })
}

export const matchPairs = (q: Question, lang: 'en' | 'ar' = 'en') =>
  keysOf(q).map(i => {
    const src = (lang === 'ar' && q.oa[i]) || q.o[i]
    const at = src.indexOf('=')
    return { left: src.slice(0, at).trim(), right: src.slice(at + 1).trim() }
  })

const normType = (s: string) => String(s).split(' (')[0].toLowerCase().replace(/\s+/g, '')
  .replace(/[٠-٩]/g, d => String(d.charCodeAt(0) - 1632)).replace(/\.0+$/, '')

export function check(q: Question, ans: AnswerValue | null | undefined): boolean {
  if (ans == null) return false
  switch (q.t) {
    case 'Order': {
      const exp = (q.a.split('(')[0].match(/[A-D]/g) || []).map(k => q.o[letters.indexOf(k)])
      const got = (ans as string[]).map(k => q.o[letters.indexOf(k)])
      return got.length === exp.length && got.every((t, i) => t === exp[i])
    }
    case 'Sort': {
      const a = ans as Record<string, number>
      return sortBoxes(q).every((b, bi) => b.keys.every(k => a[k] === bi)) && Object.keys(a).length === keysOf(q).length
    }
    case 'Match': {
      const a = ans as Record<string, number>
      const n = keysOf(q).length
      return Object.keys(a).length === n && Object.entries(a).every(([l, r]) => +l === r)
    }
    case 'Type answer':
      return normType(ans as string) === normType(q.a)
    default:
      return ans === q.a.trim()[0]
  }
}

// ---------------------------------------------------------------- the adaptive rules
function place(rec: TestRecord, lv: number, which: 'lower' | 'upper'): Placement {
  return { lv, which, grade: gradeOf(lv, which) }
}

function evalStep(rec: TestRecord, cfg: Config, bank: Question[], rng: Rng) {
  const st = rec.step!
  const c = st.right, lv = st.lv
  let outcome: OutcomeKey
  let next: [StepName, number] | null = null
  let placement: Placement | null = null
  switch (st.name) {
    case 'warmup':
      if (c >= cfg.warmPass) { outcome = 'warmPass'; next = ['know', lv] }
      else if (lv === 1) { outcome = 'warmFailL1'; placement = place(rec, 1, 'lower'); rec.flags.push('failL1') }
      else { outcome = 'warmFailDown'; next = ['warmupDown', lv - 1] }
      break
    case 'warmupDown':
      if (c >= cfg.warmPass) { outcome = 'downPass'; next = ['grade', lv] }
      else { outcome = 'downFail'; placement = place(rec, lv, 'lower'); rec.flags.push('failBoth') }
      break
    case 'know':
      if (c <= cfg.knowLow) { outcome = 'knowLow'; placement = place(rec, lv, 'lower') }
      else if (c >= cfg.knowUp) {
        if (lv === 6) { outcome = 'knowTop'; next = ['grade', 6] }
        else { outcome = 'knowUp'; next = ['knowUp', lv + 1] }
      } else { outcome = 'knowMid'; next = ['grade', lv] }
      break
    case 'knowUp':
      if (c === st.draws.length) rec.flags.push('perfectUp')
      if (c >= cfg.knowUp) { outcome = 'upHigh'; next = ['grade', lv] }
      else if (c <= cfg.knowLow) { outcome = 'upLow'; placement = place(rec, lv - 1, 'upper') }
      else { outcome = 'upMid'; placement = place(rec, lv, 'lower') }
      break
    default:
      outcome = c >= cfg.gradeUpper ? 'gradeUpper' : 'gradeLower'
      placement = place(rec, lv, c >= cfg.gradeUpper ? 'upper' : 'lower')
  }
  rec.steps.push({ name: st.name, lv, right: c, total: st.draws.length, outcome })
  if (next) rec.step = buildStep(rec, next[0], next[1], bank, rng)
  else finish(rec, placement!, cfg, bank)
}

function finish(rec: TestRecord, p: Placement, cfg: Config, bank: Question[]) {
  rec.placement = p
  rec.step = undefined
  rec.status = 'done'
  rec.finishedAt = Date.now()
  const byId = new Map(bank.map(q => [q.id, q]))
  const qd = (id: string) => byId.get(id)!
  if (!rec.simulated && rec.answers.filter(a => a.sec < cfg.fastSec).length >= cfg.fastCount) rec.flags.push('fast')
  if (rec.answers.some(a => !a.ok && qd(a.qid).pool === 'Starter')) rec.flags.push('starterMiss')
  const hardRight = rec.answers.some(a => a.ok && qd(a.qid).d === 'Hard')
  const easyWrong = rec.answers.some(a => !a.ok && qd(a.qid).d === 'Easy')
  if (hardRight && easyWrong) rec.flags.push('odd')
  if (rec.answers.some(a => a.fallback)) rec.flags.push('fallback')
  rec.flags = [...new Set(rec.flags)]
  rec.tier = computeTier(rec, cfg, bank)
}

export function computeTier(rec: TestRecord, cfg: Config, bank: Question[]): TierResult {
  const byId = new Map(bank.map(q => [q.id, q]))
  const F = rec.placement!.lv
  const counted = rec.answers.filter(a => a.lv === F)
  const byDiff = { Starter: { right: 0, total: 0 }, Easy: { right: 0, total: 0 }, Medium: { right: 0, total: 0 }, Hard: { right: 0, total: 0 } }
  let earned = 0, possible = 0
  for (const a of counted) {
    const d = byId.get(a.qid)!.d
    possible += POINTS[d]; byDiff[d].total++
    if (a.ok) { earned += POINTS[d]; byDiff[d].right++ }
  }
  const strength = possible ? Math.round((earned / possible) * 100) : 0
  const baseTier: Tier = strength >= cfg.advAt ? 'Advanced' : strength >= cfg.coreAt ? 'Core' : 'Foundation'
  let tier = baseTier
  const reasons: TierResult['reasons'] = []
  const has = (f: FlagKey) => rec.flags.includes(f)
  if (has('failL1') || has('failBoth')) { tier = 'Foundation'; reasons.push('forcedFoundation') }
  else if (has('perfectUp')) { tier = 'Advanced'; reasons.push('perfectUp') }
  if (tier === 'Advanced' && has('starterMiss')) { tier = 'Core'; reasons.push('capStarter') }
  if (tier === 'Advanced' && has('fast')) { tier = 'Core'; reasons.push('capFast') }
  const n = counted.length
  return { tier, baseTier, strength, earned, possible, counted: n, confidence: n >= 7 ? 'High' : n >= 4 ? 'Medium' : 'Low', reasons, byDiff }
}

export function answer(rec0: TestRecord, value: AnswerValue, sec: number, bank: Question[], cfg: Config = DEFAULT_CONFIG, rng: Rng = Math.random): TestRecord {
  const rec: TestRecord = structuredClone(rec0)
  const st = rec.step!
  const d = st.draws[st.i]
  const q = bank.find(x => x.id === d.qid)!
  const ok = check(q, value)
  rec.answers.push({ qid: q.id, step: st.name, stepIndex: rec.steps.length, lv: st.lv, answer: value, ok, sec, candidates: d.candidates, fallback: d.fallback })
  if (ok) st.right++
  st.i++
  if (st.i >= st.draws.length) evalStep(rec, cfg, bank, rng)
  return rec
}

/** Rough progress for the student's progress bar (the test is 7 to 15 questions). */
export function progress(rec: TestRecord) {
  const done = rec.answers.length
  if (!rec.step) return 1
  const left = rec.step.draws.length - rec.step.i
  const after = rec.step.name === 'grade' ? 0 : 4
  return done / (done + left + after)
}

// ---------------------------------------------------------------- simulator
const OFFSET: Record<Diff, number> = { Starter: -1.6, Easy: -0.7, Medium: 0, Hard: 0.7 }
export function simulate(ability: number, age: number, bank: Question[], cfg: Config = DEFAULT_CONFIG, rng: Rng = Math.random, name = 'Simulated student'): TestRecord {
  let rec = newTest({ name, age, avatar: 'robot', lang: 'en' }, bank, rng)
  rec.simulated = true
  const byId = new Map(bank.map(q => [q.id, q]))
  let guard = 0
  while (rec.step && guard++ < 40) {
    const q = currentQuestion(rec, byId)!
    const off = OFFSET[q.d] + (q.pool === 'Logic' ? -0.6 : 0) + (q.pool === 'Upper grade' ? 0.5 : 0) + (q.pool === 'Grade task' ? 0.6 : 0)
    const p = 1 / (1 + Math.exp(-2.2 * (ability - q.lv - off + 0.2)))
    const ok = rng() < p
    rec = answer(rec, ok ? correctAnswer(q) : wrongAnswer(q), Math.round(8 + rng() * 40), bank, cfg, rng)
  }
  return rec
}

export function correctAnswer(q: Question): AnswerValue {
  switch (q.t) {
    case 'Order': return q.a.split('(')[0].match(/[A-D]/g) || []
    case 'Sort': { const v: Record<string, number> = {}; sortBoxes(q).forEach((b, i) => b.keys.forEach(k => (v[k] = i))); return v }
    case 'Match': { const v: Record<string, number> = {}; keysOf(q).forEach(i => (v[i] = i)); return v }
    case 'Type answer': return q.a.split(' (')[0]
    default: return q.a.trim()[0]
  }
}
function wrongAnswer(q: Question): AnswerValue {
  switch (q.t) {
    case 'Order': return [...(correctAnswer(q) as string[])].reverse()
    case 'Sort': { const v = correctAnswer(q) as Record<string, number>; const k = Object.keys(v)[0]; return { ...v, [k]: 1 - v[k] } }
    case 'Match': { const n = keysOf(q).length; const v: Record<string, number> = {}; keysOf(q).forEach(i => (v[i] = (i + 1) % n)); return v }
    case 'Type answer': return 'x'
    default: return letters[(letters.indexOf(q.a.trim()[0]) + 1) % keysOf(q).length]
  }
}
