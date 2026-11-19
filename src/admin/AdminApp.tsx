import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { AlertTriangle, ArrowLeft, Clock, Flag, Info, LayoutGrid, List, RotateCcw, Search, Trash2, Users, X } from 'lucide-react'
import clsx from 'clsx'
import type { AnswerRec, Diff, TestRecord, Tier } from '../engine/types'
import { BY_ID } from '../data/ladder'
import { store, useTests } from '../store'
import { QuestionView, KeyLine } from '../question/QuestionView'
import { Journey } from './Journey'
import { FLAG, REASON, STEP_LABEL, TIER_STYLE, mins, when } from './labels'

const TIERS: Tier[] = ['Foundation', 'Core', 'Advanced']

export default function AdminApp({ route, go }: { route: string[]; go: (h: string) => void }) {
  const tests = useTests()
  const id = route[1]
  const rec = id ? tests.find(t => t.id === id) : null
  if (id && rec) return <TestPage rec={rec} back={() => go('admin')} />
  return <TestsHome tests={tests} open={i => go(`admin/${i}`)} />
}

/* ---------------------------------------------------------------- list + groups */
function TestsHome({ tests, open }: { tests: TestRecord[]; open: (id: string) => void }) {
  const [view, setView] = useState<'list' | 'groups'>('list')
  const [q, setQ] = useState('')
  const [grade, setGrade] = useState('')
  const [tier, setTier] = useState('')
  const [flagged, setFlagged] = useState(false)
  const done = tests.filter(t => t.status === 'done')
  const list = tests.filter(t => (!q || t.name.toLowerCase().includes(q.toLowerCase())) && (!grade || String(t.placement?.grade) === grade)
    && (!tier || t.tier?.tier === tier) && (!flagged || t.flags.some(f => FLAG[f].tone === 'warn')))
  const avgMin = done.length ? done.reduce((s, t) => s + ((t.finishedAt || 0) - t.createdAt), 0) / done.length / 60000 : 0
  const byTier = TIERS.map(tr => done.filter(t => t.tier?.tier === tr).length)
  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div><p className="m-0 text-sm font-extrabold text-orange-deep">● Admin</p><h1 className="m-0 text-3xl text-deep">Placement tests</h1></div>
        <div className="flex gap-2">
          <Seg value={view} set={setView} items={[['list', <><List size={15} /> All tests</>], ['groups', <><LayoutGrid size={15} /> Session groups</>]]} />
          <Confirm onYes={() => store.reset()} className="flex items-center gap-1.5 rounded-full border-2 border-line bg-white px-3 text-sm font-bold text-soft hover:border-blue" ask="Sure? Click again"><RotateCcw size={14} /> Reset demo</Confirm>
        </div>
      </div>
      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi label="Tests" value={tests.length} sub={`${done.length} finished`} />
        <Kpi label="Average time" value={`${avgMin.toFixed(1)} min`} sub="finished tests" />
        <Kpi label="Need a look" value={tests.filter(t => t.flags.some(f => FLAG[f].tone === 'warn')).length} sub="flagged for the teacher" warn />
        <div className="rounded-2xl border border-line bg-white p-4 shadow-[var(--shadow-card)]">
          <div className="text-xs font-bold text-soft">Tier mix</div>
          <div className="mt-2 flex h-3 overflow-hidden rounded-full bg-sky">
            {byTier.map((n, i) => <motion.i key={i} initial={{ width: 0 }} animate={{ width: `${(n / Math.max(1, done.length)) * 100}%` }} style={{ background: TIER_STYLE[TIERS[i]].dot }} />)}
          </div>
          <div className="mt-2 flex justify-between text-xs font-bold">{TIERS.map((tr, i) => <span key={tr} className={TIER_STYLE[tr].fg}>{tr} {byTier[i]}</span>)}</div>
        </div>
      </div>
      {view === 'list' ? (
        <div className="rounded-3xl border border-line bg-white p-4 shadow-[var(--shadow-card)]">
          <div className="mb-3 flex flex-wrap gap-2">
            <label className="flex flex-1 items-center gap-2 rounded-xl border-2 border-line px-3"><Search size={16} className="text-soft" /><input value={q} onChange={e => setQ(e.target.value)} placeholder="Search by name" className="min-w-0 flex-1 py-2 outline-none" /></label>
            <select value={grade} onChange={e => setGrade(e.target.value)} className="rounded-xl border-2 border-line bg-white px-3 py-2"><option value="">All grades</option>{Array.from({ length: 12 }, (_, i) => <option key={i} value={i + 1}>Grade {i + 1}</option>)}</select>
            <select value={tier} onChange={e => setTier(e.target.value)} className="rounded-xl border-2 border-line bg-white px-3 py-2"><option value="">All tiers</option>{TIERS.map(t => <option key={t}>{t}</option>)}</select>
            <button onClick={() => setFlagged(!flagged)} aria-pressed={flagged} className={clsx('flex items-center gap-1.5 rounded-xl border-2 px-3 font-bold', flagged ? 'border-orange bg-warm text-orange-deep' : 'border-line')}><Flag size={15} /> Flagged</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead><tr className="text-start text-xs text-soft">{['Student', 'Age', 'Date', 'Placement', 'Tier', 'Strength', 'Questions', 'Time', 'Flags'].map(h => <th key={h} className="border-b border-line px-2 py-2 text-start font-bold">{h}</th>)}</tr></thead>
              <tbody>
                {list.map((t, i) => (
                  <motion.tr key={t.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: Math.min(i, 20) * 0.02 }} onClick={() => open(t.id)} className="cursor-pointer hover:bg-mist">
                    <td className="border-b border-line px-2 py-2.5"><span className="flex items-center gap-2 font-bold"><span className="text-xl">{t.avatar}</span>{t.name}{t.simulated && <span className="rounded bg-sky px-1.5 text-[10px] font-bold text-soft">demo</span>}</span></td>
                    <td className="border-b border-line px-2">{t.age}</td>
                    <td className="whitespace-nowrap border-b border-line px-2 text-soft">{when(t.createdAt)}</td>
                    <td className="border-b border-line px-2 font-bold">{t.placement ? `Grade ${t.placement.grade}` : <span className="font-semibold text-soft">{t.status === 'abandoned' ? 'Not finished' : 'In progress'}</span>}</td>
                    <td className="border-b border-line px-2">{t.tier && <TierBadge tier={t.tier.tier} />}</td>
                    <td className="border-b border-line px-2">{t.tier && <span className="font-bold">{t.tier.strength}</span>}</td>
                    <td className="border-b border-line px-2">{t.answers.length}</td>
                    <td className="whitespace-nowrap border-b border-line px-2">{t.finishedAt ? `${mins(t.finishedAt - t.createdAt)} min` : ''}</td>
                    <td className="border-b border-line px-2">{t.flags.filter(f => FLAG[f].tone === 'warn').length > 0 && <AlertTriangle size={16} className="text-orange" />}</td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
            {!list.length && <p className="p-6 text-center text-soft">No tests match these filters.</p>}
          </div>
        </div>
      ) : <Groups tests={done} open={open} />}
    </div>
  )
}

function Groups({ tests, open }: { tests: TestRecord[]; open: (id: string) => void }) {
  const grades = [...new Set(tests.map(t => t.placement!.grade))].sort((a, b) => a - b)
  return (
    <div className="flex flex-col gap-3">
      <p className="m-0 text-sm text-soft">One session group is one grade and one tier. If a group is too small, merge it with the next tier. Never put Foundation and Advanced together.</p>
      {grades.map(g => (
        <motion.div layout key={g} className="rounded-3xl border border-line bg-white p-4 shadow-[var(--shadow-card)]">
          <div className="mb-3 flex items-center gap-2"><Users size={18} className="text-blue" /><h3 className="m-0 text-xl text-deep">Grade {g}</h3><span className="text-sm text-soft">{tests.filter(t => t.placement!.grade === g).length} {tests.filter(t => t.placement!.grade === g).length === 1 ? 'student' : 'students'}</span></div>
          <div className="grid gap-3 md:grid-cols-3">
            {TIERS.map(tr => {
              const kids = tests.filter(t => t.placement!.grade === g && t.tier!.tier === tr)
              const s = TIER_STYLE[tr]
              return (
                <div key={tr} className={clsx('rounded-2xl p-3', s.bg)}>
                  <div className={clsx('mb-2 flex items-center justify-between text-sm font-extrabold', s.fg)}><span>{tr}</span><span>{kids.length}</span></div>
                  <div className="flex flex-wrap gap-1.5">
                    {kids.map(k => <motion.button whileHover={{ y: -2 }} key={k.id} onClick={() => open(k.id)} className="flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-sm font-bold shadow-sm"><span>{k.avatar}</span>{k.name}</motion.button>)}
                    {!kids.length && <span className="text-xs text-soft">Nobody yet</span>}
                  </div>
                  {kids.length > 0 && kids.length < 3 && <p className="m-0 mt-2 text-xs text-soft">Small group: consider merging with {tr === 'Core' ? 'Foundation or Advanced' : 'Core'}.</p>}
                </div>
              )
            })}
          </div>
        </motion.div>
      ))}
    </div>
  )
}

/* ---------------------------------------------------------------- one test */
function TestPage({ rec, back }: { rec: TestRecord; back: () => void }) {
  const [open, setOpen] = useState<AnswerRec | null>(null)
  const p = rec.placement, tr = rec.tier
  const right = rec.answers.filter(a => a.ok).length
  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <button onClick={back} className="mb-4 flex items-center gap-1.5 rounded-full px-2 py-1 text-sm font-bold text-soft hover:bg-white"><ArrowLeft size={16} /> All tests</button>
      <div className="mb-4 flex flex-wrap items-center gap-4 rounded-3xl bg-gradient-to-r from-blue to-deep p-5 text-white shadow-[var(--shadow-pop)]">
        <div className="grid h-16 w-16 place-items-center rounded-2xl bg-white/15 text-4xl">{rec.avatar}</div>
        <div className="flex-1">
          <h1 className="m-0 text-3xl">{rec.name}</h1>
          <p className="m-0 text-sm opacity-90">Age {rec.age} · {when(rec.createdAt)} · {rec.lang === 'ar' ? 'Arabic' : 'English'} · {rec.answers.length} questions, {right} right{rec.finishedAt ? ` · ${mins(rec.finishedAt - rec.createdAt)} min` : ''}{rec.simulated ? ' · demo data' : ''}</p>
        </div>
        {p ? (
          <div className="rounded-2xl bg-white px-5 py-3 text-center text-ink">
            <div className="text-xs font-bold text-soft">Placement</div>
            <div className="font-[var(--font-head)] text-3xl font-extrabold text-blue">Grade {p.grade}</div>
            <div className="text-xs text-soft">Level {p.lv}, {p.which} grade</div>
          </div>
        ) : <span className="rounded-full bg-white/20 px-3 py-1 font-bold">{rec.status === 'abandoned' ? 'Not finished' : 'In progress'}</span>}
        <Confirm onYes={() => { store.remove(rec.id); back() }} className="flex items-center gap-1 rounded-full p-2 text-sm font-bold hover:bg-white/15" ask="Delete?"><Trash2 size={18} /></Confirm>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <Panel title="Journey through the test" sub="Each stop is a step. Higher means a higher level. Click a stop, then a question.">
          <Journey rec={rec} onQuestion={setOpen} />
        </Panel>
        <div className="flex flex-col gap-4">
          {tr && <TierCard rec={rec} />}
          <Panel title="Flags for the teacher">
            {rec.flags.length ? rec.flags.map(f => (
              <div key={f} className={clsx('mb-2 flex gap-2 rounded-xl p-3 text-sm', FLAG[f].tone === 'warn' ? 'bg-warm' : 'bg-sky')}>
                {FLAG[f].tone === 'warn' ? <AlertTriangle size={16} className="mt-0.5 shrink-0 text-orange" /> : <Info size={16} className="mt-0.5 shrink-0 text-blue" />}{FLAG[f].text}
              </div>
            )) : <p className="m-0 text-sm text-soft">None. Nothing unusual in this test.</p>}
          </Panel>
        </div>
      </div>

      <Panel title="Every answer" className="mt-4">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-xs text-soft">{['#', 'Step', 'Question', 'Pool', 'Difficulty', 'Type', 'Result', 'Time'].map(h => <th key={h} className="border-b border-line px-2 py-2 text-start">{h}</th>)}</tr></thead>
            <tbody>{rec.answers.map((a, i) => { const q = BY_ID.get(a.qid)!; return (
              <tr key={a.qid} onClick={() => setOpen(a)} className="cursor-pointer hover:bg-mist">
                <td className="border-b border-line px-2 py-2 text-soft">{i + 1}</td><td className="border-b border-line px-2">{STEP_LABEL[a.step]} <span className="text-soft">L{a.lv}</span></td>
                <td className="max-w-[340px] truncate border-b border-line px-2"><b>{q.id}</b> {q.q}</td><td className="border-b border-line px-2">{q.pool}</td><td className="border-b border-line px-2">{q.d}</td><td className="border-b border-line px-2">{q.t}</td>
                <td className={clsx('border-b border-line px-2 font-extrabold', a.ok ? 'text-ok' : 'text-bad')}>{a.ok ? '✓ Right' : '✗ Wrong'}</td><td className="border-b border-line px-2">{Math.round(a.sec)}s</td>
              </tr>) })}</tbody>
          </table>
        </div>
      </Panel>
      <AnimatePresence>{open && <AnswerDrawer rec={rec} a={open} close={() => setOpen(null)} />}</AnimatePresence>
    </div>
  )
}

function TierCard({ rec }: { rec: TestRecord }) {
  const tr = rec.tier!, s = TIER_STYLE[tr.tier]
  const R = 52, C = 2 * Math.PI * R
  return (
    <Panel title="Tier for group sessions" sub="Team only. Students and parents see only the grade.">
      <div className="flex items-center gap-4">
        <svg width="130" height="130" viewBox="0 0 130 130" className="shrink-0">
          <circle cx="65" cy="65" r={R} fill="none" stroke="#ECF8FF" strokeWidth="14" />
          <motion.circle cx="65" cy="65" r={R} fill="none" stroke={s.dot} strokeWidth="14" strokeLinecap="round" transform="rotate(-90 65 65)"
            strokeDasharray={C} initial={{ strokeDashoffset: C }} animate={{ strokeDashoffset: C * (1 - tr.strength / 100) }} transition={{ duration: 1, ease: 'easeOut' }} />
          {[45, 75].map(v => { const a = (v / 100) * 2 * Math.PI - Math.PI / 2; return <circle key={v} cx={65 + R * Math.cos(a)} cy={65 + R * Math.sin(a)} r="3" fill="#0E2A4D" /> })}
          <text x="65" y="66" textAnchor="middle" fontSize="30" fontWeight="800" fill="#0E2A4D">{tr.strength}</text>
          <text x="65" y="86" textAnchor="middle" fontSize="11" fill="#5B7599">strength</text>
        </svg>
        <div>
          <TierBadge tier={tr.tier} big />
          <p className="m-0 mt-2 text-sm text-soft">{s.blurb}</p>
          <p className="m-0 mt-1 text-xs text-soft">{tr.earned} of {tr.possible} points from {tr.counted} questions at Level {rec.placement!.lv}. Confidence: <b>{tr.confidence}</b>.</p>
        </div>
      </div>
      <div className="mt-3 space-y-1.5">
        {(['Starter', 'Easy', 'Medium', 'Hard'] as Diff[]).filter(d => tr.byDiff[d].total).map(d => (
          <div key={d} className="grid grid-cols-[64px_1fr_40px] items-center gap-2 text-xs font-bold">
            <span className="text-soft">{d}</span>
            <div className="h-2.5 rounded-full bg-sky"><motion.div className="h-2.5 rounded-full bg-blue" initial={{ width: 0 }} animate={{ width: `${(tr.byDiff[d].right / tr.byDiff[d].total) * 100}%` }} /></div>
            <span>{tr.byDiff[d].right}/{tr.byDiff[d].total}</span>
          </div>
        ))}
      </div>
      {tr.reasons.map(r => <p key={r} className="m-0 mt-2 rounded-lg bg-warm px-3 py-2 text-xs font-bold text-orange-deep">{REASON[r]}{r.startsWith('cap') ? ` Strength alone gives ${tr.baseTier}.` : ''}</p>)}
    </Panel>
  )
}

function AnswerDrawer({ rec, a, close }: { rec: TestRecord; a: AnswerRec; close: () => void }) {
  const q = BY_ID.get(a.qid)!
  const [lang, setLang] = useState<'en' | 'ar'>(rec.lang)
  const draw = useMemo(() => a, [a])
  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={close} className="fixed inset-0 z-40 bg-ink/40" />
      <motion.aside initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', stiffness: 300, damping: 32 }}
        className="fixed inset-y-0 right-0 z-50 flex w-full max-w-xl flex-col overflow-y-auto bg-white shadow-2xl" dir="ltr">
        <div className="sticky top-0 z-10 flex items-center gap-2 border-b border-line bg-white px-5 py-3">
          <span className="text-sm font-bold text-soft">{q.id} · {q.pool} · {q.d} · {q.t}</span>
          <Seg value={lang} set={setLang} items={[['en', 'EN'], ['ar', 'عربي']]} small />
          <button onClick={close} className="ms-auto rounded-full p-1.5 hover:bg-sky" aria-label="Close"><X /></button>
        </div>
        <div className="flex flex-col gap-4 p-5">
          <div className={clsx('rounded-2xl p-3 text-sm', a.ok ? 'bg-green-50' : 'bg-red-50')}>
            <b className={a.ok ? 'text-ok' : 'text-bad'}>{a.ok ? '✓ Right' : '✗ Wrong'}</b> · answered in {a.sec.toFixed(1)} seconds
          </div>
          <div dir={lang === 'ar' ? 'rtl' : 'ltr'}><QuestionView q={q} lang={lang} value={draw.answer} review salt={rec.id} /></div>
          <Info2 label="Correct answer"><KeyLine q={q} lang={lang} /></Info2>
          <Info2 label="Why the wrong answers are wrong">{q.why}</Info2>
          <Info2 label="Why this question">
            The {STEP_LABEL[a.step].toLowerCase()} at Level {a.lv} needed a {q.pool.toLowerCase()} question ({q.d.toLowerCase()}). It was picked at random from {a.candidates} unseen questions that fit{a.fallback ? ', using the fallback rule (no question left at the asked difficulty)' : ''}.
          </Info2>
          <Info2 label="Curriculum source">{q.src} · strand: {q.strand}{q.old ? ` · v1 ID ${q.old}` : ' · new in v2'}</Info2>
        </div>
      </motion.aside>
    </>
  )
}

/* ---------------------------------------------------------------- small parts */
/** Two-click confirm built into the page (browser confirm dialogs are blocked in some hosts). */
function Confirm({ onYes, ask, className, children }: { onYes: () => void; ask: string; className: string; children: React.ReactNode }) {
  const [armed, setArmed] = useState(false)
  return <button onClick={() => (armed ? onYes() : (setArmed(true), setTimeout(() => setArmed(false), 3000)))} onBlur={() => setArmed(false)} className={clsx(className, armed && 'bg-orange text-white')}>{armed ? ask : children}</button>
}
export function TierBadge({ tier, big }: { tier: Tier; big?: boolean }) {
  const s = TIER_STYLE[tier]
  return <span className={clsx('inline-flex items-center gap-1.5 rounded-full font-extrabold', s.bg, s.fg, big ? 'px-3 py-1 text-base' : 'px-2 py-0.5 text-xs')}><i className="h-2 w-2 rounded-full" style={{ background: s.dot }} />{tier}</span>
}
export function Panel({ title, sub, children, className }: { title: string; sub?: string; children: React.ReactNode; className?: string }) {
  return <section className={clsx('rounded-3xl border border-line bg-white p-5 shadow-[var(--shadow-card)]', className)}><h3 className="m-0 text-xl text-deep">{title}</h3>{sub && <p className="m-0 mb-3 text-sm text-soft">{sub}</p>}{!sub && <div className="mb-3" />}{children}</section>
}
function Kpi({ label, value, sub, warn }: { label: string; value: React.ReactNode; sub: string; warn?: boolean }) {
  return <div className="rounded-2xl border border-line bg-white p-4 shadow-[var(--shadow-card)]"><div className="text-xs font-bold text-soft">{label}</div><div className={clsx('font-[var(--font-head)] text-3xl font-extrabold', warn ? 'text-orange-deep' : 'text-deep')}>{value}</div><div className="text-xs text-soft">{sub}</div></div>
}
function Info2({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><div className="mb-1 text-xs font-extrabold text-orange-deep">{label}</div><div className="text-sm">{children}</div></div>
}
export function Seg<T extends string>({ value, set, items, small }: { value: T; set: (v: T) => void; items: [T, React.ReactNode][]; small?: boolean }) {
  return (
    <div className="flex rounded-full bg-sky p-1">
      {items.map(([k, l]) => <button key={k} onClick={() => set(k)} aria-pressed={value === k} className={clsx('flex items-center gap-1.5 rounded-full font-bold', small ? 'px-2.5 py-0.5 text-xs' : 'px-3.5 py-1.5 text-sm', value === k ? 'bg-white text-deep shadow-sm' : 'text-soft')}>{l}</button>)}
    </div>
  )
}
export { Clock }
