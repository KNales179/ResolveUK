import { useState, type FormEvent } from 'react'
import { PasswordField } from '../components/ui/PasswordField'
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
      <PasswordField id="new-password" label="New password" autoComplete="new-password" value={password} onChange={setPassword} />
      <PasswordField id="confirm-password" label="Confirm it" autoComplete="new-password" value={confirm} onChange={setConfirm} />
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
