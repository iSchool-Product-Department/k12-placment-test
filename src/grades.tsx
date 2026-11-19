/** iSchool K12 V2.0 roadmap (2026 deck): each grade's track, what it covers, and its icon (public/grades). Students see only the icon of their grade on the end screen; names and topics are for the team. */
export const GRADES: { name: string; about: string }[] = [
  { name: 'Technology Around Us', about: 'How technology helps in daily life. First animations and stories in Sprite Lab and PictoBlox Jr.' },
  { name: 'Coding with Minecraft', about: 'Algorithms, sequencing, events, loops and conditionals, by coding in Minecraft.' },
  { name: 'App Arcade Builders', about: 'Variables, events, functions and lists while building arcade games and simple apps in App Lab and Tynker.' },
  { name: 'AI Explorer', about: 'How AI works in everyday life. Building with PictoBlox and creating with generative AI, used responsibly.' },
  { name: 'Hello Python!', about: 'Text-based Python in mBlock: variables, conditions, loops, lists, functions and debugging, through games.' },
  { name: 'Game Builders', about: '2D games in the Godot Engine with GDScript: mechanics, physics, collisions and animated characters.' },
  { name: 'App Designer', about: 'UI and UX: layout, color and user flow. Wireframes, mockups and prototypes in Figma.' },
  { name: 'Mobile Apps Creators', about: 'Mobile apps with widgets, pages and navigation, built in FlutterFlow, Dart, Flutter and Firebase.' },
  { name: 'Web Builders', about: 'Front end and back end: HTML, CSS, Bootstrap, JavaScript, Node.js and databases, up to full-stack projects.' },
  { name: 'Cyber Warriors', about: 'Cyber security and ethics: Linux, networking, ethical hacking, web security and threat detection.' },
  { name: '3D Unity Game Development', about: '3D and AR games in Unity with C#: physics, UI, OOP, enemies, scores and levels.' },
  { name: 'AI & Data Science', about: 'Data analysis with Google Sheets and Python, then machine-learning models, built and evaluated.' },
]
export const gradeIcon = (g: number) => `${import.meta.env.BASE_URL}grades/g${g}.png`

/** A grade's roadmap icon (white) on a blue circle, as in the iSchool K12 roadmap deck. */
export function GradeIcon({ g, size }: { g: number; size: number }) {
  return <span className="grid shrink-0 place-items-center rounded-full bg-blue" style={{ width: size, height: size }}><img src={gradeIcon(g)} alt="" style={{ width: size * 0.62, height: size * 0.62 }} className="object-contain" /></span>
}
