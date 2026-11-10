import { useState, type FormEvent, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Logo } from '../components/site/Logo'
import { PageBackdrop } from '../components/site/SiteShell'
import { GoogleIcon } from '../components/ui/GoogleIcon'
import { PasswordField } from '../components/ui/PasswordField'
import { useStaffAuth } from './auth'

export function Frame({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="relative">
      <PageBackdrop />
      <main className="grid-texture grid-shimmer grid min-h-svh place-items-center px-5 py-16">
        <div className="rise card w-full max-w-md rounded-3xl p-8">
          <Link to="/" className="flex items-center gap-2.5 text-lg font-semibold tracking-tight">
            <Logo />
            <span>Resolve UK</span>
          </Link>
          <h1 className="mt-6 text-4xl">{title}</h1>
          {children}
        </div>
      </main>
    </div>
  )
}

function StaffForgotPassword({ onBack }: { onBack: () => void }) {
  const { resetPassword } = useStaffAuth()
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    const problem = await resetPassword(email)
    setBusy(false)
    if (problem) setError(problem)
    else setSent(true)
  }

  return (
    <Frame title="Reset your password">
      {sent ? (
        <>
          <p className="msg msg-ok mt-6" role="status">
            If a staff account exists for {email}, a reset link is on its way.
          </p>
          <button type="button" className="btn btn-ghost mt-4 w-full" onClick={onBack}>
            Back to sign in
          </button>
        </>
      ) : (
        <form onSubmit={submit} className="mt-7 space-y-5">
          <div>
            <label htmlFor="staff-forgot-email" className="mb-1.5 block text-sm font-semibold">
              Email
            </label>
            <input id="staff-forgot-email" className="input" type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          {error && (
            <p className="msg msg-error" role="alert">
              {error}
            </p>
          )}
          <button type="submit" className="btn btn-primary w-full" disabled={busy}>
            {busy ? 'Sending…' : 'Send reset link'}
          </button>
          <button type="button" className="block w-full text-center text-sm font-semibold text-soft hover:text-ink" onClick={onBack}>
            Back to sign in
          </button>
        </form>
      )}
    </Frame>
  )
}

export function StaffLogin() {
  const { signIn, signInWithGoogle } = useStaffAuth()
  const [forgot, setForgot] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [googleBusy, setGoogleBusy] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const problem = await signIn(email, password)
    if (problem) setError(problem)
    setBusy(false)
  }

  async function withGoogle() {
    setError(null)
    setGoogleBusy(true)
    const problem = await signInWithGoogle()
    if (problem) {
      setError(problem)
      setGoogleBusy(false)
    }
    // No else: the page is about to navigate to Google, so there is nothing further to do here.
  }

  if (forgot) return <StaffForgotPassword onBack={() => setForgot(false)} />

  return (
    <Frame title="Staff sign-in">
      <p className="mt-2 text-soft">For council and contractor staff, and Resolve reviewers and admins.</p>

      <button type="button" className="btn btn-ghost mt-6 w-full gap-2.5" onClick={() => void withGoogle()} disabled={googleBusy}>
        <GoogleIcon /> {googleBusy ? 'Redirecting…' : 'Continue with Google'}
      </button>
      <div className="my-5 flex items-center gap-3 text-xs font-semibold uppercase tracking-widest text-soft">
        <span className="h-px flex-1 bg-line" />
        or
        <span className="h-px flex-1 bg-line" />
      </div>

      <form onSubmit={submit} className="space-y-5">
        <div>
          <label htmlFor="staff-email" className="mb-1.5 block text-sm font-semibold">
            Email
          </label>
          <input id="staff-email" className="input" type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <PasswordField id="staff-password" label="Password" autoComplete="current-password" value={password} onChange={setPassword} />
        <button type="button" className="-mt-2 block text-sm font-semibold text-accent hover:underline" onClick={() => setForgot(true)}>
          Forgot your password?
        </button>
        {error && (
          <p className="msg msg-error" role="alert">
            {error}
          </p>
        )}
        <button type="submit" className="btn btn-primary w-full" disabled={busy}>
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </Frame>
  )
}

export function StaffNoAccess() {
  const { email, signOut } = useStaffAuth()
  return (
    <Frame title="No access yet">
      <p className="mt-3 text-soft">
        You are signed in{email ? ` as ${email}` : ''}, but this account has not been added as staff. Ask a Resolve admin to add you.
      </p>
      <button type="button" className="btn btn-ghost mt-6" onClick={() => void signOut()}>
        Sign out
      </button>
    </Frame>
  )
}
