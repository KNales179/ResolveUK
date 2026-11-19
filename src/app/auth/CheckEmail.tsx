import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { Icon } from '../../components/ui/Icon'
import { BackLink } from '../../components/ui/BackLink'

// After creating an account: Supabase emails a confirmation link (it returns to /app, signed in).
export function CheckEmail() {
  const [params] = useSearchParams()
  const email = params.get('email') ?? ''
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')

  async function resend() {
    if (!email) return
    setState('sending')
    const { error } = await supabase.auth.resend({ type: 'signup', email, options: { emailRedirectTo: `${window.location.origin}/app` } })
    setState(error ? 'error' : 'sent')
  }

  return (
    <div className="card space-y-6 rounded-3xl p-6 sm:p-8">
      <span className="tile-icon size-12 rounded-2xl">
        <Icon name="bell" className="size-6" />
      </span>
      <div>
        <h1 className="font-serif text-3xl">Check your email</h1>
        <p className="mt-1.5 text-soft">
          We've sent a link to {email ? <strong className="text-ink">{email}</strong> : 'your email'}. Open it to confirm your account, and you'll come straight back here, signed in.
        </p>
      </div>
      <ul className="space-y-2 text-sm text-soft">
        <li>It can take a minute or two to arrive.</li>
        <li>Not there? Check your spam or junk folder.</li>
      </ul>
      {email && (
        <div>
          <button type="button" className="btn btn-ghost w-full" onClick={() => void resend()} disabled={state === 'sending' || state === 'sent'}>
            {state === 'sending' ? 'Sending…' : state === 'sent' ? 'Sent again' : 'Send the link again'}
          </button>
          {state === 'error' && (
            <p className="msg msg-error mt-3" role="alert">
              We couldn't send it just now. Wait a minute and try again.
            </p>
          )}
        </div>
      )}
      <div className="flex justify-center">
        <BackLink to="/app/sign-in">Back to sign in</BackLink>
      </div>
    </div>
  )
}
