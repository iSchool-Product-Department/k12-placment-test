import bankJson from './bank.json'
import type { Question } from '../engine/types'

export const BANK = bankJson as Question[]
export const BY_ID = new Map(BANK.map(q => [q.id, q]))

export const LEVELS = [
  { lv: 1, ages: '6 to 7', tools: 'Code.org Sprite Lab, PictoBlox Junior, Canva' },
  { lv: 2, ages: '8 to 9', tools: 'Code.org App Lab, Tynker, PictoBlox, ChatGPT and Gemini' },
  { lv: 3, ages: '10 to 11', tools: 'Python (mBlock), Godot and GDScript' },
  { lv: 4, ages: '12 to 13', tools: 'Figma, FlutterFlow, Flutter and Dart, Firebase' },
  { lv: 5, ages: '14 to 15', tools: 'HTML, CSS, JavaScript, Node.js, MongoDB, Linux and cyber security tools' },
  { lv: 6, ages: '16 to 18', tools: 'Unity and C#, Python, pandas, scikit-learn' },
]
