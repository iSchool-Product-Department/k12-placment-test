import { useEffect, useMemo, useState } from 'react'
import { motion } from 'motion/react'
import { Activity, BookOpen, Eye, EyeOff, FlaskConical, GitBranch, Layers, Play, Search, Settings2 } from 'lucide-react'
import clsx from 'clsx'
import { DEFAULT_CONFIG, POINTS, simulate } from '../engine/engine'
import type { AnswerValue, Config, Question, Tier } from '../engine/types'
import { BANK, LEVELS } from '../data/ladder'
import changesJson from '../data/changes.json'
import { store, useConfig, useTests } from '../store'
import { cloudOn } from '../cloud'
import { MIN_ANSWERS, questionHealth } from './health'
import { QuestionView, KeyLine } from '../question/QuestionView'
import { Panel, Seg, TierBadge } from '../admin/AdminApp'
import { TIER_STYLE } from '../admin/labels'

type Tab = 'bank' | 'health' | 'settings' | 'flow' | 'tiers' | 'sim'
export default function ContentApp({ route, go }: { route: string[]; go: (h: string) => void }) {
  const tab = (route[1] as Tab) || 'bank'
  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div><p className="m-0 text-sm font-extrabold text-orange-deep">Content</p><h1 className="m-0 text-3xl text-deep">Questions and rules</h1></div>
        <Seg value={tab} set={t => go(`content/${t}`)} items={[['bank', <><BookOpen size={15} /> Question bank</>], ['health', <><Activity size={15} /> Question health</>], ['settings', <><Settings2 size={15} /> Settings</>], ['flow', <><GitBranch size={15} /> Flowchart</>], ['tiers', <><Layers size={15} /> Tiers</>], ['sim', <><FlaskConical size={15} /> Simulator</>]]} />
      </div>
      {tab === 'bank' && <Bank pick={route[2]} />}
      {tab === 'health' && <Health go={go} />}
      {tab === 'settings' && <Settings />}
      {tab === 'flow' && <Flowchart />}
      {tab === 'tiers' && <Tiers />}
      {tab === 'sim' && <Sim go={go} />}
    </div>
  )
}

/* ---------------------------------------------------------------- question health */
const FLAG_STYLE: Record<string, string> = {
  'Too hard': 'bg-[#FDECEC] text-bad', 'Harder than its label': 'bg-[#FFF1E5] text-orange-deep',
  'Too easy': 'bg-sky text-deep', 'Easier than its label': 'bg-sky text-deep', Slow: 'bg-[#FFF8CC] text-[#8A6A00]',
}
const FLAG_WHY: Record<string, string> = {
  'Too hard': 'Under 25% right. Check the wording, the answer key and the picture.',
  'Harder than its label': 'Starter or Easy, but under half right. Maybe Medium.',
  'Too easy': '95% or more right. It tells us little.',
  'Easier than its label': 'Hard, but over 85% right. Maybe Medium.',
  Slow: 'Twice the usual time for its level. Often too much reading.',
}
function Health({ go }: { go: (h: string) => void }) {
  const all = useTests()
  const [state, setState] = useState(cloudOn ? 'loading' : 'ready')
  useEffect(() => { if (state === 'loading') store.loadRemote().then(() => setState('ready'), (e: Error) => setState(e.message)) }, [state])
  const [only, setOnly] = useState<'flagged' | 'all'>('flagged')
  const done = all.filter(t => t.status === 'done')
  const real = done.filter(t => !t.simulated)
  const tests = real.length ? real : done
  const rows = useMemo(() => questionHealth(BANK, tests), [tests.length, all])
  const shown = only === 'flagged' ? rows.filter(r => r.flags.length) : rows
  if (state === 'loading') return <p className="py-16 text-center font-bold text-soft">Loading tests...</p>
  if (state !== 'ready') return <p className="mx-auto max-w-md py-16 text-center font-bold text-bad">{state}</p>
  return (
    <Panel title="Question health" sub={`From ${tests.length} finished ${real.length ? 'tests' : 'simulated tests (no real tests yet, so treat this as a demo)'}. A question needs ${MIN_ANSWERS} answers before it can be flagged. ${rows.length} of ${BANK.length} questions have been answered.`}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <Seg small value={only} set={setOnly} items={[['flagged', `Needs a look (${rows.filter(r => r.flags.length).length})`], ['all', `All answered (${rows.length})`]]} />
        <div className="flex flex-wrap gap-1.5">{Object.keys(FLAG_STYLE).map(k => <span key={k} title={FLAG_WHY[k]} className={clsx('rounded-full px-2 py-0.5 text-xs font-bold', FLAG_STYLE[k])}>{k}</span>)}</div>
      </div>
      {shown.length === 0
        ? <p className="m-0 py-8 text-center text-sm font-bold text-soft">{rows.length ? 'Nothing needs a look right now.' : 'No answers yet. Results show here once students finish tests.'}</p>
        : <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-xs text-soft">{['Question', 'Level', 'Difficulty', 'Answers', 'Right', 'Avg time', 'Why'].map((h, i) => <th key={h} className={clsx('px-2 py-1', i >= 3 && i <= 5 ? 'text-end' : 'text-start')}>{h}</th>)}</tr></thead>
            <tbody>{shown.map(r => (
              <tr key={r.q.id} className="hover:bg-mist">
                <td className="max-w-[340px] border-t border-line px-2 py-2">
                  <button onClick={() => go(`content/bank/${r.q.id}`)} className="text-start"><b className="text-xs text-deep underline decoration-line underline-offset-2">{r.q.id}</b><span className="block truncate">{r.q.q}</span></button>
                </td>
                <td className="border-t border-line px-2">{r.q.lv}</td>
                <td className="border-t border-line px-2">{r.q.d}</td>
                <td className="border-t border-line px-2 text-end tabular-nums">{r.n}</td>
                <td className="border-t border-line px-2 text-end font-bold tabular-nums">{Math.round(r.right * 100)}%</td>
                <td className="border-t border-line px-2 text-end tabular-nums">{Math.round(r.sec)} s</td>
                <td className="border-t border-line px-2">
                  {r.n < MIN_ANSWERS ? <span className="text-xs text-soft">Too few answers</span>
                    : <div className="flex flex-wrap gap-1">{r.flags.map(k => <span key={k} title={FLAG_WHY[k]} className={clsx('rounded-full px-2 py-0.5 text-xs font-bold', FLAG_STYLE[k])}>{k}</span>)}</div>}
                </td>
              </tr>
            ))}</tbody>
          </table>
        </div>}
    </Panel>
  )
}

/* ---------------------------------------------------------------- bank */
// v4 content edits, built from the sheet's Change log rows (ChangeLog.csv) with each question's wording before.
type Change = { what: string; why: string; q: string; o: string[]; scr: string }
const CHANGES = changesJson as Record<string, Change>
const POOLS = ['Starter', 'Logic', 'Lower grade', 'Upper grade', 'Grade task'] as const
function Bank({ pick }: { pick?: string }) {
  // /content/bank/<id> opens that question (links from Question health).
  const picked = BANK.find(q => q.id === pick)
  const [f, setF] = useState({ lv: '', pool: '', d: '', t: '', q: picked?.id || '', ch: '' })
  const [sel, setSel] = useState<Question>(picked || BANK[0])
  const list = BANK.filter(q => (!f.lv || q.lv === +f.lv) && (!f.pool || q.pool === f.pool) && (!f.d || q.d === f.d) && (!f.t || q.t === f.t) && (!f.ch || !!CHANGES[q.id])
    && (!f.q || `${q.id} ${q.old} ${q.q} ${q.qa} ${q.strand}`.toLowerCase().includes(f.q.toLowerCase())))
  const types = [...new Set(BANK.map(q => q.t))]
  const sel_ = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => setF({ ...f, [k]: e.target.value })
  return (
    <div className="flex flex-col gap-4">
      <Panel title="Bank at a glance" sub="100 questions per level. The test draws from these pools. Grade numbers show which grade each pool checks.">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-xs text-soft"><th className="px-2 py-1 text-start">Level</th><th className="px-2 text-start">Grades</th>{POOLS.map(p => <th key={p} className="px-2 text-end">{p}</th>)}<th className="px-2 text-end">Match</th></tr></thead>
            <tbody>{LEVELS.map(L => (
              <tr key={L.lv} className="hover:bg-mist"><td className="border-t border-line px-2 py-1.5 font-bold">{L.lv} <span className="font-normal text-soft">({L.ages})</span></td><td className="border-t border-line px-2">{2 * L.lv - 1} and {2 * L.lv}</td>
                {POOLS.map(p => <td key={p} className="border-t border-line px-2 text-end">{BANK.filter(q => q.lv === L.lv && q.pool === p).length}</td>)}
                <td className="border-t border-line px-2 text-end">{BANK.filter(q => q.lv === L.lv && q.t === 'Match').length}</td></tr>
            ))}</tbody>
          </table>
        </div>
      </Panel>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <section className="rounded-3xl border border-line bg-white p-4 shadow-[var(--shadow-card)]">
          <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <select value={f.lv} onChange={sel_('lv')} className="rounded-xl border-2 border-line bg-white px-2 py-2"><option value="">All levels</option>{LEVELS.map(l => <option key={l.lv} value={l.lv}>Level {l.lv}</option>)}</select>
            <select value={f.pool} onChange={sel_('pool')} className="rounded-xl border-2 border-line bg-white px-2 py-2"><option value="">All pools</option>{POOLS.map(p => <option key={p}>{p}</option>)}</select>
            <select value={f.d} onChange={sel_('d')} className="rounded-xl border-2 border-line bg-white px-2 py-2"><option value="">All difficulty</option>{['Starter', 'Easy', 'Medium', 'Hard'].map(p => <option key={p}>{p}</option>)}</select>
            <select value={f.t} onChange={sel_('t')} className="rounded-xl border-2 border-line bg-white px-2 py-2"><option value="">All types</option>{types.map(p => <option key={p}>{p}</option>)}</select>
          </div>
          <label className="mb-2 flex w-fit cursor-pointer items-center gap-2 text-sm font-bold"><input type="checkbox" checked={!!f.ch} onChange={e => setF({ ...f, ch: e.target.checked ? '1' : '' })} className="accent-orange" /> Changed in v4 and v5 only ({Object.keys(CHANGES).length})</label>
          <label className="mb-2 flex items-center gap-2 rounded-xl border-2 border-line px-3"><Search size={16} className="text-soft" /><input value={f.q} onChange={sel_('q')} placeholder="Search text, ID or old ID" className="min-w-0 flex-1 py-2 outline-none" /></label>
          <p className="m-0 mb-2 text-xs font-bold text-soft">{list.length} questions</p>
          <div className="max-h-[640px] overflow-y-auto pe-1">
            {list.map(q => (
              <button key={q.id} onClick={() => setSel(q)} className={clsx('mb-1.5 flex w-full items-start gap-3 rounded-xl border-2 px-3 py-2 text-start', sel.id === q.id ? 'border-blue bg-sky' : 'border-transparent hover:bg-mist')}>
                <span className="w-[74px] shrink-0 text-xs font-extrabold text-deep">{q.id}</span>
                <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{q.q}</span><span className="text-xs text-soft">{q.pool} · {q.d} · {q.t}{CHANGES[q.id] && <b className="ms-1.5 text-orange-deep">· changed</b>}</span></span>
                <DiffDot d={q.d} />
              </button>
            ))}
          </div>
        </section>
        <Preview key={sel.id} q={sel} />
      </div>
    </div>
  )
}
const DiffDot = ({ d }: { d: string }) => <i className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: { Starter: '#12A150', Easy: '#05ACFF', Medium: '#FF7F1C', Hard: '#D93A3A' }[d] }} title={d} />

function Changed({ c }: { c: Change }) {
  return (
    <details className="mb-3 rounded-2xl bg-warm p-3 text-sm">
      <summary className="cursor-pointer font-bold text-deep">Changed: {c.what}</summary>
      <p className="m-0 mt-2 text-soft">{c.why}</p>
      <div className="mt-2 rounded-xl border border-line bg-white p-3">
        <p className="m-0 text-xs font-extrabold text-soft">Before</p>
        <p className="m-0 mt-1 font-semibold">{c.q}</p>
        {c.scr && <p className="m-0 mt-1 whitespace-pre-line font-mono text-xs text-soft">{c.scr}</p>}
        <ol className="m-0 mt-1 ps-5 text-soft">{c.o.map((o, i) => <li key={i}>{o}</li>)}</ol>
      </div>
    </details>
  )
}

function Preview({ q }: { q: Question }) {
  const [lang, setLang] = useState<'en' | 'ar'>('en')
  const [show, setShow] = useState(false)
  const [v, setV] = useState<AnswerValue | null>(null)
  const band = q.lv <= 2 ? 'kids' : q.lv <= 4 ? 'teen' : 'pro'
  return (
    <section className="self-start lg:sticky lg:top-20 rounded-3xl border border-line bg-white p-5 shadow-[var(--shadow-card)]">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="text-sm font-extrabold text-deep">{q.id}</span>
        <span className="text-xs text-soft">{q.old ? `v1: ${q.old}` : 'new in v2'} · Level {q.lv} · {q.grade} · {q.strand}</span>
        <div className="ms-auto flex gap-2">
          <Seg value={lang} set={l => { setLang(l); setV(null) }} items={[['en', 'EN'], ['ar', 'عربي']]} small />
          <button onClick={() => setShow(!show)} className="flex items-center gap-1 rounded-full border-2 border-line px-2.5 text-xs font-bold">{show ? <EyeOff size={14} /> : <Eye size={14} />} Key</button>
        </div>
      </div>
      {CHANGES[q.id] && <Changed c={CHANGES[q.id]} />}
      <p className="m-0 mb-3 text-xs font-bold text-orange-deep">Student preview: what a {band === 'kids' ? '6 to 9' : band === 'teen' ? '10 to 13' : '14 to 18'} year old sees</p>
      <div className="rounded-2xl border border-dashed border-line bg-mist p-4" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
        <QuestionView key={q.id + lang + show} q={q} lang={lang} band={band} value={show ? v : v} onChange={setV} review={show} salt="preview" />
      </div>
      {show && <div className="mt-3 space-y-2 text-sm">
        <div><b className="text-orange-deep">Correct:</b> <KeyLine q={q} lang={lang} /></div>
        <div><b className="text-orange-deep">Why the wrong answers are wrong:</b> {q.why}</div>
        <div className="text-soft"><b>Source:</b> {q.src}</div>
      </div>}
    </section>
  )
}

/* ---------------------------------------------------------------- settings */
const range = (a: number, b: number) => (a === b ? `${a}` : `${a} to ${b}`)
function Settings() {
  const cfg = useConfig()
  const set = (k: keyof Config, v: number) => store.setConfig({ ...cfg, [k]: v })
  const fields: [keyof Config, string, number][] = [
    ['warmPass', 'Warm-up: pass at (of 3 logic)', 3], ['knowUp', 'Grade check: one level higher at (of 3)', 3], ['knowLow', 'Grade check: lower grade at or below (of 3)', 3],
    ['gradeUpper', 'Final check: upper grade at (of 4)', 4], ['coreAt', 'Tier: Creators starts at strength', 100], ['advAt', 'Tier: Innovators starts at strength', 100],
    ['fastSec', 'Fast answer: seconds', 10], ['fastCount', 'Fast answers before a flag', 15],
  ]
  const r = range
  const table: [string, string, string][] = [
    ['Warm-up', r(cfg.warmPass, 3), 'Grade check at the age level'],
    ['Warm-up', r(0, cfg.warmPass - 1), 'Warm-up one level lower. Ages 6 to 7: Grade 1, Explorers'],
    ['Warm-up one level lower', r(cfg.warmPass, 3), 'Final check at that level'],
    ['Warm-up one level lower', r(0, cfg.warmPass - 1), 'Lower grade of that level, Explorers'],
    ['Grade check', r(0, cfg.knowLow), 'Lower grade of the age level'],
    ['Grade check', r(cfg.knowLow + 1, cfg.knowUp - 1), 'Final check at the age level'],
    ['Grade check', r(cfg.knowUp, 3), 'Grade check one level higher. Ages 16 to 18: final check'],
    ['Grade check one level higher', r(0, cfg.knowLow), 'Upper grade of the age level'],
    ['Grade check one level higher', r(cfg.knowLow + 1, cfg.knowUp - 1), 'Lower grade of the higher level'],
    ['Grade check one level higher', r(cfg.knowUp, 3), 'Final check at the higher level'],
    ['Final check', r(0, cfg.gradeUpper - 1), 'Lower grade'],
    ['Final check', r(cfg.gradeUpper, 4), 'Upper grade'],
  ]
  return (
    <div className="grid gap-4 lg:grid-cols-[360px_minmax(0,1fr)]">
      <div className="flex flex-col gap-4">
        <Panel title="Settings" sub="Change and try them. New tests use these values. Saved in this browser.">
          <div className="space-y-2">
            {fields.map(([k, label, max]) => (
              <label key={k} className="grid grid-cols-[1fr_76px] items-center gap-2 text-sm">
                <span>{label}</span>
                <input type="number" min={0} max={max} value={cfg[k]} onChange={e => set(k, Math.max(0, Math.min(max, +e.target.value || 0)))} className="rounded-lg border-2 border-line bg-warm px-2 py-1.5 text-end font-bold" />
              </label>
            ))}
          </div>
          <button onClick={() => store.setConfig(DEFAULT_CONFIG)} className="mt-3 text-sm font-bold text-blue">Back to starting values</button>
        </Panel>
      </div>
      <div className="flex flex-col gap-4">
        <Panel title="Every possible score" sub="Built from the settings on the left, so it always matches what the test does.">
          <table className="w-full text-sm">
            <thead><tr className="text-xs text-soft"><th className="py-1 text-start">Step</th><th className="text-start">Right answers</th><th className="text-start">Outcome</th></tr></thead>
            <tbody>{table.map(([a, b, c], i) => <tr key={i} className={i && table[i - 1][0] !== a ? 'border-t-2 border-line' : ''}><td className="py-1.5 pe-2 font-bold">{a}</td><td className="whitespace-nowrap pe-2">{b}</td><td>{c}</td></tr>)}</tbody>
          </table>
        </Panel>
        <Panel title="Edge cases">
          <ul className="m-0 space-y-1.5 ps-5 text-sm">
            <li><b>Only the number of right answers moves the student.</b> Which questions were right only affects the tier.</li>
            <li><b>Missed the starter</b> but got both puzzles: the warm-up still passes. Flag "check digital basics", tier at most Creators.</li>
            <li><b>Level 1 warm-up fails</b>: no level below, so Grade 1, Explorers, flagged. This is the shortest test (3 questions).</li>
            <li><b>Ages 16 to 18 and strong</b>: no level above, so straight to the final check.</li>
            <li><b>No unseen question at the asked difficulty</b>: any unseen question from the same pool and level. Shown in the team view.</li>
            <li><b>Closed the page</b>: within 24 hours the student continues where they stopped. After that the test expires.</li>
            <li><b>Match, Order, Sort</b>: right only when everything is in place. Typed answers ignore spaces, capitals and Arabic digits.</li>
          </ul>
        </Panel>
      </div>
    </div>
  )
}

/* ---------------------------------------------------------------- flowchart (PRD 5.2, 5.3) */
type Node = 'practice' | 'warm' | 'down' | 'know' | 'up' | 'final' | 'tier'
type Branch = { score: string; to: Node | null; end?: string }
function Flowchart() {
  const cfg = useConfig()
  const r = range
  const [sel, setSel] = useState<Node>('warm')
  const N: Record<Node, { title: string; qs: string; mix: string; out: Branch[] }> = {
    practice: { title: 'Practice', qs: '1, not scored', mix: 'Teaches the controls and checks reading. Ages 6 to 9 drag, older students tap.', out: [{ score: 'Always', to: 'warm' }] },
    warm: { title: 'Warm-up', qs: 'Up to 4 at the age level', mix: '1 starter (not scored), then up to 3 medium logic. The third only comes after a miss.', out: [{ score: r(cfg.warmPass, 3), to: 'know' }, { score: r(0, cfg.warmPass - 1), to: 'down', end: 'Ages 6 to 7: Grade 1, Explorers' }] },
    down: { title: 'Warm-up one level lower', qs: 'Up to 4', mix: 'Same mix, one level lower', out: [{ score: r(cfg.warmPass, 3), to: 'final' }, { score: r(0, cfg.warmPass - 1), to: null, end: 'Lower grade of that level, Explorers' }] },
    know: { title: 'Grade check', qs: 'Up to 3 at the age level', mix: 'Lower grade easy and medium, upper grade medium. No hard. Stops once decided.', out: [{ score: r(0, cfg.knowLow), to: null, end: 'Lower grade of the age level' }, { score: r(cfg.knowLow + 1, cfg.knowUp - 1), to: 'final' }, { score: r(cfg.knowUp, 3), to: 'up', end: 'Ages 16 to 18 go to the final check' }] },
    up: { title: 'Grade check one level higher', qs: 'Up to 3', mix: 'Same mix, one level higher. Only for strong students.', out: [{ score: r(0, cfg.knowLow), to: null, end: 'Upper grade of the age level' }, { score: r(cfg.knowLow + 1, cfg.knowUp - 1), to: null, end: 'Lower grade of the higher level' }, { score: r(cfg.knowUp, 3), to: 'final' }] },
    final: { title: 'Final check', qs: 'Up to 4', mix: '3 lower-grade questions and 1 grade task. A hard one only after all right so far. Stops once decided, the grade task is always shown.', out: [{ score: r(0, cfg.gradeUpper - 1), to: 'tier', end: 'Lower grade' }, { score: r(cfg.gradeUpper, 4), to: 'tier', end: 'Upper grade' }] },
    tier: { title: 'Tier', qs: 'No questions', mix: 'Strength from the answers at the placed level', out: [{ score: `below ${cfg.coreAt}`, to: null, end: 'Explorers' }, { score: `${cfg.coreAt} to ${cfg.advAt - 1}`, to: null, end: 'Creators' }, { score: `${cfg.advAt}+`, to: null, end: 'Innovators' }] },
  }
  const into = (n: Node) => (Object.keys(N) as Node[]).filter(k => N[k].out.some(b => b.to === n))
  const lit = (n: Node) => n === sel || into(sel).includes(n) || N[sel].out.some(b => b.to === n)
  // Main road left to right; the two side roads sit under the step they branch from.
  const cols: Node[][] = [['practice'], ['warm', 'down'], ['know'], ['up'], ['final'], ['tier']]
  return (
    <Panel title="How a student moves through the test" sub="Click a step to see where students come from and where they go. Numbers come from Settings.">
      <div className="overflow-x-auto pb-2">
        <div className="grid min-w-[880px] grid-cols-6 gap-3">
          {cols.map((col, ci) => (
            <div key={ci} className="flex flex-col gap-3">
              {col.map(n => (
                <button key={n} onClick={() => setSel(n)} aria-pressed={sel === n}
                  className={clsx('rounded-2xl border-2 p-3 text-start transition-colors', sel === n ? 'border-blue bg-sky' : lit(n) ? 'border-bright bg-white' : 'border-line bg-white opacity-60 hover:opacity-100')}>
                  <div className="text-sm font-extrabold text-deep">{N[n].title}</div>
                  <div className="text-xs font-bold text-soft">{N[n].qs}</div>
                  <div className="mt-2 space-y-1">
                    {N[n].out.map((b, i) => (
                      <div key={i} className="flex items-start gap-1.5 text-xs">
                        <span className="shrink-0 rounded bg-mist px-1.5 py-0.5 font-extrabold text-ink">{b.score}</span>
                        <span>{b.to ? <>to <b>{N[b.to].title}</b>{b.end ? <span className="text-soft"> ({b.end})</span> : null}</> : <b className="text-orange-deep">{b.end}</b>}</span>
                      </div>
                    ))}
                  </div>
                </button>
              ))}
            </div>
          ))}
        </div>
      </div>
      <div className="mt-3 rounded-2xl bg-mist p-4 text-sm">
        <b className="text-deep">{N[sel].title}.</b> {N[sel].mix}.
        {into(sel).length > 0 && <> Students arrive from {into(sel).map(k => N[k].title).join(' or ')}.</>}
        <span className="text-soft"> The test never moves a student more than one level from their age.</span>
      </div>
    </Panel>
  )
}

/* ---------------------------------------------------------------- tiers */
function Tiers() {
  const cfg = useConfig()
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Panel title="Three tiers inside each grade" sub="Same questions as before. The tier uses the answers the test already has.">
        <div className="relative mb-6 mt-4 flex h-10 overflow-hidden rounded-full text-sm font-extrabold">
          <div className="grid place-items-center bg-[#FFE2CC] text-orange-deep" style={{ width: `${cfg.coreAt}%` }}>Explorers</div>
          <div className="grid place-items-center bg-[#CFE7FF] text-deep" style={{ width: `${cfg.advAt - cfg.coreAt}%` }}>Creators</div>
          <div className="grid flex-1 place-items-center bg-[#FFF1A6] text-[#8A6A00]">Innovators</div>
        </div>
        <div className="-mt-4 mb-4 flex justify-between text-xs font-bold text-soft"><span>0</span><span style={{ marginInlineStart: `${cfg.coreAt - 4}%` }}>{cfg.coreAt}</span><span>{cfg.advAt}</span><span>100</span></div>
        {(['Explorers', 'Creators', 'Innovators'] as Tier[]).map(t => <div key={t} className="mb-2 flex items-center gap-3"><TierBadge tier={t} /><span className="text-sm">{TIER_STYLE[t].blurb}</span></div>)}
      </Panel>
      <Panel title="How strength is worked out" sub="Only answers at the final level count. Harder questions count more.">
        <div className="mb-3 grid grid-cols-3 gap-2 text-center sm:grid-cols-5">
          {(Object.keys(POINTS) as (keyof typeof POINTS)[]).map(d => <div key={d} className="rounded-2xl bg-sky p-2.5"><div className="text-2xl font-extrabold text-deep">{POINTS[d]}</div><div className="text-xs font-bold text-soft">{d}</div></div>)}
        </div>
        <p className="m-0 text-sm">Strength = points earned ÷ points possible × 100.</p>
        <h4 className="mb-1 mt-4 text-deep">Caps</h4>
        <ul className="m-0 space-y-1 ps-5 text-sm">
          <li>Failed the warm-up at Level 1, or both warm-ups: <b>Explorers</b>.</li>
          <li>3 of 3 on the grade check one level higher: <b>Innovators</b>.</li>
          <li>Missed a digital literacy starter: <b>at most Creators</b>.</li>
          <li>4 or more answers in under 3 seconds: <b>at most Creators</b>.</li>
        </ul>
        <h4 className="mb-1 mt-4 text-deep">Confidence</h4>
        <p className="m-0 text-sm">7+ questions at the final level: high. 4 to 6: medium. 3 or fewer: the teacher confirms in session 1.</p>
      </Panel>
    </div>
  )
}

/* ---------------------------------------------------------------- simulator */
function Sim({ go }: { go: (h: string) => void }) {
  const cfg = useConfig()
  const [ab, setAb] = useState(3.5)
  const [age, setAge] = useState(10)
  const [res, setRes] = useState<{ grades: Record<number, Record<Tier, number>>; q: number; m: number } | null>(null)
  const run = () => {
    const N = 300, grades: Record<number, Record<Tier, number>> = {}; let q = 0, m = 0
    for (let i = 0; i < N; i++) {
      const r = simulate(ab, age, BANK, cfg)
      const g = r.placement!.grade; grades[g] ||= { Explorers: 0, Creators: 0, Innovators: 0 }; grades[g][r.tier!.tier]++
      q += r.answers.length; m += r.answers.reduce((s, a) => s + (BANK.find(x => x.id === a.qid)!.pool === 'Grade task' ? 75 : 40), 0) / 60
    }
    setRes({ grades, q: q / N, m: m / N })
  }
  const one = () => { const r = simulate(ab, age, BANK, cfg, Math.random, 'Simulated student'); store.save(r); go(`admin/${r.id}`) }
  const max = res ? Math.max(...Object.values(res.grades).map(g => g.Explorers + g.Creators + g.Innovators)) : 1
  return (
    <div className="grid gap-4 md:grid-cols-[340px_minmax(0,1fr)]">
      <Panel title="Simulated students" sub="Simulated students answer at random, more often right on questions at or below their skill.">
        <label className="block text-sm font-bold">Skill level: {ab.toFixed(1)} <span className="font-normal text-soft">(about Level {Math.round(ab)})</span></label>
        <input type="range" min={1} max={7} step={0.1} value={ab} onChange={e => setAb(+e.target.value)} className="w-full accent-[#056FEC]" />
        <label className="mt-3 block text-sm font-bold">Age: {age}</label>
        <input type="range" min={6} max={18} value={age} onChange={e => setAge(+e.target.value)} className="w-full accent-[#FF7F1C]" />
        <div className="mt-4 flex flex-wrap gap-2">
          <button onClick={run} className="flex items-center gap-1.5 rounded-full bg-orange px-4 py-2 font-extrabold text-white"><Play size={15} /> Run 300</button>
          <button onClick={one} className="rounded-full border-2 border-line px-4 py-2 font-bold hover:border-blue">Run one and open it</button>
        </div>
      </Panel>
      <Panel title="Where they land" sub="Grade and tier for 300 runs.">
        {!res ? <p className="text-soft">Press Run 300.</p> : (
          <>
            <div className="space-y-2">
              {Object.entries(res.grades).sort((a, b) => +a[0] - +b[0]).map(([g, t]) => (
                <div key={g} className="grid grid-cols-[72px_1fr_44px] items-center gap-2 text-sm font-bold">
                  <span>Grade {g}</span>
                  <div className="flex h-6 overflow-hidden rounded-lg bg-sky" style={{ width: `${((t.Explorers + t.Creators + t.Innovators) / max) * 100}%` }}>
                    {(['Explorers', 'Creators', 'Innovators'] as Tier[]).map(k => <motion.i key={k} initial={{ width: 0 }} animate={{ width: `${(t[k] / (t.Explorers + t.Creators + t.Innovators)) * 100}%` }} style={{ background: TIER_STYLE[k].dot }} title={`${k}: ${t[k]}`} />)}
                  </div>
                  <span className="text-end">{Math.round(((t.Explorers + t.Creators + t.Innovators) / 300) * 100)}%</span>
                </div>
              ))}
            </div>
            <div className="mt-3 flex gap-3 text-xs font-bold">{(['Explorers', 'Creators', 'Innovators'] as Tier[]).map(k => <span key={k} className="flex items-center gap-1"><i className="h-2.5 w-2.5 rounded-full" style={{ background: TIER_STYLE[k].dot }} />{k}</span>)}</div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-sky p-3"><div className="text-xs font-bold text-soft">Average questions</div><div className="text-2xl font-extrabold text-deep">{res.q.toFixed(1)}</div></div>
              <div className="rounded-2xl bg-sky p-3"><div className="text-xs font-bold text-soft">Average minutes (estimate)</div><div className="text-2xl font-extrabold text-deep">{res.m.toFixed(1)}</div></div>
            </div>
          </>
        )}
      </Panel>
    </div>
  )
}
