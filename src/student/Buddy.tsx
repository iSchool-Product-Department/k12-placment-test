import { motion } from 'motion/react'

/**
 * The buddy (PRD 6.7): one body plus four layers. Stored as a short code, for example "b0-f1-t2-o0-a3".
 * Placeholder shapes in brand colors; a designer swaps the drawings, the code format stays.
 */
export const BODY = ['#056FEC', '#FF7F1C', '#05ACFF', '#12A150', '#043FAD', '#E5B800']
export const PARTS = { b: BODY.length, f: 4, t: 5, o: 4, a: 4 } as const
export type Part = keyof typeof PARTS
type Code = Record<Part, number>

const INK = '#0E2A4D'
export const parse = (s: string): Code => {
  const c: Code = { b: 0, f: 0, t: 0, o: 0, a: 0 }
  for (const m of String(s).matchAll(/([bftoa])(\d+)/g)) c[m[1] as Part] = Math.min(+m[2], PARTS[m[1] as Part] - 1)
  return c
}
export const encode = (c: Code) => (Object.keys(PARTS) as Part[]).map(k => `${k}${c[k]}`).join('-')
export const randomBuddy = (rng: () => number = Math.random) => encode(Object.fromEntries((Object.keys(PARTS) as Part[]).map(k => [k, Math.floor(rng() * PARTS[k])])) as Code)

export function Buddy({ code, size = 120, mood = 'idle' }: { code: string; size?: number; mood?: 'idle' | 'wave' | 'cheer' }) {
  const c = parse(code)
  const body = BODY[c.b]
  const accent = c.b === 1 || c.b === 5 ? '#056FEC' : '#FF7F1C'
  const arm = (side: 1 | -1) => {
    const up = mood === 'cheer'
    const wave = mood === 'wave' && side === 1
    return (
      <motion.g style={{ transformBox: 'view-box', transformOrigin: side === 1 ? '95px 84px' : '25px 84px' }}
        animate={up ? { rotate: side * -150, y: [0, -2, 0] } : wave ? { rotate: [0, -120, -95, -120, -95, 0] } : { rotate: 0 }}
        transition={wave ? { duration: 1.6, delay: 0.3 } : { duration: 0.5 }}>
        <rect x={side === 1 ? 88 : 18} y="78" width="14" height="30" rx="7" fill={body} />
      </motion.g>
    )
  }
  return (
    <motion.svg width={size} height={size * 1.15} viewBox="0 0 120 138" aria-hidden="true"
      animate={mood === 'cheer' ? { y: [0, -8, 0, -5, 0] } : undefined} transition={{ duration: 0.9, delay: 0.2 }}>
      <defs><clipPath id={`bd-${code}`}><rect x="25" y="28" width="70" height="92" rx="35" /></clipPath></defs>
      <>
        <rect x="38" y="112" width="16" height="20" rx="8" fill={body} /><rect x="66" y="112" width="16" height="20" rx="8" fill={body} />
        {arm(-1)}{arm(1)}
      </>
      <rect x="25" y="28" width="70" height="92" rx="35" fill={body} />
      <ellipse cx="60" cy="100" rx="22" ry="16" fill="#fff" opacity=".22" />
      <g clipPath={`url(#bd-${code})`}>{OUTFIT[c.o](accent)}</g>
      {FACE[c.f]}
      {TOP[c.t](accent)}
      {EXTRA[c.a](accent)}
    </motion.svg>
  )
}

const FACE: React.ReactNode[] = [
  <g key="0" fill={INK}><circle cx="49" cy="58" r="4.5" /><circle cx="71" cy="58" r="4.5" /><path d="M50 71q10 8 20 0" stroke={INK} strokeWidth="3.5" fill="none" strokeLinecap="round" /></g>,
  <g key="1" stroke={INK} strokeWidth="3.5" fill="none" strokeLinecap="round"><path d="M44 60q5-6 10 0M66 60q5-6 10 0" /><path d="M50 69q10 12 20 0z" fill={INK} /></g>,
  <g key="2" fill={INK}><circle cx="49" cy="58" r="4.5" /><path d="M66 58h10" stroke={INK} strokeWidth="3.5" strokeLinecap="round" /><path d="M50 71q10 8 20 0" stroke={INK} strokeWidth="3.5" fill="none" strokeLinecap="round" /></g>,
  <g key="3"><circle cx="49" cy="58" r="7" fill="#fff" /><circle cx="71" cy="58" r="7" fill="#fff" /><circle cx="50" cy="59" r="3.5" fill={INK} /><circle cx="72" cy="59" r="3.5" fill={INK} /><circle cx="60" cy="73" r="3.5" fill={INK} /></g>,
]
const TOP: ((a: string) => React.ReactNode)[] = [
  () => null,
  a => <g><path d="M32 44a28 24 0 0 1 56 0z" fill={a} /><rect x="56" y="40" width="40" height="7" rx="3.5" fill={a} /></g>,
  () => <g><path d="M60 28V14" stroke={INK} strokeWidth="3" strokeLinecap="round" /><circle cx="60" cy="12" r="6" fill="#FFD700" /></g>,
  () => <g stroke={INK} strokeWidth="4" fill="none" strokeLinecap="round"><path d="M50 32q2-12 10-14M60 30q1-12 9-12M68 33q4-9 11-8" /></g>,
  a => <g><path d="M28 60a32 32 0 0 1 64 0" stroke={INK} strokeWidth="5" fill="none" /><rect x="20" y="52" width="12" height="20" rx="6" fill={a} /><rect x="88" y="52" width="12" height="20" rx="6" fill={a} /></g>,
]
const OUTFIT: ((a: string) => React.ReactNode)[] = [
  () => null,
  a => <rect x="20" y="84" width="80" height="9" rx="4" fill={a} />,
  () => <g fill="#FFD700"><path d="M60 88l-11-6v12zM60 88l11-6v12z" /><circle cx="60" cy="88" r="3.5" fill={INK} /></g>,
  a => <g><rect x="20" y="90" width="80" height="40" fill={a} /><rect x="48" y="100" width="24" height="12" rx="4" fill="#fff" opacity=".35" /></g>,
]
const EXTRA: ((a: string) => React.ReactNode)[] = [
  () => null,
  () => <g stroke={INK} strokeWidth="3" fill="none"><circle cx="49" cy="58" r="9" /><circle cx="71" cy="58" r="9" /><path d="M58 58h4" /></g>,
  () => <path d="M80 92l2.6 5.4 5.9.8-4.3 4.1 1 5.8-5.2-2.8-5.2 2.8 1-5.8-4.3-4.1 5.9-.8z" fill="#FFD700" stroke={INK} strokeWidth="1.5" />,
  () => <g><rect x="70" y="92" width="20" height="13" rx="3" fill="#fff" /><text x="80" y="102" textAnchor="middle" fontSize="9" fontWeight="800" fill={INK} fontFamily="monospace">{'</>'}</text></g>,
]
