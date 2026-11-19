// Rebuilds src/data/bank.json from the "Question Bank" tab of the v2 Google Sheet.
// 1. In Google Sheets: File > Download > Comma-separated values, with the Question Bank tab open.
// 2. Run: npm run bank -- path/to/Question\ Bank.csv
import { readFileSync, writeFileSync } from 'node:fs'

const file = process.argv[2]
if (!file) { console.error('Usage: npm run bank -- <question-bank.csv>'); process.exit(1) }

function parseCsv(text) {
  const rows = []; let row = [], cell = '', q = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (q) { if (c === '"' && text[i + 1] === '"') { cell += '"'; i++ } else if (c === '"') q = false; else cell += c; continue }
    if (c === '"') q = true
    else if (c === ',') { row.push(cell); cell = '' }
    else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(cell); rows.push(row); row = []; cell = '' }
    else cell += c
  }
  if (cell || row.length) { row.push(cell); rows.push(row) }
  return rows
}

const [head, ...rows] = parseCsv(readFileSync(file, 'utf8'))
const col = name => { const i = head.indexOf(name); if (i < 0) throw new Error(`Missing column: ${name}`); return i }
const C = {
  id: col('ID'), lv: col('Level'), grade: col('Grade'), pool: col('Pool'), strand: col('Skill strand'), d: col('Difficulty'), t: col('Type'),
  q: col('Question (English)'), qa: col('Question (Arabic)'), scr: col('On screen (picture or code)'), a: col('Correct answer'),
  why: col('Why the wrong answers are wrong'), src: col('Curriculum source'), old: head.indexOf('Old ID (v1)'),
}
const opt = (lang, k) => col(`Option ${k} (${lang})`)
const bank = rows.filter(r => r[C.id]).map(r => ({
  id: r[C.id], old: C.old >= 0 ? r[C.old] : '', lv: +r[C.lv], grade: r[C.grade], pool: r[C.pool], strand: r[C.strand], d: r[C.d], t: r[C.t],
  q: r[C.q], qa: r[C.qa], scr: r[C.scr], a: r[C.a], why: r[C.why], src: r[C.src],
  o: 'ABCD'.split('').map(k => r[opt('EN', k)] || ''), oa: 'ABCD'.split('').map(k => r[opt('AR', k)] || ''),
}))
writeFileSync(new URL('../src/data/bank.json', import.meta.url), JSON.stringify(bank))
console.log(`Wrote ${bank.length} questions. Run "npm test" to check every answer key.`)
