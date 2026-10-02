import { Link, NavLink, Navigate, Route, Routes } from 'react-router-dom'
import { Icon } from '../components/ui/Icon'
import { Logo } from '../components/site/Logo'
import { PageBackdrop } from '../components/site/SiteShell'
import { toggleTheme } from '../lib/theme'
import { StaffAuthProvider, useStaffAuth } from './auth'
import { StaffDashboard } from './Dashboard'
import { StaffLogin, StaffNoAccess } from './Login'
import { StaffManage } from './Manage'

const ROLE_LABEL = { staff: 'Council or contractor staff', reviewer: 'Resolve reviewer', resolve_admin: 'Resolve admin' } as const
const tab = ({ isActive }: { isActive: boolean }) => `rounded-full px-4 py-2 transition ${isActive ? 'bg-surface2 text-ink' : 'text-soft hover:text-ink'}`

function Shell() {
  const { status, profile, signOut } = useStaffAuth()

  if (status === 'loading') {
    return <p className="grid min-h-svh place-items-center text-soft">Loading…</p>
  }
  if (status === 'signedOut') return <StaffLogin />
  if (status === 'noAccess') return <StaffNoAccess />

  return (
    <>
      <PageBackdrop />
      <header className="fixed inset-x-0 top-0 z-40 border-b border-line bg-bg/80 backdrop-blur-xl">
        <div className="mx-auto max-w-6xl px-4 sm:px-8">
          <nav className="flex h-16 items-center justify-between gap-2" aria-label="Staff">
            <Link to="/" className="flex items-center gap-2.5 text-[1.05rem] font-semibold tracking-tight">
              <Logo />
              <span className="hidden sm:inline">Resolve UK</span>
            </Link>
            <div className="flex items-center gap-1 text-sm font-semibold">
              <NavLink to="/staff" end className={tab}>
                Dashboard
              </NavLink>
              {profile?.role === 'resolve_admin' && (
                <NavLink to="/staff/manage" className={tab}>
                  Manage
                </NavLink>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button className="icon-btn" type="button" onClick={toggleTheme} aria-label="Switch between light and dark mode">
                <span className="dark:hidden">
                  <Icon name="moon" />
                </span>
                <span className="hidden dark:block">
                  <Icon name="sun" />
                </span>
              </button>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => void signOut()}>
                Sign out
              </button>
            </div>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-5 pb-24 pt-28 sm:px-8">
        <div className="rise mb-8">
          <p className="eyebrow">Staff dashboard</p>
          <h1 className="mt-3 text-4xl sm:text-5xl">Hello, {profile?.display_name}</h1>
          <p className="mt-1 text-soft">{ROLE_LABEL[profile!.role]}</p>
        </div>
        <Routes>
          <Route index element={<StaffDashboard />} />
          {profile?.role === 'resolve_admin' && <Route path="manage" element={<StaffManage />} />}
          <Route path="*" element={<Navigate to="/staff" replace />} />
        </Routes>
      </main>
    </>
  )
}

export function StaffApp() {
  return (
    <StaffAuthProvider>
      <Shell />
    </StaffAuthProvider>
  )
}
