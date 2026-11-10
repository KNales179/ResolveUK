import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './supabase'

export interface ReporterProfile {
  id: string
  display_name: string
  bio: string | null
  avatar_path: string | null
}

type Status = 'loading' | 'signedOut' | 'ready'

interface ReporterAuth {
  status: Status
  email: string
  profile: ReporterProfile | null
  signUp: (email: string, password: string, displayName: string) => Promise<string | null>
  signIn: (email: string, password: string) => Promise<string | null>
  signInWithGoogle: () => Promise<string | null>
  resetPassword: (email: string) => Promise<string | null>
  signOut: () => Promise<void>
  updateProfile: (fields: { display_name?: string; bio?: string | null; avatar_path?: string | null }) => Promise<string | null>
}

const Ctx = createContext<ReporterAuth | null>(null)

// A separate, lighter account system for the person sending a report, not for staff. Signing up here
// never grants staff access: that stays gated by the unrelated staff_profiles table.
export function ReporterAuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null | undefined>(undefined)
  const [profile, setProfile] = useState<ReporterProfile | null | undefined>(undefined)

  useEffect(() => {
    let alive = true
    supabase.auth.getSession().then(({ data }) => {
      if (alive) setSession((current) => (current === undefined ? data.session : current))
    })
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
    ;(async () => {
      const { data } = await supabase.from('reporter_profiles').select('id, display_name, bio, avatar_path').eq('id', userId).maybeSingle()
      if (!alive) return
      if (data) {
        setProfile(data as ReporterProfile)
        return
      }
      // First sign-in after confirming an email: the account exists in auth, but the profile
      // row was never written (sign-up may have needed email confirmation first). Create it now
      // from the name given at sign-up, which Supabase kept on the account the whole time. A
      // Google sign-in carries its own name under a different metadata key instead.
      const meta = session?.user.user_metadata
      const name = ((meta?.display_name || meta?.full_name || meta?.name) as string | undefined)?.trim() || 'Reporter'
      const { data: created } = await supabase.from('reporter_profiles').insert({ id: userId, display_name: name }).select('id, display_name, bio, avatar_path').maybeSingle()
      if (alive) setProfile((created as ReporterProfile | null) ?? { id: userId, display_name: name, bio: null, avatar_path: null })
    })()
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [known, userId])

  const value = useMemo<ReporterAuth>(() => {
    let status: Status = 'ready'
    if (!known || (userId && profile === undefined)) status = 'loading'
    else if (!userId) status = 'signedOut'
    return {
      status,
      email: session?.user.email ?? '',
      profile: profile ?? null,
      async signUp(email, password, displayName) {
        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { data: { display_name: displayName.trim() || 'Reporter' } },
        })
        return error ? error.message : null
      },
      async signIn(email, password) {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
        if (!error) return null
        return /invalid login/i.test(error.message) ? 'That email and password do not match.' : error.message
      },
      async signInWithGoogle() {
        // Navigates away to Google and back, so this only ever resolves with an error — a request
        // that never even started (e.g. the Google provider is not switched on for this Supabase
        // project yet). There is nothing to await on success; the page leaves first.
        const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${window.location.origin}/account` } })
        return error ? error.message : null
      },
      async resetPassword(email) {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/reset-password` })
        return error ? error.message : null
      },
      async signOut() {
        await supabase.auth.signOut()
      },
      async updateProfile(fields) {
        if (!userId) return 'Not signed in.'
        const { data, error } = await supabase.from('reporter_profiles').update(fields).eq('id', userId).select('id, display_name, bio, avatar_path').maybeSingle()
        if (error) return error.message
        if (data) setProfile(data as ReporterProfile)
        return null
      },
    }
  }, [known, userId, profile, session])

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useReporterAuth(): ReporterAuth {
  const value = useContext(Ctx)
  if (!value) throw new Error('useReporterAuth must be used inside ReporterAuthProvider')
  return value
}
