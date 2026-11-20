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
  '📺': 'tv', '📻': 'radio', '🎤': 'mic', '📷': 'camera', '↩': 'undo', '👁': 'eye',
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
  // A picture drawn in this repo: "q/name.svg" in the sheet means public/q/name.svg.
  if (/^q\/[\w.-]+$/.test(url)) { if (!existsSync(new URL(url.slice(2), DIR))) throw new Error(`Missing public/${url}`); return url }
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

// Ages 6 to 9 (levels 1 and 2): a card with no emoji gets a drawn icon from its words. Things come before
// actions ("Play sound" is sound). A question gets icons only if every card gets a different one, so a Sort
// never gives its answer away with two matching icons. A new word needs a line here (and in icons.tsx if the icon is new).
const THING = {
  keyboard: 'keyboard', mouse: 'mouse', screen: 'monitor', monitor: 'monitor', headphones: 'headphones', microphone: 'mic', mic: 'mic',
  camera: 'camera', printer: 'printer', speaker: 'speaker', photo: 'image', picture: 'image', image: 'image', background: 'image',
  voice: 'voice', speech: 'voice', sound: 'sound', volume: 'sound', video: 'video', calculator: 'calculator', phone: 'phone',
  light: 'lamp', doorbell: 'bell', png: 'image', mp3: 'music', txt: 'file', mp4: 'video', folder: 'folder', files: 'folder',
  bin: 'trash', downloads: 'download', menu: 'menu', browser: 'globe', coin: 'coin', star: 'star', point: 'star', spike: 'spike',
  lava: 'flame', obstacle: 'obstacle', door: 'door', pause: 'pause', score: 'trophy', cat: 'cat', apple: 'apple', fish: 'fish',
  dark: 'moon', hungry: 'food', raining: 'rain', cold: 'snow', clap: 'clap', jump: 'jump', step: 'steps',
  button: 'button', label: 'label', title: 'title', sprite: 'sprite', character: 'sprite', drawing: 'palette', password: 'lock',
  idea: 'lamp', story: 'book', model: 'brain', classifier: 'brain', prompt: 'talk', reply: 'talk', home: 'house',
  school: 'school', blue: 'palette', happy: 'sprite', space: 'keyboard', reset: 'reset', list: 'list', shark: 'fish', flower: 'flower', robot: 'robot',
}
const ACTION = {
  save: 'save', delete: 'trash', mute: 'mute', click: 'click', tap: 'hand', touch: 'hand', start: 'play', play: 'play', stop: 'stop',
  send: 'send', post: 'share', tell: 'talk', say: 'talk', find: 'search', view: 'eye', show: 'eye', hide: 'hide', walk: 'steps',
  forward: 'up', backward: 'down', back: 'undo', reset: 'reset', test: 'check', check: 'check', train: 'brain', build: 'build',
  plan: 'pencil', release: 'rocket', run: 'rocket', read: 'book', type: 'keyboard', typed: 'keyboard', record: 'pencil',
  collect: 'box', wet: 'water', rinse: 'water', rub: 'hand', choose: 'click', correct: 'pencil', if: 'if', repeat: 'repeat', when: 'click', game: 'game', turn: 'turn',
}
function wordIcon(text) {
  const words = text.toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').split(/\s+/).filter(Boolean)
  const find = map => { for (const w of words) { const hit = map[w] ?? map[w.replace(/(es|s)$/, '')] ?? map[w.replace(/s$/, '')]; if (hit) return hit } }
  if (/turn left/i.test(text)) return 'left'
  if (/turn right/i.test(text)) return 'right'
  if (/press(es)? (a )?key/i.test(text)) return 'keyboard'
  if (/\bturns\b/i.test(text)) return 'turn'
  return find(THING) || find(ACTION) || ''
}
function autoIcons(r, t) {
  if (+r[C.lv] > 2 || r[C.oimg].trim() || ['Type answer', 'Code MCQ'].includes(t)) return null
  const cards = [1, 2, 3, 4].map(k => r[optCol(k, 'EN')] || '').map(s => (t === 'Match' || t === 'Sort' ? s.split('=')[0] : s).trim())
  const got = cards.map(s => (s ? wordIcon(s) : ''))
  const n = cards.filter(Boolean).length
  if (t === 'Text MCQ' && cards.some(s => s.split(/\s+/).length > 3)) return null // long answers are ideas, not things
  return got.filter(Boolean).length === n && new Set(got.filter(Boolean)).size === n ? got : null
}

const bank = []
for (const r of rows.filter(r => r[C.id])) {
  const oimg = await Promise.all(r[C.oimg].split('\n').filter(s => s.trim()).map(picture))
  let oicon = icons(r)
  if (!oicon.some(Boolean)) oicon = autoIcons(r, r[C.t]) || oicon
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
