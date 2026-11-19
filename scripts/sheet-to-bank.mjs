// Rebuilds src/data/bank.json from the Questions tab of the "Questions and Settings" sheet.
// 1. In Google Sheets: File > Download > Comma-separated values, with the Questions tab open.
// 2. Run: npm run bank -- path/to/Questions.csv
// Sheet format: Option 1 is always right. Order lists options in the right order.
// Match options are "left = right". Sort options are "item = box".
// Pictures are downloaded once into public/q/ and kept there.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'

const file = process.argv[2]
if (!file) { console.error('Usage: npm run bank -- <Questions.csv>'); process.exit(1) }

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

const [head, ...rows] = parseCsv(readFileSync(file, 'utf8').replace(/^﻿/, ''))
const col = name => { const i = head.indexOf(name); if (i < 0) throw new Error(`Missing column: ${name}`); return i }
const C = {
  id: col('ID'), lv: col('Level'), grade: col('Grade'), pool: col('Pool'), d: col('Difficulty'), t: col('Type'), strand: col('Skill strand'),
  q: col('Question (EN)'), qa: col('Question (AR)'), scr: col('On screen (code, rule or picture note)'),
  img: col('Picture link'), oimg: col('Option picture links (one per line, same order)'),
  why: col('Why the wrong options are wrong'), src: col('Curriculum source'), old: col('Old ID'),
}
const optCol = (k, lang) => col(k === 1 ? `Option 1: RIGHT ANSWER (${lang})` : `Option ${k} (${lang})`)
// PRD 10: no emoji as icons. The sheet uses emoji as stand-in pictures, so each one becomes
// a drawn icon (src/question/icons.tsx). A new emoji in the sheet needs a line here and an icon there.
const ICON = {
  '💻': 'laptop', '🍎': 'apple', '🪑': 'chair', '🖱': 'mouse', '🥄': 'spoon', '🧸': 'teddy', '⌨': 'keyboard',
  '🔈': 'speaker', '🎧': 'headphones', '🙋': 'hand', '📢': 'megaphone', '🖨': 'printer', '💾': 'save',
  '🗑': 'trash', '✂': 'scissors', '🔍': 'search', '🔊': 'sound',
  '🔘': 'power', '🔌': 'plug', '🐱': 'cat', '🖼': 'image', '🎵': 'music', '📦': 'box', '👕': 'shirt', '🙈': 'hide',
  '🔲': 'bigger', '👆': 'click', '🎨': 'palette', '🔢': 'number', '✅': 'yesno', '🚪': 'door', '👏': 'clap',
  '💬': 'talk', '➡': 'forward', '🌸': 'flower', '🛑': 'stop', '📚': 'pictures', '🎲': 'guess', '💡': 'lamp', '🚗': 'car',
  '❌': 'close', '📤': 'share', '📱': 'phone', '🔔': 'bell',
}
const EMOJI = /(\p{Extended_Pictographic})️?\s*/u
function iconOf(s, id) {
  const e = s.match(EMOJI)?.[1]
  if (e && !ICON[e]) throw new Error(`${id}: no icon for ${e}. Add it to ICON in this script and to src/question/icons.tsx.`)
  return e ? ICON[e] : ''
}
const noEmoji = s => s.replace(new RegExp(EMOJI, 'gu'), '').trim()
const opts = (r, lang) => [1, 2, 3, 4].map(k => noEmoji(r[optCol(k, lang)] || ''))
const icons = r => [1, 2, 3, 4].map(k => iconOf(r[optCol(k, 'EN')] || '', r[C.id]))

// ---------------------------------------------------------------- pictures
const DIR = new URL('../public/q/', import.meta.url)
mkdirSync(DIR, { recursive: true })
const EXT = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/gif': 'gif', 'image/svg+xml': 'svg' }
async function picture(url) {
  url = url.trim()
  if (!url) return ''
  const id = url.match(/\/d\/([\w-]+)/)?.[1] || url.match(/[?&]id=([\w-]+)/)?.[1]
  if (!id) throw new Error(`Not a Drive picture link: ${url}`)
  for (const ext of Object.values(EXT)) if (existsSync(new URL(`${id}.${ext}`, DIR))) return `q/${id}.${ext}`
  const res = await fetch(`https://lh3.googleusercontent.com/d/${id}=w800`)
  const type = (res.headers.get('content-type') || '').split(';')[0]
  if (!res.ok || !EXT[type]) throw new Error(`Could not download ${url} (${res.status} ${type}). Is the file shared with "Anyone with the link"?`)
  const name = `${id}.${EXT[type]}`
  writeFileSync(new URL(name, DIR), Buffer.from(await res.arrayBuffer()))
  return `q/${name}`
}

const bank = []
for (const r of rows.filter(r => r[C.id])) {
  const oimg = await Promise.all(r[C.oimg].split('\n').filter(s => s.trim()).map(picture))
  const oicon = icons(r)
  bank.push({
    id: r[C.id], old: r[C.old], lv: +r[C.lv], grade: r[C.grade], pool: r[C.pool], strand: r[C.strand], d: r[C.d], t: r[C.t],
    q: r[C.q], qa: r[C.qa], scr: r[C.scr], why: r[C.why], src: r[C.src],
    o: opts(r, 'EN'), oa: opts(r, 'AR'),
    ...(r[C.img].trim() && { img: await picture(r[C.img]) }),
    ...(oimg.length && { oimg }),
    ...(oicon.some(Boolean) && { oicon }),
  })
}
writeFileSync(new URL('../src/data/bank.json', import.meta.url), JSON.stringify(bank))
console.log(`Wrote ${bank.length} questions. Run "npm test" to check every answer key.`)
