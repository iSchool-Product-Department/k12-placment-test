import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import confetti from 'canvas-confetti'
import { ArrowRight, Clock, Minus, Plus, RotateCcw, Sparkles, Trophy, Zap } from 'lucide-react'
import clsx from 'clsx'
import { answer, currentQuestion, newTest, progress, startLevel } from '../engine/engine'
import type { AnswerValue, StepName, TestRecord } from '../engine/types'
import { AVATARS, BANK, BY_ID, LEARN, LEVELS } from '../data/ladder'
import { STRAND_AR, T, bandOf, type Band, type Lang } from '../i18n'
import { store, useConfig } from '../store'
import { QuestionView, speak } from '../question/QuestionView'

type Phase = 'welcome' | 'practice' | 'test' | 'result'

export default function StudentApp({ lang }: { lang: Lang }) {
  const t = T[lang]
  const cfg = useConfig()
  const [phase, setPhase] = useState<Phase>('welcome')
  const [name, setName] = useState('')
  const [age, setAge] = useState<number | null>(null)
  const [avatar, setAvatar] = useState(AVATARS[0])
  const [rec, setRec] = useState<TestRecord | null>(null)
  const band = bandOf(age)

  const begin = () => {
    const r = newTest({ name: name.trim() || (lang === 'ar' ? 'طالب' : 'Student'), age: age!, avatar, lang }, BANK)
    store.save(r); setRec(r); setPhase('test')
  }
  const restart = () => {
    if (rec && rec.status === 'in_progress') store.save({ ...rec, status: 'abandoned' })
    setRec(null); setPhase('welcome'); setAge(null); setName('')
  }

  return (
    <div className="relative min-h-[calc(100vh-64px)] overflow-hidden">
      <Backdrop band={band} />
      <div className="relative mx-auto max-w-3xl px-4 pb-16 pt-6 sm:pt-10">
        <AnimatePresence mode="wait">
          {phase === 'welcome' && (
            <motion.div key="w" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}>
              <Welcome {...{ t, band, name, setName, age, setAge, avatar, setAvatar }} onStart={() => setPhase('practice')} />
            </motion.div>
          )}
          {phase === 'practice' && (
            <motion.div key="p" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}>
              <Practice t={t} band={band} lang={lang} onDone={begin} />
            </motion.div>
          )}
          {phase === 'test' && rec && (
            <motion.div key="t" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <TestRun rec={rec} lang={lang} band={band} onAnswer={(v, sec) => {
                const r = answer(rec, v, sec, BANK, cfg); store.save(r); setRec(r)
                if (r.status === 'done') setTimeout(() => setPhase('result'), 450)
              }} />
            </motion.div>
          )}
          {phase === 'result' && rec && (
            <motion.div key="r" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}>
              <Result rec={rec} lang={lang} onAgain={restart} />
            </motion.div>
          )}
        </AnimatePresence>
        {(phase === 'test' || phase === 'practice') && (
          <button onClick={restart} className="mx-auto mt-6 flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-bold text-soft hover:bg-white/70"><RotateCcw size={14} /> {t.again}</button>
        )}
      </div>
    </div>
  )
}

/* ---------------------------------------------------------------- welcome */
function Welcome({ t, band, name, setName, age, setAge, avatar, setAvatar, onStart }: any) {
  const set = (v: number) => setAge(Math.min(18, Math.max(6, v)))
  return (
    <div className="flex flex-col gap-6">
      <div className="text-center">
        <motion.div key={band} initial={{ scale: 0.6, rotate: -10 }} animate={{ scale: 1, rotate: 0 }} className="floaty mx-auto mb-2 text-6xl" aria-hidden="true">{avatar}</motion.div>
        <h1 className={clsx('m-0 text-deep', band === 'kids' ? 'text-4xl sm:text-5xl' : 'text-3xl sm:text-4xl')}>{t.hero[band]}</h1>
        <p className="mx-auto mt-2 max-w-md text-soft">{t.sub[band]}</p>
      </div>
      <div className="rounded-3xl border border-line bg-white p-5 shadow-[var(--shadow-pop)] sm:p-7">
        <label className="mb-1 block text-sm font-extrabold text-orange-deep">{t.name}</label>
        <input value={name} onChange={e => setName(e.target.value)} placeholder={t.namePh} className="mb-6 w-full rounded-xl border-2 border-line px-4 py-3 text-lg outline-none focus:border-bright" />
        <label className="mb-2 block text-sm font-extrabold text-orange-deep">{t.age}</label>
        <div className="flex items-center justify-center gap-6">
          <button onClick={() => set((age || 13) - 1)} className="grid h-14 w-14 place-items-center rounded-full border-2 border-line bg-sky text-blue hover:border-blue" aria-label="younger"><Minus /></button>
          <div className="min-w-[120px] text-center">
            <motion.div key={age ?? 'x'} initial={{ y: -10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="font-[var(--font-head)] text-7xl font-extrabold leading-none text-blue">{age ?? '?'}</motion.div>
            <div className="font-bold text-soft">{t.years}</div>
          </div>
          <button onClick={() => set((age || 11) + 1)} className="grid h-14 w-14 place-items-center rounded-full border-2 border-line bg-sky text-blue hover:border-blue" aria-label="older"><Plus /></button>
        </div>
        <input type="range" min={6} max={18} value={age ?? 12} onChange={e => set(+e.target.value)} className="mx-auto mt-3 block w-full max-w-md accent-[#FF7F1C]" aria-label={t.age} />
        <label className="mb-2 mt-6 block text-sm font-extrabold text-orange-deep">{t.avatar}</label>
        <div className="grid grid-cols-6 gap-2 sm:grid-cols-12">
          {AVATARS.map(a => (
            <motion.button key={a} whileHover={{ y: -3 }} whileTap={{ scale: 0.9 }} onClick={() => setAvatar(a)} aria-pressed={avatar === a}
              className={clsx('grid aspect-square place-items-center rounded-2xl border-2 text-2xl', avatar === a ? 'border-blue bg-sky' : 'border-line bg-white')}>{a}</motion.button>
          ))}
        </div>
        <div className="mt-7 flex justify-center">
          <motion.button whileTap={{ scale: 0.96 }} disabled={!age} onClick={onStart}
            className="flex items-center gap-2 rounded-full bg-orange px-8 py-3.5 text-lg font-extrabold text-white shadow-lg shadow-orange/30 disabled:opacity-40">
            {t.start} <ArrowRight size={20} className="rtl:rotate-180" />
          </motion.button>
        </div>
      </div>
    </div>
  )
}

/* ---------------------------------------------------------------- practice */
function Practice({ t, band, lang, onDone }: { t: typeof T.en; band: Band; lang: Lang; onDone: () => void }) {
  const [q, opts] = t.pq[band]
  const [v, setV] = useState<number | null>(null)
  return (
    <Card>
      <span className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-warm px-3 py-1 text-sm font-extrabold text-orange-deep"><Sparkles size={14} /> {t.practice}</span>
      <h2 className="mb-1 mt-0 text-2xl text-ink">{q}</h2>
      <p className="mb-4 mt-0 text-sm text-soft">{t.practiceNote}</p>
      <div className="grid gap-3 sm:grid-cols-3">
        {opts.map((o, i) => (
          <motion.button key={i} whileTap={{ scale: 0.96 }} onClick={() => setV(i)} aria-pressed={v === i}
            className={clsx('rounded-2xl border-2 px-4 py-4 text-lg font-bold', v === i ? 'border-blue bg-sky' : 'border-line bg-white')}>{o}</motion.button>
        ))}
      </div>
      <div className="mt-6 flex justify-end"><Btn disabled={v == null} onClick={onDone}>{t.begin}</Btn></div>
    </Card>
  )
}

/* ---------------------------------------------------------------- the test */
function TestRun({ rec, lang, band, onAnswer }: { rec: TestRecord; lang: Lang; band: Band; onAnswer: (v: AnswerValue, sec: number) => void }) {
  const t = T[lang]
  const q = currentQuestion(rec, BY_ID)!
  const [value, setValue] = useState<AnswerValue | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const t0 = useRef(Date.now())
  useEffect(() => {
    setValue(null); t0.current = Date.now()
    if (rec.age <= 7) { const id = setTimeout(() => speak(q, lang), 350); return () => clearTimeout(id) }
  }, [q?.id])
  if (!q) return null
  const n = rec.answers.length
  const ready = value != null && (q.t !== 'Order' || (value as string[]).filter(Boolean).length === q.o.filter(Boolean).length)
    && (q.t !== 'Sort' && q.t !== 'Match' || Object.keys(value as object).length === q.o.filter(Boolean).length)
  const submit = () => {
    if (!ready) return
    try { speechSynthesis.cancel() } catch { /* */ }
    setToast(t.saved[n % t.saved.length]); setTimeout(() => setToast(null), 900)
    onAnswer(value!, (Date.now() - t0.current) / 1000)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  return (
    <div className="flex flex-col gap-4">
      <MissionMap rec={rec} lang={lang} />
      <AnimatePresence mode="wait">
        <motion.div key={q.id} initial={{ opacity: 0, x: lang === 'ar' ? -40 : 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: lang === 'ar' ? 40 : -40 }} transition={{ type: 'spring', stiffness: 260, damping: 26 }}>
          <Card>
            <div className="mb-3 flex items-center justify-between text-sm font-bold text-soft">
              <span>{t.question} {n + 1}</span>
              <span className="flex items-center gap-1 text-orange-deep"><Zap size={15} className="fill-gold text-orange" /> {n * 10} XP</span>
            </div>
            <QuestionView q={q} lang={lang} band={band} value={value} onChange={setValue} salt={rec.id} />
            <div className="mt-6 flex items-center justify-end gap-3">
              <AnimatePresence>{toast && <motion.span initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} className="font-extrabold text-ok">{toast} +10 XP</motion.span>}</AnimatePresence>
              <Btn disabled={!ready} onClick={submit}>{t.next} <ArrowRight size={18} className="rtl:rotate-180" /></Btn>
            </div>
          </Card>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

/** The progress bar as a little journey: done rounds, the current round, and the finish flag. */
function MissionMap({ rec, lang }: { rec: TestRecord; lang: Lang }) {
  const t = T[lang]
  const p = progress(rec)
  const rounds: { name: StepName; state: 'done' | 'now' }[] = [...rec.steps.map(s => ({ name: s.name, state: 'done' as const })), ...(rec.step ? [{ name: rec.step.name, state: 'now' as const }] : [])]
  return (
    <div className="rounded-3xl border border-line bg-white/90 px-4 py-3 shadow-[var(--shadow-card)] backdrop-blur">
      <div className="mb-2 flex flex-wrap items-center gap-2 text-xs font-extrabold">
        {rounds.map((r, i) => (
          <span key={i} className={clsx('rounded-full px-2.5 py-1', r.state === 'done' ? 'bg-sky text-deep' : 'bg-orange text-white')}>{r.state === 'done' ? '✓ ' : ''}{t.steps[r.name]}</span>
        ))}
        <span className="ms-auto text-soft">🏁</span>
      </div>
      <div className="relative h-3 rounded-full bg-sky">
        <motion.div className="h-3 rounded-full bg-gradient-to-r from-blue to-bright" animate={{ width: `${Math.max(4, p * 100)}%` }} transition={{ type: 'spring', stiffness: 80, damping: 18 }} />
        <motion.div className="absolute -top-3.5 text-2xl" animate={{ insetInlineStart: `calc(${Math.max(4, p * 100)}% - 14px)` }} transition={{ type: 'spring', stiffness: 80, damping: 18 }} aria-hidden="true">{rec.avatar}</motion.div>
      </div>
    </div>
  )
}

/* ---------------------------------------------------------------- result */
function Result({ rec, lang, onAgain }: { rec: TestRecord; lang: Lang; onAgain: () => void }) {
  const t = T[lang]
  const g = rec.placement!.grade
  const lvl = LEVELS[rec.placement!.lv - 1]
  const mins = Math.max(1, Math.round(((rec.finishedAt || Date.now()) - rec.createdAt) / 60000))
  const strands = useMemo(() => [...new Set(rec.answers.filter(a => a.ok).map(a => BY_ID.get(a.qid)!.strand))].slice(0, 5), [rec.id])
  useEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const c = ['#056FEC', '#FF7F1C', '#FFD700', '#05ACFF']
    confetti({ particleCount: 120, spread: 80, origin: { y: 0.35 }, colors: c })
    setTimeout(() => confetti({ particleCount: 60, angle: 60, spread: 60, origin: { x: 0, y: 0.6 }, colors: c }), 300)
    setTimeout(() => confetti({ particleCount: 60, angle: 120, spread: 60, origin: { x: 1, y: 0.6 }, colors: c }), 450)
  }, [])
  return (
    <Card className="text-center">
      <motion.div initial={{ scale: 0, rotate: -30 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 180, damping: 12 }} className="mx-auto mb-1 text-7xl">{rec.avatar}</motion.div>
      <p className="m-0 font-bold text-soft">{rec.name}, {t.ready}</p>
      <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.25 }}
        className="mx-auto my-3 inline-flex items-center gap-3 rounded-3xl bg-gradient-to-br from-blue to-deep px-8 py-4 text-white shadow-[var(--shadow-pop)]">
        <Trophy className="text-gold" size={36} />
        <span className="font-[var(--font-head)] text-5xl font-extrabold">{t.grade} {g}</span>
      </motion.div>
      <div className="mb-6 flex justify-center gap-4 text-sm font-bold text-soft">
        <span className="flex items-center gap-1"><Clock size={14} /> {mins} {t.time}</span>
        <span>{rec.answers.length} {t.questions}</span>
        <span className="flex items-center gap-1 text-orange-deep"><Zap size={14} className="fill-gold text-orange" /> {rec.answers.length * 10} XP</span>
      </div>
      <div className="grid gap-4 text-start sm:grid-cols-2">
        <div className="rounded-2xl bg-sky p-4">
          <h3 className="m-0 mb-2 text-lg text-deep">{t.learn}</h3>
          <ul className="m-0 list-none space-y-2 p-0">{LEARN[lang][g - 1].map(x => <li key={x} className="flex gap-2 font-semibold"><span className="mt-2 h-2.5 w-2.5 shrink-0 rounded-full bg-gold" />{x}</li>)}</ul>
        </div>
        <div className="flex flex-col gap-4">
          <div className="rounded-2xl bg-warm p-4">
            <h3 className="m-0 mb-1 text-lg text-orange-deep">{t.tools}</h3>
            <p className="m-0 font-semibold" dir="ltr">{lvl.tools}</p>
          </div>
          {strands.length > 0 && (
            <div className="rounded-2xl border border-line p-4">
              <h3 className="m-0 mb-2 text-lg text-deep">{t.showed}</h3>
              <div className="flex flex-wrap gap-2">{strands.map(s => <span key={s} className="rounded-full bg-sky px-3 py-1 text-sm font-bold text-deep">⭐ {lang === 'ar' ? STRAND_AR[s] || s : s}</span>)}</div>
            </div>
          )}
        </div>
      </div>
      <div className="mt-6"><Btn variant="ghost" onClick={onAgain}><RotateCcw size={16} /> {t.again}</Btn></div>
    </Card>
  )
}

/* ---------------------------------------------------------------- bits */
export function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={clsx('rounded-3xl border border-line bg-white p-5 shadow-[var(--shadow-pop)] sm:p-7', className)}>{children}</div>
}
export function Btn({ children, variant = 'primary', ...p }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'ghost' | 'cta' }) {
  return (
    <motion.button whileTap={{ scale: 0.96 }} {...(p as any)}
      className={clsx('inline-flex items-center gap-2 rounded-full px-6 py-3 font-extrabold disabled:opacity-40',
        variant === 'primary' && 'bg-blue text-white hover:bg-deep', variant === 'cta' && 'bg-orange text-white',
        variant === 'ghost' && 'border-2 border-line bg-white text-deep hover:border-blue')}>{children}</motion.button>
  )
}

/** Light, playful backgrounds for every age. Older students get geometric shapes, not dark screens. */
function Backdrop({ band }: { band: Band }) {
  return (
    <div className="pointer-events-none absolute inset-0 -z-0" aria-hidden="true">
      <div className={clsx('absolute inset-0 transition-colors duration-700',
        band === 'kids' && 'bg-gradient-to-b from-[#DFF3FF] to-[#F7FAFF]',
        band === 'teen' && 'bg-gradient-to-b from-[#E4EEFF] via-[#F2F7FF] to-[#F7FAFF]',
        band === 'pro' && 'bg-[#F7FAFF]')} />
      {band === 'kids' && <>
        <Cloud className="left-[6%] top-[8%] w-28" /><Cloud className="right-[8%] top-[22%] w-36" /><Cloud className="bottom-[14%] left-[12%] w-24" />
        <div className="absolute right-[12%] top-[6%] h-16 w-16 rounded-full bg-gold shadow-[0_0_40px_#FFD700]" />
      </>}
      {band === 'teen' && <>
        <div className="floaty absolute -left-10 top-24 h-40 w-40 rounded-full bg-gradient-to-br from-bright to-blue opacity-25" />
        <div className="absolute right-[6%] top-[12%] h-20 w-20 rounded-full border-[6px] border-orange/40" />
        {Array.from({ length: 18 }, (_, i) => <span key={i} className="absolute h-1.5 w-1.5 rounded-full bg-blue/30" style={{ left: `${(i * 53) % 100}%`, top: `${(i * 37) % 100}%` }} />)}
      </>}
      {band === 'pro' && <>
        <div className="absolute inset-0 [background-image:linear-gradient(#DCEAF3_1px,transparent_1px),linear-gradient(90deg,#DCEAF3_1px,transparent_1px)] [background-size:44px_44px] opacity-60" />
        <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-bright/20 blur-2xl" />
        <div className="absolute -bottom-20 -left-16 h-64 w-64 rounded-full bg-orange/15 blur-2xl" />
      </>}
    </div>
  )
}
const Cloud = ({ className }: { className: string }) => (
  <svg viewBox="0 0 120 60" className={clsx('floaty absolute opacity-90', className)}><g fill="#fff"><circle cx="35" cy="35" r="20" /><circle cx="60" cy="25" r="25" /><circle cx="85" cy="37" r="18" /><rect x="18" y="35" width="85" height="20" rx="10" /></g></svg>
)
export { startLevel }
