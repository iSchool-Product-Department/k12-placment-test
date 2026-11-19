import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Flag, Play, Trophy } from 'lucide-react'
import clsx from 'clsx'
import type { AnswerRec, TestRecord } from '../engine/types'
import { BY_ID } from '../data/ladder'
import { OUTCOME, STEP_LABEL } from './labels'
import { GRADES, GradeIcon, gradeIcon } from '../grades'

/**
 * The test as a road through the levels: x is time, y is the level.
 * Click a milestone to see its questions; click a question to open it.
 */
export function Journey({ rec, onQuestion }: { rec: TestRecord; onQuestion: (a: AnswerRec) => void }) {
  const box = useRef<HTMLDivElement>(null)
  const [w, setW] = useState(800)
  const [sel, setSel] = useState(0)
  useEffect(() => {
    const el = box.current; if (!el) return
    const ro = new ResizeObserver(() => setW(el.clientWidth)); ro.observe(el); setW(el.clientWidth)
    return () => ro.disconnect()
  }, [])
  const done = rec.status === 'done'
  const nodes = [
    { kind: 'start' as const, lv: rec.start, label: `Age ${rec.age}`, sub: `Starts at Level ${rec.start}` },
    ...rec.steps.map((s, i) => ({ kind: 'step' as const, lv: s.lv, label: STEP_LABEL[s.name], sub: `${s.right}/${s.total}`, i })),
    ...(rec.step ? [{ kind: 'now' as const, lv: rec.step.lv, label: STEP_LABEL[rec.step.name], sub: 'In progress' }] : []),
    ...(done ? [{ kind: 'end' as const, lv: rec.placement!.lv, label: `Grade ${rec.placement!.grade}`, sub: rec.tier!.tier }] : []),
  ]
  // Wide screens: each level row starts with its two grade icons from the iSchool roadmap.
  const icons = w >= 560
  const H = 250, padX = icons ? 130 : 34, top = 34, bot = 46
  const X = (i: number) => padX + (w - padX - 40) * (nodes.length === 1 ? 0.5 : i / (nodes.length - 1))
  const Y = (lv: number) => top + (H - top - bot) * (6 - lv) / 5
  const pts = nodes.map((n, i) => [X(i), Y(n.lv)])
  let d = `M${pts[0][0]},${pts[0][1]}`
  for (let i = 1; i < pts.length; i++) { const [x0, y0] = pts[i - 1], [x1, y1] = pts[i], mx = (x0 + x1) / 2; d += ` C${mx},${y0} ${mx},${y1} ${x1},${y1}` }
  const selNode = nodes[sel]
  const stepIdx = selNode?.kind === 'step' ? selNode.i! : selNode?.kind === 'now' ? rec.steps.length : null
  const answers = stepIdx == null ? [] : rec.answers.filter(a => a.stepIndex === stepIdx)
  return (
    <div>
      <div ref={box} className="relative w-full">
        <svg width={w} height={H} className="block" role="img" aria-label="Path through the levels">
          {[1, 2, 3, 4, 5, 6].map(lv => (
            <g key={lv}>
              <rect x={0} y={Y(lv) - 14} width={w} height={28} rx={14} fill={lv % 2 ? '#F7FAFF' : '#fff'} />
              {icons ? [2 * lv - 1, 2 * lv].map((g, k) => (
                <g key={g}><title>{`Grade ${g}: ${GRADES[g - 1].name}`}</title>
                  <circle cx={18 + k * 52} cy={Y(lv)} r={12} fill={rec.placement?.grade === g ? '#043FAD' : '#056FEC'} />
                  <image href={gradeIcon(g)} x={18 + k * 52 - 8} y={Y(lv) - 8} width={16} height={16} />
                  <text x={34 + k * 52} y={Y(lv) + 4} fontSize={11} fontWeight={800} fill="#5B7599">G{g}</text>
                </g>
              )) : <text x={6} y={Y(lv) + 4} fontSize={11} fontWeight={800} fill="#8AA3C2">L{lv}</text>}
            </g>
          ))}
          <motion.path d={d} fill="none" stroke="#DCEAF3" strokeWidth={18} strokeLinecap="round" />
          <motion.path key={rec.id + w} d={d} fill="none" stroke="url(#road)" strokeWidth={10} strokeLinecap="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.1, ease: 'easeInOut' }} />
          <path d={d} fill="none" stroke="#fff" strokeWidth={2} strokeDasharray="6 9" opacity={0.9} />
          <defs><linearGradient id="road" x1="0" x2="1"><stop offset="0" stopColor="#05ACFF" /><stop offset="1" stopColor="#056FEC" /></linearGradient></defs>
          {nodes.map((n, i) => {
            const [x, y] = pts[i]
            const end = n.kind === 'end', on = sel === i
            return (
              <motion.g key={i} initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.15 + i * 0.18, type: 'spring', stiffness: 260, damping: 16 }}
                style={{ transformOrigin: `${x}px ${y}px`, cursor: 'pointer' }} onClick={() => setSel(i)}>
                {on && <circle cx={x} cy={y} r={end ? 27 : 24} fill="none" stroke="#FF7F1C" strokeWidth={3} />}
                <circle cx={x} cy={y} r={end ? 21 : 18} fill={end ? '#043FAD' : n.kind === 'start' ? '#fff' : n.kind === 'now' ? '#FF7F1C' : '#056FEC'} stroke={end ? '#FFD700' : n.kind === 'start' ? '#056FEC' : '#fff'} strokeWidth={3} />
                {end ? <image href={gradeIcon(rec.placement!.grade)} x={x - 12} y={y - 12} width={24} height={24} />
                  : n.kind === 'start' ? <path d={`M${x - 4} ${y - 7}l10 7-10 7z`} fill="#056FEC" />
                  : <text x={x} y={y + 5} textAnchor="middle" fontSize={14} fontWeight={800} fill="#fff">{i}</text>}
                {w >= 560 && <text x={x} y={y + (y > H - 80 ? -30 : 38)} textAnchor="middle" fontSize={12} fontWeight={800} fill="#0E2A4D">{n.label}</text>}
                {w >= 560 && <text x={x} y={y + (y > H - 80 ? -44 : 52)} textAnchor="middle" fontSize={11} fill="#5B7599">{n.sub}</text>}
              </motion.g>
            )
          })}
        </svg>
      </div>
      <div className="no-scrollbar mt-2 flex gap-2 overflow-x-auto pb-1">
        {nodes.map((n, i) => (
          <button key={i} onClick={() => setSel(i)} className={clsx('flex shrink-0 items-center gap-2 rounded-full border-2 px-3 py-1.5 text-sm font-bold', sel === i ? 'border-orange bg-warm text-orange-deep' : 'border-line bg-white text-ink')}>
            {n.kind === 'start' ? <Play size={14} /> : n.kind === 'end' ? <Trophy size={14} /> : <Flag size={14} />} {n.label}
          </button>
        ))}
      </div>
      <AnimatePresence mode="wait">
        <motion.div key={sel} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-3 rounded-2xl border border-line bg-mist p-4">
          {selNode?.kind === 'start' && <p className="m-0">Age {rec.age} starts at <b>Level {rec.start}</b> (Grades {2 * rec.start - 1} and {2 * rec.start}). The first question is a digital literacy starter.</p>}
          {selNode?.kind === 'end' && (
            <div className="flex items-start gap-3">
              <GradeIcon g={rec.placement!.grade} size={44} />
              <div>
                <p className="m-0">Placed in <b>Grade {rec.placement!.grade}: {GRADES[rec.placement!.grade - 1].name}</b>, the {rec.placement!.which} grade of Level {rec.placement!.lv}. Tier <b>{rec.tier!.tier}</b> with strength {rec.tier!.strength}.</p>
                <p className="m-0 mt-1 text-sm text-soft">{GRADES[rec.placement!.grade - 1].about}</p>
              </div>
            </div>
          )}
          {stepIdx != null && (
            <>
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <b>{selNode!.label}</b><span className="rounded-full bg-white px-2 py-0.5 text-xs font-bold text-soft">Level {selNode!.lv}</span>
                <span className="flex gap-1">{answers.map((a, i) => <i key={i} className={clsx('h-3 w-3 rounded-full', a.ok ? 'bg-ok' : 'bg-bad')} />)}</span>
              </div>
              {rec.steps[stepIdx] && <p className="m-0 mb-2 text-sm text-soft">{OUTCOME[rec.steps[stepIdx].outcome]}</p>}
              <div className="mb-3 flex flex-wrap gap-2">
                {[2 * selNode!.lv - 1, 2 * selNode!.lv].map(g => (
                  <span key={g} title={GRADES[g - 1].about} className="flex items-center gap-2 rounded-full border border-line bg-white py-1 pe-3 ps-1 text-xs font-bold"><GradeIcon g={g} size={22} />Grade {g}: {GRADES[g - 1].name}</span>
                ))}
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {answers.map((a, i) => {
                  const q = BY_ID.get(a.qid)!
                  return (
                    <motion.button key={a.qid} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }} onClick={() => onQuestion(a)}
                      className={clsx('flex items-center gap-3 rounded-xl border-2 bg-white px-3 py-2 text-start hover:shadow-[var(--shadow-card)]', a.ok ? 'border-[#A8E2BF]' : 'border-[#F4B9B9]')}>
                      <span className={clsx('grid h-7 w-7 shrink-0 place-items-center rounded-full text-sm font-extrabold text-white', a.ok ? 'bg-ok' : 'bg-bad')}>{a.ok ? '✓' : '✗'}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-bold">{q.q}</span>
                        <span className="text-xs text-soft">{q.id} · {q.pool} · {q.d} · {q.t} · {Math.round(a.sec)}s</span>
                      </span>
                    </motion.button>
                  )
                })}
              </div>
            </>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

