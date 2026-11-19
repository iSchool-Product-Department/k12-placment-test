import { useEffect, useState } from 'react'
import clsx from 'clsx'
import { GraduationCap, LayoutDashboard, Library } from 'lucide-react'
import StudentApp from './student/StudentApp'
import AdminApp from './admin/AdminApp'
import ContentApp from './content/ContentApp'
import type { Lang } from './i18n'

// Plain #name hashes (student, admin, admin-<id>, content-rules) so links work everywhere, including inside artifacts.
const read = () => (location.hash.replace(/^#\/?/, '') || 'student').split(/[-/]/)

export default function App() {
  const [route, setRoute] = useState(read)
  const [lang, setLang] = useState<Lang>('en')
  useEffect(() => { const f = () => { setRoute(read()); window.scrollTo(0, 0) }; addEventListener('hashchange', f); return () => removeEventListener('hashchange', f) }, [])
  const go = (h: string) => { location.hash = h.replace(/\//g, '-') }
  const view = route[0]
  const studentRtl = view === 'student' && lang === 'ar'
  useEffect(() => { document.documentElement.lang = studentRtl ? 'ar' : 'en'; document.documentElement.dir = studentRtl ? 'rtl' : 'ltr' }, [studentRtl])
  const tabs: [string, string, React.ReactNode][] = [['student', 'Student', <GraduationCap size={16} />], ['admin', 'Admin', <LayoutDashboard size={16} />], ['content', 'Content', <Library size={16} />]]
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 bg-blue text-white shadow-md">
        <div className="relative mx-auto flex h-16 max-w-6xl items-center gap-3 overflow-hidden ps-4 pe-16" dir="ltr">
          <img src="./ischool-logo-white.png" alt="iSchool" className="h-8 w-auto" />
          <span className="hidden font-[var(--font-head)] text-lg font-bold sm:inline">Placement Test</span>
          <nav className="ms-auto flex rounded-full bg-deep/50 p-1">
            {tabs.map(([k, l, i]) => (
              <button key={k} onClick={() => go(k)} aria-pressed={view === k} className={clsx('flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-extrabold', view === k ? 'bg-white text-deep' : 'text-white/90 hover:text-white')}>{i}<span className="hidden sm:inline">{l}</span></button>
            ))}
          </nav>
          {view === 'student' && (
            <div className="flex rounded-full bg-deep/50 p-1">
              {(['en', 'ar'] as Lang[]).map(l => <button key={l} onClick={() => setLang(l)} aria-pressed={lang === l} className={clsx('rounded-full px-2.5 py-1.5 text-sm font-extrabold', lang === l ? 'bg-white text-deep' : 'text-white/90')}>{l === 'en' ? 'EN' : 'عربي'}</button>)}
            </div>
          )}
          <svg className="pointer-events-none absolute -right-8 -top-12 hidden h-24 w-24 opacity-90 sm:block" viewBox="0 0 100 100" aria-hidden="true"><path d="M10 90 Q 20 20 90 10" fill="none" stroke="#FF7F1C" strokeWidth="9" strokeLinecap="round" /><circle cx="18" cy="72" r="5" fill="#FFD700" /></svg>
        </div>
      </header>
      <main>
        {view === 'student' && <StudentApp key={lang} lang={lang} />}
        {view === 'admin' && <AdminApp route={route} go={go} />}
        {view === 'content' && <ContentApp route={route} go={go} />}
      </main>
    </div>
  )
}
