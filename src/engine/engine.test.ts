/// <reference types="node" />
import { existsSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import bankJson from '../data/bank.json'
import { answer, check, groupName, isExpired, pointsOf, correctAnswer, currentQuestion, DEFAULT_CONFIG, newTest, seeded, simulate, sortBoxes, splitPair } from './engine'
import type { Question, TestRecord } from './types'
import { blockIndents, codeIndents, isBlockOrder, isCodeOrder } from '../question/codeLines'
import { ICONS } from '../question/icons'
import { SIM_IDS } from '../question/Visual'
import { SCENE_IDS } from '../question/Scene'

const bank = bankJson as Question[]
const byId = new Map(bank.map(q => [q.id, q]))
const WRONG = (q: Question) => (q.t === 'Type answer' ? 'zzz' : q.t === 'Order' ? ['A'] : q.t === 'Sort' || q.t === 'Match' ? {} : 'Z')

/** Plays a test where `plan` says, per step, which answers are right (1) or wrong (0). */
function play(age: number, plan: number[][], seed = 7): TestRecord {
  const rng = seeded(seed)
  let rec = newTest({ name: 't', age, lang: 'en' }, bank, rng)
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
  it('rejects wrong answers (sheet format: option 1 right, order as listed, "=" pairs)', () => {
    for (const q of bank) {
      const keys = q.o.map((o, i) => (o ? 'ABCD'[i] : '')).filter(Boolean)
      if (q.t.endsWith('MCQ')) for (const k of keys.slice(1)) expect(check(q, k), q.id).toBe(false)
      if (q.t === 'Order') expect(check(q, [...keys].reverse()), q.id).toBe(false)
      if (q.t === 'Sort') {
        const v = correctAnswer(q) as Record<string, number>
        expect(check(q, { ...v, A: 1 - v.A }), q.id).toBe(false)
        expect(check(q, { A: v.A }), q.id).toBe(false) // not everything placed
      }
      if (q.t === 'Match') {
        expect(check(q, Object.fromEntries(keys.map((_, i) => [i, (i + 1) % keys.length]))), q.id).toBe(false)
        expect(check(q, { 0: 0 }), q.id).toBe(false)
      }
    }
  })
  it('sort boxes come from "item = box", two per question, in EN and AR', () => {
    for (const q of bank.filter(q => q.t === 'Sort')) {
      expect(sortBoxes(q).length, q.id).toBe(2)
      expect(sortBoxes(q, 'ar').map(b => b.keys)).toEqual(sortBoxes(q).map(b => b.keys))
    }
  })
  it('typed answers ignore spaces, capitals and Arabic digits', () => {
    const q = byId.get('L6-T-03')! // "5, 0, -1"
    for (const a of ['5, 0, -1', '5,0,-1', ' 5 , 0 , -1 ', '٥, ٠, -١']) expect(check(q, a), a).toBe(true)
    expect(check(q, '5, 0, 1')).toBe(false)
    expect(check(byId.get('L1-G1-07')!, 'ROBOT')).toBe(true)
  })
  it('options and pictures line up, and every picture file exists', () => {
    for (const q of bank) {
      const n = q.o.filter(Boolean).length
      expect(q.oa.filter(Boolean).length, q.id).toBe(n)
      if (q.oimg) expect(q.oimg.length, q.id).toBe(n)
      for (const p of [q.img, ...(q.oimg || [])].filter(Boolean)) expect(existsSync(`public/${p}`), p).toBe(true)
      expect([...q.o, ...q.oa].join(' '), q.id).not.toMatch(/\p{Extended_Pictographic}/u)
    }
  })
  it('code order questions get real indentation (PRD 6.5)', () => {
    const ind = (id: string) => codeIndents(byId.get(id)!.o.filter(Boolean))
    expect(ind('L3-T-01')).toEqual([0, 0, 1, 2]) // for / if / print
    expect(ind('L3-T-04')).toEqual([0, 1, 0, 0]) // def body, then back out
    expect(ind('L5-T-01')).toEqual([0, 0, 1, 0]) // addEventListener(() => { ... });
    expect(ind('L5-T-05')).toEqual([0, 1, 1, 0])
    expect(ind('L6-T-01')).toEqual([0, 1, 1, 0])
    expect(ind('L6-T-05')).toEqual([0, 1, 2, 0]) // "} }" closes two
    expect(bank.filter(isCodeOrder).length).toBeGreaterThan(0)
  })
  it('every option has words or a picture, and every icon exists (L2-DL-04 is icons only)', () => {
    for (const q of bank) for (const i of q.o.map((o, i) => (o ? i : -1)).filter(i => i >= 0)) {
      const words = q.t === 'Match' || q.t === 'Sort' ? splitPair(q, i).left : q.o[i]
      expect(words || q.oimg?.[i] || q.oicon?.[i], `${q.id} option ${i + 1}`).toBeTruthy()
      if (q.oicon?.[i]) expect(ICONS[q.oicon[i]], q.oicon[i]).toBeDefined()
    }
    expect(byId.get('L2-DL-04')!.oicon).toEqual(['search', 'sound', 'trash', ''])
    // Whole numbers never show as "2.0" (the sheet export adds it). Allowed only when the code really makes a float.
    for (const q of bank) if (!/\/|float|double/i.test(q.scr)) for (const o of [...q.o, ...q.oa]) expect(o, q.id).not.toMatch(/^-?\d+\.0$/)
    // Icons drawn from card words (ages 6 to 9) are all different, so a Sort never hints with two matching icons.
    expect(byId.get('L1-G1-34')!.oicon).toEqual(['coin', 'star', 'spike', 'flame'])
    for (const q of bank.filter(q => q.oicon && q.t === 'Sort')) expect(new Set(q.oicon!.filter(Boolean)).size, q.id).toBe(q.o.filter(Boolean).length)
  })
  it('block programs nest with the ">" sheet rule or code colons', () => {
    expect(bank.filter(isBlockOrder).map(q => q.id)).toEqual(['L1-T-01', 'L1-T-06', 'L2-T-01', 'L2-T-03', 'L2-T-05', 'L1-G2-28'])
    const ind = (id: string) => blockIndents(byId.get(id)!.o.filter(Boolean))
    expect(ind('L1-T-06')).toEqual([0, 1, 0]) // repeat [ move ] then get nectar
    expect(ind('L1-T-01')).toEqual([0, 0, 0, 0])
    expect(ind('L2-T-01')).toEqual([0, 0, 1, 1]) // when clicked: two blocks inside
    expect(ind('L2-T-05')).toEqual([0, 1, 1, 2])
  })
  it('every stage belongs to a real question, and questions keep the age word limits (sheet Settings)', () => {
    for (const id of SIM_IDS) expect(byId.has(id), id).toBe(true)
    for (const id of SCENE_IDS) expect(byId.has(id), id).toBe(true)
    const limit: Record<number, number> = { 1: 10, 2: 14, 3: 18, 4: 20, 5: 22, 6: 22 }
    for (const q of bank) expect(q.q.split(/\s+/).filter(Boolean).length, q.id).toBeLessThanOrEqual(limit[q.lv])
  })
  it('bank has 100 questions per level with the v2 pool sizes', () => {
    for (let lv = 1; lv <= 6; lv++) {
      const n = (p: string) => bank.filter(q => q.lv === lv && q.pool === p).length
      expect([n('Starter'), n('Logic'), n('Lower grade'), n('Upper grade'), n('Grade task')]).toEqual([8, 16, 34, 33, 9])
    }
  })
})

describe('tiers and resume (PRD 5.5, 6.8)', () => {
  it('a grade task is worth 3 points, and the group name is tier plus grade', () => {
    for (const q of bank.filter(q => q.pool === 'Grade task')) expect(pointsOf(q), q.id).toBe(3)
    expect(pointsOf(bank.find(q => q.pool === 'Lower grade' && q.d === 'Easy')!)).toBe(1)
    const r = play(12, [[1, 1, 1], [1, 1, 0], [1, 1, 1, 1]])
    expect(groupName(r)).toBe(`${r.tier!.tier} G8`)
  })
  it('an unfinished test expires after 24 hours; a finished one never does', () => {
    const r = newTest({ name: 't', age: 9, lang: 'en' }, bank, seeded(1))
    expect(isExpired(r, r.createdAt + 23 * 3600e3)).toBe(false)
    expect(isExpired(r, r.createdAt + 25 * 3600e3)).toBe(true)
    expect(isExpired({ ...r, status: 'done' }, r.createdAt + 99 * 3600e3)).toBe(false)
  })
})

describe('every possible score (Adaptive Rules tab)', () => {
  // Plans list the answers in the order they are shown. A step stops once the rest cannot change the result.
  it('first question is always a Starter, and it does not count toward the warm-up', () => {
    for (let age = 6; age <= 18; age++) expect(byId.get(play(age, []).answers[0].qid)!.pool).toBe('Starter')
    const r = play(10, [[0, 1, 1]]); expect(r.steps[0].outcome).toBe('warmPass'); expect(r.steps[0].total).toBe(2) // 2 right: the third is not needed
  })
  it('one slip in the warm-up is forgiven: a third logic question, pass at 2 of 3', () => {
    const r = play(10, [[1, 0, 1, 1]]); expect(r.steps[0].outcome).toBe('warmPass'); expect(r.steps[0].total).toBe(3)
  })
  it('warm-up 0 or 1 of 3 logic at Level 1 places Grade 1, Explorers, flagged', () => {
    for (const w of [[1, 0, 0], [1, 1, 0, 0], [0, 0, 0]]) {
      const r = play(6, [w]); expect(grade(r)).toBe(1); expect(r.tier!.tier).toBe('Explorers'); expect(r.flags).toContain('failL1')
      expect(r.answers.length).toBe(w.length) // [1, 0, 0]: the third logic question cannot help, so it is not asked
    }
  })
  it('warm-up fail above Level 1 goes one level down', () => {
    const r = play(10, [[1, 0, 0], [1, 1, 1], [1, 1, 1, 1]]) // L3 fail, L2 pass, final check 3 right then the grade task
    expect(r.steps.map(s => s.name)).toEqual(['warmup', 'warmupDown', 'grade'])
    expect(grade(r)).toBe(4); expect(r.answers.length).toBe(10)
  })
  it('fails both warm-ups: lower grade of S-1, Explorers, in 6 questions', () => {
    const r = play(10, [[1, 0, 0], [1, 0, 0]]); expect(grade(r)).toBe(3); expect(r.tier!.tier).toBe('Explorers'); expect(r.flags).toContain('failBoth'); expect(r.answers.length).toBe(6)
  })
  it('grade check 0 or 1 of 3 places the lower grade of S', () => {
    expect(grade(play(12, [[1, 1, 1], [0, 0]]))).toBe(7)
    expect(grade(play(12, [[1, 1, 1], [1, 0, 0]]))).toBe(7)
  })
  it('grade check 2 of 3 goes to the final check at S', () => {
    const r = play(12, [[1, 1, 1], [1, 1, 0], [1, 1, 1, 0]])
    expect(r.steps.map(s => s.name)).toEqual(['warmup', 'know', 'grade']); expect(grade(r)).toBe(8)
  })
  it('grade check 3 of 3 goes up; up-check 0-1 => upper grade of S, 2 => lower of S+1, 3 => final check', () => {
    expect(grade(play(8, [[1, 1, 1], [1, 1, 1], [1, 0, 0]]))).toBe(4)
    expect(grade(play(8, [[1, 1, 1], [1, 1, 1], [1, 1, 0]]))).toBe(5)
    expect(grade(play(8, [[1, 1, 1], [1, 1, 1], [1, 1, 1], [1, 1, 1, 0]]))).toBe(6)
  })
  it('perfect up-check flags and makes Innovators', () => {
    const r = play(8, [[1, 1, 1], [1, 1, 1], [1, 1, 1], [0, 0, 0]])
    expect(r.flags).toContain('perfectUp'); expect(r.tier!.tier).toBe('Innovators'); expect(grade(r)).toBe(5)
  })
  it('Level 6 with a high grade check goes straight to the final check', () => {
    const r = play(17, [[1, 1, 1], [1, 1, 1], [1, 1, 1, 1]]); expect(r.steps.map(s => s.name)).toEqual(['warmup', 'know', 'grade']); expect(grade(r)).toBe(12)
  })
  it('final check: a hard question (other than the grade task) only after every earlier one was right; the grade task is always shown', () => {
    for (let seed = 0; seed < 150; seed++) {
      const r = play(12, [[1, 1, 1], [1, 1, 0], [0, 1, 1, 1]], seed)
      const fin = r.answers.filter(a => a.step === 'grade').map(a => byId.get(a.qid)!)
      // Every grade task in the sheet is Hard, so it has no easier swap; only the other questions are checked.
      expect(fin.slice(1).some(q => q.d === 'Hard' && q.pool !== 'Grade task'), `seed ${seed}`).toBe(false)
      expect(fin.at(-1)!.pool).toBe('Grade task')
    }
    const decided = play(12, [[1, 1, 1], [1, 1, 0], [0, 0, 1]]) // 0 of 2: cannot reach 3, so straight to the grade task
    expect(decided.answers.filter(a => a.step === 'grade').map(a => byId.get(a.qid)!.pool)).toEqual(['Lower grade', 'Lower grade', 'Grade task'])
  })
  it('a hard question right with an easy one wrong flags odd', () => {
    const r = [...Array(300).keys()].map(s => play(12, [[1, 1, 1], [0, 1, 1], [1, 1, 1, 1]], s)).find(r => byId.get(r.answers.find(a => a.step === 'grade')!.qid)!.d === 'Hard')!
    expect(r.flags).toContain('odd')
  })
  it('sheet example: capped by digital basics', () => {
    const r = play(12, [[0, 1, 1], [1, 1, 0], [1, 1, 1, 1]])
    expect(grade(r)).toBe(8); expect(r.tier!.baseTier).toBe('Innovators'); expect(r.tier!.tier).toBe('Creators'); expect(r.tier!.reasons).toContain('capStarter')
  })
  it('sheet example: smart beginner is Creators, not Explorers', () => {
    const r = play(10, [[1, 1, 1], [1, 0, 0]]); expect(grade(r)).toBe(5); expect(r.tier!.strength).toBe(60); expect(r.tier!.tier).toBe('Creators')
  })
  it('test length is 3 to 15; no hard question before the final check; every final check ends on the grade task', () => {
    const rng = seeded(3)
    for (let i = 0; i < 400; i++) {
      const r = simulate(1 + rng() * 6, 6 + Math.floor(rng() * 13), bank, DEFAULT_CONFIG, rng)
      expect(r.answers.length).toBeGreaterThanOrEqual(3); expect(r.answers.length).toBeLessThanOrEqual(15)
      expect(new Set(r.answers.map(a => a.qid)).size).toBe(r.answers.length)
      expect(r.answers.filter(a => a.step !== 'grade' && !a.fallback).some(a => byId.get(a.qid)!.d === 'Hard')).toBe(false)
      if (r.steps.some(s => s.name === 'grade')) expect(byId.get(r.answers.at(-1)!.qid)!.pool).toBe('Grade task')
    }
  })
})
