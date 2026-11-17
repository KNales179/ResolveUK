import { LEAF_LEFT_PATH, LEAF_RIGHT_PATH, PIN_PATH, R_PATH } from './logoPaths'

// The Resolve UK mark: the R (with its pin and the pin's hole) plus the two leaves. Colours come
// straight from the theme tokens (--c-logo-mark, --c-accent, --c-accent-display), so it switches with
// light/dark mode on its own — no separate dark-mode artwork or backing tile needed.
export function Logo({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 198 223"
      width="198"
      height="223"
      className={`h-7 w-auto shrink-0 ${className}`}
      role="img"
      aria-label="Resolve"
    >
      <path fill="var(--c-logo-mark)" fillRule="evenodd" d={`${R_PATH} ${PIN_PATH}`} />
      <path fill="var(--c-logo-leaf-r, var(--c-accent))" d={LEAF_RIGHT_PATH} />
      <path fill="var(--c-logo-leaf-l, var(--c-accent-display))" d={LEAF_LEFT_PATH} />
    </svg>
  )
}
