import { motion } from 'motion/react'
import { Check, Volume2, X } from 'lucide-react'
import clsx from 'clsx'
import type { AnswerValue, Question } from '../engine/types'
import { check, correctAnswer, keysOf, matchPairs, seeded, sortBoxes, splitPair } from '../engine/engine'
import { BlockOrderAnswer, CodeOrderAnswer, MatchAnswer, OrderAnswer, SortAnswer } from './DragAnswers'
import { blockText, isBlockOrder, isCodeOrder } from './codeLines'
import { ICONS } from './icons'
import { T, type Band, type Lang } from '../i18n'
import { QuestionVisual, hasSim, hasVisual, looksLikeCode } from './Visual'

const L = 'ABCD'
const hash = (s: string) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7)
export const stableShuffle = <T,>(arr: T[], salt: string) => {
  const r = seeded(hash(salt)), a = arr.slice()
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]] }
  return a
}
export const qText = (q: Question, lang: Lang) => (lang === 'ar' && q.qa) || q.q
/** Option text. For Sort, only the item (the box is the answer). */
export function optText(q: Question, i: number, lang: Lang) {
  if (q.t === 'Sort') return splitPair(q, i, lang).left
  const t = (lang === 'ar' && q.oa[i]) || q.o[i] || ''
  return q.t === 'Order' && isBlockOrder(q) ? blockText(t) : t
}
/** Questions with a picture, stage, code or drag answers use the wide layout; text-only ones a narrower card. */
export const roomy = (q: Question) => !!q.img || hasVisual(q) || ['Order', 'Sort', 'Match'].includes(q.t)
export const picSrc = (p: string) => import.meta.env.BASE_URL + p
const isCodey = (s: string) => !/[؀-ۿ]/.test(s) && (/[;{}=<>$#]|^\w[\w.]*\(.*\)$|\(\)/.test(s))
/** An option's picture: a sheet picture, or a drawn icon for the emoji the sheet used. */
export function Art({ pic, icon, size }: { pic?: string; icon?: string; size: number }) {
  if (pic) return <img src={picSrc(pic)} alt="" style={{ width: size, height: size }} className="shrink-0 object-contain" />
  const I = icon && ICONS[icon]
  return I ? <span className="grid shrink-0 place-items-center text-blue" style={{ width: size, height: size }}><I size={size * 0.7} strokeWidth={1.75} /></span> : null
}
function OptLabel({ text, pic, icon, big, tile }: { text: string; pic?: string; icon?: string; big?: boolean; tile?: boolean }) {
  const label = isCodey(text) ? <code className="whitespace-pre-wrap text-[14px]" dir="ltr">{text}</code> : text ? <span>{text}</span> : null
  if (!pic && !icon) return label
  // Pictures must be big enough to read (PRD 6.6). Icons are simpler and can be smaller.
  if (tile) return <span className="flex flex-col items-center gap-2 text-center"><Art pic={pic} icon={icon} size={pic ? 120 : 64} />{label}</span>
  return <span className="flex items-center gap-3"><Art pic={pic} icon={icon} size={pic ? 88 : big ? 52 : 40} />{label}</span>
}

export function speak(q: Question, lang: Lang) {
  try {
    const s = window.speechSynthesis; s.cancel()
    const parts = [qText(q, lang)]
    if (q.t === 'Match') matchPairs(q, lang).forEach(p => parts.push(p.left))
    else keysOf(q).forEach(i => parts.push(optText(q, i, lang)))
    const u = new SpeechSynthesisUtterance(parts.join('. '))
    u.lang = lang === 'ar' ? 'ar-EG' : 'en-US'; u.rate = 0.92
    s.speak(u)
  } catch { /* no speech on this device */ }
}

export function answerText(q: Question, v: AnswerValue | null | undefined, lang: Lang = 'en'): string {
  if (v == null) return ''
  if (q.t === 'Type answer') return String(v)
  if (q.t === 'Order') return (v as string[]).filter(Boolean).map(k => optText(q, L.indexOf(k), lang)).join('  →  ')
  if (q.t === 'Sort') { const b = sortBoxes(q, lang); return Object.entries(v as Record<string, number>).map(([k, bi]) => `${optText(q, L.indexOf(k), lang)}: ${b[bi]?.label}`).join(' · ') }
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
  /** The answer is in: inputs stop, and a stage (if any) plays the answer, then calls onPlayed. */
  locked?: boolean
  onPlayed?: () => void
  /** The practice showed reading is hard: the Listen button stands out (it never plays by itself). */
  listenHot?: boolean
  /** The practice showed dragging is hard: hints talk about tapping only (tap works everywhere). */
  tapMode?: boolean
}

export function QuestionView({ q, lang, band = 'teen', value, onChange, salt = '', review, showListen = true, locked, onPlayed, listenHot, tapMode }: Props) {
  const t = T[lang]
  const set = (v: AnswerValue | null) => !review && !locked && onChange?.(v)
  const keys = keysOf(q)
  const label = (k: string) => <OptLabel text={optText(q, L.indexOf(k), lang)} pic={q.oimg?.[L.indexOf(k)]} icon={q.oicon?.[L.indexOf(k)]} big={band === 'kids'} />
  const art = (i: number) => <Art pic={q.oimg?.[i]} icon={q.oicon?.[i]} size={q.oimg?.[i] ? 72 : band === 'kids' ? 48 : 36} />
  const hint = (h: string) => (tapMode ? t.tapHint : h)
  const drag = { q, lang, salt, review, big: band === 'kids', shuffle: stableShuffle, label }
  // Picture tiles, word underneath: ages 6 to 9 for any picture or icon, every age for real pictures.
  const tiles = keys.some(k => q.oimg?.[k]) || (band === 'kids' && keys.some(k => q.oicon?.[k]))
  // Any picture, stage, code or blocks with a plain answer list: side by side on wider screens, so nothing scrolls.
  const side = (!!q.img || hasVisual(q)) && (q.t.endsWith('MCQ') || q.t === 'Type answer') && !tiles
  const wide = side && !hasSim(q) && !q.img && looksLikeCode(q)
  const plain = !roomy(q) && !keys.some(k => q.oimg?.[k] || q.oicon?.[k])
  const stageChoice = q.t === 'Order' ? ((value as string[] | null) || []).filter(Boolean).map(k => q.o[L.indexOf(k)]) : typeof value === 'string' && L.includes(value) ? q.o[L.indexOf(value)] : null
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-start gap-3">
        <h2 className={clsx('m-0 max-w-3xl flex-1 text-ink', band === 'kids' ? 'text-[26px] font-bold' : band === 'teen' ? 'text-2xl font-bold' : 'text-[22px] font-semibold')}>{qText(q, lang)}</h2>
        {showListen && (
          <button onClick={() => speak(q, lang)} aria-label={t.listen}
            className={clsx('flex shrink-0 items-center gap-1.5 rounded-full border-2 px-3 py-1.5 text-sm font-extrabold', listenHot ? 'border-orange bg-orange text-white' : 'border-line bg-white text-deep hover:border-blue')}>
            <Volume2 size={18} /> <span className={listenHot ? '' : 'hidden sm:inline'}>{t.listen}</span>
          </button>
        )}
      </div>
      <div className={clsx('flex flex-col gap-3', side && 'md:grid md:items-center md:gap-5', side && (wide ? 'md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]' : 'md:grid-cols-2'))}>
      {q.img && !hasSim(q)
        ? <img src={picSrc(q.img)} alt={q.scr} className="mx-auto max-h-[28vh] w-auto max-w-full rounded-2xl object-contain" />
        : <QuestionVisual q={q} choice={stageChoice} play={locked || review} onDone={onPlayed} />}
      <div className="contents" {...(locked ? { inert: '' } : {})}>
      {q.t === 'Type answer' && <TypeAnswer value={value as string | null} set={set} placeholder={t.typeHere} review={review} />}
      {q.t === 'Order' && (isBlockOrder(q)
        ? <BlockOrderAnswer {...drag} value={(value as string[]) || []} set={set} hint={hint(t.blockOrder)} clear={t.clear} />
        : isCodeOrder(q)
        ? <CodeOrderAnswer {...drag} value={(value as string[]) || []} set={set} hint={hint(t.codeOrder)} clear={t.clear} />
        : <OrderAnswer {...drag} value={(value as string[]) || []} set={set} hint={hint(t.tapOrder)} clear={t.clear} />)}
      {q.t === 'Sort' && <SortAnswer {...drag} value={(value as Record<string, number>) || {}} set={set} hint={hint(t.sortHint)} />}
      {q.t === 'Match' && <MatchAnswer {...drag} art={art} value={(value as Record<string, number>) || {}} set={set} hint={hint(t.matchHint)} />}
      {['Text MCQ', 'Code MCQ', 'Picture MCQ'].includes(q.t) && (
        <div className={clsx('grid gap-2.5', side ? 'grid-cols-1' : tiles ? (keys.length === 4 ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-3') : keys.some(k => (q.o[k] || '').length > 70) ? 'grid-cols-1' : keys.length === 4 ? 'sm:grid-cols-2' : band === 'kids' ? 'sm:grid-cols-3' : 'sm:grid-cols-1')}>
          {stableShuffle(keys, q.id + salt).map((k, n) => {
            const on = value === L[k], right = review && L[k] === 'A'
            return (
              <motion.button key={k} whileTap={{ scale: 0.97 }} onClick={() => set(L[k])} aria-pressed={on}
                className={clsx('flex items-center gap-3 rounded-2xl border-2 bg-white px-4 text-start font-bold transition-colors', plain ? 'min-h-[64px] py-3.5 text-lg' : 'min-h-[52px] py-2.5',
                  tiles ? 'flex-col justify-center px-2 py-3 text-lg' : band === 'kids' && !side && 'sm:flex-col sm:justify-center sm:text-center',
                  on && !review && 'border-blue bg-sky shadow-[0_0_0_4px_rgba(5,172,255,.18)]',
                  !on && !right && 'border-line hover:border-bright',
                  review && on && !right && 'border-bad bg-red-50', right && 'border-ok bg-green-50')}>
                {!tiles && <span className={clsx('grid h-8 w-8 shrink-0 place-items-center rounded-full text-sm font-extrabold', on ? 'bg-blue text-white' : 'bg-sky text-deep')}>{L[n]}</span>}
                <OptLabel text={optText(q, k, lang)} pic={q.oimg?.[k]} icon={q.oicon?.[k]} big={band === 'kids'} tile={tiles} />
                {review && right && <Check className={tiles ? 'text-ok' : 'ms-auto text-ok'} size={20} />}
                {review && on && !right && <X className={tiles ? 'text-bad' : 'ms-auto text-bad'} size={20} />}
              </motion.button>
            )
          })}
        </div>
      )}
      </div>
      </div>
    </div>
  )
}

function TypeAnswer({ value, set, placeholder, review }: { value: string | null; set: (v: string | null) => void; placeholder: string; review?: boolean }) {
  return <input dir="ltr" readOnly={review} value={value || ''} onChange={e => set(e.target.value.trim() ? e.target.value : null)} placeholder={placeholder} autoComplete="off" autoFocus={!review}
    className="w-full max-w-sm rounded-xl border-2 border-line bg-white px-4 py-3 text-xl outline-none focus:border-bright" />
}

/** Answer key summary used by the admin and content views. */
export function KeyLine({ q, lang = 'en' }: { q: Question; lang?: Lang }) {
  return <span>{answerText(q, correctAnswer(q), lang)}</span>
}
export const isRight = check
