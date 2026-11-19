import type { Question } from '../engine/types'

/** An Order question whose options are lines of code (levels 3 to 6). Levels 1 and 2 use blocks instead. */
export const isCodeOrder = (q: Question) =>
  q.t === 'Order' && q.lv >= 3 && q.o.filter(Boolean).every(l => /[=(){};:]|^(return|break|continue|pass)\b/.test(l))

/** The editor the student will use in that grade (PRD 6.5). */
export function codeFile(lines: string[]): { lang: string; file: string; unit: number } {
  const t = lines.join('\n')
  if (/\b(void|float|Input\.|transform\.|Instantiate)\b/.test(t)) return { lang: 'C#', file: 'Player.cs', unit: 4 }
  if (/\b(const|let|function|console\.|document\.)/.test(t)) return { lang: 'JavaScript', file: 'script.js', unit: 2 }
  return { lang: 'Python', file: 'main.py', unit: 4 }
}

/**
 * Indent level of each line, read from the lines in their right order.
 * Each line keeps its indent wherever the student puts it, like a Parsons puzzle,
 * so the program only looks right when the order is right.
 * Braces: "{" opens, a leading "}" closes. Python: a line ending ":" opens, "return" closes the body.
 */
export function codeIndents(lines: string[]): number[] {
  let depth = 0
  return lines.map(raw => {
    const l = raw.trim()
    const lead = (l.match(/^[\s})\]]*/)![0].match(/}/g) || []).length
    const indent = Math.max(0, depth - lead)
    depth += (l.match(/{/g) || []).length - (l.match(/}/g) || []).length
    if (/:$/.test(l)) depth++
    else if (/^return\b/.test(l) && !/[{};]/.test(l)) depth--
    depth = Math.max(0, depth)
    return indent
  })
}

/** Block programs for levels 1 and 2: Order questions about blocks (L1-T-01, L1-T-06, L2-T-01, L2-T-03, L2-T-05). */
export const isBlockOrder = (q: Question) => q.t === 'Order' && q.lv <= 2 && /block/i.test(q.q + ' ' + q.scr)

/** Sheet rule: an option that starts with ">" sits inside the block above it (one ">" per level). Otherwise read like code. */
export function blockIndents(lines: string[]): number[] {
  const code = codeIndents(lines.map(l => l.replace(/^\s*>+\s*/, '')))
  return lines.map((l, i) => l.match(/^\s*(>+)/)?.[1].length ?? code[i])
}
export const blockText = (l: string) => l.replace(/^\s*>+\s*/, '').replace(/:$/, '')
