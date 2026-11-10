import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { PageBackdrop } from '../components/site/SiteShell'
import { Reveal } from '../components/ui/Reveal'
import { PasswordField } from '../components/ui/PasswordField'
import { supabase } from '../lib/supabase'

// Reached by clicking the link in a "forgot password" email, for either a reporter or a staff
// account — the same underlying Supabase auth, so one page serves both. Following that link signs
// the browser into a short-lived recovery session automatically; this page only has to offer a
// form to set a new password while that session lasts, not re-implement the email step itself.
export function ResetPasswordPage() {
  const [ready, setReady] = useState<'checking' | 'ready' | 'invalid'>('checking')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let alive = true
    supabase.auth.getSession().then(({ data }) => {
      if (alive) setReady(data.session ? 'ready' : 'invalid')
    })
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setReady('ready')
    })
    return () => {
      alive = false
      data.subscription.unsubscribe()
    }
  }, [])

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (password.length < 8) return setError('Please use at least 8 characters.')
    setBusy(true)
    const { error: updateError } = await supabase.auth.updateUser({ password })
    setBusy(false)
    if (updateError) setError(updateError.message)
    else setDone(true)
  }

  return (
    <div className="relative">
      <PageBackdrop />
      <main className="grid-texture grid-shimmer grid min-h-svh place-items-center px-5 py-16">
        <Reveal className="card w-full max-w-md rounded-3xl p-8">
          <h1 className="text-4xl">Choose a new password</h1>

          {ready === 'checking' && <p className="mt-4 text-soft">Checking your link…</p>}

          {ready === 'invalid' && (
            <>
              <p className="mt-4 text-soft">This link is invalid or has expired. Request a new one from the sign-in page.</p>
              <Link to="/account" className="btn btn-ghost mt-6 w-full">
                Back to sign in
              </Link>
            </>
          )}

          {ready === 'ready' && !done && (
            <form onSubmit={submit} className="mt-6 space-y-5">
              <PasswordField id="new-password" label="New password" autoComplete="new-password" value={password} onChange={setPassword} />
              {error && (
                <p className="msg msg-error" role="alert">
                  {error}
                </p>
              )}
              <button type="submit" className="btn btn-primary w-full" disabled={busy}>
                {busy ? 'Saving…' : 'Save new password'}
              </button>
            </form>
          )}

          {done && (
            <>
              <p className="msg msg-ok mt-6" role="status">
                Password updated. You're signed in with it already.
              </p>
              <Link to="/account" className="btn btn-primary mt-6 w-full">
                Continue
              </Link>
            </>
          )}
        </Reveal>
      </main>
    </div>
  )
}
