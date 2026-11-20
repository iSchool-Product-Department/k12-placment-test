import { useEffect, useRef, useState } from 'react'
import clsx from 'clsx'
import type { Lang } from '../i18n'
import { ICONS } from './icons'
import { SPR } from './Visual'

/* A tiny game screen for game-making questions (ages 6 to 9): a cat, the ground, and maybe a coin, a wall, a score.
   Before Next it shows a still picture of the idea (the cat mid-jump, the coin to collect).
   After Next it acts out the student's answer:
   - Order: rebuilds the game in the student's order, one card at a time. "Test" only works if what it needs came first.
   - MCQ: does what the picked option says.
   It never says right or wrong. A wrong order simply does not work, like a real game. */
type S = {
  cast: boolean; x: number; y: number; coin: 'off' | 'loose' | 'on' | 'gone'; score: number | null; bg: 0 | 1
  wall: boolean; tap: boolean; key: boolean; faded: boolean; shake: boolean; glow: boolean; flags: string[]
}
/** Effects, in the order they play:
 *  cast, coin (loose in a corner), place (coin moves into the level), score0, bg, wall,
 *  flag:<click|jump|touch|start|score> (the part is added; a small chip shows it),
 *  test-jump (tap; jumps only with click and jump added), test-bg (tap; the background changes only with pick, click and switch added), run (walks only with start added),
 *  collect (walks to the coin; takes it with touch added, and scores with score added too),
 *  arrive (walks to the coin), take (coin goes), +1, +5, glow (score pulses),
 *  jump, jump3, walk, tap, key, stop-wall, pass-wall, fade, shake. */
export type GameDef = {
  init?: Partial<S>
  still?: Partial<S> // the picture before Next
  steps?: [RegExp, string[]][] // Order: card text -> effects
  pick?: [RegExp, string[]][] // MCQ: picked option -> effects
  run?: string[] // after Next, whatever was picked
}

export const BASE: S = { cast: true, x: 0.15, y: 0, coin: 'off', score: null, bg: 0, wall: false, tap: false, key: false, faded: false, shake: false, glow: false, flags: [] }
const COIN_X = 0.68, WALL_X = 0.55

/** Turns effects into frames, each a full state. Effects that depend on parts read the state at that moment. */
export function frames(start: S, effects: string[]): S[] {
  let s = { ...start }
  const out: S[] = []
  const push = (p: Partial<S>) => { s = { ...s, shake: false, ...p }; out.push(s) }
  const has = (f: string) => s.flags.includes(f)
  for (const e of effects) {
    if (e === 'cast') push({ cast: true })
    else if (e === 'coin') push({ coin: 'loose' })
    else if (e === 'place') push({ coin: s.coin === 'off' ? 'off' : 'on' })
    else if (e === 'score0') push({ score: 0 })
    else if (e === 'bg') push({ bg: 1 })
    else if (e === 'wall') push({ wall: true })
    else if (e.startsWith('flag:')) push({ flags: [...s.flags, e.slice(5)] })
    else if (e === 'test-jump') {
      push({ tap: true })
      if (s.cast && has('click') && has('jump')) { push({ y: -60 }); push({ y: 0, tap: false }) } else push({ shake: true, tap: false })
    } else if (e === 'test-bg') {
      push({ tap: true })
      push(has('pick') && has('click') && has('switch') ? { bg: 1, tap: false } : { shake: true, tap: false })
    } else if (e === 'run') push(s.cast && has('start') ? { x: 0.8 } : { shake: true })
    else if (e === 'collect') {
      if (!s.cast || s.coin === 'off') { push({ shake: true }); continue }
      push({ x: COIN_X - 0.06 })
      if (s.coin === 'on' && has('touch')) push({ coin: 'gone', score: has('score') && s.score != null ? s.score + 1 : s.score })
      else push({ x: 0.88 })
    } else if (e === 'arrive') push({ x: COIN_X - 0.06 })
    else if (e === 'take') push({ coin: 'gone' })
    else if (e === '+1' || e === '+5') push({ score: (s.score ?? 0) + +e.slice(1), glow: true })
    else if (e === 'glow') { push({ glow: true }); push({ glow: false }) }
    else if (e === 'jump') { push({ y: -60 }); push({ y: 0 }) }
    else if (e === 'jump3') for (let k = 0; k < 3; k++) { push({ y: -60 }); push({ y: 0 }) }
    else if (e === 'walk') push({ x: Math.min(s.x + 0.45, 0.85) })
    else if (e === 'tap') { push({ tap: true }); push({ tap: false }) }
    else if (e === 'key') push({ key: true })
    else if (e === 'stop-wall') { push({ x: WALL_X - 0.12 }); push({ shake: true }) }
    else if (e === 'pass-wall') { push({ x: WALL_X - 0.12 }); push({ x: 0.85 }) }
    else if (e === 'fade') push({ faded: true })
    else if (e === 'shake') push({ shake: true })
  }
  return out
}

const CHIP: Record<string, string> = { click: 'click', jump: 'jump', touch: 'hand', start: 'play', score: 'trophy', pick: 'image', switch: 'palette' }

export function GameScene({ g, lang, choice, play, onDone }: { g: GameDef; lang: Lang; choice: string | string[] | null; play?: boolean; onDone?: () => void }) {
  const start = { ...BASE, ...g.init }
  const [s, setS] = useState<S>({ ...start, ...g.still })
  const done = useRef(onDone)
  done.current = onDone
  useEffect(() => {
    if (!play) { setS({ ...start, ...g.still }); return }
    const list = Array.isArray(choice) ? choice : []
    const pick = typeof choice === 'string' ? choice : ''
    const effects = [
      ...(g.steps ? list.flatMap(c => g.steps!.find(([re]) => re.test(c))?.[1] || []) : []),
      ...(g.pick?.find(([re]) => re.test(pick))?.[1] || []),
      ...(g.run || []),
    ]
    const fs = frames(start, effects)
    const fast = matchMedia('(prefers-reduced-motion: reduce)').matches
    let k = 0, id = 0
    setS(start)
    const tick = () => {
      if (fast) { setS(fs[fs.length - 1] || start); k = fs.length } else setS(fs[k++] || start)
      id = window.setTimeout(k < fs.length ? tick : () => done.current?.(), fast ? 0 : 650)
    }
    id = window.setTimeout(tick, fast ? 0 : 400)
    return () => clearTimeout(id)
  }, [play, JSON.stringify(choice)])

  const W = 360, G = 150, X = (f: number) => 20 + f * (W - 40)
  const Hand = ICONS.hand
  return (
    <div dir="ltr" className="mx-auto w-full max-w-[400px] overflow-hidden rounded-2xl border border-line" aria-hidden="true">
      <svg viewBox={`0 0 ${W} 190`} className="block w-full">
        <rect width={W} height="190" fill={s.bg ? '#FFF6D6' : '#ECF8FF'} style={{ transition: 'fill .5s' }} />
        {s.bg === 1 && <circle cx={W - 50} cy="42" r="20" fill="#FFD700" />}
        <rect y={G} width={W} height="40" fill="#E8F5E9" /><path d={`M0 ${G} H${W}`} stroke="#C5E1A5" strokeWidth="3" />
        <g style={{ opacity: s.faded ? 0.12 : 1, transition: 'opacity .6s' }}>
          {s.wall && <g transform={`translate(${X(WALL_X)}, ${G - 38})`} dangerouslySetInnerHTML={{ __html: SPR.wall }} />}
          {s.coin !== 'off' && (
            <g style={{ transform: s.coin === 'loose' ? 'translate(40px, 40px) scale(.8)' : `translate(${X(COIN_X)}px, ${G - 22}px)`, opacity: s.coin === 'gone' ? 0 : s.coin === 'loose' ? 0.6 : 1, transition: 'transform .6s ease, opacity .4s' }}>
              <circle r="13" fill="#FFD700" stroke="#E0A800" strokeWidth="3" /><path d="M0 -6 v12" stroke="#E0A800" strokeWidth="3" strokeLinecap="round" />
            </g>
          )}
          {s.cast && (
            <g style={{ transform: `translate(${X(s.x)}px, ${G - 22 + s.y}px)`, transition: 'transform .55s cubic-bezier(.22,1,.36,1)' }}>
              <g className={clsx(s.shake && 'shake')} dangerouslySetInnerHTML={{ __html: SPR.cat }} />
              {s.y < 0 && <path d="M-14 34 v10 M0 36 v12 M14 34 v10" stroke="#5B7599" strokeWidth="2.5" strokeLinecap="round" />}
              {s.tap && <Hand x={6} y={4} size={30} color="#0E2A4D" strokeWidth={2} />}
            </g>
          )}
          {s.score != null && (
            <text x={W - 14} y="30" textAnchor="end" fontSize="20" fontWeight="800" fill={s.glow ? '#FF7F1C' : '#0E2A4D'} style={{ transition: 'fill .3s' }}>
              {lang === 'ar' ? `النقاط: ${s.score}` : `Score: ${s.score}`}
            </text>
          )}
          {g.init && 'key' in g.init && (
            <g transform={`translate(18, ${G + 6})`}>
              <rect width="34" height="28" rx="6" fill={s.key ? '#056FEC' : '#fff'} stroke="#0E2A4D" strokeWidth="2" style={{ transition: 'fill .3s' }} />
              <text x="17" y="20" textAnchor="middle" fontSize="16" fontWeight="800" fill={s.key ? '#fff' : '#0E2A4D'}>→</text>
            </g>
          )}
        </g>
        <g transform="translate(10, 10)">
          {s.flags.filter(f => CHIP[f]).map((f, i) => {
            const I = ICONS[CHIP[f]]
            return <g key={f} transform={`translate(${i * 34}, 0)`}><rect width="30" height="30" rx="8" fill="#fff" stroke="#056FEC" strokeWidth="2" /><I x={5} y={5} size={20} color="#056FEC" strokeWidth={2} /></g>
          })}
        </g>
      </svg>
    </div>
  )
}
