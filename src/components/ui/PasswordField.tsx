import { useState } from 'react'
import { Icon } from './Icon'

export function PasswordField({
  id,
  label,
  autoComplete,
  value,
  onChange,
}: {
  id: string
  label: string
  autoComplete: string
  value: string
  onChange: (value: string) => void
}) {
  const [shown, setShown] = useState(false)

  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          className="input pr-11"
          type={shown ? 'text' : 'password'}
          autoComplete={autoComplete}
          required
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        <button
          type="button"
          onClick={() => setShown((s) => !s)}
          className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-soft transition hover:text-ink"
          aria-label={shown ? 'Hide password' : 'Show password'}
        >
          <Icon name={shown ? 'eye-off' : 'eye'} className="size-5" />
        </button>
      </div>
    </div>
  )
}
