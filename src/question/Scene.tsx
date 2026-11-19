import { useEffect, useRef, useState } from 'react'
import { ArrowRight, Bot } from 'lucide-react'
import clsx from 'clsx'
import type { Question } from '../engine/types'
import type { Lang } from '../i18n'
import { ICONS } from './icons'

/* Small drawn scenes for questions that were words only (ages 6 to 9), keyed by question ID like the stages.
   Like a stage, a scene stays still while the student answers (it may mark their pick), and once Next locks
   the answer it plays, then the test moves on. A scene must never show the answer before Next: check it
   again whenever its question changes in the sheet. Words are [English, Arabic]. */
type W = [string, string]
type Tone = 'blue' | 'orange' | 'gold' | 'soft'
type Tile = { i?: string; n?: number; t?: W | string; tone?: Tone; faint?: boolean }
type Item = Tile | '→'
type Part = { k: 'title' | 'label' | 'button' | 'input' | 'image' | 'sprite'; t?: W | string; hidden?: boolean }
type SceneDef =
  | { row: Item[] } // plays: each tile lights up in turn
  | { still: Item[] } // never plays
  | { add: [string, number, number] } // plays: the two groups join
  | { week: number } // marks the picked day; plays: a dot hops this many days from Monday
  | { chat: { me?: boolean; t: W }[]; reply?: W } // plays: the bot types its reply
  | { screens: Part[][]; play?: 'tap' | 'score' | 'front' | 'go' | 'build' }
  | { xy: [number, number] } // plays: the car drives the way the student picked

const kid = (en: string, ar: string, tone?: Tone): Tile => ({ i: 'user', t: [en, ar], tone })
const who: Tile = { i: 'user', t: '?', tone: 'soft' }

const SCENE: Record<string, SceneDef> = {
  // Counting and logic
  'L1-G1-23': { add: ['star', 4, 2] },
  'L2-LG-04': { week: 3 },
  'L2-LG-07': { still: [kid('Omar', 'عمر', 'orange'), who, who] },
  'L2-LG-01': { still: [kid('Mona', 'منى'), kid('Ali', 'علي'), kid('Sami', 'سامي')] }, // same height on purpose: the words decide
  'L1-G2-24': { row: [{ i: 'apple', n: 3, tone: 'orange', t: ['Learned', 'تعلّم'] }, '→', { i: 'brain' }] },
  // App screens
  'L2-G3-01': { screens: [[{ k: 'title', t: ['My app', 'تطبيقي'] }, { k: 'button', t: ['Start', 'ابدأ'] }]], play: 'tap' },
  'L2-G3-09': { screens: [[{ k: 'title', t: ['Home', 'الرئيسية'] }, { k: 'button', t: ['Play', 'العب'] }], [{ k: 'title', t: ['Game', 'اللعبة'] }, { k: 'sprite' }]], play: 'go' },
  'L2-G3-12': { screens: [[{ k: 'label', t: ['Hello!', 'مرحبًا!'] }, { k: 'input', t: ['Your name', 'اسمك'] }, { k: 'button', t: ['Go', 'هيا'] }]] },
  'L2-G3-21': { screens: [[{ k: 'label', t: ['Score: #', 'النقاط: #'] }, { k: 'sprite' }, { k: 'button', t: ['Start', 'ابدأ'] }]], play: 'score' },
  'L2-G3-23': { screens: [[{ k: 'title', t: ['Level 1', 'المرحلة 1'] }, { k: 'image', hidden: true }]], play: 'front' },
  'L2-G3-25': { screens: [[{ k: 'label', t: ['Score: 0', 'النقاط: 0'] }, { k: 'image' }, { k: 'input', t: ['Your name', 'اسمك'] }, { k: 'button', t: ['Submit', 'إرسال'] }]] },
  'L2-G3-28': { screens: [[{ k: 'title', t: ['Welcome!', 'أهلًا بك!'] }, { k: 'button', t: ['Start', 'ابدأ'] }]], play: 'build' },
  'L2-G3-19': { xy: [100, 200] },
  // AI
  'L2-G4-02': { row: [{ i: 'book', t: ['Story', 'قصة'] }, '→', { i: 'phone' }, '→', { i: 'sound', tone: 'orange' }] },
  'L2-G4-03': { row: [{ i: 'bottle', n: 3, t: ['Bottle photos', 'صور زجاجات'] }, '→', { i: 'brain' }] },
  'L2-G4-06': { row: [{ i: 'cat', tone: 'orange' }, '→', { i: 'brain', t: '?' }] },
  'L2-G4-08': { row: [{ i: 'face' }, '→', { i: 'phone' }, '→', { t: ['This is Sara', 'هذه سارة'], tone: 'orange' }] },
  'L2-G4-10': { row: [{ i: 'image', t: ['Sign photo', 'صورة لافتة'] }, '→', { i: 'phone' }, '→', { i: 'file', t: ['Words', 'كلمات'], tone: 'orange' }] },
  'L2-G4-15': { chat: [{ me: true, t: ['Two burgers, please', 'برغران من فضلك'] }], reply: ['Two burgers coming up!', 'برغران في الطريق!'] },
  'L2-G4-09': { chat: [{ me: true, t: ['You are a teacher. Explain fractions.', 'أنت معلّم. اشرح الكسور.'] }], reply: ['Okay class! A fraction is a part of a whole.', 'حسنًا يا طلاب! الكسر جزء من كل.'] },
  'L2-G4-16': { chat: [{ t: ['Giraffes live near the Pyramids.', 'الزرافات تعيش قرب الأهرامات.'] }] },
  'L2-G4-22': { chat: [{ me: true, t: ['A good book about space?', 'كتاب جيد عن الفضاء؟'] }, { t: ['Read "Moon Cats" by Sam Lee.', 'اقرأ «قطط القمر» لسام لي.'] }] },
  'L2-G4-18': { still: [{ i: 'image', t: ['Pizza Plase', 'بيتزا بلاس'], tone: 'orange' }] },
  'L2-G4-20': { row: [{ i: 'sun', tone: 'gold', t: ['Works', 'ينجح'] }, { i: 'moon', tone: 'soft', t: ['Fails', 'يفشل'] }] },
  'L2-G4-21': { row: [{ i: 'file', t: ['Recipe', 'وصفة'] }, '→', { i: 'phone' }, '→', { i: 'sound', tone: 'orange' }] },
  'L2-G4-24': { row: [{ i: 'voice', tone: 'soft', faint: true, t: ['Quiet voice', 'صوت هادئ'] }, '→', { i: 'mic' }, '→', { t: '?', tone: 'orange' }] },
}

export const SCENE_IDS = Object.keys(SCENE)
export const hasScene = (q: Question) => !!SCENE[q.id]
/** True when the scene plays after Next, so the test waits for it like a stage. */
export const scenePlays = (q: Question) => {
  const s = SCENE[q.id]
  return !!s && ('row' in s || 'add' in s || 'week' in s || 'xy' in s || ('chat' in s && !!s.reply) || ('screens' in s && !!s.play))
}

const say = (t: W | string | undefined, lang: Lang) => (Array.isArray(t) ? t[lang === 'ar' ? 1 : 0] : t)
const TONE: Record<Tone, string> = { blue: 'text-blue', orange: 'text-orange', gold: 'text-gold', soft: 'text-soft' }
const box = 'mx-auto flex w-fit max-w-full flex-wrap items-center justify-center gap-2 rounded-2xl bg-mist p-3'
const mark = 'outline-3 outline-dashed outline-offset-2 outline-orange'
const lit = 'border-blue! bg-sky! scale-105'

/** Counts 1..n, one step every `ms`, once `play` turns on; then calls onDone. Reduced motion jumps to the end. */
function useSteps(play: boolean | undefined, n: number, ms: number, onDone?: () => void) {
  const [step, setStep] = useState(0)
  const done = useRef(onDone)
  done.current = onDone
  useEffect(() => {
    if (!play) { setStep(0); return }
    const fast = matchMedia('(prefers-reduced-motion: reduce)').matches
    let k = 0, id = 0
    const tick = () => { k = fast ? n : k + 1; setStep(k); id = window.setTimeout(k < n ? tick : () => done.current?.(), fast ? 0 : ms) }
    id = window.setTimeout(tick, fast ? 0 : 300)
    return () => clearTimeout(id)
  }, [play, n, ms])
  return step
}

function TileView({ tile, lang, on }: { tile: Tile; lang: Lang; on?: boolean }) {
  const I = tile.i ? ICONS[tile.i] : null
  const tone = TONE[tile.tone || 'blue']
  return (
    <div className={clsx('flex min-w-[64px] flex-col items-center gap-1 rounded-2xl border-2 border-line bg-white px-3 py-2.5 transition-all duration-300', on && lit)}>
      {I && <div className={clsx('flex max-w-[180px] flex-wrap justify-center gap-0.5', tone, tile.faint && 'opacity-40')}>{Array.from({ length: tile.n || 1 }, (_, k) => <I key={k} size={tile.n && tile.n > 1 ? 30 : 40} strokeWidth={1.75} fill={tile.tone === 'gold' ? 'currentColor' : 'none'} />)}</div>}
      {tile.t && <span className={clsx('text-center font-extrabold', I ? 'text-sm text-ink' : clsx('text-xl', tile.tone ? tone : 'text-ink'))}>{say(tile.t, lang)}</span>}
    </div>
  )
}
const Arrow = () => <ArrowRight size={22} className="shrink-0 text-soft rtl:-scale-x-100" aria-hidden="true" />

type Props = { q: Question; lang: Lang; choice: string | string[] | null; play?: boolean; onDone?: () => void }

function Row({ items, lang, play, onDone }: { items: Item[]; lang: Lang; play?: boolean; onDone?: () => void }) {
  const tiles = items.filter(x => x !== '→').length
  const step = useSteps(play, tiles, 650, onDone)
  let k = 0
  return <div className={box} aria-hidden="true">{items.map((x, i) => x === '→' ? <Arrow key={i} /> : <TileView key={i} tile={x} lang={lang} on={++k <= step} />)}</div>
}

function Add({ s: [icon, a, b], lang, play, onDone }: { s: [string, number, number]; lang: Lang; play?: boolean; onDone?: () => void }) {
  const joined = useSteps(play, 1, 1200, onDone) > 0
  const tile = (n: number) => <TileView tile={{ i: icon, n, tone: 'gold' }} lang={lang} />
  return <div className={box} aria-hidden="true">{joined ? tile(a + b) : <>{tile(a)}<b className="text-2xl text-deep">+</b>{tile(b)}<b className="text-2xl text-deep">=</b><TileView tile={{ t: '?', tone: 'orange' }} lang={lang} /></>}</div>
}

const DAYS: [string, string][] = [['Monday', 'اثنين'], ['Tuesday', 'ثلاثاء'], ['Wednesday', 'أربعاء'], ['Thursday', 'خميس'], ['Friday', 'جمعة'], ['Saturday', 'سبت'], ['Sunday', 'أحد']]
function Week({ hops, lang, choice, play, onDone }: { hops: number; lang: Lang; choice: Props['choice']; play?: boolean; onDone?: () => void }) {
  const step = useSteps(play, hops, 650, onDone)
  const picked = DAYS.findIndex(([en]) => typeof choice === 'string' && choice.startsWith(en))
  return (
    <div className={box} aria-hidden="true">
      {DAYS.map(([en, ar], i) => (
        <div key={en} className={clsx('relative flex min-w-[52px] flex-col items-center rounded-xl border-2 border-line bg-white px-2 pb-4 pt-2 font-extrabold', i === 0 ? 'text-orange' : 'text-ink', i === picked && mark)}>
          {lang === 'ar' ? ar : en.slice(0, 3)}
          {i === (play ? step : 0) && <span className="absolute bottom-1 h-2.5 w-2.5 rounded-full bg-orange" />}
        </div>
      ))}
    </div>
  )
}

function Chat({ s, lang, play, onDone }: { s: Extract<SceneDef, { chat: unknown }>; lang: Lang; play?: boolean; onDone?: () => void }) {
  const step = useSteps(play && !!s.reply, 2, 900, onDone)
  const bot = (t: React.ReactNode, k: number) => <span key={k} className="flex max-w-[90%] items-end gap-2 self-start"><Bot size={26} className="shrink-0 text-blue" /><span className="rounded-2xl rounded-es-sm border border-line bg-white px-3.5 py-2 font-bold text-ink">{t}</span></span>
  return (
    <div className="mx-auto flex w-full max-w-[360px] flex-col gap-2 rounded-2xl bg-mist p-3" aria-hidden="true">
      {s.chat.map((m, i) => m.me ? <span key={i} className="max-w-[85%] self-end rounded-2xl rounded-ee-sm bg-blue px-3.5 py-2 font-bold text-white">{say(m.t, lang)}</span> : bot(say(m.t, lang), i))}
      {step === 1 && bot(<span className="tracking-[.3em] text-soft">...</span>, 98)}
      {step === 2 && bot(say(s.reply, lang), 99)}
    </div>
  )
}

/** App screens. Each `play` kind is one small story told after Next. */
function Screens({ s, lang, choice, play, onDone }: { s: Extract<SceneDef, { screens: unknown }>; lang: Lang; choice: Props['choice']; play?: boolean; onDone?: () => void }) {
  const pick = typeof choice === 'string' ? choice : ''
  const order = Array.isArray(choice) ? choice : []
  const n = s.play === 'score' ? 3 : s.play === 'go' ? 2 : s.play === 'build' ? Math.max(order.length, 1) : 1
  const step = useSteps(!!(s.play && play), n, s.play === 'build' ? 800 : 700, onDone)
  // build: the screen comes together in the student's order of steps.
  const built = (re: RegExp) => s.play !== 'build' || !play || order.slice(0, step).some(x => re.test(x))
  const frameOn = built(/create a screen/i)
  const Sprite = ICONS.sprite, Pic = ICONS.image, Tap = ICONS.hand
  const screen = (parts: Part[], si: number) => {
    const goLit = s.play === 'go' && step === 2 && /setScreen/.test(pick)
    return (
      <div key={si} className={clsx('relative flex h-[200px] w-[130px] flex-col items-center gap-2 rounded-[22px] border-4 bg-white p-2.5 pt-4 transition-all duration-300',
        frameOn ? 'border-deep' : 'border-dashed border-line', si === 1 && goLit && 'scale-105 border-blue!', si === 0 && goLit && 'opacity-50',
        /background/i.test(pick) && mark)}>
        {parts.map((p, i) => {
          const t = say(p.t, lang)?.replace('#', String(7 + (s.play === 'score' ? step : 0)))
          const marked = new RegExp(`^${p.k}$`, 'i').test(pick) && mark
          if (p.k === 'title') return built(/title/i) && <b key={i} className="text-base text-deep">{t}</b>
          if (p.k === 'label') return <span key={i} className={clsx('rounded px-1 text-sm font-bold text-ink', marked)}>{t}</span>
          if (p.k === 'button') {
            const tapped = (s.play === 'tap' || s.play === 'go') && step >= 1 || s.play === 'build' && play && order.slice(0, step).some(x => /test/i.test(x))
            return built(/start button/i) && <span key={i} className={clsx('relative rounded-full bg-orange px-4 py-1 text-sm font-extrabold text-white transition-transform', marked, tapped && 'scale-90')}>
              {t}{tapped && <Tap size={26} className="absolute -bottom-5 -end-4 text-deep" strokeWidth={2} />}</span>
          }
          if (p.k === 'input') return <span key={i} className="w-full rounded-lg border-2 border-line px-2 py-1 text-xs text-soft">{t}</span>
          if (p.k === 'sprite') return <Sprite key={i} size={40} className="text-blue" strokeWidth={1.75} />
          // A hidden sprite peeks out behind the picture. "front" brings it forward, if that was the pick.
          const front = p.hidden && step > 0 && /front/i.test(pick)
          return (
            <span key={i} className="relative grid w-full flex-1 place-items-center rounded-lg bg-sky text-blue">
              <Pic size={36} strokeWidth={1.75} className={clsx('transition-opacity', front && 'opacity-30')} />
              {p.hidden && <Sprite size={front ? 44 : 26} strokeWidth={1.75} className={clsx('absolute transition-all duration-500', front ? 'text-blue' : '-bottom-1 end-1 text-soft opacity-40')} />}
            </span>
          )
        })}
      </div>
    )
  }
  return <div className={box} aria-hidden="true">{s.screens.map((p, i) => <div key={i} className="contents">{i > 0 && <Arrow />}{screen(p, i)}</div>)}</div>
}

const DRIVE: Record<string, [number, number]> = { Up: [0, -45], Down: [0, 20], Left: [-60, 0], Right: [50, 0] }
/** An app screen with its x and y arrows and the car's start point. After Next the car drives the picked way. */
function XY({ at: [x, y], choice, play, onDone }: { at: [number, number]; choice: Props['choice']; play?: boolean; onDone?: () => void }) {
  const moved = useSteps(play, 1, 1100, onDone) > 0
  const [dx, dy] = (moved && typeof choice === 'string' && DRIVE[choice]) || [0, 0]
  const Car = ICONS.car
  return (
    <div dir="ltr" className="mx-auto w-fit rounded-2xl bg-mist p-3" aria-hidden="true">
      <svg viewBox="0 0 220 180" className="block h-[180px] w-[220px]">
        <rect x="20" y="20" width="190" height="150" rx="10" fill="#fff" stroke="#0E2A4D" strokeWidth="3" />
        <path d="M20 12 h70 m-8 -5 l8 5 l-8 5" fill="none" stroke="#FF7F1C" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        <text x="98" y="17" fontSize="14" fontWeight="800" fill="#FF7F1C">x</text>
        <path d="M12 20 v60 m-5 -8 l5 8 l5 -8" fill="none" stroke="#FF7F1C" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        <text x="7" y="98" fontSize="14" fontWeight="800" fill="#FF7F1C">y</text>
        <text x="26" y="36" fontSize="11" fontWeight="700" fill="#5B7599">(0, 0)</text>
        <g style={{ transform: `translate(${dx}px, ${dy}px)`, transition: 'transform 1s ease' }}><Car x={96} y={104} size={40} color="#056FEC" strokeWidth={1.75} /></g>
        <text x="116" y="160" textAnchor="middle" fontSize="13" fontWeight="800" fill="#0E2A4D">({x}, {y})</text>
      </svg>
    </div>
  )
}

export function Scene({ q, lang, choice, play, onDone }: Props) {
  const s = SCENE[q.id]
  const p = { lang, play, onDone }
  if (!s) return null
  if ('row' in s) return <Row items={s.row} {...p} />
  if ('still' in s) return <Row items={s.still} lang={lang} />
  if ('add' in s) return <Add s={s.add} {...p} />
  if ('week' in s) return <Week hops={s.week} choice={choice} {...p} />
  if ('chat' in s) return <Chat s={s} {...p} />
  if ('screens' in s) return <Screens s={s} choice={choice} {...p} />
  return <XY at={s.xy} choice={choice} play={play} onDone={onDone} />
}
