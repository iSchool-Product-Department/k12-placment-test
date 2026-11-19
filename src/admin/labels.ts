import type { FlagKey, OutcomeKey, StepName, Tier } from '../engine/types'

export const STEP_LABEL: Record<StepName, string> = {
  warmup: 'Warm-up', warmupDown: 'Warm-up, one level down', know: 'Knowledge check', knowUp: 'Knowledge check, one level up', grade: 'Grade check',
}
export const OUTCOME: Record<OutcomeKey, string> = {
  warmPass: 'Passed the warm-up, so a knowledge check at this level.',
  warmFailDown: 'Did not pass the warm-up, so one level down.',
  warmFailL1: 'Did not pass the warm-up at Level 1, so Grade 1.',
  downPass: 'Passed the warm-up one level down, so a grade check at this level.',
  downFail: 'Did not pass either warm-up, so the lower grade of this level.',
  knowLow: 'Low score, so the lower grade of this level.',
  knowMid: 'Middle score, so a grade check at this level.',
  knowUp: 'High score, so a knowledge check one level up.',
  knowTop: 'High score at the top level, so a grade check.',
  upLow: 'Low score one level up, so the upper grade of the starting level.',
  upMid: 'Middle score one level up, so the lower grade of this level.',
  upHigh: 'High score one level up, so a grade check at this level.',
  gradeLower: 'Grade check below the mark, so the lower grade.',
  gradeUpper: 'Grade check reached the mark, so the upper grade.',
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
export const TIER_STYLE: Record<Tier, { bg: string; fg: string; dot: string; blurb: string }> = {
  Foundation: { bg: 'bg-[#FFF1E5]', fg: 'text-orange-deep', dot: '#FF7F1C', blurb: 'Slower pace, more guided practice.' },
  Core: { bg: 'bg-sky', fg: 'text-deep', dot: '#056FEC', blurb: 'Ready for the grade at the normal pace.' },
  Advanced: { bg: 'bg-[#FFF8CC]', fg: 'text-[#8A6A00]', dot: '#E5B800', blurb: 'Strong for this grade. Give extension challenges.' },
}
export const REASON: Record<string, string> = {
  forcedFoundation: 'Set to Foundation because the warm-up was not passed.',
  perfectUp: 'Set to Advanced: perfect score one level up.',
  capStarter: 'Capped at Core: missed a digital literacy starter.',
  capFast: 'Capped at Core: too many very fast answers.',
}
export const mins = (ms: number) => Math.max(1, Math.round(ms / 60000))
export const when = (ts: number) => new Date(ts).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
