import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { ReporterAuthProvider, useReporterAuth } from '../lib/reporterAuth'
import { supabase } from '../lib/supabase'

// Who is using the app at /app, and what they can see.
//
// Two ways in:
// - A real account (Supabase sign-in, the same accounts the old /account page used). The role comes
//   from the database's app_role() (supabase/app-roles.sql): resident, staff or admin.
// - The demo ("Try the demo" on the sign-in screen): a pretend person on this device only, with a
//   switch to preview the app as a resident, community member, staff member or admin. The demo never
//   writes to the database; it only changes what this browser shows, and leaving it wipes it.

export type AppRole = 'resident' | 'community' | 'staff' | 'admin'
export const ROLES: Array<{ id: AppRole; label: string }> = [
  { id: 'resident', label: 'Resident' },
  { id: 'community', label: 'Community' },
  { id: 'staff', label: 'Staff' },
  { id: 'admin', label: 'Admin' },
]

const DEMO_KEY = 'resolve.demo'

function readDemo(): AppRole | null {
  try {
    const raw = localStorage.getItem(DEMO_KEY)
    if (!raw) return null
    const role = (JSON.parse(raw) as { role?: AppRole }).role
    return role && ROLES.some((r) => r.id === role) ? role : 'resident'
  } catch {
    return null
  }
}

function writeDemo(role: AppRole | null) {
  try {
    if (role) localStorage.setItem(DEMO_KEY, JSON.stringify({ role }))
    else localStorage.removeItem(DEMO_KEY)
  } catch {
    // storage blocked: the demo still runs for this visit
  }
}

interface AppSession {
  status: 'loading' | 'signedOut' | 'ready'
  demo: boolean
  role: AppRole
  name: string
  email: string
  /** The real account's id (null in the demo). */
  userId: string | null
  startDemo: (role?: AppRole) => void
  setDemoRole: (role: AppRole) => void
  exitDemo: () => void
  signOut: () => Promise<void>
}

const Ctx = createContext<AppSession | null>(null)

function SessionInner({ children }: { children: ReactNode }) {
  const auth = useReporterAuth()
  const [demoRole, setDemoRoleState] = useState<AppRole | null>(readDemo)
  // The role the database gave for one particular account; it only counts for that account, so a
  // sign-out or a switch of account never shows the previous person's sections.
  const [fetched, setFetched] = useState<{ email: string; role: AppRole } | null>(null)

  // Ask the database what this signed-in person can do. If the function hasn't been added to the
  // database yet, or the request fails, they are treated as a resident (the safe, lowest level).
  const signedIn = auth.status === 'ready'
  useEffect(() => {
    if (!signedIn) return
    let alive = true
    const email = auth.email
    void supabase.rpc('app_role').then(({ data, error }) => {
      if (!alive) return
      setFetched({ email, role: !error && (data === 'staff' || data === 'admin' || data === 'community') ? data : 'resident' })
    })
    return () => {
      alive = false
    }
  }, [signedIn, auth.email])
  const realRole = signedIn && fetched?.email === auth.email ? fetched.role : null

  const startDemo = useCallback((role: AppRole = 'resident') => {
    writeDemo(role)
    setDemoRoleState(role)
  }, [])
  const setDemoRole = useCallback((role: AppRole) => {
    writeDemo(role)
    setDemoRoleState(role)
  }, [])
  const exitDemo = useCallback(() => {
    writeDemo(null)
    setDemoRoleState(null)
  }, [])

  const value = useMemo<AppSession>(() => {
    if (demoRole) {
      return {
        status: 'ready', demo: true, role: demoRole, name: 'Sam (demo)', email: 'demo@resolve.local', userId: null,
        startDemo, setDemoRole, exitDemo, signOut: async () => exitDemo(),
      }
    }
    const status = auth.status === 'ready' && realRole === null ? 'loading' : auth.status
    return {
      status,
      demo: false,
      role: realRole ?? 'resident',
      name: auth.profile?.display_name ?? '',
      email: auth.email,
      userId: auth.profile?.id ?? null,
      startDemo, setDemoRole, exitDemo,
      signOut: auth.signOut,
    }
  }, [demoRole, realRole, auth.status, auth.profile, auth.email, auth.signOut, startDemo, setDemoRole, exitDemo])

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function AppSessionProvider({ children }: { children: ReactNode }) {
  return (
    <ReporterAuthProvider>
      <SessionInner>{children}</SessionInner>
    </ReporterAuthProvider>
  )
}

export function useAppSession(): AppSession {
  const v = useContext(Ctx)
  if (!v) throw new Error('useAppSession must be used inside AppSessionProvider')
  return v
}

// Which sections each role sees in the app's navigation.
export function canSee(role: AppRole, section: 'staff' | 'admin'): boolean {
  if (section === 'admin') return role === 'admin'
  return role === 'staff' || role === 'admin'
}
