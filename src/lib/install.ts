// Installing Resolve UK like an app. Chrome, Edge and Samsung Internet fire `beforeinstallprompt`
// once the site qualifies (it has a manifest and a service worker, and is served over HTTPS); calling
// prompt() on that saved event opens the browser's own "Install Resolve UK?" box. Safari and Firefox
// never fire it, so there the details popup shows the steps for that browser instead.
// The event is captured when this module loads, so an early one is never missed.

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

let deferred: BeforeInstallPromptEvent | null = null
const listeners = new Set<() => void>()
const notify = () => listeners.forEach((l) => l())

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    deferred = e as BeforeInstallPromptEvent
    notify()
  })
  window.addEventListener('appinstalled', () => {
    deferred = null
    notify()
  })
}

export function isRunningInstalled(): boolean {
  return matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true
}

/** True when one tap can open the browser's own install box. */
export function canPromptInstall(): boolean {
  return deferred !== null && !isRunningInstalled()
}

export function onInstallChange(cb: () => void): () => void {
  listeners.add(cb)
  return () => {
    listeners.delete(cb)
  }
}

/** Opens the browser's own install box. Resolves to whether the person accepted. */
export async function promptInstall(): Promise<boolean> {
  if (!deferred) return false
  const event = deferred
  await event.prompt()
  const { outcome } = await event.userChoice
  deferred = null
  notify()
  return outcome === 'accepted'
}

// ---- The details popup (InstallDialog, mounted once in SiteShell) opens from anywhere ----
const OPEN_EVENT = 'resolve:open-install'
export function openInstallDialog(): void {
  window.dispatchEvent(new Event(OPEN_EVENT))
}
export function onOpenInstallDialog(cb: () => void): () => void {
  window.addEventListener(OPEN_EVENT, cb)
  return () => window.removeEventListener(OPEN_EVENT, cb)
}

// ---- Step-by-step instructions for browsers with no one-tap install ----
export type BrowserKind = 'ios' | 'android-chrome' | 'android-samsung' | 'android-firefox' | 'desktop-chrome' | 'desktop-edge' | 'mac-safari' | 'desktop-firefox' | 'other'

export function detectBrowser(ua = navigator.userAgent): BrowserKind {
  if (/iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && 'ontouchend' in document)) return 'ios'
  const android = /Android/.test(ua)
  if (android && /SamsungBrowser/.test(ua)) return 'android-samsung'
  if (android && /Firefox/.test(ua)) return 'android-firefox'
  if (android) return 'android-chrome'
  if (/Edg\//.test(ua)) return 'desktop-edge'
  if (/Firefox/.test(ua)) return 'desktop-firefox'
  if (/Chrome\//.test(ua)) return 'desktop-chrome'
  if (/Safari/.test(ua) && /Macintosh/.test(ua)) return 'mac-safari'
  return 'other'
}

export interface InstallGuide {
  label: string
  steps: string[]
  /** This browser cannot install sites as apps at all. */
  unsupported?: boolean
}

export const INSTALL_GUIDES: Record<BrowserKind, InstallGuide> = {
  ios: {
    label: 'iPhone or iPad (Safari)',
    steps: ['Tap the Share button, the square with an arrow pointing up.', 'Scroll down and tap "Add to Home Screen".', 'Tap "Add". Resolve UK now opens from its own icon on your home screen.'],
  },
  'android-chrome': {
    label: 'Android (Chrome)',
    steps: ['Tap the ⋮ menu at the top right.', 'Tap "Add to Home screen" or "Install app".', 'Tap "Install". Resolve UK appears on your home screen and in your app list.'],
  },
  'android-samsung': {
    label: 'Samsung Internet',
    steps: ['Tap the ≡ menu at the bottom right.', 'Tap "Add page to", then "Home screen".', 'Tap "Add".'],
  },
  'android-firefox': {
    label: 'Firefox on Android',
    steps: ['Tap the ⋮ menu.', 'Tap "Install" or "Add to Home screen".', 'Tap "Add".'],
  },
  'desktop-chrome': {
    label: 'Chrome on a computer',
    steps: ['Click the ⋮ menu at the top right of Chrome.', 'Point to "Cast, save, and share".', 'Click "Install page as app", then "Install". Resolve UK gets its own window and desktop icon.'],
  },
  'desktop-edge': {
    label: 'Edge on a computer',
    steps: ['Click the … menu at the top right of Edge.', 'Point to "Apps".', 'Click "Install this site as an app", then "Install".'],
  },
  'mac-safari': {
    label: 'Safari on a Mac',
    steps: ['In the menu bar, click File, then "Add to Dock".', 'Click "Add". Resolve UK opens from your Dock like any other app.'],
  },
  'desktop-firefox': {
    label: 'Firefox on a computer',
    unsupported: true,
    steps: ['Firefox on a computer cannot install sites as apps. Open Resolve UK in Chrome or Edge to install it, or keep using it here in the browser.'],
  },
  other: {
    label: 'Another browser',
    steps: ['Open your browser\'s menu.', 'Look for "Install app", "Add to Home screen" or "Install this site as an app".'],
  },
}
