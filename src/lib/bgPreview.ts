import { gsap } from './gsap'
import type { ThemeName } from './theme'

// The background shade a visitor picked for each theme (see BgSwatchPicker), remembered on this
// device. public/theme-init.js applies it before the first paint; applyBgForTheme keeps it in step
// whenever the theme is switched, from any page (SiteShell's BgPreviewSync).
const KEY = 'resolve.bg'
type Picks = Record<ThemeName, string | null>

function read(): Picks {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || '{}')
    return { light: v.light ?? null, dark: v.dark ?? null }
  } catch {
    return { light: null, dark: null }
  }
}

export function pickedBgFor(theme: ThemeName): string | null {
  return read()[theme]
}

export function setPickedBg(theme: ThemeName, hex: string): void {
  const picks = read()
  picks[theme] = hex
  try {
    localStorage.setItem(KEY, JSON.stringify(picks))
  } catch {
    // storage blocked: the pick still applies for this visit
  }
  gsap.killTweensOf(document.documentElement, '--c-bg')
  gsap.to(document.documentElement, { '--c-bg': hex, duration: 0.6, ease: 'power2.out' })
}

// Instant (not tweened): this runs right as the theme switches, inside the theme toggle's own
// circular reveal, which should show the new theme's shade straight away.
export function applyBgForTheme(theme: ThemeName): void {
  gsap.killTweensOf(document.documentElement, '--c-bg')
  const hex = read()[theme]
  if (hex) document.documentElement.style.setProperty('--c-bg', hex)
  else document.documentElement.style.removeProperty('--c-bg')
}
