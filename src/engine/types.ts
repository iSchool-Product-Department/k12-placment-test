export type Pool = 'Starter' | 'Logic' | 'Lower grade' | 'Upper grade' | 'Grade task'
export type Diff = 'Starter' | 'Easy' | 'Medium' | 'Hard'
export type QType = 'Picture MCQ' | 'Text MCQ' | 'Code MCQ' | 'Match' | 'Order' | 'Sort' | 'Type answer'

/** One row of the Question Bank tab in the v2 sheet. */
export interface Question {
  id: string
  old: string
  lv: number
  grade: string
  pool: Pool
  strand: string
  d: Diff
  t: QType
  q: string
  qa: string
  scr: string
  /** Option 1 (index 0) is always the right answer. Order: right order. Match "left = right". Sort "item = box". */
  o: string[]
  oa: string[]
  /** Local picture paths (public/q/), downloaded from the sheet by `npm run bank`. */
  img?: string
  oimg?: string[]
  /** Drawn icon per option (src/question/icons.tsx), from the emoji the sheet uses as stand-in pictures. */
  oicon?: string[]
  why: string
  src: string
}

export type StepName = 'warmup' | 'warmupDown' | 'know' | 'knowUp' | 'grade'

export interface Slot { pool: Pool; diffs: Diff[] }
export interface Draw { qid: string; candidates: number; fallback: boolean; slot: Slot }

export interface StepState { name: StepName; lv: number; draws: Draw[]; i: number; right: number }

/** Letters are sheet option columns (A = option 1, the right one). MCQ 'A'..'D'; Order ['B','A',..]; Sort {A:0,B:1} (box index); Match {0:2,1:0} (left index: right index); Type answer string. */
export type AnswerValue = string | string[] | Record<string, number>

export interface AnswerRec {
  qid: string
  step: StepName
  stepIndex: number
  lv: number
  answer: AnswerValue
  ok: boolean
  sec: number
  candidates: number
  fallback: boolean
}

export type OutcomeKey =
  | 'warmPass' | 'warmFailDown' | 'warmFailL1'
  | 'downPass' | 'downFail'
  | 'knowLow' | 'knowMid' | 'knowUp' | 'knowTop'
  | 'upLow' | 'upMid' | 'upHigh'
  | 'gradeLower' | 'gradeUpper'

export interface StepResult { name: StepName; lv: number; right: number; total: number; outcome: OutcomeKey }

export type FlagKey = 'failL1' | 'failBoth' | 'perfectUp' | 'fast' | 'odd' | 'starterMiss' | 'fallback'
export type Tier = 'Explorers' | 'Creators' | 'Innovators'

export interface Placement { lv: number; which: 'lower' | 'upper'; grade: number }

export interface TierResult {
  tier: Tier
  baseTier: Tier
  strength: number
  earned: number
  possible: number
  counted: number
  confidence: 'High' | 'Medium' | 'Low'
  reasons: ('forcedExplorers' | 'perfectUp' | 'capStarter' | 'capFast')[]
  byDiff: Record<Diff | 'Grade task', { right: number; total: number }>
}

/** code, phone, email come from the iSchool admin record (fake in the demo). avatar is unused (old tests may have one). */
export interface Student { name: string; age: number; avatar?: string; lang: 'en' | 'ar'; code?: string; phone?: string; email?: string }

/** The practice question (PRD 6.2). Wrong or slow: the Listen button stands out. Young student who could not drag: tap mode. */
export interface Practice { ok: boolean; sec: number; readHelp: boolean; tapMode: boolean }

export interface TestRecord extends Student {
  id: string
  createdAt: number
  finishedAt?: number
  start: number
  status: 'in_progress' | 'done' | 'expired'
  practice?: Practice
  step?: StepState
  answers: AnswerRec[]
  steps: StepResult[]
  flags: FlagKey[]
  used: string[]
  placement?: Placement
  tier?: TierResult
  simulated?: boolean
}

export interface Config {
  warmPass: number
  knowUp: number
  knowLow: number
  gradeUpper: number
  coreAt: number
  advAt: number
  fastSec: number
  fastCount: number
}
