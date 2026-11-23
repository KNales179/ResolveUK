import { useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { SIGNED_OUT_ELSEWHERE, useReporterAuth } from '../../lib/reporterAuth'
import { useAuthOptions } from '../../lib/authOptions'
import { PasswordField } from '../../components/ui/PasswordField'
import { GoogleIcon } from '../../components/ui/GoogleIcon'
import { Icon } from '../../components/ui/Icon'
import { useAppSession } from '../session'
import { shake } from './fields'

export function SignIn() {
  const auth = useReporterAuth()
  const session = useAppSession()
  const options = useAuthOptions()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from ?? '/app'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [wrong, setWrong] = useState(false)
  const [busy, setBusy] = useState(false)
  // Sent here because the account was signed out in another open tab: say so, once.
  const [elsewhere] = useState(() => {
    try {
      const was = sessionStorage.getItem(SIGNED_OUT_ELSEWHERE) === '1'
      sessionStorage.removeItem(SIGNED_OUT_ELSEWHERE)
      return was
    } catch {
      return false
    }
  })

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (!email.trim() || !password) {
      setError('Enter your email and password.')
      shake(!email.trim() ? 'signin-email' : 'signin-password')
      return
    }
    setBusy(true)
    const problem = await auth.signIn(email, password)
    setBusy(false)
    if (problem) {
      setError(/not confirmed/i.test(problem) ? 'Your email is not confirmed yet. Open the link we sent you, then sign in.' : problem)
      setWrong(true)
      shake('signin-password')
      return
    }
    navigate(from, { replace: true })
  }

  function tryDemo() {
    session.startDemo('resident')
    navigate('/app', { replace: true })
  }

  return (
    <div className="card space-y-6 rounded-3xl p-6 sm:p-8">
      <div>
        <h1 className="font-serif text-3xl">Welcome back</h1>
        <p className="mt-1.5 text-soft">Sign in to follow your reports and see what's happening near you.</p>
      </div>
      {elsewhere && (
        <p className="msg msg-info" role="status">
          You signed out in another tab, so this one has been signed out too.
        </p>
      )}

      <form onSubmit={submit} noValidate className="space-y-4">
        <div>
          <label htmlFor="signin-email" className="mb-1.5 block text-sm font-semibold">
            Email
          </label>
          <input id="signin-email" className="input" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div>
          <PasswordField
            id="signin-password"
            label="Password"
            autoComplete="current-password"
            value={password}
            invalid={wrong}
            onChange={(v) => {
              setPassword(v)
              setWrong(false)
            }}
          />
          <Link to="/app/forgot-password" className="mt-2 inline-block text-sm font-semibold text-accent hover:underline">
            Forgot your password?
          </Link>
        </div>
        {error && (
          <p className="msg msg-error" role="alert">
            {error}
          </p>
        )}
        <button type="submit" className="btn btn-primary w-full" disabled={busy}>
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
      </form>

      <div className="space-y-2">
        <button type="button" className="btn btn-ghost w-full gap-2" onClick={tryDemo}>
          <Icon name="compass" className="size-5" /> Try the demo
        </button>
        <p className="text-center text-xs text-soft">No account needed. Explore with sample data on this device only; nothing is sent, and it disappears when you leave.</p>
      </div>

      {options.google && (
        <button type="button" className="btn btn-ghost w-full gap-2.5" onClick={() => void auth.signInWithGoogle()}>
          <GoogleIcon /> Continue with Google
        </button>
      )}

      {options.signUp && (
        <p className="text-center text-sm text-soft">
          New to Resolve UK?{' '}
          <Link to="/app/create-account" className="font-semibold text-accent hover:underline">
            Create an account
          </Link>
        </p>
      )}
      <p className="text-center text-xs text-soft">
        Just want to report something?{' '}
        <Link to="/report" className="font-semibold underline underline-offset-2 hover:text-ink">
          Report without an account
        </Link>
      </p>
    </div>
  )
}
