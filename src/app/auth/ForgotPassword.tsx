import { useState, type FormEvent } from 'react'
import { useReporterAuth } from '../../lib/reporterAuth'
import { shake } from './fields'
import { BackLink } from '../../components/ui/BackLink'

export function ForgotPassword() {
  const auth = useReporterAuth()
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("That doesn't look like an email address.")
      shake('fp-email')
      return
    }
    setBusy(true)
    const problem = await auth.resetPassword(email)
    setBusy(false)
    if (problem) setError(problem)
    else setSent(true)
  }

  return (
    <div className="card space-y-6 rounded-3xl p-6 sm:p-8">
      <div>
        <h1 className="font-serif text-3xl">Reset your password</h1>
        <p className="mt-1.5 text-soft">We'll email you a link to choose a new one.</p>
      </div>
      {sent ? (
        <p className="msg msg-info" role="status">
          If {email.trim()} has an account, a reset link is on its way. It can take a minute; check your spam folder too.
        </p>
      ) : (
        <form onSubmit={submit} noValidate className="space-y-4">
          <div>
            <label htmlFor="fp-email" className="mb-1.5 block text-sm font-semibold">
              Email
            </label>
            <input id="fp-email" className="input" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          {error && (
            <p className="msg msg-error" role="alert">
              {error}
            </p>
          )}
          <button type="submit" className="btn btn-primary w-full" disabled={busy}>
            {busy ? 'Sending…' : 'Send reset link'}
          </button>
        </form>
      )}
      <div className="flex justify-center">
        <BackLink to="/app/sign-in">Back to sign in</BackLink>
      </div>
    </div>
  )
}
