export type Lang = 'en' | 'ar'
export type Band = 'kids' | 'teen' | 'pro'
export const bandOf = (age: number | null): Band => (!age || age <= 9 ? 'kids' : age <= 13 ? 'teen' : 'pro')

const en = {
  hero: { kids: 'Let’s find your class!', teen: 'Your coding mission starts here', pro: 'Find your level' },
  sub: {
    kids: 'Play a few short games. There is no pass or fail.',
    teen: 'About 10 minutes. The questions change to match you.',
    pro: '10 to 15 minutes. Questions adapt to your answers, so take your time.',
  },
  age: 'How old are you?', years: 'years old', name: 'Your name', namePh: 'Type your name', avatar: 'Pick your buddy',
  start: 'Let’s go', practice: 'Practice round', practiceNote: 'Just for practice. It does not count.', begin: 'Start the real questions',
  next: 'Next', listen: 'Listen', typeHere: 'Type your answer', clear: 'Clear', tapOrder: 'Drag the cards into the right order, or tap them in order.', blockOrder: 'Snap the blocks into the program. Drag them, or tap a block to add it.', codeOrder: 'Drag the lines up or down to fix the program, or tap a line and then where it goes.',
  sortHint: 'Drag each card into a box, or tap a card and then a box.', matchHint: 'Drag from a dot to its partner, or tap a card and then its partner.',
  question: 'Question', saved: ['Nice!', 'Got it!', 'Saved!', 'Keep going!', 'Great focus!'],
  steps: { warmup: 'Warm-up', warmupDown: 'Extra warm-up', know: 'Skill check', knowUp: 'Bonus round', grade: 'Final round' },
  ready: 'You are ready for', grade: 'Grade', learn: 'What you will learn', tools: 'You will use', again: 'Start a new test',
  showed: 'Skills you showed today', time: 'min', questions: 'questions',
  pq: {
    kids: ['Which number is the biggest?', ['3', '9', '5']],
    teen: ['What comes next? 3, 6, 9, 12, ?', ['14', '15', '18']],
    pro: ['All bloops are razzies, and all razzies are lazzies. Are all bloops lazzies?', ['Yes', 'No', 'Not enough information']],
  } as Record<Band, [string, string[]]>,
}
const ar: typeof en = {
  hero: { kids: 'هيا نجد صفّك!', teen: 'مهمتك البرمجية تبدأ هنا', pro: 'اعرف مستواك' },
  sub: {
    kids: 'العب بعض الألعاب القصيرة. لا يوجد نجاح أو رسوب.',
    teen: 'حوالي 10 دقائق. الأسئلة تتغيّر لتناسبك.',
    pro: 'من 10 إلى 15 دقيقة. الأسئلة تتكيّف مع إجاباتك، فخذ وقتك.',
  },
  age: 'كم عمرك؟', years: 'سنة', name: 'اسمك', namePh: 'اكتب اسمك', avatar: 'اختر رفيقك',
  start: 'هيا بنا', practice: 'جولة تدريب', practiceNote: 'للتدريب فقط ولا يُحتسب.', begin: 'ابدأ الأسئلة الحقيقية',
  next: 'التالي', listen: 'استمع', typeHere: 'اكتب إجابتك', clear: 'مسح', tapOrder: 'اسحب البطاقات إلى الترتيب الصحيح، أو اضغط عليها بالترتيب.', blockOrder: 'ركّب الكتل في البرنامج. اسحبها، أو اضغط على كتلة لإضافتها.', codeOrder: 'اسحب الأسطر لأعلى أو لأسفل لإصلاح البرنامج، أو اضغط على سطر ثم على مكانه.',
  sortHint: 'اسحب كل بطاقة إلى صندوق، أو اضغط على البطاقة ثم على الصندوق.', matchHint: 'اسحب من النقطة إلى ما يناسبها، أو اضغط على بطاقة ثم على ما يناسبها.',
  question: 'السؤال', saved: ['رائع!', 'تمام!', 'تم الحفظ!', 'استمر!', 'تركيز ممتاز!'],
  steps: { warmup: 'الإحماء', warmupDown: 'إحماء إضافي', know: 'فحص المهارات', knowUp: 'جولة إضافية', grade: 'الجولة الأخيرة' },
  ready: 'أنت جاهز لـ', grade: 'الصف', learn: 'ماذا ستتعلم', tools: 'ستستخدم', again: 'ابدأ اختبارًا جديدًا',
  showed: 'مهارات أظهرتها اليوم', time: 'دقيقة', questions: 'أسئلة',
  pq: {
    kids: ['أي رقم هو الأكبر؟', ['3', '9', '5']],
    teen: ['ما الرقم التالي؟ 3، 6، 9، 12، ؟', ['14', '15', '18']],
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
