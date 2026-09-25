import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import type { StaffProfile } from '../types'

type Status = 'loading' | 'signedOut' | 'noAccess' | 'ready'

interface StaffAuth {
  status: Status
  email: string
  profile: StaffProfile | null
  isAdmin: boolean
  isReviewer: boolean
  isStaff: boolean
  signIn: (email: string, password: string) => Promise<string | null>
  signOut: () => Promise<void>
}

const Ctx = createContext<StaffAuth | null>(null)

export function StaffAuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null | undefined>(undefined)
  const [profile, setProfile] = useState<StaffProfile | null | undefined>(undefined)

  useEffect(() => {
    let alive = true
    supabase.auth.getSession().then(({ data }) => {
      if (alive) setSession((current) => (current === undefined ? data.session : current))
    })
    // Only store the session here; querying the database in this callback can stall the client.
    const { data } = supabase.auth.onAuthStateChange((_event, next) => setSession(next))
    return () => {
      alive = false
      data.subscription.unsubscribe()
    }
  }, [])

  const known = session !== undefined
  const userId = session?.user.id ?? null

  useEffect(() => {
    if (!known) return
    if (!userId) {
      setProfile(null)
      return
    }
    let alive = true
    setProfile(undefined)
    supabase
      .from('staff_profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle()
      .then(({ data }) => {
        if (alive) setProfile((data as StaffProfile | null) ?? null)
      })
    return () => {
      alive = false
    }
  }, [known, userId])

  const value = useMemo<StaffAuth>(() => {
    let status: Status = 'ready'
    if (!known || (userId && profile === undefined)) status = 'loading'
    else if (!userId) status = 'signedOut'
    else if (!profile) status = 'noAccess'
    return {
      status,
      email: session?.user.email ?? '',
      profile: profile ?? null,
      isAdmin: profile?.role === 'resolve_admin',
      isReviewer: profile?.role === 'reviewer',
      isStaff: profile?.role === 'staff',
      async signIn(email, password) {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
        if (!error) return null
        return /invalid login/i.test(error.message) ? 'That email and password do not match.' : error.message
      },
      async signOut() {
        await supabase.auth.signOut()
      },
    }
  }, [known, userId, profile, session])

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useStaffAuth(): StaffAuth {
  const value = useContext(Ctx)
  if (!value) throw new Error('useStaffAuth must be used inside StaffAuthProvider')
  return value
}

export function useStaffMe(): StaffProfile {
  const { profile } = useStaffAuth()
  if (!profile) throw new Error('No staff profile')
  return profile
}
