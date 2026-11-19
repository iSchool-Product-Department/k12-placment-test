import { describe, expect, it } from 'vitest'
import bankJson from '../data/bank.json'
import { answer, check, correctAnswer, currentQuestion, DEFAULT_CONFIG, newTest, seeded, simulate } from './engine'
import type { Question, TestRecord } from './types'

const bank = bankJson as Question[]
const byId = new Map(bank.map(q => [q.id, q]))
const WRONG = (q: Question) => (q.t === 'Type answer' ? 'zzz' : q.t === 'Order' ? ['A'] : q.t === 'Sort' || q.t === 'Match' ? {} : 'Z')

/** Plays a test where `plan` says, per step, which answers are right (1) or wrong (0). */
function play(age: number, plan: number[][], seed = 7): TestRecord {
  const rng = seeded(seed)
  let rec = newTest({ name: 't', age, avatar: 'robot', lang: 'en' }, bank, rng)
  let s = 0
  while (rec.step) {
    const step = rec.steps.length
    const i = rec.step.i
    const right = plan[step]?.[i] ?? 0
    const q = currentQuestion(rec, byId)!
    rec = answer(rec, right ? correctAnswer(q) : WRONG(q), 10, bank, DEFAULT_CONFIG, rng)
    if (++s > 20) throw new Error('loop')
  }
  return rec
}
const grade = (r: TestRecord) => r.placement!.grade

describe('answer keys', () => {
  it('every question accepts its own correct answer', () => {
    for (const q of bank) expect(check(q, correctAnswer(q)), q.id).toBe(true)
  })
  it('bank has 61 questions per level with the v2 pool sizes', () => {
    for (let lv = 1; lv <= 6; lv++) {
      const n = (p: string) => bank.filter(q => q.lv === lv && q.pool === p).length
      expect([n('Starter'), n('Logic'), n('Lower grade'), n('Upper grade'), n('Grade task')]).toEqual([5, 10, 20, 20, 6])
    }
  })
})

describe('every possible score (Adaptive Rules tab)', () => {
  it('first scored question is always a Starter', () => {
    for (let age = 6; age <= 18; age++) expect(byId.get(play(age, []).answers[0].qid)!.pool).toBe('Starter')
  })
  it('warm-up 0 or 1 of 3 at Level 1 places Grade 1, Foundation, flagged', () => {
    for (const w of [[0, 0, 0], [1, 0, 0]]) {
      const r = play(6, [w]); expect(grade(r)).toBe(1); expect(r.tier!.tier).toBe('Foundation'); expect(r.flags).toContain('failL1')
    }
  })
  it('warm-up fail above Level 1 goes one level down', () => {
    const r = play(10, [[1, 0, 0], [1, 1, 0], [1, 1, 1, 1]]) // L3 fail, L2 pass, grade check 4/4
    expect(r.steps.map(s => s.name)).toEqual(['warmup', 'warmupDown', 'grade'])
    expect(grade(r)).toBe(4)
  })
  it('fails both warm-ups: lower grade of S-1, Foundation', () => {
    const r = play(10, [[1, 0, 0], [0, 1, 0]]); expect(grade(r)).toBe(3); expect(r.tier!.tier).toBe('Foundation'); expect(r.flags).toContain('failBoth')
  })
  it('knowledge 0 or 1 of 4 places the lower grade of S', () => {
    expect(grade(play(12, [[1, 1, 1], [0, 0, 0, 0]]))).toBe(7)
    expect(grade(play(12, [[1, 1, 1], [1, 0, 0, 0]]))).toBe(7)
  })
  it('knowledge 2 of 4 (easy right, hard wrong) goes to the grade check at S', () => {
    const r = play(12, [[1, 1, 1], [1, 1, 0, 0], [1, 1, 1, 0]])
    expect(r.steps.map(s => s.name)).toEqual(['warmup', 'know', 'grade']); expect(grade(r)).toBe(8)
  })
  it('knowledge 2 of 4 (upper right, lower wrong) takes the same path and flags odd', () => {
    const r = play(12, [[1, 1, 1], [0, 0, 1, 1], [0, 0, 0, 0]])
    expect(r.steps[1].outcome).toBe('knowMid'); expect(grade(r)).toBe(7); expect(r.flags).toContain('odd')
  })
  it('knowledge 3+ goes up; up-check 0-1 => upper grade of S, 2 => lower of S+1, 3+ => grade check', () => {
    expect(grade(play(8, [[1, 1, 1], [1, 1, 1, 0], [1, 0, 0, 0]]))).toBe(4)
    expect(grade(play(8, [[1, 1, 1], [1, 1, 1, 0], [1, 1, 0, 0]]))).toBe(5)
    expect(grade(play(8, [[1, 1, 1], [1, 1, 1, 0], [1, 1, 1, 0], [1, 1, 1, 0]]))).toBe(6)
  })
  it('perfect up-check flags and makes Advanced', () => {
    const r = play(8, [[1, 1, 1], [1, 1, 1, 1], [1, 1, 1, 1], [0, 0, 0, 0]])
    expect(r.flags).toContain('perfectUp'); expect(r.tier!.tier).toBe('Advanced'); expect(grade(r)).toBe(5)
  })
  it('Level 6 with a high knowledge score goes straight to the grade check', () => {
    const r = play(17, [[1, 1, 1], [1, 1, 1, 1], [1, 1, 1, 1]]); expect(r.steps.map(s => s.name)).toEqual(['warmup', 'know', 'grade']); expect(grade(r)).toBe(12)
  })
  it('sheet example: capped by digital basics', () => {
    const r = play(12, [[0, 1, 1], [1, 1, 0, 0], [1, 1, 1, 1]])
    expect(grade(r)).toBe(8); expect(r.tier!.strength).toBe(75); expect(r.tier!.baseTier).toBe('Advanced'); expect(r.tier!.tier).toBe('Core')
  })
  it('sheet example: smart beginner is Core, not Foundation', () => {
    const r = play(10, [[1, 1, 1], [1, 0, 0, 0]]); expect(grade(r)).toBe(5); expect(r.tier!.strength).toBe(50); expect(r.tier!.tier).toBe('Core')
  })
  it('test length is 7 to 15 questions', () => {
    const rng = seeded(3)
    for (let i = 0; i < 400; i++) {
      const r = simulate(1 + rng() * 6, 6 + Math.floor(rng() * 13), bank, DEFAULT_CONFIG, rng)
      expect(r.answers.length).toBeGreaterThanOrEqual(6); expect(r.answers.length).toBeLessThanOrEqual(15)
      expect(new Set(r.answers.map(a => a.qid)).size).toBe(r.answers.length)
    }
  })
})
