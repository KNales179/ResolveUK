import { useEffect, useState } from 'react'

// Which sign-in options the Supabase project actually has switched on, read live from its public
// auth settings — so a "Continue with Google" button or a "Create an account" tab only appears once
// it would really work, and shows up on its own the day it's enabled in Supabase → Authentication.
// Until the answer arrives (or if it can't be fetched), both stay hidden: a missing button is
// better than one that fails.
export type AuthOptions = { google: boolean; signUp: boolean }

const HIDDEN: AuthOptions = { google: false, signUp: false }
let cached: Promise<AuthOptions> | null = null

function load(): Promise<AuthOptions> {
  if (!cached) {
    const url = import.meta.env.VITE_SUPABASE_URL
    const key = import.meta.env.VITE_SUPABASE_ANON_KEY
    cached = fetch(`${url}/auth/v1/settings`, { headers: { apikey: key } })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((s) => ({ google: s?.external?.google === true, signUp: s?.disable_signup === false }))
      .catch(() => {
        cached = null // try again next time rather than remembering a network blip
        return HIDDEN
      })
  }
  return cached
}

export function useAuthOptions(): AuthOptions {
  const [opts, setOpts] = useState(HIDDEN)
  useEffect(() => {
    let alive = true
    void load().then((o) => {
      if (alive) setOpts(o)
    })
    return () => {
      alive = false
    }
  }, [])
  return opts
}
