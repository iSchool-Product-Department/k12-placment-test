import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { AlertTriangle, ArrowLeft, Check, Download, Info, LayoutGrid, List, RotateCcw, Search, X } from 'lucide-react'
import clsx from 'clsx'
import type { AnswerRec, TestRecord, Tier } from '../engine/types'
import { groupName } from '../engine/engine'
import { GRADES, GradeIcon } from '../grades'
import { BY_ID } from '../data/ladder'
import { store, useTests } from '../store'
import { cloudOn, savedPassword, studentOnly } from '../cloud'
import { QuestionView, KeyLine, answerText } from '../question/QuestionView'
import { Journey } from './Journey'
import { FLAG, REASON, STEP_LABEL, TIER_STYLE, mins, when, TIER_NO } from './labels'

const TIERS: Tier[] = ['Explorers', 'Creators', 'Innovators']
/** As the iSchool admin shows a level: "Grade 3 - 4". */
const levelLabel = (lv: number) => `Grade ${2 * lv - 1} - ${2 * lv}`
const took = (t: TestRecord) => (t.finishedAt ? `${mins(t.finishedAt - t.createdAt)} min` : '')

export default function AdminApp(props: { route: string[]; go: (h: string) => void }) {
  const [state, setState] = useState(!cloudOn ? 'ready' : studentOnly && !savedPassword() ? 'password' : 'loading')
  useEffect(() => { if (state === 'loading') store.loadRemote().then(() => setState('ready'), (e: Error) => setState(e.message === 'password' ? 'password' : e.message)) }, [state])
  if (state === 'password') return <Password done={() => setState('ready')} />
  if (state === 'loading') return <p className="py-16 text-center font-bold text-soft">Loading tests...</p>
  if (state !== 'ready') return <p className="mx-auto max-w-md py-16 text-center font-bold text-bad">{state}</p>
  return <Admin {...props} />
}

function Password({ done }: { done: () => void }) {
  const [pw, setPw] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const submit = (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setErr('')
    store.loadRemote(pw).then(done, (x: Error) => { setErr(x.message === 'password' ? 'Wrong password.' : x.message); setBusy(false) })
  }
  return (
    <form onSubmit={submit} className="mx-auto mt-16 flex max-w-sm flex-col gap-3 rounded-3xl border border-line bg-white p-6 shadow-[var(--shadow-card)]">
      <div><p className="m-0 text-sm font-extrabold text-orange-deep">Admin</p><h1 className="m-0 text-2xl text-deep">Team password</h1></div>
      <input type="password" autoComplete="current-password" aria-label="Team password" required autoFocus value={pw} onChange={e => setPw(e.target.value)} className="w-full rounded-xl border-2 border-line bg-white px-3 py-2.5 font-semibold text-deep outline-none focus:border-blue" />
      {err && <p role="alert" className="m-0 text-sm font-bold text-bad">{err}</p>}
      <button disabled={busy} className="rounded-full bg-blue px-4 py-2.5 font-extrabold text-white disabled:opacity-60">{busy ? 'Opening...' : 'Open admin'}</button>
    </form>
  )
}

function Admin({ route, go }: { route: string[]; go: (h: string) => void }) {
  const tests = useTests()
  // PRD 7.1: finished tests only.
  const done = useMemo(() => tests.filter(t => t.status === 'done'), [tests])
  const rec = route[1] ? done.find(t => t.id === route[1]) : null
  if (rec) return <TestPage rec={rec} back={() => go('admin')} />
  return <TestsHome tests={done} open={i => go(`admin/${i}`)} />
}

/* ---------------------------------------------------------------- CSV */
function downloadCsv(name: string, rows: (string | number)[][]) {
  const cell = (v: string | number) => (/[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v))
  const blob = new Blob(['﻿' + rows.map(r => r.map(cell).join(',')).join('\n')], { type: 'text/csv;charset=utf-8' })
  const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: name })
  a.click(); URL.revokeObjectURL(a.href)
}
const testsCsv = (list: TestRecord[]) => downloadCsv('placement-tests.csv', [
  ['Student code', 'Name', 'Phone', 'Email', 'Age', 'Date', 'Group', 'Grade', 'Tier', 'Strength', 'Questions', 'Time (min)', 'Language'],
  ...list.map(t => [t.code || '', t.name, t.phone || '', t.email || '', t.age, new Date(t.createdAt).toISOString().slice(0, 10), groupName(t), t.placement!.grade, t.tier!.tier, t.tier!.strength, t.answers.length, mins(t.finishedAt! - t.createdAt), t.lang === 'ar' ? 'Arabic' : 'English']),
])

/* ---------------------------------------------------------------- list + groups */
function TestsHome({ tests, open }: { tests: TestRecord[]; open: (id: string) => void }) {
  const [view, setView] = useState<'list' | 'groups'>('list')
  const [q, setQ] = useState('')
  const [grade, setGrade] = useState('')
  const [tier, setTier] = useState('')
  const needle = q.trim().toLowerCase()
  const list = tests.filter(t => (!needle || `${t.name} ${t.code} ${t.phone}`.toLowerCase().replace(/\s/g, '').includes(needle.replace(/\s/g, '')))
    && (!grade || String(t.placement!.grade) === grade) && (!tier || t.tier!.tier === tier))
  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div><p className="m-0 text-sm font-extrabold text-orange-deep">Admin</p><h1 className="m-0 text-3xl text-deep">Placement tests</h1><p className="m-0 text-sm text-soft">{tests.length} finished tests. Unfinished tests are not shown.</p></div>
        <div className="flex flex-wrap gap-2">
          <Seg value={view} set={setView} items={[['list', <><List size={15} /> Tests</>], ['groups', <><LayoutGrid size={15} /> Groups</>]]} />
          {cloudOn
            ? <button onClick={() => store.loadRemote()} className="flex items-center gap-1.5 rounded-full border-2 border-line bg-white px-3 text-sm font-bold text-soft hover:border-blue"><RotateCcw size={14} /> Refresh</button>
            : <Confirm onYes={() => store.reset()} className="flex items-center gap-1.5 rounded-full border-2 border-line bg-white px-3 text-sm font-bold text-soft hover:border-blue" ask="Sure? Click again"><RotateCcw size={14} /> Reset demo</Confirm>}
        </div>
      </div>
      {view === 'list' ? (
        <section className="rounded-3xl border border-line bg-white p-4 shadow-[var(--shadow-card)]">
          <div className="mb-3 flex flex-wrap gap-2">
            <label className="flex min-w-[220px] flex-1 items-center gap-2 rounded-xl border-2 border-line px-3"><Search size={16} className="text-soft" /><input value={q} onChange={e => setQ(e.target.value)} placeholder="Search by name, code or phone" className="min-w-0 flex-1 py-2 outline-none" /></label>
            <select value={grade} onChange={e => setGrade(e.target.value)} className="rounded-xl border-2 border-line bg-white px-3 py-2"><option value="">All grades</option>{Array.from({ length: 12 }, (_, i) => <option key={i} value={i + 1}>Grade {i + 1}</option>)}</select>
            <select value={tier} onChange={e => setTier(e.target.value)} className="rounded-xl border-2 border-line bg-white px-3 py-2"><option value="">All tiers</option>{TIERS.map(t => <option key={t}>{t}</option>)}</select>
            <button onClick={() => testsCsv(list)} className="flex items-center gap-1.5 rounded-xl border-2 border-line px-3 font-bold hover:border-blue"><Download size={15} /> Export CSV</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead><tr className="text-xs text-soft">{['Student code', 'Name', 'Phone', 'Age', 'Date', 'Group', 'Time'].map(h => <th key={h} className="border-b border-line px-2 py-2 text-start font-bold">{h}</th>)}</tr></thead>
              <tbody>
                {list.map(t => (
                  <tr key={t.id} onClick={() => open(t.id)} className="cursor-pointer hover:bg-mist">
                    <td className="border-b border-line px-2 py-2" onClick={e => e.stopPropagation()}><Copy text={t.code || ''} /></td>
                    <td className="border-b border-line px-2"><span className="flex items-center gap-2 font-bold"><Initials name={t.name} size={26} />{t.name}</span></td>
                    <td className="whitespace-nowrap border-b border-line px-2" dir="ltr" onClick={e => e.stopPropagation()}><Copy text={t.phone || ''} /></td>
                    <td className="border-b border-line px-2">{t.age}</td>
                    <td className="whitespace-nowrap border-b border-line px-2 text-soft">{when(t.createdAt)}</td>
                    <td className="border-b border-line px-2"><TierBadge tier={t.tier!.tier} label={groupName(t)} /></td>
                    <td className="whitespace-nowrap border-b border-line px-2">{took(t)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!list.length && <p className="p-6 text-center text-soft">No tests match these filters.</p>}
          </div>
        </section>
      ) : <Groups tests={tests} open={open} />}
    </div>
  )
}

/** PRD 7.3: grade by tier, names in each box. */
function Groups({ tests, open }: { tests: TestRecord[]; open: (id: string) => void }) {
  const grades = [...new Set(tests.map(t => t.placement!.grade))].sort((a, b) => a - b)
  const csv = () => downloadCsv('placement-groups.csv', [['Group', 'Grade', 'Tier', 'Students'],
    ...grades.flatMap(g => TIERS.map(tr => { const k = tests.filter(t => t.placement!.grade === g && t.tier!.tier === tr); return [`${tr} G${g}`, g, tr, k.map(x => x.name).join('; ')] }).filter(r => r[3]))])
  return (
    <section className="rounded-3xl border border-line bg-white p-4 shadow-[var(--shadow-card)]">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="m-0 text-sm text-soft">One group is one grade and one tier. A small group can join the next tier, but never put Explorers and Innovators together.</p>
        <button onClick={csv} className="flex items-center gap-1.5 rounded-xl border-2 border-line px-3 py-1.5 text-sm font-bold hover:border-blue"><Download size={15} /> Export CSV</button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead><tr className="text-xs text-soft"><th className="w-24 border-b border-line px-2 py-2 text-start">Grade</th>{TIERS.map(tr => <th key={tr} className="border-b border-line px-2 py-2 text-start"><TierBadge tier={tr} /></th>)}</tr></thead>
          <tbody>{grades.map(g => (
            <tr key={g} className="align-top">
              <td className="border-b border-line px-2 py-3 font-extrabold text-deep">Grade {g}</td>
              {TIERS.map(tr => {
                const kids = tests.filter(t => t.placement!.grade === g && t.tier!.tier === tr)
                return (
                  <td key={tr} className="border-b border-line px-2 py-2.5">
                    <div className="flex flex-wrap gap-1.5">
                      {kids.map(k => <button key={k.id} onClick={() => open(k.id)} className="flex items-center gap-1 rounded-full border border-line bg-white py-0.5 pe-2.5 ps-1 font-bold hover:border-blue"><Initials name={k.name} size={20} />{k.name}</button>)}
                      {!kids.length && <span className="text-xs text-soft">Nobody yet</span>}
                    </div>
                  </td>
                )
              })}
            </tr>
          ))}</tbody>
        </table>
      </div>
    </section>
  )
}

/* ---------------------------------------------------------------- one test (PRD 7.2) */
function TestPage({ rec, back }: { rec: TestRecord; back: () => void }) {
  const [open, setOpen] = useState<AnswerRec | null>(null)
  const p = rec.placement!
  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <button onClick={back} className="mb-3 flex items-center gap-1.5 rounded-full px-2 py-1 text-sm font-bold text-soft hover:bg-white"><ArrowLeft size={16} /> All tests</button>
      <SummaryCard rec={rec} />
      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Panel title="Journey" sub="Each stop is a step. Higher means a higher level. Click a stop, then a question.">
          <Journey rec={rec} onQuestion={setOpen} />
        </Panel>
        <Strength rec={rec} />
      </div>
      <Panel title="Every answer" sub={`${rec.answers.filter(a => a.ok).length} of ${rec.answers.length} right. Click a row to see the question as the student saw it.`} className="mt-4">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-xs text-soft">{['#', 'Question', 'Step', 'Result', 'Time'].map(h => <th key={h} className="border-b border-line px-2 py-2 text-start">{h}</th>)}</tr></thead>
            <tbody>{rec.answers.map((a, i) => { const q = BY_ID.get(a.qid)!; return (
              <tr key={a.qid} onClick={() => setOpen(a)} className="cursor-pointer hover:bg-mist">
                <td className="border-b border-line px-2 py-2 text-soft">{i + 1}</td>
                <td className="max-w-[460px] truncate border-b border-line px-2"><b className="text-deep">{q.id}</b> {q.q}</td>
                <td className="whitespace-nowrap border-b border-line px-2">{STEP_LABEL[a.step]} <span className="text-soft">L{a.lv}</span></td>
                <td className={clsx('whitespace-nowrap border-b border-line px-2 font-extrabold', a.ok ? 'text-ok' : 'text-bad')}>{a.ok ? <><Check size={14} className="inline" /> Right</> : <><X size={14} className="inline" /> Wrong</>}</td>
                <td className="border-b border-line px-2">{Math.round(a.sec)}s</td>
              </tr>) })}</tbody>
          </table>
        </div>
      </Panel>
      <p className="mt-3 text-xs text-soft">Placed at Level {p.lv}, the {p.which} grade. {rec.simulated ? 'Demo data.' : ''}</p>
      <AnimatePresence>{open && <AnswerDrawer rec={rec} a={open} close={() => setOpen(null)} />}</AnimatePresence>
    </div>
  )
}

/** Styled like the student card in the iSchool admin: who, how to reach them, and the result. */
function SummaryCard({ rec }: { rec: TestRecord }) {
  const p = rec.placement!, s = TIER_STYLE[rec.tier!.tier]
  const field = (label: string, v: React.ReactNode) => <div><dt className="text-xs font-bold text-soft">{label}</dt><dd className="m-0 font-bold">{v}</dd></div>
  return (
    <section className="grid gap-5 rounded-3xl border border-line bg-white p-5 shadow-[var(--shadow-card)] md:grid-cols-[auto_minmax(0,1fr)_auto]">
      <Initials name={rec.name} size={96} />
      <div>
        <h1 className="m-0 text-3xl text-deep">{rec.name}</h1>
        <dl className="m-0 mt-2 grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-3">
          {field('Student code', <Copy text={rec.code || ''} />)}
          {field('Phone', <span dir="ltr"><Copy text={rec.phone || ''} /></span>)}
          {field('Email', <Copy text={rec.email || ''} />)}
          {field('Test date', when(rec.createdAt))}
          {field('Time taken', took(rec))}
          {field('Language', rec.lang === 'ar' ? 'Arabic' : 'English')}
        </dl>
      </div>
      {/* The group: grade (with its roadmap track), level and tier with its number. */}
      <div className={clsx('flex flex-col gap-3 rounded-2xl p-4 md:min-w-[280px]', s.bg)}>
        <div>
          <span className="text-xs font-bold text-soft">Group</span>
          <div className={clsx('font-[var(--font-head)] text-3xl font-extrabold leading-tight', s.fg)}><Copy text={groupName(rec)} /></div>
        </div>
        <div className="flex items-center gap-3">
          <GradeIcon g={p.grade} size={40} />
          <div className="min-w-0">
            <div className="font-extrabold">Grade {p.grade}: {GRADES[p.grade - 1].name}</div>
            <div className="text-xs text-soft">Level {levelLabel(p.lv)}, the {p.which} grade</div>
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <TierBadge tier={rec.tier!.tier} big />
          <span className="text-xs text-soft">{s.blurb}</span>
        </div>
      </div>
    </section>
  )
}

/** Strength next to the journey: the score, the bars by difficulty, and anything that changed the tier. */
function Strength({ rec }: { rec: TestRecord }) {
  const tr = rec.tier!, s = TIER_STYLE[tr.tier]
  const rows = (['Starter', 'Easy', 'Medium', 'Hard', 'Grade task'] as const).filter(d => tr.byDiff[d].total)
  const warn = rec.flags.filter(f => f !== 'fallback')
  return (
    <Panel title="Strength" sub={`Counts only Level ${rec.placement!.lv} answers. Team only.`}>
      <div className="flex items-baseline gap-2">
        <span className="font-[var(--font-head)] text-5xl font-extrabold text-ink">{tr.strength}</span>
        <span className="text-sm text-soft">of 100 · {tr.earned} of {tr.possible} points</span>
      </div>
      <div className="relative mt-2 h-2.5 rounded-full bg-sky">
        <motion.div className="h-full rounded-full" style={{ background: s.dot }} initial={{ width: 0 }} animate={{ width: `${tr.strength}%` }} transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }} />
        {[45, 75].map(v => <i key={v} className="absolute -top-1 h-4.5 w-0.5 bg-ink/50" style={{ insetInlineStart: `${v}%` }} title={String(v)} />)}
      </div>
      <div className="mt-1 flex justify-between text-[11px] font-bold text-soft"><span>Explorers</span><span>Creators</span><span>Innovators</span></div>
      <div className="mt-4 space-y-1.5">
        {rows.map(d => (
          <div key={d} className="grid grid-cols-[76px_1fr_36px] items-center gap-2 text-xs font-bold">
            <span className="text-soft">{d}</span>
            <div className="h-2 rounded-full bg-sky"><div className="h-2 rounded-full bg-blue" style={{ width: `${(tr.byDiff[d].right / tr.byDiff[d].total) * 100}%` }} /></div>
            <span className="text-end">{tr.byDiff[d].right}/{tr.byDiff[d].total}</span>
          </div>
        ))}
      </div>
      {tr.reasons.map(r => <p key={r} className="m-0 mt-3 rounded-lg bg-warm px-3 py-2 text-xs font-bold text-orange-deep">{REASON[r]}{r.startsWith('cap') ? ` Strength alone gives ${tr.baseTier}.` : ''}</p>)}
      {warn.map(f => (
        <p key={f} className={clsx('m-0 mt-2 flex gap-2 rounded-lg px-3 py-2 text-xs', FLAG[f].tone === 'warn' ? 'bg-warm' : 'bg-sky')}>
          {FLAG[f].tone === 'warn' ? <AlertTriangle size={14} className="mt-px shrink-0 text-orange" /> : <Info size={14} className="mt-px shrink-0 text-blue" />}{FLAG[f].text}
        </p>
      ))}
    </Panel>
  )
}

function AnswerDrawer({ rec, a, close }: { rec: TestRecord; a: AnswerRec; close: () => void }) {
  const q = BY_ID.get(a.qid)!
  const [lang, setLang] = useState<'en' | 'ar'>(rec.lang)
  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={close} className="fixed inset-0 z-40 bg-ink/40" />
      <motion.aside initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        className="fixed inset-y-0 right-0 z-50 flex w-full max-w-xl flex-col overflow-y-auto bg-white shadow-2xl" dir="ltr">
        <div className="sticky top-0 z-10 flex items-center gap-2 border-b border-line bg-white px-5 py-3">
          <span className="text-sm font-bold text-soft">{q.id} · {q.pool} · {q.d}</span>
          <Seg value={lang} set={setLang} items={[['en', 'EN'], ['ar', 'عربي']]} small />
          <button onClick={close} className="ms-auto rounded-full p-1.5 hover:bg-sky" aria-label="Close"><X /></button>
        </div>
        <div className="flex flex-col gap-4 p-5">
          <div className={clsx('rounded-2xl p-3 text-sm', a.ok ? 'bg-green-50' : 'bg-red-50')}>
            <b className={a.ok ? 'text-ok' : 'text-bad'}>{a.ok ? 'Right' : 'Wrong'}</b> · answered in {a.sec.toFixed(1)} seconds
          </div>
          <div dir={lang === 'ar' ? 'rtl' : 'ltr'}><QuestionView q={q} lang={lang} value={a.answer} review salt={rec.id} showListen={false} /></div>
          <Info2 label="Their answer">{answerText(q, a.answer, lang)}</Info2>
          <Info2 label="Right answer"><KeyLine q={q} lang={lang} /></Info2>
          <Info2 label="Why the wrong answers are wrong">{q.why}</Info2>
          <Info2 label="Why this question">
            The {STEP_LABEL[a.step].toLowerCase()} at Level {a.lv} needed a {q.pool.toLowerCase()} question ({q.d.toLowerCase()}), picked at random from {a.candidates} unseen questions that fit{a.fallback ? ', using the fallback rule' : ''}.
          </Info2>
        </div>
      </motion.aside>
    </>
  )
}

/* ---------------------------------------------------------------- small parts */
/** PRD 7.2: click to copy, dotted underline like the iSchool admin, a small "Copied" note. */
function Copy({ text }: { text: string }) {
  const [ok, setOk] = useState(false)
  if (!text) return <span className="text-soft">Not given</span>
  const copy = () => { navigator.clipboard?.writeText(text).catch(() => {}); setOk(true); setTimeout(() => setOk(false), 1200) }
  return (
    <button onClick={copy} title="Click to copy" className="relative cursor-copy text-start underline decoration-dotted decoration-2 underline-offset-4 hover:text-blue">
      {text}
      <AnimatePresence>{ok && <motion.span initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="absolute -top-6 start-0 whitespace-nowrap rounded-md bg-ink px-1.5 py-0.5 text-[11px] font-bold text-white no-underline">Copied</motion.span>}</AnimatePresence>
    </button>
  )
}
/** Two-click confirm built into the page (browser confirm dialogs are blocked in some hosts). */
function Confirm({ onYes, ask, className, children }: { onYes: () => void; ask: string; className: string; children: React.ReactNode }) {
  const [armed, setArmed] = useState(false)
  return <button onClick={() => (armed ? onYes() : (setArmed(true), setTimeout(() => setArmed(false), 3000)))} onBlur={() => setArmed(false)} className={clsx(className, armed && 'bg-orange text-white')}>{armed ? ask : children}</button>
}
export function TierBadge({ tier, big, label }: { tier: Tier; big?: boolean; label?: string }) {
  const s = TIER_STYLE[tier]
  return <span className={clsx('inline-flex items-center gap-1.5 whitespace-nowrap rounded-full font-extrabold', s.bg, s.fg, big ? 'px-3 py-1 text-base' : 'px-2 py-0.5 text-xs')}><i className="h-2 w-2 rounded-full" style={{ background: s.dot }} />{label ?? tier} <span className="font-bold opacity-75">(Tier {TIER_NO[tier]})</span></span>
}
export function Panel({ title, sub, children, className }: { title: string; sub?: string; children: React.ReactNode; className?: string }) {
  return <section className={clsx('rounded-3xl border border-line bg-white p-5 shadow-[var(--shadow-card)]', className)}><h3 className="m-0 text-xl text-deep">{title}</h3>{sub ? <p className="m-0 mb-3 text-sm text-soft">{sub}</p> : <div className="mb-3" />}{children}</section>
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

/** First letters of the name, where the iSchool admin shows a student photo. */
function Initials({ name, size }: { name: string; size: number }) {
  const ini = name.trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase()
  return <span className="grid shrink-0 place-items-center rounded-full bg-sky font-extrabold text-deep" style={{ width: size, height: size, fontSize: size * 0.4 }}>{ini}</span>
}
