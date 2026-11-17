import { useEffect, useState, useSyncExternalStore } from 'react'
import { Icon } from '../ui/Icon'
import { Select } from '../ui/Select'
import { canPromptInstall, detectBrowser, INSTALL_GUIDES, isRunningInstalled, onInstallChange, onOpenInstallDialog, promptInstall, type BrowserKind } from '../../lib/install'

const BENEFITS = [
  'Its own icon on your home screen or desktop',
  'Opens straight to the site, full screen, without the browser bar',
  'Free, with nothing to download from an app store',
  'Always the latest version: it updates itself',
]

const CHOICES = (Object.keys(INSTALL_GUIDES) as BrowserKind[]).map((k) => ({ value: k, label: INSTALL_GUIDES[k].label }))

// Browsers that can install a site in one step with their own "Install" box. Everyone else (iPhone,
// iPad, Safari, Firefox) has no such button, so they get the steps straight away.
const ONE_TAP: BrowserKind[] = ['desktop-chrome', 'desktop-edge', 'android-chrome', 'android-samsung']

// The "Install Resolve UK" popup, opened by openInstallDialog() from the About page, the homepage
// and the occasional InstallNudge card.
// - Chrome, Edge, Samsung Internet: an Install button that opens the browser's own install box.
//   If the browser hasn't offered it (already installed, or a test copy without the app files),
//   pressing it says so and shows that browser's steps instead.
// - iPhone, iPad, Safari, Firefox: the steps for that browser.
// Either way, "Installing on another device?" shows the steps for any device.
export function InstallDialog() {
  const [open, setOpen] = useState(false)
  const [mine, setMine] = useState<BrowserKind>('other')
  const [browser, setBrowser] = useState<BrowserKind>('other')
  const [installed, setInstalled] = useState(false)
  const [busy, setBusy] = useState(false)
  const [fallback, setFallback] = useState(false)
  const [otherDevice, setOtherDevice] = useState(false)
  const promptable = useSyncExternalStore(onInstallChange, canPromptInstall, () => false)

  useEffect(
    () =>
      onOpenInstallDialog(() => {
        const b = detectBrowser()
        setMine(b)
        setBrowser(b)
        setInstalled(isRunningInstalled())
        setFallback(false)
        setOtherDevice(false)
        setOpen(true)
      }),
    [],
  )

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  if (!open) return null

  const oneTap = ONE_TAP.includes(mine)
  const showSteps = otherDevice || fallback || !oneTap
  const guide = INSTALL_GUIDES[browser]

  async function install() {
    if (!promptable) {
      setFallback(true)
      return
    }
    setBusy(true)
    const accepted = await promptInstall()
    setBusy(false)
    if (accepted) setInstalled(true)
  }

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/55 backdrop-blur-sm" onClick={() => setOpen(false)} aria-hidden="true" />
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
        <div role="dialog" aria-modal="true" aria-labelledby="install-title" data-lenis-prevent className="card rise max-h-[88svh] w-full max-w-lg overflow-y-auto overscroll-contain p-6 sm:p-8">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <img src="/icons/icon-192.png" alt="" className="size-12 shrink-0 rounded-xl" />
              <div>
                <h2 id="install-title" className="font-serif text-2xl">Install Resolve UK</h2>
                <p className="text-sm text-soft">Use it like an app, on any device.</p>
              </div>
            </div>
            <button type="button" className="icon-btn shrink-0" onClick={() => setOpen(false)} aria-label="Close">
              <Icon name="x" />
            </button>
          </div>

          <ul className="mt-6 space-y-2.5">
            {BENEFITS.map((b) => (
              <li key={b} className="flex items-start gap-2.5 text-sm">
                <span className="tile-icon mt-0.5 size-5 shrink-0 rounded-full">
                  <Icon name="check" className="size-3" />
                </span>
                {b}
              </li>
            ))}
          </ul>

          {installed ? (
            <p className="msg msg-info mt-7 flex items-center gap-2" role="status">
              <Icon name="check" className="size-5" /> Resolve UK is installed on this device.
            </p>
          ) : (
            oneTap && (
              <div className="mt-7">
                <button type="button" className="btn btn-primary w-full text-base" onClick={() => void install()} disabled={busy}>
                  <Icon name="plus" className="size-4" /> {busy ? 'Opening…' : 'Install'}
                </button>
                {fallback && (
                  <p className="msg msg-warn mt-3" role="status">
                    Your browser hasn't offered to install it on this page. That usually means it's already installed, or you're on a test copy of the site. You can still add it with the steps below.
                  </p>
                )}
              </div>
            )
          )}

          {!installed && showSteps && (
            <div className="mt-6 rounded-2xl border border-line bg-[var(--c-field)] p-5">
              <label htmlFor="install-browser" className="mb-1.5 block text-sm font-semibold">
                Steps for
              </label>
              <Select id="install-browser" label="Steps for" choices={CHOICES} value={browser} onChange={(v) => setBrowser(v as BrowserKind)} />
              <ol className="mt-4 space-y-3">
                {guide.steps.map((step, i) => (
                  <li key={step} className="flex gap-3 text-sm leading-relaxed">
                    {!guide.unsupported && <span className="grid size-6 shrink-0 place-items-center rounded-full bg-accent-vivid text-xs font-semibold text-accent-ink">{i + 1}</span>}
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
            {!showSteps && !installed ? (
              <button type="button" className="text-sm font-semibold text-soft underline underline-offset-2 hover:text-ink" onClick={() => setOtherDevice(true)}>
                Installing on another device?
              </button>
            ) : (
              <span />
            )}
            <button type="button" className="btn btn-ghost" onClick={() => setOpen(false)}>
              {installed ? 'Done' : 'Not now'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
