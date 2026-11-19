import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { DndContext, useDraggable, useDroppable, type DragEndEvent } from '@dnd-kit/core'
import { Apple, ArrowRight, Minus, Plus, Rocket, ShoppingBasket, Star, Volleyball } from 'lucide-react'
import clsx from 'clsx'
import { aboutTotal, answer, currentQuestion, newTest } from '../engine/engine'
import type { AnswerValue, Practice, TestRecord } from '../engine/types'
import { BANK, BY_ID } from '../data/ladder'
import { T, bandOf, type Band, type Lang } from '../i18n'
import { store, useConfig } from '../store'
import { QuestionView, roomy, stableShuffle } from '../question/QuestionView'
import { hasSim } from '../question/Visual'
import { useDragSensors } from '../question/DragAnswers'

type Phase = 'welcome' | 'resume' | 'practice' | 'test' | 'result'
type Tx = typeof T.en
/** PRD 6.2: over this many seconds on the practice counts as needing help. */
const SLOW_SEC = 20

export default function StudentApp({ lang }: { lang: Lang }) {
  const t = T[lang]
  const cfg = useConfig()
  const open = useMemo(() => store.resumable(), [])
  const [rec, setRec] = useState<TestRecord | null>(open ?? null)
  const [phase, setPhase] = useState<Phase>(open ? 'resume' : 'welcome')
  const [name, setName] = useState('')
  const [age, setAge] = useState<number | null>(null)
  const band = bandOf(rec?.age ?? age)

  const begin = (practice: Practice) => {
    const r = { ...newTest({ name: name.trim(), age: age!, lang }, BANK), practice }
    store.save(r); setRec(r); setPhase('test')
  }
  const fresh = () => { setRec(null); setName(''); setAge(null); setPhase('welcome') }
  const fade = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -12 }, transition: { duration: 0.25, ease: [0.22, 1, 0.36, 1] } } as const

  return (
    <div className="relative min-h-[calc(100dvh-64px)] overflow-hidden">
      <Backdrop theme={phase === 'welcome' || phase === 'resume' ? 'none' : band} />
      <div className={clsx('relative mx-auto px-4 pb-10 pt-4 sm:pt-6', phase === 'test' ? 'max-w-5xl' : 'max-w-3xl')}>
        <AnimatePresence mode="wait">
          {phase === 'welcome' && <motion.div key="w" {...fade}><Welcome {...{ t, band, name, setName, age, setAge }} onStart={() => setPhase('practice')} /></motion.div>}
          {phase === 'resume' && rec && (
            <motion.div key="re" {...fade}>
              <Card className="text-center">
                <h1 className="m-0 text-3xl text-deep">{t.welcomeBack(rec.name)}</h1>
                <p className="mb-5 mt-1 text-soft">{t.resumeNote}</p>
                <div className="flex flex-col items-center gap-3">
                  <Btn onClick={() => setPhase('test')}>{t.resume} <ArrowRight size={18} className="rtl:rotate-180" /></Btn>
                  <button onClick={fresh} className="text-sm font-bold text-soft hover:text-deep">{t.newStudent}</button>
                </div>
              </Card>
            </motion.div>
          )}
          {phase === 'practice' && <motion.div key="p" {...fade}><PracticeStep t={t} band={band} onDone={begin} /></motion.div>}
          {phase === 'test' && rec && (
            <motion.div key="t" {...fade}>
              <TestRun rec={rec} lang={lang} band={band} onAnswer={(v, sec) => {
                const r = answer(rec, v, sec, BANK, cfg); store.save(r); setRec(r)
                if (r.status === 'done') setPhase('result')
              }} />
            </motion.div>
          )}
          {phase === 'result' && rec && (
            <motion.div key="r" {...fade}>
              <Card className="py-10 text-center">
                <motion.div initial={{ y: 24, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                  className="mx-auto grid h-24 w-24 place-items-center rounded-full bg-blue text-white"><Rocket size={46} strokeWidth={1.75} /></motion.div>
                <p className="m-0 mt-3 text-2xl font-bold text-orange-deep">{t.youAre[rec.tier!.tier]}</p>
                <h1 className="m-0 text-4xl text-deep sm:text-5xl">{t.inGrade(rec.placement!.grade)}</h1>
                <p className="mx-auto mb-0 mt-2 max-w-sm text-lg text-soft">{t.contact}</p>
              </Card>
              {/* Demo only: the next person on this device. A finished test is never retaken (PRD 3.2). */}
              <button onClick={fresh} className="mx-auto mt-4 block text-sm font-bold text-soft hover:text-deep">{t.newStudent}</button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

/* ---------------------------------------------------------------- welcome: name and age */
function Welcome({ t, band, name, setName, age, setAge, onStart }: {
  t: Tx; band: Band; name: string; setName: (s: string) => void; age: number | null; setAge: (n: number) => void; onStart: () => void
}) {
  const set = (v: number) => setAge(Math.min(18, Math.max(6, v)))
  return (
    <div className="flex flex-col gap-4">
      <div className="text-center">
        <h1 className={clsx('m-0 text-deep', band === 'kids' ? 'text-4xl' : 'text-3xl')}>{t.hero[band]}</h1>
        <p className="mx-auto mb-0 mt-1 max-w-md text-soft">{t.sub[band]}</p>
      </div>
      <Card className="mx-auto w-full max-w-md">
        <div>
          <label className="mb-1 block text-sm font-extrabold text-orange-deep" htmlFor="nm">{t.name}</label>
          <input id="nm" value={name} onChange={e => setName(e.target.value)} placeholder={t.namePh} autoComplete="off"
            className="mb-5 w-full rounded-xl border-2 border-line px-4 py-2.5 text-lg outline-none focus:border-bright" />
          <span className="mb-1 block text-sm font-extrabold text-orange-deep">{t.age}</span>
          <div className="flex items-center justify-center gap-5">
            <button onClick={() => set((age || 13) - 1)} className="grid h-12 w-12 place-items-center rounded-full border-2 border-line bg-sky text-blue hover:border-blue" aria-label="younger"><Minus /></button>
            <div className="min-w-[96px] text-center">
              <div className="font-[var(--font-head)] text-6xl font-extrabold leading-none text-blue">{age ?? '?'}</div>
              <div className="text-sm font-bold text-soft">{t.years}</div>
            </div>
            <button onClick={() => set((age || 11) + 1)} className="grid h-12 w-12 place-items-center rounded-full border-2 border-line bg-sky text-blue hover:border-blue" aria-label="older"><Plus /></button>
          </div>
          <input type="range" min={6} max={18} value={age ?? 12} onChange={e => set(+e.target.value)} className="mt-3 block w-full accent-[#FF7F1C]" aria-label={t.age} />
          <div className="mt-6 flex justify-center">
            <Btn variant="cta" disabled={!age || !name.trim()} onClick={onStart}>{t.start} <ArrowRight size={20} className="rtl:rotate-180" /></Btn>
          </div>
        </div>
      </Card>
    </div>
  )
}

/* ---------------------------------------------------------------- practice (PRD 6.2) */
function PracticeStep({ t, band, onDone }: { t: Tx; band: Band; onDone: (p: Practice) => void }) {
  const t0 = useRef(Date.now())
  const [res, setRes] = useState<{ i: number; tapped: boolean } | null>(null)
  const done = () => {
    const sec = (Date.now() - t0.current) / 1000, ok = res!.i === 0
    onDone({ ok, sec, readHelp: !ok || sec > SLOW_SEC, tapMode: band === 'kids' && (res!.tapped || sec > SLOW_SEC) })
  }
  const [q, opts] = t.pq[band]
  return (
    <Card>
      <span className="mb-2 inline-block rounded-full bg-warm px-3 py-1 text-sm font-extrabold text-orange-deep">{t.practice}</span>
      <h2 className="m-0 text-2xl text-ink">{q}</h2>
      <p className="mb-4 mt-1 text-sm text-soft">{t.practiceNote}</p>
      {band === 'kids'
        ? <AppleDrag names={opts} onAnswer={(i, tapped) => setRes({ i, tapped })} />
        : <div className="grid gap-2.5 sm:grid-cols-3">
            {stableShuffle(opts.map((_, i) => i), q).map(i => (
              <button key={i} onClick={() => setRes({ i, tapped: true })} aria-pressed={res?.i === i}
                className={clsx('rounded-2xl border-2 px-4 py-3 text-lg font-bold', res?.i === i ? 'border-blue bg-sky' : 'border-line bg-white hover:border-bright')}>{opts[i]}</button>
            ))}
          </div>}
      <div className="mt-5 flex justify-end"><Btn disabled={!res} onClick={done}>{t.begin} <ArrowRight size={18} className="rtl:rotate-180" /></Btn></div>
    </Card>
  )
}

const THINGS = [Apple, Volleyball, Star]
/** Put one of three things in the basket: one tap drops it in, dragging works too, so nobody gets stuck. Thing 0 is the apple. */
function AppleDrag({ names, onAnswer }: { names: string[]; onAnswer: (i: number, tapped: boolean) => void }) {
  const [inBasket, setIn] = useState<number | null>(null)
  const dragged = useRef(false)
  const put = (i: number, tapped: boolean) => { setIn(i); onAnswer(i, tapped) }
  const sensors = useDragSensors()
  const end = (e: DragEndEvent) => { if (e.over) put(+e.active.id, false); setTimeout(() => (dragged.current = false)) }
  const I = inBasket != null ? THINGS[inBasket] : null
  return (
    <DndContext sensors={sensors} onDragStart={() => (dragged.current = true)} onDragEnd={end} onDragCancel={() => (dragged.current = false)}>
      <div className="flex flex-wrap items-center justify-center gap-6">
        <div className="flex gap-3">
          {[1, 0, 2].map(i => inBasket !== i && <Thing key={i} i={i} label={names[i]} onTap={() => !dragged.current && put(i, true)} />)}
        </div>
        <Basket>{I && <I size={40} className="text-orange" />}</Basket>
      </div>
    </DndContext>
  )
}
function Thing({ i, label, onTap }: { i: number; label: string; onTap: () => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: String(i) })
  const I = THINGS[i]
  return (
    <button ref={setNodeRef} {...attributes} {...listeners} onClick={onTap} aria-label={label}
      style={transform ? { transform: `translate(${transform.x}px, ${transform.y}px)` } : undefined}
      className={clsx('flex h-24 w-24 touch-none flex-col items-center justify-center gap-1 rounded-2xl border-2 border-line bg-white font-bold hover:border-bright', isDragging && 'z-10 shadow-lg')}>
      <I size={40} className={i === 0 ? 'text-bad' : i === 1 ? 'text-blue' : 'text-gold'} />
      <span className="text-sm">{label}</span>
    </button>
  )
}
function Basket({ children }: { children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: 'basket' })
  return (
    <div ref={setNodeRef} aria-label="basket"
      className={clsx('relative grid h-32 w-36 place-items-center rounded-3xl border-2 border-dashed', isOver ? 'border-blue bg-sky' : 'border-line bg-white')}>
      <ShoppingBasket size={72} strokeWidth={1.5} className="text-deep" />
      <span className="absolute top-3">{children}</span>
    </div>
  )
}

/* ---------------------------------------------------------------- the test */
function TestRun({ rec, lang, band, onAnswer }: { rec: TestRecord; lang: Lang; band: Band; onAnswer: (v: AnswerValue, sec: number) => void }) {
  const t = T[lang]
  const q = currentQuestion(rec, BY_ID)!
  // Everything below belongs to one question, keyed by its ID, so nothing leaks into the next one.
  const [ans, setAns] = useState<{ id: string; v: AnswerValue | null }>({ id: '', v: null })
  const value = q && ans.id === q.id ? ans.v : null
  const setValue = (v: AnswerValue | null) => setAns({ id: q.id, v })
  // Stage questions: Next locks the answer, the stage plays it, then the test moves on by itself.
  const [lockedId, setLockedId] = useState('')
  const [playedId, setPlayedId] = useState('')
  const locked = !!q && lockedId === q.id, played = !!q && playedId === q.id
  const sec = useRef(0)
  const t0 = useRef(Date.now())
  useEffect(() => { t0.current = Date.now() }, [q?.id])
  useEffect(() => { if (played) { const id = setTimeout(finish, 700); return () => clearTimeout(id) } }, [played])
  // After each answer the rocket moves along the bar and a kind line pops up. Never tied to right or wrong.
  const done = rec.answers.length
  const [cheer, setCheer] = useState(0)
  useEffect(() => { if (!done) return; setCheer(done); const id = setTimeout(() => setCheer(0), 1800); return () => clearTimeout(id) }, [done])
  const still = useReducedMotion()
  if (!q) return null
  const n = rec.answers.length
  const total = Math.max(aboutTotal(rec), n + 1)
  const pct = (n / total) * 100
  const ready = value != null && (q.t !== 'Order' || (value as string[]).filter(Boolean).length === q.o.filter(Boolean).length)
    && (q.t !== 'Sort' && q.t !== 'Match' || Object.keys(value as object).length === q.o.filter(Boolean).length)
  const stage = hasSim(q)
  const submit = () => {
    if (!ready || locked) return
    sec.current = (Date.now() - t0.current) / 1000
    if (stage) setLockedId(q.id); else finish()
  }
  function finish() {
    try { speechSynthesis.cancel() } catch { /* no speech */ }
    onAnswer(value!, sec.current)
    window.scrollTo({ top: 0 })
  }
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-end gap-3 px-1">
        <span className="shrink-0 text-sm font-extrabold text-deep">{t.questionOf(n + 1, total)}</span>
        <div className="relative flex-1 pt-11">
          <div className="h-2 overflow-hidden rounded-full bg-line" role="progressbar" aria-valuenow={n} aria-valuemax={total}>
            <motion.div className="h-full rounded-full bg-blue" animate={{ width: `${pct}%` }} transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }} />
          </div>
          <motion.div className="absolute top-0 -translate-x-1/2 rtl:translate-x-1/2" style={{ insetInlineStart: 0 }} initial={false}
            animate={{ insetInlineStart: `${pct}%` }} transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}>
            <motion.div animate={still ? undefined : cheer ? { y: [0, -8, 0] } : { y: [0, -2, 0] }} transition={cheer ? { duration: 0.6 } : { duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
              className="relative grid h-9 w-9 place-items-center rounded-full bg-blue text-white shadow-[var(--shadow-card)]">
              <Rocket size={20} strokeWidth={2} className="rotate-45 rtl:-rotate-[135deg]" />
            </motion.div>
            <AnimatePresence>
              {cheer > 0 && (
                <motion.span key={cheer} initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}
                  className={clsx('absolute top-1 whitespace-nowrap rounded-full border border-line bg-white px-3 py-1 text-sm font-extrabold text-deep shadow-[var(--shadow-card)]', pct > 60 ? 'end-full me-1' : 'start-full ms-1')}>
                  {t.cheers[(cheer + rec.id.length) % t.cheers.length]}
                </motion.span>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </div>
      <AnimatePresence mode="wait">
        {/* Text-only questions get a narrower card with bigger answers; pictures, code and drag questions use the full width. */}
        <motion.div key={q.id} className={clsx('mx-auto w-full', !roomy(q) && 'max-w-3xl')} initial={{ opacity: 0, x: lang === 'ar' ? -24 : 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}>
          <Card>
            <QuestionView q={q} lang={lang} band={band} value={value} onChange={setValue} salt={rec.id} locked={locked} onPlayed={() => setPlayedId(q.id)}
              listenHot={rec.practice?.readHelp} tapMode={rec.practice?.tapMode} />
            {/* Next stays on screen even when a question is taller than the window. */}
            <div className="sticky bottom-0 -mx-4 mt-4 flex justify-end rounded-b-3xl bg-white/95 px-4 py-3 sm:-mx-6 sm:px-6">
              <Btn disabled={!ready || locked} onClick={submit}>{t.next} <ArrowRight size={18} className="rtl:rotate-180" /></Btn>
            </div>
          </Card>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

/* ---------------------------------------------------------------- bits */
export function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={clsx('rounded-3xl border border-line bg-white p-4 shadow-[var(--shadow-card)] sm:p-6', className)}>{children}</div>
}
export function Btn({ children, variant = 'primary', ...p }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'ghost' | 'cta' }) {
  return (
    <button {...p}
      className={clsx('inline-flex items-center gap-2 rounded-full px-6 py-3 font-extrabold transition-[transform,background-color] active:scale-[.97] disabled:opacity-40',
        variant === 'primary' && 'bg-blue text-white hover:bg-deep', variant === 'cta' && 'bg-orange text-white hover:bg-orange-deep',
        variant === 'ghost' && 'border-2 border-line bg-white text-deep hover:border-blue')}>{children}</button>
  )
}

/** Quiet backgrounds: clouds for the youngest, a dot grid for teens, a line grid for the oldest. */
/**
 * The page behind the test. The name and age screen is plain; once the student presses Start it fades
 * into their age's background. Brand colors only: sky with clouds (6 to 9), dots (10 to 13), a fine grid (14 to 18).
 */
type Theme = 'none' | Band
function Backdrop({ theme }: { theme: Theme }) {
  const layer = (k: Theme, el: React.ReactNode) => (
    <motion.div key={k} className="absolute inset-0" initial={false} animate={{ opacity: theme === k ? 1 : 0 }} transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}>{el}</motion.div>
  )
  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden="true">
      {layer('none', <div className="absolute inset-0 [background-image:radial-gradient(#DCEAF3_1.5px,transparent_1.5px)] [background-size:22px_22px]" />)}
      {layer('kids', <div className="absolute inset-0 bg-sky"><Cloud className="left-[4%] top-[6%] w-28" /><Cloud className="right-[6%] top-[30%] w-36" /><Cloud className="bottom-[8%] left-[10%] w-24" /></div>)}
      {layer('teen', <div className="absolute inset-0 [background-image:radial-gradient(#B9DDF7_2px,transparent_2px)] [background-size:26px_26px]"><span className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-sky" /><span className="absolute -bottom-32 -left-20 h-80 w-80 rounded-full bg-warm" /></div>)}
      {layer('pro', <div className="absolute inset-0 bg-white [background-image:linear-gradient(#E6EDF1_1px,transparent_1px),linear-gradient(90deg,#E6EDF1_1px,transparent_1px)] [background-size:32px_32px]" />)}
    </div>
  )
}
const Cloud = ({ className }: { className: string }) => (
  <svg viewBox="0 0 120 60" className={clsx('absolute', className)}><g fill="#fff"><circle cx="35" cy="35" r="20" /><circle cx="60" cy="25" r="25" /><circle cx="85" cy="37" r="18" /><rect x="18" y="35" width="85" height="20" rx="10" /></g></svg>
)
