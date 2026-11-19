import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useReporterAuth } from '../../lib/reporterAuth'
import { PasswordField } from '../../components/ui/PasswordField'
import { Icon } from '../../components/ui/Icon'
import { FieldMessage, shake, STRENGTH, strengthOf } from './fields'

type Field = 'name' | 'email' | 'password' | 'confirm' | 'agree'
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// The same rules Supabase checks, caught here first, field by field, so nobody is left guessing
// why "Create account" didn't work. No invite code (unlike Fico): anyone can join.
function validate(v: { name: string; email: string; password: string; confirm: string; agree: boolean }) {
  const e: Partial<Record<Field, string>> = {}
  const name = v.name.trim()
  if (!name) e.name = 'Enter your name, or a nickname'
  else if (name.length > 80) e.name = '80 characters at most'
  const email = v.email.trim()
  if (!email) e.email = 'Enter your email'
  else if (!EMAIL_RE.test(email)) e.email = "That doesn't look like an email address"
  if (!v.password) e.password = 'Choose a password'
  else if (v.password.length < 8) e.password = `At least 8 characters (${8 - v.password.length} more)`
  if (!v.confirm) e.confirm = 'Type your password again'
  else if (v.confirm !== v.password) e.confirm = "Passwords don't match"
  if (!v.agree) e.agree = 'Please confirm you understand this'
  return e
}

export function CreateAccount() {
  const auth = useReporterAuth()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [agree, setAgree] = useState(false)
  const [touched, setTouched] = useState<Partial<Record<Field, boolean>>>({})
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [emailTaken, setEmailTaken] = useState(false)
  const [busy, setBusy] = useState(false)

  const errors = validate({ name, email, password, confirm, agree })
  const shown = (f: Field) => (submitted || touched[f] ? errors[f] : undefined)
  const touch = (f: Field) => () => setTouched((t) => ({ ...t, [f]: true }))
  const strength = strengthOf(password)
  const matches = confirm.length > 0 && confirm === password

  async function submit(e: FormEvent) {
    e.preventDefault()
    setSubmitted(true)
    setError(null)
    setEmailTaken(false)
    const order: Field[] = ['name', 'email', 'password', 'confirm', 'agree']
    const bad = order.filter((f) => errors[f])
    if (bad.length) {
      const id = (f: Field) => (f === 'agree' ? 'ca-agree' : `ca-${f}`)
      document.getElementById(id(bad[0]))?.focus()
      bad.forEach((f) => shake(id(f)))
      return
    }
    setBusy(true)
    const problem = await auth.signUp(email, password, name)
    setBusy(false)
    if (problem) {
      if (/already registered|already been registered|exists/i.test(problem)) {
        setEmailTaken(true)
        shake('ca-email')
      } else setError(problem)
      return
    }
    // With email confirmation on, there is no session yet: they need to open the link first.
    navigate(`/app/check-email?email=${encodeURIComponent(email.trim())}`, { replace: true })
  }

  return (
    <div className="card space-y-6 rounded-3xl p-6 sm:p-8">
      <div>
        <h1 className="font-serif text-3xl">Create your account</h1>
        <p className="mt-1.5 text-soft">Free, and ready in under a minute. You can still report without one.</p>
      </div>

      <form onSubmit={submit} noValidate className="space-y-4">
        <div>
          <label htmlFor="ca-name" className="mb-1.5 block text-sm font-semibold">
            Your name
          </label>
          <input id="ca-name" className="input" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} onBlur={touch('name')} aria-invalid={!!shown('name') || undefined} aria-describedby="ca-name-msg" />
          <FieldMessage id="ca-name-msg" error={shown('name')} hint="Shown on stories you post. A first name or nickname is fine." />
        </div>

        <div>
          <label htmlFor="ca-email" className="mb-1.5 block text-sm font-semibold">
            Email
          </label>
          <input
            id="ca-email"
            className="input"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value)
              setEmailTaken(false)
            }}
            onBlur={touch('email')}
            aria-invalid={!!shown('email') || emailTaken || undefined}
            aria-describedby="ca-email-msg"
          />
          {emailTaken ? (
            <span id="ca-email-msg" className="mt-1.5 block text-sm" role="alert">
              <span className="field-error">That email already has an account.</span>{' '}
              <Link to="/app/sign-in" className="font-semibold text-accent underline">
                Sign in
              </Link>{' '}
              or{' '}
              <Link to="/app/forgot-password" className="font-semibold text-accent underline">
                reset your password
              </Link>
              .
            </span>
          ) : (
            <FieldMessage id="ca-email-msg" error={shown('email')} />
          )}
        </div>

        <div>
          <PasswordField id="ca-password" label="Password" autoComplete="new-password" value={password} onChange={setPassword} onBlur={touch('password')} invalid={!!shown('password')} describedBy="ca-password-msg" />
          {password && (
            <div className="mt-2 flex items-center gap-2" aria-live="polite">
              <div className="flex flex-1 gap-1">
                {[1, 2, 3, 4].map((n) => (
                  <span key={n} className={`strength-bar ${n <= strength ? `strength-${strength}` : ''}`} />
                ))}
              </div>
              <span className={`w-20 text-right text-xs font-semibold strength-text-${strength}`}>{STRENGTH[strength]}</span>
            </div>
          )}
          <FieldMessage id="ca-password-msg" error={shown('password')} hint="At least 8 characters. A short phrase is easier to remember and harder to guess." />
        </div>

        <div>
          <PasswordField id="ca-confirm" label="Confirm password" autoComplete="new-password" value={confirm} onChange={setConfirm} onBlur={touch('confirm')} invalid={!!shown('confirm')} describedBy="ca-confirm-msg" />
          {shown('confirm') ? (
            <FieldMessage id="ca-confirm-msg" error={shown('confirm')} />
          ) : matches ? (
            <span id="ca-confirm-msg" className="mt-1.5 flex items-center gap-1 text-sm font-semibold text-accent">
              <Icon name="check" className="size-4" /> Passwords match
            </span>
          ) : null}
        </div>

        <div>
          <label className="flex items-start gap-2.5 text-sm text-soft">
            <input id="ca-agree" type="checkbox" className="mt-1 size-4 accent-[var(--c-accent-ink)]" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
            <span>I understand that reports and stories I post are public, and I'll leave out other people's names, faces and number plates.</span>
          </label>
          {submitted && <FieldMessage id="ca-agree-msg" error={errors.agree} />}
        </div>

        {error && (
          <p className="msg msg-error" role="alert">
            {error}
          </p>
        )}
        <button type="submit" className="btn btn-primary w-full" disabled={busy}>
          {busy ? 'Creating your account…' : 'Create account'}
        </button>
      </form>

      <p className="text-center text-sm text-soft">
        Already have an account?{' '}
        <Link to="/app/sign-in" className="font-semibold text-accent hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  )
}
