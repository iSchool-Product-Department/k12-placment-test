/**
 * Match, Order and Sort answers. They share one set of drag rules:
 * - Drag any card with a finger, a mouse, or the keyboard (Space to pick up, arrows to move, Space to drop).
 * - Or tap: tap a card, then where it goes. In Order, tapping a card puts it in the next empty slot.
 * - Drop on a taken place and the two cards swap (Match: the old link is replaced).
 * - Drag a placed card back out, or drop it on nothing, to take it back.
 * Code order is the one exception: the lines already sit in the editor, so you move them up and down.
 */
import { useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import {
  DndContext, DragOverlay, KeyboardSensor, PointerSensor, closestCenter, pointerWithin, useDraggable, useDroppable, useSensor, useSensors,
  type CollisionDetection, type DragEndEvent, type DragStartEvent,
} from '@dnd-kit/core'
import clsx from 'clsx'
import { ChevronDown, ChevronUp, GripVertical, Play } from 'lucide-react'
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { Question } from '../engine/types'
import { correctAnswer, keysOf, matchPairs, sortBoxes } from '../engine/engine'
import { blockIndents, blockText, codeFile, codeIndents } from './codeLines'
import { CodeText, blockColor } from './Visual'
import type { Lang } from '../i18n'

const L = 'ABCD'
type Shuffle = <T>(arr: T[], salt: string) => T[]
interface Common { q: Question; lang: Lang; salt: string; review?: boolean; hint: string; big?: boolean; shuffle: Shuffle; label: (k: string) => ReactNode }

// Pointer: drop where the finger is. Keyboard: drop on the closest place.
const collide: CollisionDetection = a => (a.pointerCoordinates ? pointerWithin(a) : closestCenter(a))
export const useDragSensors = () => useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }), useSensor(KeyboardSensor))

const Grip = () => <GripVertical size={18} className="ms-auto shrink-0 text-soft" aria-hidden="true" />

const cardCls = (big?: boolean) => clsx(
  'flex w-full select-none items-center gap-2 rounded-xl border-2 bg-white px-3 py-2 text-start font-bold transition-colors',
  big ? 'min-h-[64px] text-lg' : 'min-h-[52px]',
)

/** A card you can drag or tap. */
function Card({ id, disabled, onTap, className, style, children, extraRef }: {
  id: string; disabled?: boolean; onTap?: () => void; className?: string; style?: React.CSSProperties; children: ReactNode; extraRef?: (n: HTMLElement | null) => void
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id, disabled })
  return (
    <button type="button" ref={n => { setNodeRef(n); extraRef?.(n) }} {...attributes} {...listeners}
      onClick={e => { e.stopPropagation(); if (!disabled) onTap?.() }} style={style}
      className={clsx(className, !disabled && 'cursor-grab touch-none active:cursor-grabbing', isDragging && 'opacity-40')}>
      {children}
    </button>
  )
}

/** A place a card can go. Glows while a card is over it. */
function Zone({ id, disabled, onTap, className, children }: { id: string; disabled?: boolean; onTap?: () => void; className?: string; children: ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id, disabled })
  return <div ref={setNodeRef} onClick={() => !disabled && onTap?.()} className={clsx(className, isOver && 'border-bright! bg-sky')}>{children}</div>
}

// ---------------------------------------------------------------- Order
type OrderProps = Common & { value: string[]; set: (v: string[] | null) => void; clear: string }

/** Slots, tray, swap on drop, tap to place. */
function useOrder({ q, value, set, salt, shuffle }: OrderProps) {
  const keys = keysOf(q).map(i => L[i])
  const slots = keys.map((_, i) => value[i] || '')
  const pool = useMemo(() => shuffle(keys, q.id + salt), [q.id])
  const [active, setActive] = useState<string | null>(null)
  const put = (k: string, to: number | 'tray') => {
    const s = [...slots], from = s.indexOf(k)
    if (to === 'tray') { if (from >= 0) s[from] = '' }
    else { const prev = s[to]; s[to] = k; if (from >= 0 && from !== to) s[from] = prev }
    set(s.some(Boolean) ? s : null)
  }
  const ctx = {
    sensors: useDragSensors(), collisionDetection: collide,
    onDragStart: (e: DragStartEvent) => setActive(String(e.active.id)),
    onDragCancel: () => setActive(null),
    onDragEnd: ({ active: a, over }: DragEndEvent) => {
      setActive(null)
      put(String(a.id), !over || over.id === 'tray' ? 'tray' : +String(over.id).slice(1))
    },
  }
  return { slots, tray: pool.filter(k => !slots.includes(k)), active, put, ctx, right: (i: number) => q.o[L.indexOf(slots[i])] === q.o[i] }
}

export function OrderAnswer(p: OrderProps) {
  const { review, hint, big, label, clear, set } = p
  const { slots, tray, active, put, ctx, right } = useOrder(p)
  return (
    <DndContext {...ctx}>
      {/* Wider screens: the slots and the cards to place sit side by side, so the question fits without scrolling. */}
      <div className="flex flex-col gap-3 sm:grid sm:grid-cols-2 sm:items-start sm:gap-x-5">
        <p className="m-0 text-sm text-soft sm:col-span-2">{hint}</p>
        <ol className="m-0 flex list-none flex-col gap-2 p-0">
          {slots.map((k, i) => (
            <li key={i} className="flex items-center gap-3">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-blue text-sm font-extrabold text-white">{i + 1}</span>
              <Zone id={'s' + i} disabled={review} className={clsx('flex-1 rounded-xl border-2 border-dashed', k ? 'border-transparent' : 'border-bright/60 bg-sky/40', big ? 'min-h-[64px]' : 'min-h-[52px]')}>
                {k && (
                  <Card id={k} disabled={review} onTap={() => put(k, 'tray')}
                    className={clsx(cardCls(big), review ? (right(i) ? 'border-ok bg-green-50' : 'border-bad bg-red-50') : 'border-blue')}>
                    {label(k)}{!review && <Grip />}
                  </Card>
                )}
              </Zone>
            </li>
          ))}
        </ol>
        {!review && (
          <Zone id="tray" className="flex min-h-[60px] flex-wrap gap-2 rounded-2xl border-2 border-transparent p-1 sm:flex-col sm:flex-nowrap">
            {tray.map(k => (
              <Card key={k} id={k} onTap={() => put(k, slots.indexOf(''))} className={clsx(cardCls(big), 'w-auto border-line hover:border-bright')}>{label(k)}<Grip /></Card>
            ))}
            {slots.some(Boolean) && <button type="button" onClick={() => set(null)} className="rounded-xl px-3 py-2 text-sm font-bold text-soft hover:bg-sky">{clear}</button>}
          </Zone>
        )}
      </div>
      <DragOverlay dropAnimation={null}>{active && <div className={clsx(cardCls(big), 'border-blue shadow-[var(--shadow-pop)]')}>{label(active)}</div>}</DragOverlay>
    </DndContext>
  )
}

/**
 * "Put the lines in order" for levels 3 to 6 (PRD 6.5). Like moving lines in a real editor:
 * the program starts scrambled inside the editor, and the student drags lines up or down
 * (or taps a line, then where it goes, or uses the arrows). Each line keeps its real indent,
 * so the program only reads right when the order is right.
 */
export function CodeOrderAnswer({ q, lang, value, set, salt, review, hint, shuffle }: OrderProps) {
  const keys = keysOf(q).map(i => L[i])
  // Never starts already right. The answer only counts once a line has been moved.
  const start = useMemo(() => { let s = shuffle(keys, q.id + salt); if (s.every((k, i) => k === keys[i])) s = [...s.slice(1), s[0]]; return s }, [q.id])
  const order = value.length === keys.length && value.every(Boolean) ? value : start
  const [sel, setSel] = useState<string | null>(null)
  const [active, setActive] = useState<string | null>(null)
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }))
  const lines = keys.map(k => q.o[L.indexOf(k)])
  const { lang: language, file, unit } = codeFile(lines)
  const indents = codeIndents(lines)
  const text = (k: string) => q.o[L.indexOf(k)]
  const indent = (k: string) => indents[L.indexOf(k)] * unit
  const move = (from: number, to: number) => { if (to >= 0 && to < order.length && from !== to) set(arrayMove(order, from, to)); setSel(null) }
  const tap = (k: string) => (sel && sel !== k ? move(order.indexOf(sel), order.indexOf(k)) : setSel(sel === k ? null : k))
  const code = 'mono whitespace-pre-wrap break-words text-[13px] leading-relaxed text-ink sm:text-[14px]'

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter}
      onDragStart={e => { setSel(null); setActive(String(e.active.id)) }} onDragCancel={() => setActive(null)}
      onDragEnd={({ active: a, over }) => { setActive(null); if (over) move(order.indexOf(String(a.id)), order.indexOf(String(over.id))) }}>
      <div className="flex flex-col gap-3">
        <p className="m-0 text-sm text-soft">{hint}</p>
        <div dir="ltr" className="overflow-hidden rounded-2xl border border-line bg-white">
          <div className="flex items-end justify-between border-b border-line bg-mist px-2 pt-2">
            <span className="mono rounded-t-lg border border-b-0 border-line bg-white px-3 py-1.5 text-[13px] font-semibold text-ink">{file}</span>
            <span className="pb-1.5 pe-2 text-xs font-bold text-soft">{language}</span>
          </div>
          <SortableContext items={order} strategy={verticalListSortingStrategy}>
            <ol className="m-0 list-none py-2 ps-0">
              {order.map((k, i) => (
                <CodeLine key={k} id={k} n={i + 1} disabled={review} selected={sel === k}
                  status={review ? (q.o[L.indexOf(k)] === q.o[i] ? 'ok' : 'bad') : undefined}
                  onTap={() => tap(k)} onMove={d => move(i, i + d)} first={i === 0} last={i === order.length - 1} lang={lang}>
                  <code className={code} style={{ paddingInlineStart: `${indent(k)}ch` }}><CodeText src={text(k)} /></code>
                </CodeLine>
              ))}
            </ol>
          </SortableContext>
        </div>
      </div>
      <DragOverlay dropAnimation={null}>
        {active && (
          <div dir="ltr" className="flex items-center rounded-md border border-blue bg-white px-2 py-1.5 shadow-[var(--shadow-pop)]">
            <code className={code} style={{ paddingInlineStart: `${indent(active)}ch` }}><CodeText src={text(active)} /></code>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  )
}

function CodeLine({ id, n, disabled, selected, status, onTap, onMove, first, last, lang, children }: {
  id: string; n: number; disabled?: boolean; selected: boolean; status?: 'ok' | 'bad'; onTap: () => void; onMove: (d: number) => void
  first: boolean; last: boolean; lang: Lang; children: ReactNode
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id, disabled })
  const arrow = 'grid h-8 w-8 place-items-center rounded-md text-deep hover:bg-sky disabled:opacity-30'
  return (
    <li ref={setNodeRef} style={{ transform: CSS.Translate.toString(transform), transition }} className={clsx('flex items-center', isDragging && 'opacity-30')}>
      <span className="mono w-10 shrink-0 select-none pe-3 text-end text-[13px] text-soft/70">{n}</span>
      <button type="button" {...attributes} {...listeners} onClick={() => !disabled && onTap()}
        className={clsx('group flex min-h-[40px] min-w-0 flex-1 items-center gap-2 rounded-md px-2 py-1.5 text-start',
          status === 'ok' ? 'bg-green-50' : status === 'bad' ? 'bg-red-50' : selected ? 'bg-sky ring-2 ring-bright/60' : 'hover:bg-sky',
          !disabled && 'cursor-grab touch-none active:cursor-grabbing')}>
        <span className="min-w-0 flex-1">{children}</span>
        {!disabled && <GripVertical size={16} className="shrink-0 text-soft opacity-40 group-hover:opacity-100" aria-hidden="true" />}
      </button>
      <span className={clsx('flex shrink-0 pe-1', !selected && 'invisible')}>
        <button type="button" className={arrow} disabled={first} onClick={() => onMove(-1)} aria-label={lang === 'ar' ? 'انقل السطر لأعلى' : 'Move line up'}><ChevronUp size={18} /></button>
        <button type="button" className={arrow} disabled={last} onClick={() => onMove(1)} aria-label={lang === 'ar' ? 'انقل السطر لأسفل' : 'Move line down'}><ChevronDown size={18} /></button>
      </span>
    </li>
  )
}

// ---------------------------------------------------------------- Blocks (levels 1 and 2)
/**
 * Scratch-style: blocks wait in the palette, the student snaps them into the script.
 * Drag a block in (it lands where you drop it), drag it to reorder, drag it out to remove.
 * Or tap: a palette block goes to the bottom of the script, a script block goes back.
 * Loops and "if" wrap the blocks that sit inside them, read from the sheet's ">" rule.
 */
export function BlockOrderAnswer({ q, lang, value, set, salt, review, hint, big, shuffle }: OrderProps) {
  const keys = keysOf(q).map(i => L[i])
  const script = value.filter(Boolean)
  const pool = useMemo(() => shuffle(keys, q.id + salt), [q.id])
  const palette = pool.filter(k => !script.includes(k))
  const depths = blockIndents(keys.map(k => q.o[L.indexOf(k)]))
  const at = (k: string) => L.indexOf(k)
  const label = (k: string) => blockText((lang === 'ar' && q.oa[at(k)]) || q.o[at(k)])
  const color = (k: string) => blockColor(blockText(q.o[at(k)]))
  const opens = (k: string) => depths[at(k) + 1] > depths[at(k)]
  const hat = (k: string) => /^when\b/i.test(blockText(q.o[at(k)]))
  const hasHat = keys.some(hat)
  const [active, setActive] = useState<string | null>(null)
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }))
  const save = (s: string[]) => set(s.length ? s : null)
  // Prefer a block under the finger over the script area around it.
  const collideBlocks: CollisionDetection = a => {
    if (!a.pointerCoordinates) return closestCenter(a)
    const hits = pointerWithin(a), blocks = hits.filter(h => h.id !== 'script' && h.id !== 'palette')
    return blocks.length ? blocks : hits
  }
  const end = ({ active: a, over }: DragEndEvent) => {
    setActive(null)
    const k = String(a.id), o = over ? String(over.id) : 'palette', rest = script.filter(x => x !== k)
    if (o === 'palette') return script.includes(k) && save(rest)
    if (o === 'script') return save([...rest, k])
    if (script.includes(k)) return save(arrayMove(script, script.indexOf(k), script.indexOf(o)))
    const s2 = [...script]; s2.splice(script.indexOf(o), 0, k); save(s2)
  }

  // Lay the script out: blocks inside a loop get the loop's arm on their left, and the loop closes with a cap.
  type Open = { k: string; d: number; hat: boolean; kids: number }
  const rows: ReactNode[] = [], stack: Open[] = []
  const arms = () => stack.filter(o => !o.hat).map(o => o.k)
  const close = () => {
    const o = stack.pop()!
    if (o.hat) return
    if (!o.kids) rows.push(<Arms key={'m' + o.k} arms={[...arms(), o.k]} color={color} className="h-6" />)
    rows.push(<Arms key={'c' + o.k} arms={arms()} color={color}><span className={clsx('h-4 w-24 rounded-e-md rounded-bl-md', color(o.k).split(' ')[0])} /></Arms>)
  }
  script.forEach((k, i) => {
    while (stack.length && stack[stack.length - 1].d >= depths[at(k)]) close()
    if (stack.length) stack[stack.length - 1].kids++
    const ok = review ? q.o[at(k)] === q.o[i] : undefined
    rows.push(
      <ScriptBlock key={k} id={k} arms={arms()} color={color} disabled={review} big={big} hat={hat(k)} opens={opens(k)} ok={ok}
        onTap={() => save(script.filter(x => x !== k))}>{label(k)}</ScriptBlock>,
    )
    if (opens(k)) stack.push({ k, d: depths[at(k)], hat: hat(k), kids: 0 })
  })
  while (stack.length) close()

  return (
    <DndContext sensors={sensors} collisionDetection={collideBlocks} onDragStart={e => setActive(String(e.active.id))} onDragEnd={end} onDragCancel={() => setActive(null)}>
      {/* Wider screens: the palette sits beside the script, like the Scratch editor. */}
      <div className="flex flex-col gap-3 sm:grid sm:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] sm:items-start sm:gap-x-5">
        <p className="m-0 text-sm text-soft sm:col-span-2">{hint}</p>
        <SortableContext items={script} strategy={verticalListSortingStrategy}>
          <ScriptArea>
            {!hasHat && <div className="mb-px flex w-fit items-center gap-2 rounded-t-2xl rounded-b-md bg-orange px-4 pb-2 pt-3 text-sm font-extrabold text-white"><Play size={16} className="fill-white" />{lang === 'ar' ? 'عند التشغيل' : 'when Run it'}</div>}
            {rows}
            {!script.length && <div className="mt-1 rounded-md border-2 border-dashed border-bright/60 px-4 py-2 text-sm font-bold text-soft">{lang === 'ar' ? 'ضع الكتل هنا' : 'Snap blocks here'}</div>}
          </ScriptArea>
        </SortableContext>
        {!review && (
          <Zone id="palette" className="flex min-h-[56px] flex-wrap items-start gap-2 rounded-2xl border-2 border-transparent p-1 sm:flex-col sm:flex-nowrap">
            {palette.map(k => (
              <Card key={k} id={k} onTap={() => save([...script, k])}
                className={clsx('relative rounded-md px-3 font-extrabold', big ? 'py-3 text-base' : 'py-2 text-sm', color(k), hat(k) && 'rounded-t-2xl pt-3')}>
                {label(k)}
              </Card>
            ))}
          </Zone>
        )}
      </div>
      <DragOverlay dropAnimation={null}>
        {active && <div className={clsx('w-fit rounded-md px-3 font-extrabold shadow-[var(--shadow-pop)]', big ? 'py-3 text-base' : 'py-2 text-sm', color(active))}>{label(active)}</div>}
      </DragOverlay>
    </DndContext>
  )
}

/** The canvas the program is built on: a light dotted grid, like the Scratch stage area. */
function ScriptArea({ children }: { children: ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: 'script' })
  return (
    <ol ref={setNodeRef} className={clsx('m-0 flex min-h-[140px] list-none flex-col rounded-2xl border border-line p-4', isOver && 'border-bright')}
      style={{ backgroundColor: 'var(--color-mist)', backgroundImage: 'radial-gradient(var(--color-line) 1.2px, transparent 1.2px)', backgroundSize: '16px 16px' }}>
      {children}
    </ol>
  )
}

/** One row of the script: the arms of the loops it sits in, then the content. */
function Arms({ arms, color, className, children }: { arms: string[]; color: (k: string) => string; className?: string; children?: ReactNode }) {
  return <li className={clsx('flex items-stretch', className)}>{arms.map(k => <span key={k} className={clsx('w-4 shrink-0', color(k).split(' ')[0])} />)}{children}</li>
}

function ScriptBlock({ id, arms, color, disabled, big, hat, opens, ok, onTap, children }: {
  id: string; arms: string[]; color: (k: string) => string; disabled?: boolean; big?: boolean; hat: boolean; opens: boolean; ok?: boolean; onTap: () => void; children: ReactNode
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id, disabled })
  return (
    <li ref={setNodeRef} style={{ transform: CSS.Translate.toString(transform), transition }} className={clsx('flex items-stretch', isDragging && 'opacity-30')}>
      {arms.map(k => <span key={k} className={clsx('w-4 shrink-0', color(k).split(' ')[0])} />)}
      <button type="button" {...attributes} {...listeners} onClick={() => !disabled && onTap()}
        className={clsx('relative w-fit rounded-md px-3 text-start font-extrabold', big ? 'py-3 text-base' : 'py-2 text-sm', color(id),
          hat && 'rounded-t-2xl pt-3', opens && !hat && 'rounded-bl-none', ok === true && 'ring-4 ring-ok', ok === false && 'ring-4 ring-bad',
          !disabled && 'cursor-grab touch-none active:cursor-grabbing')}>
        {children}
      </button>
    </li>
  )
}

// ---------------------------------------------------------------- Sort
export function SortAnswer({ q, lang, value, set, salt, review, hint, big, shuffle, label }: Common & { value: Record<string, number>; set: (v: Record<string, number> | null) => void }) {
  const boxes = sortBoxes(q, lang)
  const items = useMemo(() => shuffle(keysOf(q).map(i => L[i]), q.id + salt), [q.id])
  const key = correctAnswer(q) as Record<string, number>
  const [sel, setSel] = useState<string | null>(null)
  const [active, setActive] = useState<string | null>(null)
  const sensors = useDragSensors()

  const place = (k: string, b: number | null) => {
    const v = { ...value }
    if (b == null) delete v[k]; else v[k] = b
    set(Object.keys(v).length ? v : null); setSel(null)
  }
  const end = ({ active: a, over }: DragEndEvent) => {
    setActive(null)
    place(String(a.id), !over || over.id === 'tray' ? null : +String(over.id).slice(1))
  }
  const card = (k: string) => (
    <Card key={k} id={k} disabled={review} onTap={() => setSel(sel === k ? null : k)}
      className={clsx(cardCls(big), 'w-auto',
        review ? (value[k] === key[k] ? 'border-ok bg-green-50' : 'border-bad bg-red-50') : sel === k ? 'border-blue bg-sky' : 'border-line hover:border-bright')}>
      {label(k)}{!review && <Grip />}
    </Card>
  )
  const tray = items.filter(k => value[k] == null)

  return (
    <DndContext sensors={sensors} collisionDetection={collide} onDragStart={e => { setSel(null); setActive(String(e.active.id)) }} onDragEnd={end} onDragCancel={() => setActive(null)}>
      <div className="flex flex-col gap-3">
        <p className="m-0 text-sm text-soft">{hint}</p>
        {!review && (
          <Zone id="tray" onTap={() => sel && place(sel, null)} className="flex min-h-[60px] flex-wrap gap-2 rounded-2xl border-2 border-transparent p-1">
            {tray.map(card)}
          </Zone>
        )}
        <div className="grid grid-cols-2 gap-3">
          {boxes.map((b, bi) => (
            <Zone key={bi} id={'b' + bi} disabled={review} onTap={() => sel && place(sel, bi)}
              className={clsx('flex min-h-[140px] flex-col gap-2 rounded-2xl border-2 border-dashed p-2', sel ? 'border-blue bg-sky/40' : 'border-bright/60')}>
              <span className="px-1 text-center font-[var(--font-head)] text-base font-bold text-deep">{b.label}</span>
              {items.filter(k => value[k] === bi).map(card)}
            </Zone>
          ))}
        </div>
      </div>
      <DragOverlay dropAnimation={null}>{active && <div className={clsx(cardCls(big), 'w-auto border-blue shadow-[var(--shadow-pop)]')}>{label(active)}</div>}</DragOverlay>
    </DndContext>
  )
}

// ---------------------------------------------------------------- Match
// Brand colors, each pair also numbered so color is never the only cue.
const PAIR = ['#056FEC', '#FF7F1C', '#043FAD', '#C9A000']
type Pt = { x: number; y: number }

/** The point on card a's edge that faces card b, relative to the container. Works in LTR and RTL. */
function edge(a: DOMRect, b: DOMRect, c: DOMRect): Pt {
  const toRight = a.left + a.width / 2 < b.left + b.width / 2
  return { x: (toRight ? a.right : a.left) - c.left, y: a.top + a.height / 2 - c.top }
}

function MatchCard({ id, disabled, onTap, children, className, style, cardRef }: {
  id: string; disabled?: boolean; onTap: () => void; children: ReactNode; className: string; style?: React.CSSProperties; cardRef: (n: HTMLElement | null) => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id, disabled })
  return <Card id={id} disabled={disabled} onTap={onTap} extraRef={n => { setNodeRef(n); cardRef(n) }} style={style} className={clsx(className, isOver && 'border-bright! bg-sky')}>{children}</Card>
}

export function MatchAnswer({ q, lang, value, set, salt, review, hint, big, shuffle, art }: Omit<Common, 'label'> & { value: Record<string, number>; set: (v: Record<string, number> | null) => void; art: (i: number) => ReactNode }) {
  const pairs = matchPairs(q, lang)
  const rights = useMemo(() => { let s = shuffle(pairs.map((_, i) => i), q.id + salt); if (s.every((v, i) => v === i)) s = [...s.slice(1), s[0]]; return s }, [q.id])
  const box = useRef<HTMLDivElement>(null)
  const cards = useRef<Record<string, HTMLElement | null>>({})
  const start = useRef<Pt>({ x: 0, y: 0 })
  const [sel, setSel] = useState<string | null>(null)
  const [drag, setDrag] = useState<{ from: string; a: Pt; b: Pt } | null>(null)
  const [lines, setLines] = useState<{ l: number; r: number; a: Pt; b: Pt }[]>([])
  const sensors = useDragSensors()

  const sideOf = (id: string) => id[0]
  const leftOf = (r: number) => Object.entries(value).find(([, rr]) => rr === r)?.[0]
  const link = (x: string, y: string) => {
    if (sideOf(x) === sideOf(y)) return
    const l = +(sideOf(x) === 'L' ? x : y).slice(1), r = +(sideOf(x) === 'R' ? x : y).slice(1)
    const v = { ...value }
    for (const [k, rr] of Object.entries(v)) if (rr === r) delete v[k]
    v[l] = r; set(v)
  }
  const unlink = (id: string) => {
    const v = { ...value }
    if (sideOf(id) === 'L') delete v[+id.slice(1)]
    else { const l = leftOf(+id.slice(1)); if (l != null) delete v[+l] }
    set(Object.keys(v).length ? v : null)
  }
  const tap = (id: string) => {
    if (sel && sideOf(sel) !== sideOf(id)) { link(sel, id); setSel(null) }
    else setSel(sel === id ? null : id)
  }

  // Lines between linked cards. Measured from the real cards, so they follow layout, font and RTL.
  useLayoutEffect(() => {
    const el = box.current
    if (!el) return
    const measure = () => {
      const c = el.getBoundingClientRect()
      setLines(Object.entries(value).flatMap(([l, r]) => {
        const a = cards.current['L' + l]?.getBoundingClientRect(), b = cards.current['R' + r]?.getBoundingClientRect()
        return a && b ? [{ l: +l, r, a: edge(a, b, c), b: edge(b, a, c) }] : []
      }))
    }
    measure()
    const ro = new ResizeObserver(measure); ro.observe(el)
    return () => ro.disconnect()
  }, [value, lang])

  const onStart = ({ active, activatorEvent }: DragStartEvent) => {
    setSel(null)
    const id = String(active.id), el = cards.current[id], other = cards.current[(sideOf(id) === 'L' ? 'R' : 'L') + '0']
    if (!el || !other || !box.current) return
    const r = el.getBoundingClientRect(), c = box.current.getBoundingClientRect()
    const ev = activatorEvent as PointerEvent
    start.current = 'clientX' in ev ? { x: ev.clientX, y: ev.clientY } : { x: r.left + r.width / 2, y: r.top + r.height / 2 }
    const a = edge(r, other.getBoundingClientRect(), c)
    setDrag({ from: id, a, b: a })
  }
  const onMove = ({ delta }: { delta: Pt }) => {
    const c = box.current?.getBoundingClientRect()
    if (c) setDrag(d => d && { ...d, b: { x: start.current.x + delta.x - c.left, y: start.current.y + delta.y - c.top } })
  }
  const onEnd = ({ active, over }: DragEndEvent) => {
    setDrag(null)
    const id = String(active.id)
    if (over && sideOf(String(over.id)) !== sideOf(id)) link(id, String(over.id))
    else if (!over) unlink(id)
  }

  const colorOf = (l: number) => (review ? (value[l] === l ? '#12A150' : '#D93A3A') : PAIR[l % PAIR.length])
  const badge = (l: number) => <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-extrabold text-white" style={{ background: colorOf(l) }}>{l + 1}</span>
  const target = (side: string) => (drag && sideOf(drag.from) !== side) || (sel && sideOf(sel) !== side)
  // The dot on the edge facing the other column: where you drag from, and where the line lands.
  const handle = (side: string, color: string | undefined, hint: boolean) => (
    <span aria-hidden="true" style={{ borderColor: color ?? '#05ACFF' }}
      className={clsx('absolute top-1/2 grid h-5 w-5 -translate-y-1/2 place-items-center rounded-full border-2 bg-white transition-transform group-hover:scale-125', side === 'L' ? '-end-2.5' : '-start-2.5')}>
      <span className="h-2 w-2 rounded-full" style={{ background: color ?? '#05ACFF' }} />
      {hint && <span className="absolute -inset-1 rounded-full border-2 border-bright motion-safe:animate-ping" />}
    </span>
  )
  const showHint = !review && !drag && !sel && Object.keys(value).length === 0
  const cls = (id: string, linked: boolean, side: string) => clsx(cardCls(big), 'group relative', side === 'R' && 'font-semibold',
    sel === id ? 'border-blue bg-sky' : target(side) && !linked ? 'border-dashed border-bright' : !linked && 'border-line hover:border-bright')

  return (
    <DndContext sensors={sensors} collisionDetection={collide} onDragStart={onStart} onDragMove={onMove} onDragEnd={onEnd} onDragCancel={() => setDrag(null)}>
      <div className="flex flex-col gap-2">
        <p className="m-0 text-sm text-soft">{hint}</p>
        <div ref={box} className="relative grid grid-cols-2 gap-x-8 gap-y-2 sm:gap-x-20">
          <svg className="pointer-events-none absolute inset-0 h-full w-full overflow-visible" aria-hidden="true">
            {lines.map(({ l, a, b }) => (
              <g key={l} stroke={colorOf(l)} fill={colorOf(l)}>
                <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} strokeWidth={3} strokeLinecap="round" />
              </g>
            ))}
            {drag && (
              <g stroke="#05ACFF" fill="#05ACFF">
                <line x1={drag.a.x} y1={drag.a.y} x2={drag.b.x} y2={drag.b.y} strokeWidth={3} strokeDasharray="6 6" strokeLinecap="round" />
                <circle cx={drag.b.x} cy={drag.b.y} r={9} fillOpacity={0.3} />
              </g>
            )}
          </svg>
          <div className="flex flex-col gap-2">
            {pairs.map((p, l) => {
              const id = 'L' + l, linked = value[l] != null
              return (
                <MatchCard key={id} id={id} disabled={review} onTap={() => tap(id)} cardRef={n => { cards.current[id] = n }}
                  className={clsx(cls(id, linked, 'L'), 'max-sm:flex-wrap max-sm:justify-center max-sm:text-center')} style={linked ? { borderColor: colorOf(l) } : undefined}>
                  {linked && badge(l)}
                  {art(l)}
                  {p.left && <span>{p.left}</span>}
                  {handle('L', linked ? colorOf(l) : undefined, showHint && l === 0)}
                </MatchCard>
              )
            })}
          </div>
          <div className="flex flex-col gap-2">
            {rights.map(r => {
              const id = 'R' + r, l = leftOf(r)
              return (
                <MatchCard key={id} id={id} disabled={review} onTap={() => tap(id)} cardRef={n => { cards.current[id] = n }}
                  className={cls(id, l != null, 'R')} style={l != null ? { borderColor: colorOf(+l) } : undefined}>
                  {l != null && badge(+l)}
                  <span>{pairs[r].right}</span>
                  {handle('R', l != null ? colorOf(+l) : undefined, false)}
                </MatchCard>
              )
            })}
          </div>
        </div>
      </div>
    </DndContext>
  )
}
