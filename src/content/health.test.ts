import { describe, expect, it } from 'vitest'
import type { Question, TestRecord } from '../engine/types'
import { questionHealth } from './health'

const q = (id: string, d: string): Question => ({ id, lv: 1, d } as Question)
const test = (answers: [string, boolean, number][]) => ({ answers: answers.map(([qid, ok, sec]) => ({ qid, ok, sec })) } as unknown as TestRecord)

describe('question health', () => {
  const bank = [q('hard', 'Hard'), q('easy', 'Easy'), q('mid', 'Medium'), q('few', 'Medium')]
  const tests = Array.from({ length: 6 }, (_, i) => test([['hard', true, 10], ['easy', i === 0, 10], ['mid', i < 3, 40], ['few', false, 10]]))
  const h = Object.fromEntries(questionHealth(bank, [...tests, test([])]).map(r => [r.q.id, r]))
  it('flags labels that do not match the results', () => {
    expect(h.hard.flags).toContain('Too easy')
    expect(h.easy.flags).toContain('Too hard')
    expect(h.mid.flags).toEqual(['Slow'])
  })
  it('needs enough answers before it flags anything', () => {
    const one = questionHealth(bank, [test([['hard', false, 99]])])
    expect(one[0].flags).toEqual([])
  })
})
