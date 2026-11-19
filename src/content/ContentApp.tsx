import { useMemo, useState } from 'react'
import { motion } from 'motion/react'
import { ArrowDown, BookOpen, Eye, EyeOff, FlaskConical, Layers, Play, Search, Settings2 } from 'lucide-react'
import clsx from 'clsx'
import { DEFAULT_CONFIG, POINTS, simulate } from '../engine/engine'
import type { AnswerValue, Config, Question, Tier } from '../engine/types'
import { BANK, LEVELS } from '../data/ladder'
import changesJson from '../data/changes.json'
import { store, useConfig } from '../store'
import { QuestionView, KeyLine } from '../question/QuestionView'
import { Panel, Seg, TierBadge } from '../admin/AdminApp'
import { TIER_STYLE } from '../admin/labels'

type Tab = 'bank' | 'rules' | 'tiers' | 'sim'
export default function ContentApp({ route, go }: { route: string[]; go: (h: string) => void }) {
  const tab = (route[1] as Tab) || 'bank'
  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div><p className="m-0 text-sm font-extrabold text-orange-deep">● Content</p><h1 className="m-0 text-3xl text-deep">Questions and rules</h1></div>
        <Seg value={tab} set={t => go(`content/${t}`)} items={[['bank', <><BookOpen size={15} /> Question bank</>], ['rules', <><Settings2 size={15} /> Rules</>], ['tiers', <><Layers size={15} /> Tiers</>], ['sim', <><FlaskConical size={15} /> Simulator</>]]} />
      </div>
      {tab === 'bank' && <Bank />}
      {tab === 'rules' && <Rules />}
      {tab === 'tiers' && <Tiers />}
      {tab === 'sim' && <Sim go={go} />}
    </div>
  )
}

/* ---------------------------------------------------------------- bank */
// v4 content edits, built from the sheet's Change log rows (ChangeLog-v4.csv) with each question's wording before.
type Change = { what: string; why: string; q: string; o: string[]; scr: string }
const CHANGES = changesJson as Record<string, Change>
const POOLS = ['Starter', 'Logic', 'Lower grade', 'Upper grade', 'Grade task'] as const
function Bank() {
  const [f, setF] = useState({ lv: '', pool: '', d: '', t: '', q: '', ch: '' })
  const [sel, setSel] = useState<Question>(BANK[0])
  const list = BANK.filter(q => (!f.lv || q.lv === +f.lv) && (!f.pool || q.pool === f.pool) && (!f.d || q.d === f.d) && (!f.t || q.t === f.t) && (!f.ch || !!CHANGES[q.id])
    && (!f.q || `${q.id} ${q.old} ${q.q} ${q.qa} ${q.strand}`.toLowerCase().includes(f.q.toLowerCase())))
  const types = [...new Set(BANK.map(q => q.t))]
  const sel_ = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => setF({ ...f, [k]: e.target.value })
  return (
    <div className="flex flex-col gap-4">
      <Panel title="Bank at a glance" sub="61 questions per level. The test draws from these pools. Grade numbers show which grade each pool checks.">
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
          <label className="mb-2 flex w-fit cursor-pointer items-center gap-2 text-sm font-bold"><input type="checkbox" checked={!!f.ch} onChange={e => setF({ ...f, ch: e.target.checked ? '1' : '' })} className="accent-orange" /> Changed in v4 only ({Object.keys(CHANGES).length})</label>
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
      <summary className="cursor-pointer font-bold text-deep">Changed in v4: {c.what}</summary>
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
    <section className="sticky top-20 self-start rounded-3xl border border-line bg-white p-5 shadow-[var(--shadow-card)]">
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

/* ---------------------------------------------------------------- rules */
function Rules() {
  const cfg = useConfig()
  const set = (k: keyof Config, v: number) => store.setConfig({ ...cfg, [k]: v })
  const fields: [keyof Config, string, number][] = [
    ['warmPass', 'Warm-up pass mark (of 3)', 3], ['knowUp', 'Knowledge: go up at (of 4)', 4], ['knowLow', 'Knowledge: lower grade at or below (of 4)', 4],
    ['gradeUpper', 'Grade check: upper grade at (of 4)', 4], ['coreAt', 'Tier: Creators starts at strength', 100], ['advAt', 'Tier: Innovators starts at strength', 100],
    ['fastSec', 'Fast answer: seconds', 10], ['fastCount', 'Fast answers before a flag', 15],
  ]
  const r = (a: number, b: number) => (a === b ? `${a}` : `${a} to ${b}`)
  const table: [string, string, string][] = [
    ['Warm-up (3)', r(cfg.warmPass, 3), 'Pass: knowledge check at this level'],
    ['Warm-up (3)', r(0, cfg.warmPass - 1), 'Fail: warm-up one level down. At Level 1: Grade 1, Explorers'],
    ['Warm-up down (3)', r(cfg.warmPass, 3), 'Final level is this level: grade check'],
    ['Warm-up down (3)', r(0, cfg.warmPass - 1), 'Lower grade of this level, Explorers'],
    ['Knowledge at S (4)', r(0, cfg.knowLow), 'Lower grade of S'],
    ['Knowledge at S (4)', r(cfg.knowLow + 1, cfg.knowUp - 1), 'Grade check at S'],
    ['Knowledge at S (4)', r(cfg.knowUp, 4), 'Knowledge check one level up (Level 6: grade check)'],
    ['Knowledge at S+1 (4)', r(0, cfg.knowLow), 'Upper grade of S'],
    ['Knowledge at S+1 (4)', r(cfg.knowLow + 1, cfg.knowUp - 1), 'Lower grade of S+1'],
    ['Knowledge at S+1 (4)', r(cfg.knowUp, 4), 'Grade check at S+1 (4 of 4 also flags "may belong higher")'],
    ['Grade check (4)', r(0, cfg.gradeUpper - 1), 'Lower grade of the final level'],
    ['Grade check (4)', r(cfg.gradeUpper, 4), 'Upper grade of the final level'],
  ]
  const flow = [
    ['Practice', 'Not scored', '1 question for the age'],
    ['1 · Warm-up at S', '3 questions', 'Starter (digital literacy, very easy) + Logic medium + Logic hard'],
    ['2 · Knowledge check', '4 questions', 'Lower easy, Lower medium, Upper medium, Upper hard'],
    ['3 · One level up (if strong)', '4 questions', 'Same mix at level S+1'],
    ['4 · Grade check', '4 questions', '3 lower-grade (medium or hard) + 1 grade task'],
    ['5 · Tier', 'No questions', 'Strength from answers at the final level'],
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
        <Panel title="The flow">
          {flow.map(([a, b, c], i) => (
            <div key={a}>
              <motion.div initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }} className="rounded-2xl border-s-4 border-blue bg-sky px-3 py-2">
                <div className="flex justify-between text-sm font-extrabold text-deep"><span>{a}</span><span className="text-soft">{b}</span></div>
                <div className="text-xs text-soft">{c}</div>
              </motion.div>
              {i < flow.length - 1 && <ArrowDown size={16} className="mx-auto my-1 text-soft" />}
            </div>
          ))}
        </Panel>
      </div>
      <div className="flex flex-col gap-4">
        <Panel title="Every possible score" sub="Built from the settings on the left, so it always matches what the test does.">
          <table className="w-full text-sm">
            <thead><tr className="text-xs text-soft"><th className="py-1 text-start">Step</th><th className="text-start">Correct</th><th className="text-start">Outcome</th></tr></thead>
            <tbody>{table.map(([a, b, c], i) => <tr key={i} className={i && table[i - 1][0] !== a ? 'border-t-2 border-line' : ''}><td className="py-1.5 pe-2 font-bold">{a}</td><td className="whitespace-nowrap pe-2">{b}</td><td>{c}</td></tr>)}</tbody>
          </table>
        </Panel>
        <Panel title="Edge cases">
          <ul className="m-0 space-y-1.5 ps-5 text-sm">
            <li><b>2 of 4, easy right and hard wrong</b>: middle score, grade check at the level. The usual case.</li>
            <li><b>2 of 4, hard right and easy wrong</b>: same path, plus an "odd pattern" flag for the teacher.</li>
            <li><b>Missed the starter</b> but got both puzzles: the warm-up still passes. Flag "check digital basics", tier at most Creators.</li>
            <li><b>Level 1 warm-up fails</b>: no level below, so Grade 1, Explorers, flagged. This is the shortest test (3 questions).</li>
            <li><b>Level 6 and strong</b>: no level above, so straight to the grade check.</li>
            <li><b>No unseen question at the asked difficulty</b>: any unseen question from the same pool and level. Shown in the team view.</li>
            <li><b>Closed early</b>: saved as "Not finished", no placement.</li>
            <li><b>Match, Order, Sort</b>: right only when everything is in place. Typed answers ignore spaces, capitals and Arabic digits.</li>
          </ul>
        </Panel>
      </div>
    </div>
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
        <div className="mb-3 grid grid-cols-4 gap-2 text-center">
          {(Object.keys(POINTS) as (keyof typeof POINTS)[]).map(d => <div key={d} className="rounded-2xl bg-sky p-3"><div className="text-2xl font-extrabold text-deep">{POINTS[d]}</div><div className="text-xs font-bold text-soft">{d}{d === 'Hard' ? ' / task' : ''}</div></div>)}
        </div>
        <p className="m-0 text-sm">Strength = points earned ÷ points possible × 100.</p>
        <h4 className="mb-1 mt-4 text-deep">Caps</h4>
        <ul className="m-0 space-y-1 ps-5 text-sm">
          <li>Failed the warm-up at Level 1, or both warm-ups: <b>Explorers</b>.</li>
          <li>4 of 4 one level up: <b>Innovators</b>.</li>
          <li>Missed a digital literacy starter: <b>at most Creators</b>.</li>
          <li>Many very fast answers: <b>at most Creators</b>.</li>
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
  const one = () => { const r = simulate(ab, age, BANK, cfg, Math.random, 'Simulated student'); r.avatar = '🧪'; store.save(r); go(`admin/${r.id}`) }
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
