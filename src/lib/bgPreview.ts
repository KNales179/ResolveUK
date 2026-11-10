import { gsap } from './gsap'
import type { ThemeName } from './theme'

// TEMPORARY — part of the BgSwatchPicker comparison tool (see BgSwatchPicker.tsx). Delete this
// file alongside it once a background colour is picked for each theme.
//
// A plain module object, not React state, so a picked colour survives navigating away from the
// Home page (where the picker itself lives) and back — it isn't tied to that component's mount
// lifecycle. applyBgForTheme must run on every theme change from somewhere that's always mounted
// (SiteShell), not just while the picker is: otherwise toggling the theme on any other page left
// --c-bg stuck on whatever inline override the previous theme had, mismatched against the new
// theme's own styling until the picker remounted (going back to Home) and corrected it.
export const pickedBg: Record<ThemeName, string | null> = { light: null, dark: null }

export function applyBgForTheme(theme: ThemeName) {
  gsap.killTweensOf(document.documentElement, '--c-bg')
  const hex = pickedBg[theme]
  if (hex) {
    gsap.to(document.documentElement, { '--c-bg': hex, duration: 0.6, ease: 'power2.out' })
  } else {
    document.documentElement.style.removeProperty('--c-bg')
  }
}
