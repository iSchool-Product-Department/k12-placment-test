import type { Tier } from './engine/types'

export type Lang = 'en' | 'ar'
export type Band = 'kids' | 'teen' | 'pro'
export const bandOf = (age: number | null): Band => (!age || age <= 9 ? 'kids' : age <= 13 ? 'teen' : 'pro')

const en = {
  hero: { kids: 'Let’s find your class!', teen: 'Let’s find your class', pro: 'Find your class' },
  sub: {
    kids: 'A few short games. There is no pass or fail.',
    teen: 'About 10 minutes. The questions change to match you.',
    pro: 'About 10 minutes. The questions adapt to your answers, so take your time.',
  },
  age: 'How old are you?', years: 'years old', name: 'Your name', namePh: 'Type your name',
  start: 'Let’s go', practice: 'Practice', practiceNote: 'Just for practice. It does not count.', begin: 'Start the test',
  next: 'Next', listen: 'Listen', pause: 'Pause', listenOn: 'Resume', again: 'Start again', typeHere: 'Type your answer', clear: 'Clear', tapOrder: 'Drag the cards into the right order, or tap them in order.', blockOrder: 'Snap the blocks into the program. Drag them, or tap a block to add it.', codeOrder: 'Drag the lines up or down to fix the program, or tap a line and then where it goes.',
  sortHint: 'Drag each card into a box, or tap a card and then a box.', matchHint: 'Drag from a dot to its partner, or tap a card and then its partner.',
  tapHint: 'Tap a card, then tap where it goes.',
  questionOf: (n: number, total: number) => `Question ${n} of about ${total}`,
  cheers: ['Nice work', 'Keep going', 'Good thinking', 'You’ve got this', 'Great focus', 'Well done'],
  // The tier as a name only, never as a rank (no other tier names, no order, no score).
  youAre: { Explorers: 'You’re an Explorer', Creators: 'You’re a Creator', Innovators: 'You’re an Innovator' } as Record<Tier, string>,
  inGrade: (g: number) => `in Grade ${g}!`, contact: 'Our team will contact you soon.', newStudent: 'New student',
  welcomeBack: (name: string) => `Welcome back, ${name}`, resumeNote: 'Pick up where you stopped.', resume: 'Continue',
  pq: {
    kids: ['Put the apple in the basket.', ['Apple', 'Ball', 'Star']],
    teen: ['What comes next? 3, 6, 9, 12, ?', ['15', '14', '18']],
    pro: ['All bloops are razzies, and all razzies are lazzies. Are all bloops lazzies?', ['Yes', 'No', 'Not enough information']],
  } as Record<Band, [string, string[]]>,
}
const ar: typeof en = {
  hero: { kids: 'هيا نجد صفّك!', teen: 'هيا نجد صفّك', pro: 'اعرف صفّك' },
  sub: {
    kids: 'بعض الألعاب القصيرة. لا يوجد نجاح أو رسوب.',
    teen: 'حوالي 10 دقائق. الأسئلة تتغيّر لتناسبك.',
    pro: 'حوالي 10 دقائق. الأسئلة تتكيّف مع إجاباتك، فخذ وقتك.',
  },
  age: 'كم عمرك؟', years: 'سنة', name: 'اسمك', namePh: 'اكتب اسمك',
  start: 'هيا بنا', practice: 'تدريب', practiceNote: 'للتدريب فقط ولا يُحتسب.', begin: 'ابدأ الاختبار',
  next: 'التالي', listen: 'استمع', pause: 'إيقاف مؤقت', listenOn: 'متابعة', again: 'من البداية', typeHere: 'اكتب إجابتك', clear: 'مسح', tapOrder: 'اسحب البطاقات إلى الترتيب الصحيح، أو اضغط عليها بالترتيب.', blockOrder: 'ركّب الكتل في البرنامج. اسحبها، أو اضغط على كتلة لإضافتها.', codeOrder: 'اسحب الأسطر لأعلى أو لأسفل لإصلاح البرنامج، أو اضغط على سطر ثم على مكانه.',
  sortHint: 'اسحب كل بطاقة إلى صندوق، أو اضغط على البطاقة ثم على الصندوق.', matchHint: 'اسحب من النقطة إلى ما يناسبها، أو اضغط على بطاقة ثم على ما يناسبها.',
  tapHint: 'اضغط على بطاقة، ثم اضغط على مكانها.',
  questionOf: (n: number, total: number) => `السؤال ${n} من حوالي ${total}`,
  cheers: ['عمل رائع', 'واصل', 'تفكير جميل', 'أنت قادر', 'تركيز رائع', 'أحسنت'],
  youAre: { Explorers: 'أنت من المستكشفين', Creators: 'أنت من المبدعين', Innovators: 'أنت من المبتكرين' },
  inGrade: (g: number) => `في الصف ${g}!`, contact: 'سيتواصل معك فريقنا قريبًا.', newStudent: 'طالب جديد',
  welcomeBack: (name: string) => `أهلًا بعودتك يا ${name}`, resumeNote: 'أكمل من حيث توقفت.', resume: 'أكمل',
  pq: {
    kids: ['ضع التفاحة في السلة.', ['تفاحة', 'كرة', 'نجمة']],
    teen: ['ما الرقم التالي؟ 3، 6، 9، 12، ؟', ['15', '14', '18']],
    pro: ['كل البلوبز رازيز، وكل الرازيز لازيز. هل كل البلوبز لازيز؟', ['نعم', 'لا', 'المعلومات غير كافية']],
  },
}
export const T = { en, ar }

export const STRAND_AR: Record<string, string> = {
  'Logic & patterns': 'المنطق والأنماط', 'Digital basics': 'المهارات الرقمية', 'Sequencing & algorithms': 'الخوارزميات والترتيب',
  Events: 'الأحداث', Loops: 'الحلقات', 'Conditionals & logic': 'الشروط', 'Variables & data': 'المتغيرات والبيانات',
  Functions: 'الدوال', 'Debugging & tracing': 'اكتشاف الأخطاء', AI: 'الذكاء الاصطناعي', 'Apps & UI': 'التطبيقات والواجهات',
  Games: 'الألعاب', 'Web, security & data': 'الويب والأمن والبيانات',
}
