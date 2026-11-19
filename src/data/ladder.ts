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

export const LEARN: Record<'en' | 'ar', string[][]> = {
  en: [['Use a mouse and keyboard', 'Make characters move and talk in Sprite Lab', 'Build your first loops and scores'], ['Put steps in order like a real coder', 'Use loops and if/else, and fix bugs', 'Build games with Code.org'], ['Design app screens', 'Build apps with buttons, lists and functions', 'Make games with clones and collisions'], ['See how AI sees, hears and talks', 'Train your own AI model', 'Write strong prompts for chatbots'], ['Write real Python code', 'Use loops, lists and functions', 'Solve problems step by step'], ['Make 2D games in Godot', 'Add physics, collisions and enemies', 'Code game logic in GDScript'], ['Design apps in Figma', 'Research users and sketch ideas', 'Build clickable prototypes'], ['Build mobile apps with Flutter and Dart', 'Connect apps to APIs and Firebase', 'Sign users in and save their data'], ['Build websites with HTML, CSS and JavaScript', 'Make pages work on every screen', 'Create a server with Node.js and MongoDB'], ['Learn the basics of cyber security', 'Understand how networks and the internet work', 'Find and report security weaknesses'], ['Make 3D games in Unity', 'Code game logic in C#', 'Publish games for web and mobile'], ['Analyze data with Python and pandas', 'Train machine learning models', 'Turn data into clear charts']],
  ar: [['استخدام الفأرة ولوحة المفاتيح', 'تحريك الشخصيات وجعلها تتكلم في Sprite Lab', 'أول حلقات تكرار ونقاط في ألعابك'], ['ترتيب الخطوات مثل المبرمجين', 'الحلقات وif/else وإصلاح الأخطاء', 'بناء ألعاب في Code.org'], ['تصميم شاشات التطبيقات', 'بناء تطبيقات بالأزرار والقوائم والدوال', 'صنع ألعاب بالنسخ والتصادمات'], ['كيف يرى الذكاء الاصطناعي ويسمع ويتكلم', 'تدريب نموذج ذكاء اصطناعي خاص بك', 'كتابة طلبات قوية لروبوتات المحادثة'], ['كتابة كود حقيقي بلغة Python', 'الحلقات والقوائم والدوال', 'حل المشكلات خطوة بخطوة'], ['صنع ألعاب ثنائية الأبعاد في Godot', 'الفيزياء والتصادمات والأعداء', 'برمجة منطق اللعبة بلغة GDScript'], ['تصميم التطبيقات في Figma', 'دراسة المستخدمين ورسم الأفكار', 'بناء نماذج تفاعلية'], ['بناء تطبيقات موبايل بـ Flutter وDart', 'ربط التطبيقات بواجهات API وFirebase', 'تسجيل دخول المستخدمين وحفظ بياناتهم'], ['بناء مواقع بـ HTML وCSS وJavaScript', 'صفحات تعمل على كل الشاشات', 'إنشاء خادم بـ Node.js وMongoDB'], ['أساسيات الأمن السيبراني', 'كيف تعمل الشبكات والإنترنت', 'اكتشاف الثغرات الأمنية والإبلاغ عنها'], ['صنع ألعاب ثلاثية الأبعاد في Unity', 'برمجة منطق اللعبة بلغة C#', 'نشر الألعاب على الويب والموبايل'], ['تحليل البيانات بـ Python وpandas', 'تدريب نماذج تعلّم الآلة', 'تحويل البيانات إلى رسوم بيانية واضحة']],
}

/** Avatars are emoji so they stay tiny and need no image files. */
export const AVATARS = ['🤖', '🦊', '🐼', '🚀', '🦁', '🐙', '🦄', '🐢', '🎮', '⚡', '🧠', '🎧']
