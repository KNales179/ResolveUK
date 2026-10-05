import { useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import { useStaffAuth } from './auth'

const MIN_LENGTH = 8

// Shared by the forced "set your password" gate (after a temp account's first sign-in) and the
// voluntary password change on the account page. Only the heading and what happens afterwards differ.
export function ChangePasswordForm({ onDone }: { onDone: () => void }) {
  const { refresh, profile } = useStaffAuth()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (password.length < MIN_LENGTH) {
      setError(`Please choose a password of at least ${MIN_LENGTH} characters.`)
      return
    }
    if (password !== confirm) {
      setError('Those two passwords do not match.')
      return
    }
    setBusy(true)
    const { error: updateError } = await supabase.auth.updateUser({ password })
    if (updateError) {
      setError(updateError.message)
      setBusy(false)
      return
    }
    if (profile?.must_change_password) {
      const { error: clearError } = await supabase.rpc('clear_must_change_password')
      if (clearError) {
        setError(clearError.message)
        setBusy(false)
        return
      }
    }
    await refresh()
    setBusy(false)
    setPassword('')
    setConfirm('')
    onDone()
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <div>
        <label htmlFor="new-password" className="mb-1.5 block text-sm font-semibold">
          New password
        </label>
        <input id="new-password" className="input" type="password" autoComplete="new-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
      </div>
      <div>
        <label htmlFor="confirm-password" className="mb-1.5 block text-sm font-semibold">
          Confirm it
        </label>
        <input id="confirm-password" className="input" type="password" autoComplete="new-password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} />
      </div>
      {error && (
        <p className="msg msg-error" role="alert">
          {error}
        </p>
      )}
      <button type="submit" className="btn btn-primary w-full" disabled={busy}>
        {busy ? 'Saving…' : 'Save password'}
      </button>
    </form>
  )
}
