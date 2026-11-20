import { describe, expect, it } from 'vitest'
import { BASE, frames } from './GameScene'

const last = (fx: string[], init = {}) => frames({ ...BASE, ...init }, fx).at(-1)!
const jumped = (fx: string[]) => frames({ ...BASE, cast: false }, fx).some(s => s.y < 0)

describe('game scenes act out the answer', () => {
  it('the cat jumps only if the click and the jump were added before the test', () => {
    expect(jumped(['cast', 'flag:click', 'flag:jump', 'test-jump'])).toBe(true)
    expect(jumped(['cast', 'flag:click', 'test-jump', 'flag:jump'])).toBe(false)
    expect(jumped(['flag:click', 'flag:jump', 'test-jump', 'cast'])).toBe(false)
  })
  it('a coin is collected and scored only with a touch event', () => {
    expect(last(['coin', 'place', 'flag:touch', 'flag:score', 'collect'], { score: 0 })).toMatchObject({ coin: 'gone', score: 1 })
    expect(last(['coin', 'place', 'flag:score', 'collect'], { score: 0 })).toMatchObject({ coin: 'on', score: 0 })
  })
  it('the background changes only once it is picked, clicked and switched', () => {
    expect(last(['flag:pick', 'flag:click', 'flag:switch', 'test-bg']).bg).toBe(1)
    expect(last(['flag:pick', 'flag:click', 'test-bg', 'flag:switch']).bg).toBe(0)
  })
})
