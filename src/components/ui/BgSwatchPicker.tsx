import { useState } from 'react'
import { useThemeName } from '../../lib/theme'
import { pickedBgFor, setPickedBg } from '../../lib/bgPreview'

// Lets a visitor choose how bright or dark the page background is, separately for light and dark
// mode (it shows the set for whichever theme is on). The choice is remembered on their device and
// applied on every page.
const DARK_SWATCHES: Array<[string, string]> = [
  ['Darkest', '#020c0b'],
  ['Darker', '#041513'],
  ['Dark', '#061f1b'],
  ['Mid', '#072823'],
  ['Light dark', '#09312b'],
  ['Deep green', '#0b3d36'],
]

const LIGHT_SWATCHES: Array<[string, string]> = [
  ['Brightest', '#f0f5ec'],
  ['Dimmer', '#e3ecdd'],
  ['Dimmer still', '#d6e2ce'],
  ['Muted', '#c9d9bf'],
  ['Most muted', '#bcd0b0'],
]

export function BgSwatchPicker() {
  const theme = useThemeName()
  // Bumped on each pick so the active ring re-renders; the pick itself lives in storage.
  const [, setVersion] = useState(0)
  const active = pickedBgFor(theme)
  const swatches = theme === 'dark' ? DARK_SWATCHES : LIGHT_SWATCHES

  return (
    <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-4 gap-y-3 px-5 py-6 sm:px-8" role="group" aria-label="Background shade">
      <span className="text-sm font-semibold text-soft">Background shade</span>
      <div className="flex flex-wrap items-center gap-2.5">
        {swatches.map(([label, hex]) => (
          <button
            key={hex}
            type="button"
            title={label}
            aria-label={label}
            aria-pressed={active === hex}
            data-tag={`Background: ${label}`}
            onClick={() => {
              setPickedBg(theme, hex)
              setVersion((v) => v + 1)
            }}
            className={`hover-ring size-8 shrink-0 rounded-full border-2 transition-transform hover:scale-110 ${active === hex ? 'scale-110 border-ink' : 'border-[color-mix(in_oklab,var(--c-ink)_25%,transparent)]'}`}
            style={{ background: hex }}
          />
        ))}
      </div>
    </div>
  )
}
