import type { FlagKey, OutcomeKey, StepName, Tier } from '../engine/types'

export const STEP_LABEL: Record<StepName, string> = {
  warmup: 'Warm-up', warmupDown: 'Warm-up one level lower', know: 'Skill check', knowUp: 'Skill check one level higher', grade: 'Final check',
}
export const OUTCOME: Record<OutcomeKey, string> = {
  warmPass: 'Passed the warm-up, so a skill check at this level.',
  warmFailDown: 'Did not pass the warm-up, so a warm-up one level lower.',
  warmFailL1: 'Did not pass the warm-up at Level 1, so Grade 1.',
  downPass: 'Passed the lower warm-up, so a final check at that level.',
  downFail: 'Did not pass either warm-up, so the lower grade of this level.',
  knowLow: 'Low skill check, so the lower grade of this level.',
  knowMid: 'Middle skill check, so a final check at this level.',
  knowUp: 'High skill check, so a skill check one level higher.',
  knowTop: 'High skill check at the top level, so a final check.',
  upLow: 'Low score one level higher, so the upper grade of the age level.',
  upMid: 'Middle score one level higher, so the lower grade of that level.',
  upHigh: 'High score one level higher, so a final check at that level.',
  gradeLower: 'Final check below the mark, so the lower grade.',
  gradeUpper: 'Final check reached the mark, so the upper grade.',
}
export const FLAG: Record<FlagKey, { text: string; tone: 'warn' | 'info' }> = {
  failL1: { text: 'Did not pass the warm-up at Level 1.', tone: 'warn' },
  failBoth: { text: 'Did not pass both warm-ups.', tone: 'warn' },
  perfectUp: { text: 'Got every question right one level up. May belong higher than the one-level limit allows.', tone: 'info' },
  fast: { text: 'Answered 4 or more questions in under 3 seconds. Possible guessing.', tone: 'warn' },
  odd: { text: 'Got hard questions right but easy ones wrong. Worth a look.', tone: 'info' },
  starterMiss: { text: 'Missed a digital literacy starter. Check digital basics in session 1.', tone: 'warn' },
  fallback: { text: 'A step ran out of questions at the asked difficulty and used another from the same pool.', tone: 'info' },
}
/** Tier number, shown after the name: Explorers (Tier 1). */
export const TIER_NO: Record<Tier, number> = { Explorers: 1, Creators: 2, Innovators: 3 }
export const TIER_STYLE: Record<Tier, { bg: string; fg: string; dot: string; blurb: string }> = {
  Explorers: { bg: 'bg-[#FFF1E5]', fg: 'text-orange-deep', dot: '#FF7F1C', blurb: 'Slower pace, more guided practice.' },
  Creators: { bg: 'bg-sky', fg: 'text-deep', dot: '#056FEC', blurb: 'Ready for the grade at the normal pace.' },
  Innovators: { bg: 'bg-[#FFF8CC]', fg: 'text-[#8A6A00]', dot: '#E5B800', blurb: 'Strong for this grade. Give extension challenges.' },
}
export const REASON: Record<string, string> = {
  forcedExplorers: 'Set to Explorers: the warm-up was not passed.',
  perfectUp: 'Set to Innovators: perfect score one level up.',
  capStarter: 'Capped at Creators: missed a digital literacy starter.',
  capFast: 'Capped at Creators: too many very fast answers.',
}
export const mins = (ms: number) => Math.max(1, Math.round(ms / 60000))
export const when = (ts: number) => new Date(ts).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
