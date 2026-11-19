import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { DndContext, useDraggable, useDroppable, type DragEndEvent } from '@dnd-kit/core'
import { Apple, ArrowRight, Minus, Plus, ShoppingBasket, Star, Volleyball } from 'lucide-react'
import clsx from 'clsx'
import { aboutTotal, answer, currentQuestion, newTest } from '../engine/engine'
import type { AnswerValue, Practice, TestRecord } from '../engine/types'
import { BANK, BY_ID } from '../data/ladder'
import { T, bandOf, type Band, type Lang } from '../i18n'
import { store, useConfig } from '../store'
import { QuestionView, stableShuffle } from '../question/QuestionView'
import { hasSim } from '../question/Visual'
import { useDragSensors } from '../question/DragAnswers'
import { BODY, Buddy, PARTS, encode, parse, randomBuddy, type Part } from './Buddy'

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
  const [buddy, setBuddy] = useState(() => randomBuddy())
  const band = bandOf(rec?.age ?? age)

  const begin = (practice: Practice) => {
    const r = { ...newTest({ name: name.trim(), age: age!, avatar: buddy, lang }, BANK), practice }
    store.save(r); setRec(r); setPhase('test')
  }
  const fresh = () => { setRec(null); setName(''); setAge(null); setBuddy(randomBuddy()); setPhase('welcome') }
  const fade = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -12 }, transition: { duration: 0.25, ease: [0.22, 1, 0.36, 1] } } as const

  return (
    <div className="relative min-h-[calc(100dvh-64px)] overflow-hidden">
      <Backdrop band={band} />
      <div className="relative mx-auto max-w-3xl px-4 pb-10 pt-4 sm:pt-6">
        <AnimatePresence mode="wait">
          {phase === 'welcome' && <motion.div key="w" {...fade}><Welcome {...{ t, band, name, setName, age, setAge, buddy, setBuddy }} onStart={() => setPhase('practice')} /></motion.div>}
          {phase === 'resume' && rec && (
            <motion.div key="re" {...fade}>
              <Card className="text-center">
                <div className="mx-auto w-fit"><Buddy code={rec.avatar} size={110} mood="wave" /></div>
                <h1 className="m-0 mt-2 text-3xl text-deep">{t.welcomeBack(rec.name)}</h1>
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
                <div className="mx-auto w-fit"><Buddy code={rec.avatar} size={130} mood="cheer" /></div>
                <h1 className="m-0 mt-3 text-4xl text-deep sm:text-5xl">{t.youreIn(rec.placement!.grade)}</h1>
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

/* ---------------------------------------------------------------- welcome: name, age, buddy on one screen */
function Welcome({ t, band, name, setName, age, setAge, buddy, setBuddy, onStart }: {
  t: Tx; band: Band; name: string; setName: (s: string) => void; age: number | null; setAge: (n: number) => void; buddy: string; setBuddy: (s: string) => void; onStart: () => void
}) {
  const set = (v: number) => setAge(Math.min(18, Math.max(6, v)))
  const c = parse(buddy)
  const pick = (k: Part, i: number) => setBuddy(encode({ ...c, [k]: i }))
  return (
    <div className="flex flex-col gap-4">
      <div className="text-center">
        <h1 className={clsx('m-0 text-deep', band === 'kids' ? 'text-4xl' : 'text-3xl')}>{t.hero[band]}</h1>
        <p className="mx-auto mb-0 mt-1 max-w-md text-soft">{t.sub[band]}</p>
      </div>
      <Card className="grid gap-6 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
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
          <div className="mt-6 flex justify-center sm:justify-start">
            <Btn variant="cta" disabled={!age || !name.trim()} onClick={onStart}>{t.start} <ArrowRight size={20} className="rtl:rotate-180" /></Btn>
          </div>
        </div>
        <div className="flex gap-3 rounded-2xl bg-mist p-3">
          <div className="grid shrink-0 place-items-center"><Buddy code={buddy} size={band === 'kids' ? 120 : 100} mood="wave" /></div>
          <div className="min-w-0 flex-1">
            <span className="mb-1.5 block text-sm font-extrabold text-orange-deep">{t.avatar}</span>
            {(Object.keys(PARTS) as Part[]).map(k => (
              <div key={k} className="mb-1.5 flex items-center gap-1.5">
                <span className="w-12 shrink-0 text-xs font-bold text-soft">{t.parts[k]}</span>
                <div className="flex flex-wrap gap-1">
                  {Array.from({ length: PARTS[k] }, (_, i) => (
                    <button key={i} onClick={() => pick(k, i)} aria-pressed={c[k] === i} aria-label={`${t.parts[k]} ${i + 1}`}
                      className={clsx('grid h-8 w-8 place-items-center overflow-hidden rounded-lg border-2', c[k] === i ? 'border-blue bg-white' : 'border-transparent bg-white/70 hover:border-line')}>
                      {k === 'b' ? <i className="h-5 w-5 rounded-full" style={{ background: BODY[i] }} /> : <Buddy code={encode({ ...c, [k]: i })} size={26} />}
                    </button>
                  ))}
                </div>
              </div>
            ))}
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
/** Drag one of three things into the basket, or tap it and then the basket. Thing 0 is the apple. */
function AppleDrag({ names, onAnswer }: { names: string[]; onAnswer: (i: number, tapped: boolean) => void }) {
  const [inBasket, setIn] = useState<number | null>(null)
  const [sel, setSel] = useState<number | null>(null)
  const put = (i: number, tapped: boolean) => { setIn(i); setSel(null); onAnswer(i, tapped) }
  const sensors = useDragSensors()
  const end = (e: DragEndEvent) => { if (e.over) put(+e.active.id, false) }
  const I = inBasket != null ? THINGS[inBasket] : null
  return (
    <DndContext sensors={sensors} onDragEnd={end}>
      <div className="flex flex-wrap items-center justify-center gap-6">
        <div className="flex gap-3">
          {[1, 0, 2].map(i => inBasket !== i && <Thing key={i} i={i} label={names[i]} sel={sel === i} onTap={() => setSel(sel === i ? null : i)} />)}
        </div>
        <Basket onTap={() => sel != null && put(sel, true)} hot={sel != null}>{I && <I size={40} className="text-orange" />}</Basket>
      </div>
    </DndContext>
  )
}
function Thing({ i, label, sel, onTap }: { i: number; label: string; sel: boolean; onTap: () => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: String(i) })
  const I = THINGS[i]
  return (
    <button ref={setNodeRef} {...attributes} {...listeners} onClick={onTap} aria-label={label} aria-pressed={sel}
      style={transform ? { transform: `translate(${transform.x}px, ${transform.y}px)` } : undefined}
      className={clsx('flex h-24 w-24 touch-none flex-col items-center justify-center gap-1 rounded-2xl border-2 bg-white font-bold', sel ? 'border-blue bg-sky' : 'border-line', isDragging && 'z-10 shadow-lg')}>
      <I size={40} className={i === 0 ? 'text-bad' : i === 1 ? 'text-blue' : 'text-gold'} />
      <span className="text-sm">{label}</span>
    </button>
  )
}
function Basket({ children, onTap, hot }: { children: React.ReactNode; onTap: () => void; hot: boolean }) {
  const { setNodeRef, isOver } = useDroppable({ id: 'basket' })
  return (
    <button ref={setNodeRef} onClick={onTap} aria-label="basket"
      className={clsx('relative grid h-32 w-36 place-items-center rounded-3xl border-2 border-dashed', isOver || hot ? 'border-blue bg-sky' : 'border-line bg-white')}>
      <ShoppingBasket size={72} strokeWidth={1.5} className="text-deep" />
      <span className="absolute top-3">{children}</span>
    </button>
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
  if (!q) return null
  const n = rec.answers.length
  const total = Math.max(aboutTotal(rec), n + 1)
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
      <div className="flex items-center gap-3 px-1">
        <span className="shrink-0 text-sm font-extrabold text-deep">{t.questionOf(n + 1, total)}</span>
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-line" role="progressbar" aria-valuenow={n} aria-valuemax={total}>
          <motion.div className="h-full rounded-full bg-blue" animate={{ width: `${(n / total) * 100}%` }} transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }} />
        </div>
        <Buddy code={rec.avatar} size={30} />
      </div>
      <AnimatePresence mode="wait">
        <motion.div key={q.id} initial={{ opacity: 0, x: lang === 'ar' ? -24 : 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}>
          <Card>
            <QuestionView q={q} lang={lang} band={band} value={value} onChange={setValue} salt={rec.id} locked={locked} onPlayed={() => setPlayedId(q.id)}
              listenHot={rec.practice?.readHelp} tapMode={rec.practice?.tapMode} />
            <div className="mt-4 flex justify-end">
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
function Backdrop({ band }: { band: Band }) {
  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden="true">
      {band === 'kids' && <div className="absolute inset-0 bg-sky">
        <Cloud className="left-[4%] top-[6%] w-28" /><Cloud className="right-[6%] top-[30%] w-36" /><Cloud className="bottom-[8%] left-[10%] w-24" />
      </div>}
      {band === 'teen' && <div className="absolute inset-0 [background-image:radial-gradient(#DCEAF3_1.5px,transparent_1.5px)] [background-size:22px_22px]" />}
      {band === 'pro' && <div className="absolute inset-0 opacity-60 [background-image:linear-gradient(#DCEAF3_1px,transparent_1px),linear-gradient(90deg,#DCEAF3_1px,transparent_1px)] [background-size:44px_44px]" />}
    </div>
  )
}
const Cloud = ({ className }: { className: string }) => (
  <svg viewBox="0 0 120 60" className={clsx('absolute', className)}><g fill="#fff"><circle cx="35" cy="35" r="20" /><circle cx="60" cy="25" r="25" /><circle cx="85" cy="37" r="18" /><rect x="18" y="35" width="85" height="20" rx="10" /></g></svg>
)
