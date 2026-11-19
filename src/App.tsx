import { Component, useEffect, useState, type ReactNode } from 'react'
import clsx from 'clsx'
import { GraduationCap, LayoutDashboard, Library } from 'lucide-react'
import StudentApp from './student/StudentApp'
import AdminApp from './admin/AdminApp'
import ContentApp from './content/ContentApp'
import type { Lang } from './i18n'
import { studentOnly } from './cloud'

// Plain #name hashes (student, admin, admin-<id>, content-rules) so links work everywhere, including inside artifacts.
const read = () => (location.hash.replace(/^#\/?/, '') || 'student').split(/[-/]/)

// Last line of defence: a render error shows this instead of a blank white page. Changing view resets it.
class Safe extends Component<{ children: ReactNode }, { err: Error | null }> {
  state = { err: null as Error | null }
  static getDerivedStateFromError(err: Error) { return { err } }
  componentDidCatch(err: Error) { console.error(err) }
  render() {
    if (!this.state.err) return this.props.children
    return (
      <div className="mx-auto mt-16 max-w-md rounded-3xl border border-line bg-white p-6 text-center shadow-[var(--shadow-card)]">
        <h2 className="m-0 text-2xl text-deep">Something went wrong on this screen</h2>
        <p className="mb-4 mt-2 text-soft">Your answers so far are saved.</p>
        <button onClick={() => location.reload()} className="rounded-full bg-orange px-6 py-2.5 font-extrabold text-white">Reload</button>
      </div>
    )
  }
}

export default function App() {
  const [route, setRoute] = useState(read)
  const [lang, setLang] = useState<Lang>('en')
  useEffect(() => { const f = () => { setRoute(read()); window.scrollTo(0, 0) }; addEventListener('hashchange', f); return () => removeEventListener('hashchange', f) }, [])
  const go = (h: string) => { location.hash = h.replace(/\//g, '-') }
  // A deployed build: the test, plus #/admin behind the team password. No tabs, no content view.
  const view = studentOnly && route[0] !== 'admin' ? 'student' : route[0]
  const studentRtl = view === 'student' && lang === 'ar'
  useEffect(() => { document.documentElement.lang = studentRtl ? 'ar' : 'en'; document.documentElement.dir = studentRtl ? 'rtl' : 'ltr' }, [studentRtl])
  const tabs: [string, string, React.ReactNode][] = [['student', 'Student', <GraduationCap size={16} />], ['admin', 'Admin', <LayoutDashboard size={16} />], ['content', 'Content', <Library size={16} />]]
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 bg-blue text-white shadow-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4" dir="ltr">
          <img src="./ischool-logo-white.png" alt="iSchool" className="h-7 w-auto sm:h-8" />
          <span className="hidden font-[var(--font-head)] text-lg font-bold sm:inline">Placement Test</span>
          {!studentOnly && <nav className="ms-auto flex rounded-full bg-deep/50 p-1">
            {tabs.map(([k, l, i]) => (
              <button key={k} onClick={() => go(k)} aria-pressed={view === k} className={clsx('flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-extrabold', view === k ? 'bg-white text-deep' : 'text-white/90 hover:text-white')}>{i}<span className="hidden sm:inline">{l}</span></button>
            ))}
          </nav>}
          {view === 'student' && (
            <div className={clsx("flex rounded-full bg-deep/50 p-1", studentOnly && "ms-auto")}>
              {(['en', 'ar'] as Lang[]).map(l => <button key={l} onClick={() => setLang(l)} aria-pressed={lang === l} className={clsx('rounded-full px-2.5 py-1.5 text-sm font-extrabold', lang === l ? 'bg-white text-deep' : 'text-white/90')}>{l === 'en' ? 'EN' : 'عربي'}</button>)}
            </div>
          )}
        </div>
      </header>
      <main><Safe key={route.join('-')}>
        {view === 'student' && <StudentApp key={lang} lang={lang} />}
        {view === 'admin' && <AdminApp route={route} go={go} />}
        {view === 'content' && <ContentApp route={route} go={go} />}
      </Safe></main>
    </div>
  )
}
