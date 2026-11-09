import { useEffect, useState } from 'react'
import { gsap } from '../../lib/gsap'
import { useThemeName } from '../../lib/theme'

// TEMPORARY — a quick comparison tool, not meant to ship. Delete this file and its one usage in
// Home.tsx once a background colour is picked for each theme; nothing else in the app reads from
// it. Shows only the swatch set for whichever theme is currently active (switch with the site's
// own theme toggle to see the other set) — clicking one animates --c-bg to that exact colour with
// GSAP. Each swatch is a step between "close to black" and the original, un-mixed green background
// from before the darkening request.
const DARK_SWATCHES: Array<[string, string]> = [
  ['Darkest', '#020c0b'],
  ['Darker', '#041513'],
  ['Dark', '#061f1b'],
  ['Mid', '#072823'],
  ['Light dark', '#09312b'],
  ['Original green', '#0b3d36'],
]

const LIGHT_SWATCHES: Array<[string, string]> = [
  ['Original (brightest)', '#f0f5ec'],
  ['Dimmer', '#e3ecdd'],
  ['Dimmer still', '#d6e2ce'],
  ['Muted', '#c9d9bf'],
  ['Most muted', '#bcd0b0'],
]

function Swatch({ label, hex, active, onClick }: { label: string; hex: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className={`size-8 shrink-0 rounded-full border-2 transition-transform hover:scale-110 ${active ? 'border-ink scale-110' : 'border-line'}`}
      style={{ background: hex }}
    />
  )
}

export function BgSwatchPicker() {
  const theme = useThemeName()
  const [activeHex, setActiveHex] = useState<string | null>(null)
  const swatches = theme === 'dark' ? DARK_SWATCHES : LIGHT_SWATCHES

  // A picked swatch sets --c-bg as an inline style (that's what GSAP animates), which otherwise
  // outranks either theme's own stylesheet value forever — switch themes with the real toggle
  // and the previous pick kept showing through instead of that theme's default. Clearing it (and
  // the ring highlight) every time the theme changes means each theme always starts from its own
  // real colour again; pick a swatch to preview that theme specifically.
  useEffect(() => {
    gsap.killTweensOf(document.documentElement, '--c-bg')
    document.documentElement.style.removeProperty('--c-bg')
    setActiveHex(null)
  }, [theme])

  const pick = (hex: string) => {
    gsap.to(document.documentElement, { '--c-bg': hex, duration: 0.6, ease: 'power2.out' })
    setActiveHex(hex)
  }

  return (
    <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-2.5 px-5 py-6 sm:px-8">
      {swatches.map(([label, hex]) => (
        <Swatch key={hex} label={label} hex={hex} active={activeHex === hex} onClick={() => pick(hex)} />
      ))}
    </div>
  )
}
