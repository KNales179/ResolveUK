import { useEffect, useId, useRef, useState } from 'react'
import { Icon } from './Icon'

// A dropdown where even the open list matches the design (a native <select> cannot be styled).
interface Props {
  label: string
  options: string[]
  value: string
  onChange: (value: string) => void
  className?: string
}

export function Dropdown({ label, options, value, onChange, className = '' }: Props) {
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  const listId = useId()

  useEffect(() => {
    if (!open) return
    const away = (e: MouseEvent) => {
      if (root.current && !root.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', away)
    return () => document.removeEventListener('mousedown', away)
  }, [open])

  const move = (from: number, step: number) => {
    const items = root.current?.querySelectorAll<HTMLButtonElement>('[role="option"]')
    items?.[Math.max(0, Math.min(options.length - 1, from + step))]?.focus()
  }

  return (
    <div
      ref={root}
      className={`dd ${className}`}
      data-open={open}
      onKeyDown={(e) => {
        if (e.key === 'Escape') setOpen(false)
      }}
    >
      <button type="button" className="btn btn-ghost dd-btn w-full sm:w-auto" aria-haspopup="listbox" aria-expanded={open} aria-controls={listId} onClick={() => setOpen((o) => !o)}>
        <span>
          <span className="text-soft">{label}: </span>
          <b>{value}</b>
        </span>
        <Icon name="chevron" className="dd-chevron size-4" />
      </button>
      <div className="dd-list" role="listbox" id={listId} aria-label={label}>
        {options.map((o, i) => (
          <button
            key={o}
            type="button"
            role="option"
            aria-selected={o === value}
            className="dd-opt"
            tabIndex={open ? 0 : -1}
            onClick={() => {
              onChange(o)
              setOpen(false)
            }}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') {
                e.preventDefault()
                move(i, 1)
              } else if (e.key === 'ArrowUp') {
                e.preventDefault()
                move(i, -1)
              }
            }}
          >
            <span>{o}</span>
            <Icon name="check" className="dd-check size-4" />
          </button>
        ))}
      </div>
    </div>
  )
}
