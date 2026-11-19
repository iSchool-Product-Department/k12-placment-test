import { useMemo, useState } from 'react'
import { Reorder, motion } from 'motion/react'
import { Check, GripVertical, Volume2, X } from 'lucide-react'
import clsx from 'clsx'
import type { AnswerValue, Question } from '../engine/types'
import { check, correctAnswer, keysOf, matchPairs, seeded, sortBoxes } from '../engine/engine'
import { EMOJI, SORT_AR } from '../data/ladder'
import { T, type Band, type Lang } from '../i18n'
import { QuestionVisual } from './Visual'

const L = 'ABCD'
const hash = (s: string) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7)
export const stableShuffle = <T,>(arr: T[], salt: string) => {
  const r = seeded(hash(salt)), a = arr.slice()
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]] }
  return a
}
export const qText = (q: Question, lang: Lang) => (lang === 'ar' && q.qa) || q.q
export function optText(q: Question, i: number, lang: Lang) {
  const t = (lang === 'ar' && q.oa[i]) || q.o[i] || ''
  if (q.lv > 2 || /^\p{Extended_Pictographic}/u.test(t)) return t
  const e = EMOJI.find(([re]) => re.test(q.o[i]))
  return e && q.t !== 'Match' ? `${e[1]} ${t}` : t
}
const isCodey = (s: string) => !/[؀-ۿ]/.test(s) && (/[;{}=<>$#]|^\w[\w.]*\(.*\)$|\(\)/.test(s))
function OptLabel({ text, big }: { text: string; big?: boolean }) {
  const m = text.match(/^(\p{Extended_Pictographic}️?)\s*(.*)$/u)
  if (m) return <span className="flex items-center gap-3"><span className={big ? 'text-4xl' : 'text-2xl'} aria-hidden="true">{m[1]}</span><span>{m[2]}</span></span>
  return isCodey(text) ? <code className="whitespace-pre-wrap text-[14px]">{text}</code> : <span>{text}</span>
}

export function speak(q: Question, lang: Lang) {
  try {
    const s = window.speechSynthesis; s.cancel()
    const parts = [qText(q, lang)]
    if (q.t === 'Match') matchPairs(q, lang).forEach(p => parts.push(p.left))
    else keysOf(q).forEach(i => parts.push(optText(q, i, lang).replace(/^\p{Extended_Pictographic}️?\s*/u, '')))
    const u = new SpeechSynthesisUtterance(parts.join('. '))
    u.lang = lang === 'ar' ? 'ar-EG' : 'en-US'; u.rate = 0.92
    s.speak(u)
  } catch { /* no speech on this device */ }
}

export function answerText(q: Question, v: AnswerValue | null | undefined, lang: Lang = 'en'): string {
  if (v == null) return ''
  if (q.t === 'Type answer') return String(v)
  if (q.t === 'Order') return (v as string[]).map(k => optText(q, L.indexOf(k), lang)).join('  →  ')
  if (q.t === 'Sort') { const b = sortBoxes(q); return Object.entries(v as Record<string, number>).map(([k, bi]) => `${optText(q, L.indexOf(k), lang)}: ${b[bi]?.label}`).join(' · ') }
  if (q.t === 'Match') { const p = matchPairs(q, lang); return Object.entries(v as Record<string, number>).map(([l, r]) => `${p[+l].left} = ${p[r]?.right}`).join(' · ') }
  const i = L.indexOf(v as string)
  return i >= 0 ? optText(q, i, lang) : String(v)
}

interface Props {
  q: Question
  lang: Lang
  band?: Band
  value: AnswerValue | null
  onChange?: (v: AnswerValue | null) => void
  salt?: string
  review?: boolean
  showListen?: boolean
}

export function QuestionView({ q, lang, band = 'teen', value, onChange, salt = '', review, showListen = true }: Props) {
  const t = T[lang]
  const set = (v: AnswerValue | null) => !review && onChange?.(v)
  const keys = keysOf(q)
  const stageChoice = q.t === 'Order' ? ((value as string[] | null) || []).map(k => q.o[L.indexOf(k)]) : typeof value === 'string' && L.includes(value) ? q.o[L.indexOf(value)] : null
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start gap-3">
        <h2 className={clsx('m-0 flex-1 text-ink', band === 'kids' ? 'text-[26px] font-bold' : band === 'teen' ? 'text-2xl font-bold' : 'text-[22px] font-semibold')}>{qText(q, lang)}</h2>
        {showListen && (
          <button onClick={() => speak(q, lang)} className="flex shrink-0 items-center gap-1.5 rounded-full border-2 border-line bg-white px-3 py-1.5 text-sm font-extrabold text-deep hover:border-blue" aria-label={t.listen}>
            <Volume2 size={18} /> <span className="hidden sm:inline">{t.listen}</span>
          </button>
        )}
      </div>
      <QuestionVisual q={q} choice={stageChoice} />
      {q.t === 'Type answer' && <TypeAnswer value={value as string | null} set={set} placeholder={t.typeHere} review={review} />}
      {q.t === 'Order' && <OrderAnswer q={q} lang={lang} value={(value as string[]) || []} set={set} salt={salt} review={review} hint={t.tapOrder} clear={t.clear} />}
      {q.t === 'Sort' && <SortAnswer q={q} lang={lang} value={(value as Record<string, number>) || {}} set={set} review={review} hint={t.sortHint} />}
      {q.t === 'Match' && <MatchAnswer q={q} lang={lang} value={(value as Record<string, number>) || {}} set={set} salt={salt} review={review} hint={t.matchHint} />}
      {['Text MCQ', 'Code MCQ', 'Picture MCQ'].includes(q.t) && (
        <div className={clsx('grid gap-3', keys.some(k => (q.o[k] || '').length > 26) ? 'grid-cols-1' : keys.length === 4 ? 'sm:grid-cols-2' : band === 'kids' ? 'sm:grid-cols-3' : 'sm:grid-cols-1')}>
          {stableShuffle(keys, q.id + salt).map((k, n) => {
            const on = value === L[k], right = review && q.a.trim()[0] === L[k]
            return (
              <motion.button key={k} whileTap={{ scale: 0.97 }} onClick={() => set(L[k])} aria-pressed={on}
                className={clsx('flex min-h-[60px] items-center gap-3 rounded-2xl border-2 bg-white px-4 py-3 text-start font-bold transition-colors',
                  band === 'kids' && 'sm:flex-col sm:justify-center sm:text-center',
                  on && !review && 'border-blue bg-sky shadow-[0_0_0_4px_rgba(5,172,255,.18)]',
                  !on && !right && 'border-line hover:border-bright',
                  review && on && !right && 'border-bad bg-red-50', right && 'border-ok bg-green-50')}>
                <span className={clsx('grid h-8 w-8 shrink-0 place-items-center rounded-full text-sm font-extrabold', on ? 'bg-blue text-white' : 'bg-sky text-deep')}>{L[n]}</span>
                <OptLabel text={optText(q, k, lang)} big={band === 'kids'} />
                {review && right && <Check className="ms-auto text-ok" size={20} />}
                {review && on && !right && <X className="ms-auto text-bad" size={20} />}
              </motion.button>
            )
          })}
        </div>
      )}
    </div>
  )
}

function TypeAnswer({ value, set, placeholder, review }: { value: string | null; set: (v: string | null) => void; placeholder: string; review?: boolean }) {
  return <input dir="ltr" readOnly={review} value={value || ''} onChange={e => set(e.target.value.trim() ? e.target.value : null)} placeholder={placeholder} autoComplete="off" autoFocus={!review}
    className="w-full max-w-sm rounded-xl border-2 border-line bg-white px-4 py-3 text-xl outline-none focus:border-bright" />
}

function OrderAnswer({ q, lang, value, set, salt, review, hint, clear }: { q: Question; lang: Lang; value: string[]; set: (v: string[] | null) => void; salt: string; review?: boolean; hint: string; clear: string }) {
  const keys = keysOf(q).map(i => L[i])
  const pool = useMemo(() => stableShuffle(keys, q.id + salt), [q.id])
  const label = (k: string) => optText(q, L.indexOf(k), lang)
  return (
    <div className="flex flex-col gap-3">
      <p className="m-0 text-sm text-soft">{hint}</p>
      <Reorder.Group axis="y" values={value} onReorder={v => set(v)} className="m-0 flex min-h-[64px] list-none flex-col gap-2 rounded-2xl border-2 border-dashed border-bright bg-sky/50 p-2">
        {value.map((k, n) => (
          <Reorder.Item key={k} value={k} dragListener={!review} className="flex items-center gap-3 rounded-xl border-2 border-blue bg-white px-3 py-2 font-bold shadow-sm">
            <span className="grid h-7 w-7 place-items-center rounded-full bg-blue text-sm text-white">{n + 1}</span>
            <OptLabel text={label(k)} />
            {!review && <><GripVertical className="ms-auto cursor-grab text-soft" size={18} />
              <button onClick={() => set(value.filter(x => x !== k).length ? value.filter(x => x !== k) : null)} className="rounded-full p-1 text-soft hover:bg-sky" aria-label="remove"><X size={16} /></button></>}
          </Reorder.Item>
        ))}
      </Reorder.Group>
      {!review && (
        <div className="flex flex-wrap gap-2">
          {pool.filter(k => !value.includes(k)).map(k => (
            <motion.button layout key={k} whileTap={{ scale: 0.95 }} onClick={() => set([...value, k])} className="rounded-xl border-2 border-line bg-white px-3 py-2 font-bold hover:border-bright"><OptLabel text={label(k)} /></motion.button>
          ))}
          {value.length > 0 && <button onClick={() => set(null)} className="rounded-xl px-3 py-2 text-sm font-bold text-soft hover:bg-sky">{clear}</button>}
        </div>
      )}
    </div>
  )
}

function SortAnswer({ q, lang, value, set, review, hint }: { q: Question; lang: Lang; value: Record<string, number>; set: (v: Record<string, number> | null) => void; review?: boolean; hint: string }) {
  const boxes = sortBoxes(q)
  return (
    <div className="flex flex-col gap-2">
      <p className="m-0 text-sm text-soft">{hint}</p>
      {keysOf(q).map(i => (
        <div key={i} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-line bg-white px-3 py-2">
          <span className="font-bold"><OptLabel text={optText(q, i, lang)} /></span>
          <div className="flex gap-1.5">
            {boxes.map((b, bi) => (
              <button key={bi} onClick={() => set({ ...value, [L[i]]: bi })} aria-pressed={value[L[i]] === bi}
                className={clsx('rounded-full border-2 px-3 py-1.5 text-sm font-bold', value[L[i]] === bi ? 'border-blue bg-blue text-white' : 'border-line bg-white hover:border-bright')}>
                {lang === 'ar' ? SORT_AR[b.label] || b.label : b.label}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

const PAIR = ['#056FEC', '#FF7F1C', '#0F8F6B', '#9B6BFF']
function MatchAnswer({ q, lang, value, set, salt, review, hint }: { q: Question; lang: Lang; value: Record<string, number>; set: (v: Record<string, number> | null) => void; salt: string; review?: boolean; hint: string }) {
  const pairs = matchPairs(q, lang)
  const rights = useMemo(() => { let s = stableShuffle(pairs.map((_, i) => i), q.id + salt); if (s.every((v, i) => v === i)) s = [...s.slice(1), s[0]]; return s }, [q.id])
  const [sel, setSel] = useState<number | null>(null)
  const pairOfRight = (r: number) => Object.entries(value).find(([, rr]) => rr === r)?.[0]
  const pick = (r: number) => {
    if (sel == null || review) return
    const v = { ...value }
    for (const [l, rr] of Object.entries(v)) if (rr === r) delete v[l]
    v[sel] = r; set(v); setSel(null)
  }
  return (
    <div className="flex flex-col gap-2">
      <p className="m-0 text-sm text-soft">{hint}</p>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-2">
          {pairs.map((p, l) => {
            const paired = value[l] != null
            return (
              <motion.button key={l} whileTap={{ scale: 0.97 }} onClick={() => !review && setSel(l)}
                className={clsx('flex min-h-[52px] items-center gap-2 rounded-xl border-2 bg-white px-3 py-2 text-start font-bold', sel === l ? 'border-blue bg-sky' : 'border-line')}
                style={paired ? { borderColor: PAIR[l % 4] } : undefined}>
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs text-white" style={{ background: paired ? PAIR[l % 4] : '#B8CBE0' }}>{l + 1}</span>
                <OptLabel text={p.left} />
              </motion.button>
            )
          })}
        </div>
        <div className="flex flex-col gap-2">
          {rights.map(r => {
            const l = pairOfRight(r)
            const ok = review && l != null && +l === r
            return (
              <motion.button key={r} layout whileTap={{ scale: 0.97 }} onClick={() => pick(r)}
                className={clsx('flex min-h-[52px] items-center gap-2 rounded-xl border-2 bg-white px-3 py-2 text-start font-semibold', sel != null && !review ? 'border-dashed border-bright' : 'border-line', review && l != null && (ok ? 'bg-green-50' : 'bg-red-50'))}
                style={l != null ? { borderColor: PAIR[+l % 4], borderStyle: 'solid' } : undefined}>
                {l != null && <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs text-white" style={{ background: PAIR[+l % 4] }}>{+l + 1}</span>}
                <span>{pairs[r].right}</span>
              </motion.button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

/** Answer key summary used by the admin and content views. */
export function KeyLine({ q, lang = 'en' }: { q: Question; lang?: Lang }) {
  return <span>{answerText(q, correctAnswer(q), lang)}</span>
}
export const isRight = check
