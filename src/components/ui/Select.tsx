import { useEffect, useId, useRef, useState } from 'react'
import { Icon } from './Icon'

export interface Choice {
  value: string
  label: string
}

// A form select where even the open list matches the design. The trigger button takes the id, so a <label htmlFor> works.
interface Props {
  id?: string
  label: string
  choices: Choice[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
  required?: boolean
  className?: string
}

export function Select({ id, label, choices, value, onChange, placeholder = 'Choose one', required, className = '' }: Props) {
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  const listId = useId()
  const current = choices.find((c) => c.value === value)

  useEffect(() => {
    if (!open) return
    const away = (e: MouseEvent) => {
      if (root.current && !root.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', away)
    return () => document.removeEventListener('mousedown', away)
  }, [open])

  return (
    <div ref={root} className={`dd ${className}`} data-open={open} onKeyDown={(e) => e.key === 'Escape' && setOpen(false)}>
      <button
        id={id}
        type="button"
        className="input flex items-center justify-between gap-3 text-left"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={label}
        aria-required={required}
        onClick={() => setOpen((o) => !o)}
      >
        <span className={current ? '' : 'text-soft'}>{current?.label ?? placeholder}</span>
        <Icon name="chevron" className="dd-chevron size-4 shrink-0" />
      </button>
      <div className="dd-list" role="listbox" id={listId} aria-label={label}>
        {choices.map((c) => (
          <button
            key={c.value}
            type="button"
            role="option"
            aria-selected={c.value === value}
            className="dd-opt"
            tabIndex={open ? 0 : -1}
            onClick={() => {
              onChange(c.value)
              setOpen(false)
            }}
          >
            <span>{c.label}</span>
            <Icon name="check" className="dd-check size-4" />
          </button>
        ))}
      </div>
    </div>
  )
}
