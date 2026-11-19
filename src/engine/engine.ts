import type {
  AnswerValue, Config, Diff, Draw, FlagKey, OutcomeKey, Placement, Question, Slot, StepName, StepState,
  Student, TestRecord, Tier, TierResult,
} from './types'

/** Starting values from the Adaptive Rules tab. Change them in the Content view. */
export const DEFAULT_CONFIG: Config = {
  warmPass: 2, knowUp: 3, knowLow: 1, gradeUpper: 3, coreAt: 45, advAt: 75, fastSec: 3, fastCount: 4,
}

export const POINTS: Record<Diff | 'Grade task', number> = { Starter: 1, Easy: 1, Medium: 2, Hard: 3, 'Grade task': 3 }
/** PRD 5.5: a grade task is worth 3 whatever its difficulty. */
export const pointsOf = (q: Question) => POINTS[q.pool === 'Grade task' ? 'Grade task' : q.d]
export const groupName = (rec: TestRecord) => (rec.tier && rec.placement ? `${rec.tier.tier} G${rec.placement.grade}` : '')

/** PRD 6.8: an unfinished test can be continued for 24 hours, then it expires. */
export const RESUME_MS = 24 * 3600e3
export const isExpired = (rec: TestRecord, now = Date.now()) => rec.status === 'in_progress' && now - rec.createdAt > RESUME_MS

/**
 * Which questions each step draws, in order. No hard question in the warm-up or skill check:
 * a student could only earn it by getting everything before it right, and by then the step is decided.
 * The starter is for confidence and does not count toward the warm-up, so one slip on it changes nothing.
 */
export const STEP_SLOTS: Record<'warmup' | 'know' | 'grade', Slot[]> = {
  warmup: [
    { pool: 'Starter', diffs: ['Starter'] },
    { pool: 'Logic', diffs: ['Medium'] },
    { pool: 'Logic', diffs: ['Medium'] },
  ],
  know: [
    { pool: 'Lower grade', diffs: ['Easy'] },
    { pool: 'Lower grade', diffs: ['Medium'] },
    { pool: 'Upper grade', diffs: ['Medium'] },
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
  student = { code: `STA-ISCHOOL-S-${100 + Math.floor(rng() * 900)}`, ...student }
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

/** Splits a "left = right" option (Match) or "item = box" option (Sort). */
export function splitPair(q: Question, i: number, lang: 'en' | 'ar' = 'en') {
  const src = (lang === 'ar' && q.oa[i]) || q.o[i]
  const at = src.indexOf('=')
  return { left: src.slice(0, at).trim(), right: src.slice(at + 1).trim() }
}

export const matchPairs = (q: Question, lang: 'en' | 'ar' = 'en') => keysOf(q).map(i => splitPair(q, i, lang))

/** Sort boxes in the order they first appear in the options. Box identity comes from the English text. */
export function sortBoxes(q: Question, lang: 'en' | 'ar' = 'en'): { label: string; keys: string[] }[] {
  const boxes: { id: string; label: string; keys: string[] }[] = []
  for (const i of keysOf(q)) {
    const id = splitPair(q, i).right
    let b = boxes.find(x => x.id === id)
    if (!b) boxes.push(b = { id, label: splitPair(q, i, lang).right, keys: [] })
    b.keys.push(letters[i])
  }
  return boxes
}

const normType = (s: string) => String(s).split(' (')[0].toLowerCase().replace(/\s+/g, '')
  .replace(/[٠-٩]/g, d => String(d.charCodeAt(0) - 1632)).replace(/\.0+$/, '')

export function check(q: Question, ans: AnswerValue | null | undefined): boolean {
  if (ans == null) return false
  switch (q.t) {
    case 'Order': {
      // Compare texts, not letters, so two options with the same text can swap places.
      const exp = keysOf(q).map(i => q.o[i])
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
      return [q.o[0], q.oa[0]].some(a => a && normType(ans as string) === normType(a))
    default:
      return ans === 'A'
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
  rec.steps.push({ name: st.name, lv, right: c, total: st.draws.filter(d => d.slot.pool !== 'Starter').length, outcome })
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
  const byDiff = { Starter: { right: 0, total: 0 }, Easy: { right: 0, total: 0 }, Medium: { right: 0, total: 0 }, Hard: { right: 0, total: 0 }, 'Grade task': { right: 0, total: 0 } }
  let earned = 0, possible = 0
  for (const a of counted) {
    const q = byId.get(a.qid)!, d = q.pool === 'Grade task' ? 'Grade task' : q.d, pts = pointsOf(q)
    possible += pts; byDiff[d].total++
    if (a.ok) { earned += pts; byDiff[d].right++ }
  }
  const strength = possible ? Math.round((earned / possible) * 100) : 0
  const baseTier: Tier = strength >= cfg.advAt ? 'Innovators' : strength >= cfg.coreAt ? 'Creators' : 'Explorers'
  let tier = baseTier
  const reasons: TierResult['reasons'] = []
  const has = (f: FlagKey) => rec.flags.includes(f)
  if (has('failL1') || has('failBoth')) { tier = 'Explorers'; reasons.push('forcedExplorers') }
  else if (has('perfectUp')) { tier = 'Innovators'; reasons.push('perfectUp') }
  if (tier === 'Innovators' && has('starterMiss')) { tier = 'Creators'; reasons.push('capStarter') }
  if (tier === 'Innovators' && has('fast')) { tier = 'Creators'; reasons.push('capFast') }
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
  if (ok && q.pool !== 'Starter') st.right++
  st.i++
  stopIfDecided(st, cfg)
  if (st.i >= st.draws.length) evalStep(rec, cfg, bank, rng)
  else earnHard(rec, bank, rng)
  return rec
}

/** Scores where a step's result changes. A step stops once the questions left cannot cross one (the grade task is always shown). */
const cutsOf = (n: StepName, c: Config) => (n === 'grade' ? [c.gradeUpper] : n === 'warmup' || n === 'warmupDown' ? [c.warmPass] : [c.knowLow + 1, c.knowUp])
function stopIfDecided(st: StepState, cfg: Config) {
  const left = st.draws.length - st.i
  if (left && !cutsOf(st.name, cfg).some(c => st.right < c && st.right + left >= c))
    st.draws = [...st.draws.slice(0, st.i), ...st.draws.slice(st.i).filter(d => d.slot.pool === 'Grade task')]
}
/** A hard question only after every earlier question in the step was right; otherwise the slot's medium or easy. */
function earnHard(rec: TestRecord, bank: Question[], rng: Rng) {
  const st = rec.step!, d = st.draws[st.i]
  const easier = d.slot.diffs.filter(x => x !== 'Hard')
  if (st.right === st.i || !easier.length || bank.find(q => q.id === d.qid)!.d !== 'Hard') return
  const used = new Set(rec.used)
  const n = draw(bank, used, st.lv, { ...d.slot, diffs: easier }, rng)
  if (n && !n.fallback) { st.draws[st.i] = n; rec.used = [...used] }
}

/** "Question 3 of about 10" (PRD 6.3): answered, plus what is left in this step, plus one more step unless this is the last. */
export function aboutTotal(rec: TestRecord) {
  const done = rec.answers.length
  if (!rec.step) return done
  return done + rec.step.draws.length - rec.step.i + (rec.step.name === 'grade' ? 0 : 3)
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
    case 'Order': return keysOf(q).map(i => letters[i])
    case 'Sort': { const v: Record<string, number> = {}; sortBoxes(q).forEach((b, i) => b.keys.forEach(k => (v[k] = i))); return v }
    case 'Match': { const v: Record<string, number> = {}; keysOf(q).forEach(i => (v[i] = i)); return v }
    case 'Type answer': return q.o[0]
    default: return 'A'
  }
}
function wrongAnswer(q: Question): AnswerValue {
  switch (q.t) {
    case 'Order': return [...(correctAnswer(q) as string[])].reverse()
    case 'Sort': { const v = correctAnswer(q) as Record<string, number>; const k = Object.keys(v)[0]; return { ...v, [k]: 1 - v[k] } }
    case 'Match': { const n = keysOf(q).length; const v: Record<string, number> = {}; keysOf(q).forEach(i => (v[i] = (i + 1) % n)); return v }
    case 'Type answer': return 'x'
    default: return 'B'
  }
}
