import { useEffect, useRef } from 'react'
import type { Question } from '../engine/types'

/* ------------------------------------------------------------------ live stages (grid and number line)
   Ported from the v1 demo. Keyed by the v1 question ID so they keep working after the v2 renumbering. */
const NOROT = new Set(['rabbit', 'cat', 'frog'])
const C = 80
const DIRS: Record<string, [number, number]> = { u: [0, -1], r: [1, 0], d: [0, 1], l: [-1, 0] }
const ANG: Record<string, number> = { u: 0, r: 90, d: 180, l: 270 }
const SPR: Record<string, string> = {
  robot: `<rect x="-20" y="-18" width="40" height="36" rx="9" fill="#056FEC"/><rect x="-13" y="-10" width="26" height="13" rx="4" fill="#ECF8FF"/><circle cx="-6" cy="-3.5" r="3" fill="#0E2A4D"/><circle cx="6" cy="-3.5" r="3" fill="#0E2A4D"/><path d="M0 -18 v-8" stroke="#5B7599" stroke-width="3"/><circle cx="0" cy="-28" r="4" fill="#FF7F1C"/><path d="M-8 -34 l8 -10 l8 10z" fill="#FFD700"/>`,
  bee: `<ellipse cx="0" cy="2" rx="22" ry="16" fill="#FFD700"/><rect x="-8" y="-13" width="6" height="30" fill="#0E2A4D"/><rect x="4" y="-13" width="6" height="30" fill="#0E2A4D"/><ellipse cx="-4" cy="-16" rx="10" ry="7" fill="#ECF8FF" opacity=".9"/><path d="M-6 -36 l6 -8 l6 8z" fill="#FF7F1C"/>`,
  rabbit: `<ellipse cx="-8" cy="-22" rx="5" ry="14" fill="#fff" stroke="#CFD8DC" stroke-width="2"/><ellipse cx="8" cy="-22" rx="5" ry="14" fill="#fff" stroke="#CFD8DC" stroke-width="2"/><circle cx="0" cy="4" r="18" fill="#fff" stroke="#CFD8DC" stroke-width="2"/><circle cx="-6" cy="1" r="2.5" fill="#0E2A4D"/><circle cx="6" cy="1" r="2.5" fill="#0E2A4D"/><circle cx="0" cy="8" r="2.5" fill="#E91E63"/>`,
  cat: `<path d="M-18 -6 l4 -18 l10 10z M18 -6 l-4 -18 l-10 10z" fill="#FFB74D"/><circle cx="0" cy="2" r="18" fill="#FFB74D"/><circle cx="-6" cy="-1" r="2.5" fill="#0E2A4D"/><circle cx="6" cy="-1" r="2.5" fill="#0E2A4D"/><circle cx="0" cy="6" r="2" fill="#E91E63"/>`,
  frog: `<ellipse cx="0" cy="6" rx="22" ry="14" fill="#43A047"/><circle cx="-10" cy="-8" r="8" fill="#43A047"/><circle cx="10" cy="-8" r="8" fill="#43A047"/><circle cx="-10" cy="-9" r="4" fill="#fff"/><circle cx="10" cy="-9" r="4" fill="#fff"/><circle cx="-10" cy="-9" r="2" fill="#0E2A4D"/><circle cx="10" cy="-9" r="2" fill="#0E2A4D"/>`,
  carrot: `<path d="M0 22 l-11 -32 h22z" fill="#FF7F1C"/><path d="M0 -10 l-7 -12 M0 -10 l0 -14 M0 -10 l7 -12" stroke="#43A047" stroke-width="4" stroke-linecap="round"/>`,
  star: `<path d="M0 -24 l7 15 l16 2 l-12 11 l3 16 l-14 -8 l-14 8 l3 -16 l-12 -11 l16 -2z" fill="#FFD700" stroke="#FFBB1A" stroke-width="2"/>`,
  battery: `<rect x="-12" y="-20" width="24" height="40" rx="4" fill="#43A047"/><rect x="-5" y="-25" width="10" height="6" rx="2" fill="#43A047"/><path d="M3 -12 l-9 14 h6 l-3 11 l9 -14 h-6z" fill="#FFD700"/>`,
  flower: `${[0, 72, 144, 216, 288].map(a => `<circle cx="${Math.round(13 * Math.sin(a * Math.PI / 180))}" cy="${Math.round(-13 * Math.cos(a * Math.PI / 180))}" r="10" fill="#EC407A"/>`).join('')}<circle r="8" fill="#FFD700"/>`,
  rock: `<path d="M-24 16 q-4 -22 14 -30 q20 -8 30 10 q6 14 -4 20z" fill="#90A4AE"/>`,
  wall: `<rect x="-14" y="-38" width="28" height="76" rx="4" fill="#8D6E63"/>${[-22, -6, 10, 26].map(y => `<path d="M-14 ${y} h28" stroke="#5D4037" stroke-width="2"/>`).join('')}`,
}
const arrows = (o: string) => [...o].map(c => ({ '↑': 'u', '→': 'r', '↓': 'd', '←': 'l' } as Record<string, string>)[c]).filter(Boolean)
const rep = <T,>(n: number, a: T[]) => Array.from({ length: n }, () => a).flat()
type Sim = {
  g?: [number, number]; a: string; s: number | [number, number]; f?: string; goal?: [string, [number, number]]; rocks?: [number, number][]
  walls?: [number, number][]; ghost?: [number, number]; count?: string; line?: [number, number]; hops?: () => number[]
  mark?: (o: string) => [number, number]; run?: (o: any) => string[]
}
const SIM: Record<string, Sim> = {
  'L1-LG-03': { g: [3, 3], a: 'rabbit', s: [0, 2], f: 'u', goal: ['carrot', [2, 0]], run: (o: string) => arrows(o) },
  'L1-LG-05': { g: [3, 3], a: 'robot', s: [0, 2], f: 'r', goal: ['star', [2, 0]], rocks: [[1, 1]], run: (o: string) => arrows(o) },
  'L1-GT-01': { g: [3, 3], a: 'robot', s: [0, 2], f: 'r', goal: ['battery', [2, 1]], run: (seq: string[]) => seq.map(x => (/left/.test(x) ? 'L' : 'F')) },
  'L1-GT-06': { g: [4, 1], a: 'bee', s: [0, 0], f: 'r', goal: ['flower', [3, 0]], run: (seq: string[]) => { const out: string[] = []; for (let i = 0; i < seq.length; i++) { const x = seq[i]; if (/repeat/.test(x)) { const nx = seq[i + 1]; if (nx) { out.push(...rep(3, /nectar/.test(nx) ? ['N'] : ['F'])); i++ } } else out.push(/nectar/.test(x) ? 'N' : 'F') } return out } },
  'L1-GB-02': { g: [6, 1], a: 'robot', s: [0, 0], f: 'r', ghost: [4, 0], run: (o: string) => { const m = o.match(/repeat (\d+)/); return rep(m ? +m[1] : 1, ['F']) } },
  'L1-GB-05': { g: [5, 1], a: 'bee', s: [0, 0], f: 'r', goal: ['flower', [3, 0]], run: (o: string) => rep(+o || 0, ['F']) },
  'L1-GB-14': { g: [3, 1], a: 'bee', s: [1, 0], f: 'r', walls: [[2, 0]], run: (o: string) => (/forward/i.test(o) ? ['F'] : /left/i.test(o) ? ['L'] : ['W']) },
  'L1-GT-02': { g: [4, 4], a: 'robot', s: [0, 3], f: 'u', count: 'F', run: () => rep(3, ['F', 'F', 'R']) },
  'L1-GB-17': { g: [6, 1], a: 'robot', s: [0, 0], f: 'r', count: 'F', run: () => rep(4, ['F']) },
  'L1-LG-12': { g: [4, 4], a: 'cat', s: [0, 3], f: 'r', count: 'M', run: () => ['r', 'r', 'u', 'u'] },
  'L1-GB-20': { g: [4, 1], a: 'robot', s: [0, 0], f: 'r', ghost: [3, 0], run: () => ['F', 'F'] },
  'L2-LG-05': { g: [5, 5], a: 'robot', s: [1, 4], f: 'u', run: () => rep(3, ['F', 'F', 'R']) },
  'L2-LG-11': { g: [5, 4], a: 'robot', s: [1, 3], f: 'r', mark: o => { const n = (s: string) => +((o.match(new RegExp('(\\d+) squares? ' + s)) || [0, 0])[1]); return [1 + n('right'), 3 - n('up') + n('down')] }, run: () => ['F', 'F', 'L', 'F'] },
  'L1-LG-06': { line: [1, 10], a: 'frog', s: 1, hops: () => [2, 2, 2] },
  'L3-LG-06': { line: [0, 16], a: 'robot', s: 0, hops: () => rep(4, [3, -1]) },
}
export const hasSim = (q: Question) => !!SIM[q.old || q.id]

function stageSvg(sp: Sim) {
  if (sp.line) {
    const [a, b] = sp.line, W = 760, step = (W - 60) / (b - a), X = (v: number) => 30 + (v - a) * step
    return `<svg class="stage" viewBox="0 0 ${W} 170" data-w="${step}"><line x1="20" x2="${W - 20}" y1="120" y2="120" stroke="#0E2A4D" stroke-width="3"/>${Array.from({ length: b - a + 1 }, (_, i) => `<line x1="${X(a + i)}" x2="${X(a + i)}" y1="112" y2="128" stroke="#0E2A4D" stroke-width="2"/><text x="${X(a + i)}" y="152" text-anchor="middle" font-size="18" font-weight="700" fill="#0E2A4D">${a + i}</text>`).join('')}<g id="arcs"></g><g id="mk"></g><g id="ag" style="transform:translate(${X(sp.s as number)}px,92px)"><g class="spr">${SPR[sp.a]}</g></g></svg>`
  }
  const [cw, ch] = sp.g!, P = 10, cell = (c: number, r: number) => `translate(${P + c * C + C / 2}px,${P + r * C + C / 2}px)`
  let s = `<svg class="stage" viewBox="0 0 ${cw * C + P * 2} ${ch * C + P * 2 + (sp.count ? 30 : 0)}">`
  for (let r = 0; r < ch; r++) for (let c = 0; c < cw; c++) s += `<rect x="${P + c * C}" y="${P + r * C}" width="${C}" height="${C}" rx="6" fill="${(r + c) % 2 ? '#F1F8E9' : '#E8F5E9'}" stroke="#C5E1A5"/>`;
  (sp.rocks || []).forEach(([c, r]) => (s += `<g style="transform:${cell(c, r)}">${SPR.rock}</g>`));
  (sp.walls || []).forEach(([c, r]) => (s += `<g style="transform:translate(${P + c * C + 14}px,${P + r * C + C / 2}px)">${SPR.wall}</g>`))
  if (sp.ghost) s += `<rect x="${P + sp.ghost[0] * C + 6}" y="${P + sp.ghost[1] * C + 6}" width="${C - 12}" height="${C - 12}" rx="10" fill="none" stroke="#FF7F1C" stroke-width="3" stroke-dasharray="8 6"/>`
  if (sp.goal) s += `<g id="goal" style="transform:${cell(...sp.goal[1])}"><g class="spr">${SPR[sp.goal[0]]}</g></g>`
  const st = sp.s as [number, number]
  s += `<g id="mk"></g><g id="ag" style="transform:${cell(st[0], st[1])} rotate(${NOROT.has(sp.a) ? 0 : ANG[sp.f!]}deg)"><g class="spr">${SPR[sp.a]}</g></g>`
  if (sp.count) s += `<text id="cnt" x="${P}" y="${ch * C + P * 2 + 20}" font-size="20" font-weight="800" fill="#0E2A4D"></text>`
  return s + '</svg>'
}

let simTok = 0
/** Draws the start, marks the student's choice, and with `play` runs it. Resolves when the run ends. */
function runStage(svg: SVGSVGElement, sp: Sim, choice: string | string[] | null, play: boolean): Promise<void> {
  const tok = ++simTok, ag = svg.querySelector<SVGGElement>('#ag')!, mk = svg.querySelector('#mk')!
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches, wait = (ms: number) => new Promise(r => setTimeout(r, reduce ? 0 : ms))
  const sk = ag.querySelector('.spr')!
  ag.style.transition = 'none'; ag.style.opacity = '1'; sk.classList.remove('shake'); void ag.getBoundingClientRect()
  if (sp.line) {
    const [a] = sp.line, step = +(svg.dataset.w || 1), X = (v: number) => 30 + (v - a) * step, arcs = svg.querySelector('#arcs')!
    arcs.innerHTML = ''
    const pick = typeof choice === 'string' && /^-?\d+$/.test(choice) ? +choice : null
    mk.innerHTML = pick != null ? `<rect x="${X(pick) - 18}" y="70" width="36" height="66" rx="8" fill="none" stroke="#FF7F1C" stroke-width="3" stroke-dasharray="6 5"/>` : ''
    ag.style.transform = `translate(${X(sp.s as number)}px,92px)`
    if (!play) return Promise.resolve()
    return (async () => {
      await wait(60); ag.style.transition = 'transform .45s ease'; let v = sp.s as number
      for (const h of sp.hops!()) {
        if (tok !== simTok) return
        const nv = v + h
        arcs.innerHTML += `<path d="M${X(v)} 104 Q${(X(v) + X(nv)) / 2} ${h > 0 ? 40 : 60} ${X(nv)} 104" fill="none" stroke="#056FEC" stroke-width="3" stroke-dasharray="6 6"/>`
        v = nv; ag.style.transform = `translate(${X(v)}px,92px)`; await wait(600)
      }
    })()
  }
  const [cw, ch] = sp.g!, P = 10, tr = (c: number, r: number, a: number) => `translate(${P + c * C + C / 2}px,${P + r * C + C / 2}px) rotate(${NOROT.has(sp.a) ? 0 : a}deg)`
  let [c, r] = sp.s as [number, number]; let a = ANG[sp.f!], n = 0
  ag.style.transform = tr(c, r, a); svg.querySelector('#goal .spr')?.classList.remove('won')
  const cnt = svg.querySelector('#cnt'); if (cnt) cnt.textContent = ''; mk.innerHTML = ''
  if (sp.mark && typeof choice === 'string') { const [mc, mr] = sp.mark(choice); mk.innerHTML = `<rect x="${P + mc * C + 6}" y="${P + mr * C + 6}" width="${C - 12}" height="${C - 12}" rx="10" fill="none" stroke="#FF7F1C" stroke-width="3" stroke-dasharray="8 6"/>` }
  if (!play) return Promise.resolve()
  const acts = sp.run!(Array.isArray(choice) ? choice : String(choice || ''))
  const blocked = (nc: number, nr: number) => (sp.rocks || []).some(([x, y]) => x === nc && y === nr) || (sp.walls || []).some(([x, y]) => x === nc && y === nr)
  return (async () => {
    await wait(80); ag.style.transition = 'transform .42s ease, opacity .3s'
    for (const act of acts) {
      if (tok !== simTok) return
      if (act === 'L' || act === 'R') { a += act === 'L' ? -90 : 90; ag.style.transform = tr(c, r, a) }
      else if (act === 'W') { sk.classList.add('shake'); await wait(500); sk.classList.remove('shake') }
      else if (act === 'N') { const g = sp.goal?.[1]; if (g && g[0] === c && g[1] === r) svg.querySelector('#goal .spr')!.classList.add('won'); else { sk.classList.add('shake'); await wait(400); sk.classList.remove('shake') } }
      else {
        let d: [number, number]
        if (act === 'F') { const k = (((a % 360) + 360) % 360) / 90; d = ([[0, -1], [1, 0], [0, 1], [-1, 0]] as [number, number][])[k] } else { d = DIRS[act]; a = ANG[act] }
        const nc = c + d[0], nr = r + d[1]; n++
        if (cnt) cnt.textContent = (sp.count === 'F' ? 'move forward: ' : 'steps: ') + n
        if (blocked(nc, nr)) { ag.style.transform = `translate(${P + (c + d[0] * 0.35) * C + C / 2}px,${P + (r + d[1] * 0.35) * C + C / 2}px) rotate(${NOROT.has(sp.a) ? 0 : a}deg)`; await wait(380); ag.style.transform = tr(c, r, a); sk.classList.add('shake'); await wait(450); return }
        c = nc; r = nr; ag.style.transform = tr(c, r, a)
        if (c < 0 || r < 0 || c >= cw || r >= ch) { await wait(380); ag.style.opacity = '.25'; return }
      }
      await wait(520)
    }
    const g = sp.goal?.[1]; if (g && g[0] === c && g[1] === r && !acts.includes('N')) svg.querySelector('#goal .spr')?.classList.add('won')
  })()
}

/**
 * The stage stays still while the student answers (it only marks their choice).
 * Once the answer is locked, `play` runs it, so it never becomes trial and error.
 */
export function Stage({ q, choice, play = false, onDone }: { q: Question; choice: string | string[] | null; play?: boolean; onDone?: () => void }) {
  const box = useRef<HTMLDivElement>(null)
  const sp = SIM[q.old || q.id]
  useEffect(() => { if (box.current && sp) box.current.innerHTML = stageSvg(sp) }, [q.id])
  useEffect(() => {
    const svg = box.current?.querySelector('svg')
    let alive = true
    if (svg && sp) runStage(svg as SVGSVGElement, sp, choice, play).then(() => alive && play && onDone?.())
    return () => { alive = false }
  }, [q.id, JSON.stringify(choice), play])
  return <div ref={box} className="mx-auto w-full max-w-[360px] [&_svg]:block [&_svg]:max-h-[220px] [&_svg]:w-full [&_svg]:rounded-2xl [&_svg]:border [&_svg]:border-line [&_svg]:bg-white" aria-hidden="true" />
}

/* ------------------------------------------------------------------ shape patterns */
const COLORS: Record<string, string> = { red: '#EF4444', blue: '#056FEC', green: '#22A55A', yellow: '#FFD700', orange: '#FF7F1C' }
function Shape({ kind, color }: { kind: string; color: string }) {
  if (kind === '?') return <rect x="4" y="4" width="40" height="40" rx="10" fill="none" stroke="#FF7F1C" strokeWidth="3" strokeDasharray="6 5" />
  if (kind === 'square') return <rect x="6" y="6" width="36" height="36" rx="6" fill={color} />
  if (kind === 'triangle') return <path d="M24 5 L44 42 H4Z" fill={color} />
  return <circle cx="24" cy="24" r="19" fill={color} />
}
export function parsePattern(q: Question): { kind: string; color: string }[] | null {
  const src = (q.scr.includes(':') ? q.scr.split(':').slice(1).join(':') : q.scr).trim()
  const parts = src.split(',').map(s => s.trim().toLowerCase())
  if (parts.length < 3) return null
  const out = parts.map(p => {
    if (p === '?') return { kind: '?', color: '' }
    const kind = (p.match(/circle|square|triangle/) || [''])[0]
    const color = (p.match(/red|blue|green|yellow|orange/) || [''])[0]
    return kind ? { kind, color: COLORS[color] || '#056FEC' } : null
  })
  return out.every(Boolean) ? (out as { kind: string; color: string }[]) : null
}
export function Pattern({ items }: { items: { kind: string; color: string }[] }) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-2 rounded-2xl border border-line bg-white p-3" aria-hidden="true">
      {items.map((it, i) => <svg key={i} viewBox="0 0 48 48" className="h-10 w-10 sm:h-12 sm:w-12"><Shape {...it} /></svg>)}
    </div>
  )
}

/* ------------------------------------------------------------------ block code for ages 6 to 9 */
type Blk = { text: string; kids?: Blk[] }
const blockColor = (t: string) =>
  /^(repeat|forever)/i.test(t) ? 'bg-gold text-ink' : /^(when|on )/i.test(t) ? 'bg-orange text-white' :
  /^(set|change)/i.test(t) ? 'bg-[#FF9F4A] text-white' : /^(if|else)/i.test(t) ? 'bg-bright text-white' :
  /^(say|play)/i.test(t) ? 'bg-[#9B6BFF] text-white' : 'bg-blue text-white'
function parseInline(s: string): Blk[] {
  const out: Blk[] = []; let i = 0, cur = ''
  while (i < s.length) {
    const ch = s[i]
    if (ch === '[') {
      let depth = 1, j = i + 1
      while (j < s.length && depth) { if (s[j] === '[') depth++; if (s[j] === ']') depth--; j++ }
      out.push({ text: cur.trim(), kids: parseInline(s.slice(i + 1, j - 1)) }); cur = ''; i = j; continue
    }
    if (ch === ',') { if (cur.trim()) out.push({ text: cur.trim() }); cur = ''; i++; continue }
    cur += ch; i++
  }
  if (cur.trim()) out.push({ text: cur.trim() })
  return out
}
function parseBlocks(scr: string): Blk[] {
  const lines = scr.replace(/^Program:\s*/i, '').split('\n')
  const out: Blk[] = []
  for (const line of lines) {
    const ind = line.match(/^\s+/)
    if (ind && out.length) { (out[out.length - 1].kids ||= []).push(...parseInline(line.trim())); continue }
    out.push(...parseInline(line.trim().replace(/:$/, '')))
  }
  return out
}
export const looksLikeBlocks = (q: Question) => q.lv <= 2 && /\b(repeat|move forward|set (score|lives|count)|change (score|count|lives)|turn (left|right)|say ")/i.test(q.scr) && !/[;{}]|var |\+\+/.test(q.scr)
function BlockList({ items }: { items: Blk[] }) {
  return (
    <div className="flex flex-col gap-1.5">
      {items.map((b, i) => b.kids ? (
        <div key={i} className="rounded-xl bg-gold/30 p-1.5 pe-3">
          <div className={`inline-block rounded-lg px-3 py-1.5 text-sm font-extrabold ${blockColor(b.text)}`}>{b.text}</div>
          <div className="ms-4 mt-1.5 border-s-4 border-gold ps-2"><BlockList items={b.kids} /></div>
        </div>
      ) : <div key={i} className={`self-start rounded-lg px-3 py-1.5 text-sm font-extrabold shadow-sm ${blockColor(b.text)}`}>{b.text}</div>)}
    </div>
  )
}
export function Blocks({ scr }: { scr: string }) {
  return <div dir="ltr" className="mx-auto w-fit max-w-full rounded-2xl border border-line bg-white p-3"><BlockList items={parseBlocks(scr)} /></div>
}

/* ------------------------------------------------------------------ code with light syntax colours */
const KW = /\b(def|return|if|elif|else|for|while|in|range|print|var|let|const|function|int|float|void|public|class|true|false|True|False|None|new|try|catch|import|from|and|or|not|async|await|List|String|Debug\.Log|console\.log)\b/
/** Code with light syntax colours. Shared by code questions and the code order editor. */
export function CodeText({ src }: { src: string }) {
  const tokens = src.split(/("[^"]*"|'[^']*'|\/\/.*|#.*|\b\d+(?:\.\d+)?\b|\b\w+\b|[^\w\s]|\s+)/).filter(Boolean)
  return <>{tokens.map((t, i) => {
    const cls = /^["']/.test(t) ? 'text-[#C76316]' : /^(\/\/|#)/.test(t) ? 'text-soft italic' : /^\d/.test(t) ? 'text-[#0F8F6B]' : KW.test(t) && t.match(KW)![0] === t ? 'text-deep font-semibold' : ''
    return <span key={i} className={cls}>{t}</span>
  })}</>
}
export function Code({ src }: { src: string }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-white shadow-sm" dir="ltr">
      <div className="flex items-center gap-1.5 border-b border-line bg-sky px-3 py-1.5">
        <i className="h-2.5 w-2.5 rounded-full bg-orange" /><i className="h-2.5 w-2.5 rounded-full bg-gold" /><i className="h-2.5 w-2.5 rounded-full bg-bright" />
      </div>
      <pre className="mono m-0 overflow-x-auto p-4 text-[14px] leading-relaxed text-ink"><CodeText src={src} /></pre>
    </div>
  )
}
export const looksLikeCode = (q: Question) => q.t === 'Code MCQ' || /\n|[=;{}<>]|\w\(|\/\/|\[\d/.test(q.scr) && !/^(A |An |Three|Four|Two|Grid|Six|Pictures)/.test(q.scr)

/** Picks the right compact visual for a question, or nothing when the on-screen note was only for designers. */
export function QuestionVisual({ q, choice, play, onDone }: { q: Question; choice: string | string[] | null; play?: boolean; onDone?: () => void }) {
  if (hasSim(q)) return <Stage q={q} choice={choice} play={play} onDone={onDone} />
  const pat = parsePattern(q)
  if (pat) return <Pattern items={pat} />
  if (!q.scr) return null
  if (looksLikeBlocks(q)) return <Blocks scr={q.scr} />
  if (looksLikeCode(q)) return <Code src={q.scr} />
  if (/[:\d]/.test(q.scr) && q.scr.length < 160) return <div className="rounded-2xl bg-sky px-4 py-3 text-center font-semibold text-deep" dir="ltr">{q.scr}</div>
  return null
}
