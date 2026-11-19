import type { ReactNode } from 'react'

// Shakes a field once (a wrong password, a field that still needs something), the way the Fico
// sign-in screens do. Skipped for anyone who prefers reduced motion.
export function shake(id: string) {
  const el = document.getElementById(id)
  if (!el || matchMedia('(prefers-reduced-motion: reduce)').matches) return
  el.classList.remove('field-shake')
  void el.offsetWidth
  el.classList.add('field-shake')
}

export function FieldMessage({ id, error, hint }: { id: string; error?: string; hint?: ReactNode }) {
  if (error)
    return (
      <span id={id} className="field-error mt-1.5 text-sm" role="alert">
        {error}
      </span>
    )
  if (hint)
    return (
      <span id={id} className="mt-1.5 block text-xs text-soft">
        {hint}
      </span>
    )
  return null
}

// A rough password strength, 0-4, the same scale Fico shows under its password field.
export function strengthOf(password: string): number {
  if (!password) return 0
  if (password.length < 8) return 1
  let score = 0
  if (password.length >= 12) score++
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++
  if (/\d/.test(password)) score++
  if (/[^a-zA-Z0-9]/.test(password)) score++
  return Math.min(4, Math.max(2, score + 1))
}

export const STRENGTH = ['', 'Too short', 'Okay', 'Good', 'Strong']
