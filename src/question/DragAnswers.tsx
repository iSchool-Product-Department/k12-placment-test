/**
 * Match, Order and Sort answers. They share one set of drag rules:
 * - Drag any card with a finger, a mouse, or the keyboard (Space to pick up, arrows to move, Space to drop).
 * - Or tap: tap a card, then where it goes. In Order, tapping a card puts it in the next empty slot.
 * - Drop on a taken place and the two cards swap (Match: the old link is replaced).
 * - Drag a placed card back out, or drop it on nothing, to take it back.
 */
import { useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import {
  DndContext, DragOverlay, KeyboardSensor, PointerSensor, closestCenter, pointerWithin, useDraggable, useDroppable, useSensor, useSensors,
  type CollisionDetection, type DragEndEvent, type DragStartEvent,
} from '@dnd-kit/core'
import clsx from 'clsx'
import { GripVertical } from 'lucide-react'
import type { Question } from '../engine/types'
import { correctAnswer, keysOf, matchPairs, sortBoxes } from '../engine/engine'
import type { Lang } from '../i18n'

const L = 'ABCD'
type Shuffle = <T>(arr: T[], salt: string) => T[]
interface Common { q: Question; lang: Lang; salt: string; review?: boolean; hint: string; big?: boolean; shuffle: Shuffle; label: (k: string) => ReactNode }

// Pointer: drop where the finger is. Keyboard: drop on the closest place.
const collide: CollisionDetection = a => (a.pointerCoordinates ? pointerWithin(a) : closestCenter(a))
const useDragSensors = () => useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }), useSensor(KeyboardSensor))

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
export function OrderAnswer({ q, value, set, salt, review, hint, big, shuffle, label, clear }: Common & { value: string[]; set: (v: string[] | null) => void; clear: string }) {
  const keys = keysOf(q).map(i => L[i])
  const slots = keys.map((_, i) => value[i] || '')
  const pool = useMemo(() => shuffle(keys, q.id + salt), [q.id])
  const tray = pool.filter(k => !slots.includes(k))
  const [active, setActive] = useState<string | null>(null)
  const sensors = useDragSensors()

  const put = (k: string, to: number | 'tray') => {
    const s = [...slots], from = s.indexOf(k)
    if (to === 'tray') { if (from >= 0) s[from] = '' }
    else { const prev = s[to]; s[to] = k; if (from >= 0 && from !== to) s[from] = prev }
    set(s.some(Boolean) ? s : null)
  }
  const end = ({ active: a, over }: DragEndEvent) => {
    setActive(null)
    const k = String(a.id)
    if (!over || over.id === 'tray') return put(k, 'tray')
    put(k, +String(over.id).slice(1))
  }
  const right = (i: number) => q.o[L.indexOf(slots[i])] === q.o[i]

  return (
    <DndContext sensors={sensors} collisionDetection={collide} onDragStart={(e: DragStartEvent) => setActive(String(e.active.id))} onDragEnd={end} onDragCancel={() => setActive(null)}>
      <div className="flex flex-col gap-3">
        <p className="m-0 text-sm text-soft">{hint}</p>
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
          <Zone id="tray" className="flex min-h-[60px] flex-wrap gap-2 rounded-2xl border-2 border-transparent p-1">
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

export function MatchAnswer({ q, lang, value, set, salt, review, hint, big, shuffle }: Omit<Common, 'label'> & { value: Record<string, number>; set: (v: Record<string, number> | null) => void }) {
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
        <div ref={box} className="relative grid grid-cols-2 gap-x-12 gap-y-2 sm:gap-x-20">
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
                  className={cls(id, linked, 'L')} style={linked ? { borderColor: colorOf(l) } : undefined}>
                  {linked && badge(l)}
                  <span>{p.left}</span>
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
