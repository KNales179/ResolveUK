import { useState, type FormEvent, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Logo } from '../components/site/Logo'
import { PageBackdrop } from '../components/site/SiteShell'
import { useStaffAuth } from './auth'

export function Frame({ title, children }: { title: string; children: ReactNode }) {
  return (
    <>
      <PageBackdrop />
      <main className="grid min-h-svh place-items-center px-5 py-16">
        <div className="rise card w-full max-w-md rounded-3xl p-8">
          <Link to="/" className="flex items-center gap-2.5 text-lg font-semibold tracking-tight">
            <Logo />
            <span>Resolve UK</span>
          </Link>
          <h1 className="mt-6 text-4xl">{title}</h1>
          {children}
        </div>
      </main>
    </>
  )
}

export function StaffLogin() {
  const { signIn } = useStaffAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const problem = await signIn(email, password)
    if (problem) setError(problem)
    setBusy(false)
  }

  return (
    <Frame title="Staff sign-in">
      <p className="mt-2 text-soft">For council and contractor staff, and Resolve reviewers and admins.</p>
      <form onSubmit={submit} className="mt-7 space-y-5">
        <div>
          <label htmlFor="staff-email" className="mb-1.5 block text-sm font-semibold">
            Email
          </label>
          <input id="staff-email" className="input" type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div>
          <label htmlFor="staff-password" className="mb-1.5 block text-sm font-semibold">
            Password
          </label>
          <input id="staff-password" className="input" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
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
