// Release notes for the prototype. No real versioning scheme has been decided yet, so these
// numbers are a placeholder — just a running count so "what changed and when" has somewhere to
// live. The newest entry is the current version: it's what the footer shows, and what the
// "What's new" pop-up (see WhatsNewModal) shows once per device after an update.
//
// Add a new entry at the top for every change worth telling someone about. That's the whole
// process — nothing else needs to change for it to show up in the pop-up and on /updates.

import type { IconName } from '../components/ui/Icon'

export interface Release {
  version: string
  /** YYYY-MM-DD */
  date: string
  title: string
  highlights: { icon: IconName; title: string; body: string }[]
}

export const RELEASES: Release[] = [
  {
    version: '3.4',
    date: '2026-11-16',
    title: "You'll be told when there's an update",
    highlights: [
      {
        icon: 'bell',
        title: 'A heads-up instead of a silent refresh',
        body: "Previously, picking up a new version needed an unexplained reload with no warning. Now a small message appears saying an update is ready, with a button to apply it whenever you're ready — nothing happens in the background without telling you first.",
      },
      {
        icon: 'sparkles',
        title: 'A running history of every change',
        body: "This page. Every update from now on gets written down here in plain language, and the first time you open the site after an update, you'll see a short summary of what changed.",
      },
    ],
  },
  {
    version: '3.3',
    date: '2026-11-16',
    title: 'Logo and colours matched exactly to the brand sheet',
    highlights: [
      {
        icon: 'palette',
        title: 'The logo now uses the real brand colours',
        body: 'The logo was switching between a dark colour and plain white depending on light or dark mode. It now uses the actual colours from the brand sheet instead — sage green in light mode, and a clearly visible colour in dark mode.',
      },
      {
        icon: 'rotate',
        title: "A couple of other colours that weren't on the sheet",
        body: "Two colours used for buttons and a background illustration turned out to be custom picks rather than the agreed colours. Both have been swapped for colours actually on the brand sheet.",
      },
      {
        icon: 'sparkles',
        title: 'The icon you see in the browser tab and on a phone home screen',
        body: 'This was still the placeholder logo. It now shows the real logo on a dark green tile, matching how your brand sheet presents it.',
      },
    ],
  },
  {
    version: '3.2',
    date: '2026-11-15',
    title: 'Sample reports stay put for now',
    highlights: [
      {
        icon: 'check',
        title: "Won't look empty with only one or two real reports",
        body: "The reported-problems page was switching to real reports the moment even a single one existed, which made the page look sparse. It now keeps showing the full sample set until there are enough real reports for the page to look right, same as the homepage already did.",
      },
    ],
  },
  {
    version: '3.1',
    date: '2026-11-15',
    title: 'Easier to read over photos',
    highlights: [
      {
        icon: 'eye',
        title: 'Headings over the tree photo are clearer now',
        body: "Text sitting on top of a photo background was hard to read wherever the photo was lighter or busier behind the letters. The shadow behind that text is now dark instead of pale, so it stays readable no matter what's behind it, in both light and dark mode.",
      },
    ],
  },
  {
    version: '3.0',
    date: '2026-11-14',
    title: 'The real logo is in',
    highlights: [
      {
        icon: 'palette',
        title: 'Your actual brand mark replaces the placeholder',
        body: 'The site was using a placeholder logo that did not match your branding. The real logo — the R shape with the location pin and the two leaves — is now traced directly from your branding materials and in place across the site.',
      },
      {
        icon: 'moon',
        title: 'Switches with light and dark mode on its own',
        body: 'The logo now changes its own colours depending on whether someone is viewing the site in light or dark mode, with nothing extra to manage.',
      },
    ],
  },
]

export const CURRENT_RELEASE = RELEASES[0]
export const APP_VERSION = CURRENT_RELEASE.version

const SEEN_KEY = 'resolve.seenVersion'

/** The version this device last saw the notes for (null on a fresh device). */
export function seenVersion(): string | null {
  try {
    return localStorage.getItem(SEEN_KEY)
  } catch {
    return APP_VERSION // storage blocked — don't nag every load
  }
}

/**
 * Every release this device hasn't seen yet, newest first — so skipping versions (updating
 * twice between visits) still shows everything in one pop-up instead of only the latest. A
 * device that never saw any notes gets just the current one, not the entire history.
 */
export function unseenReleases(): Release[] {
  const seen = seenVersion()
  if (seen === APP_VERSION) return []
  if (seen === null) return [CURRENT_RELEASE]
  const index = RELEASES.findIndex((r) => r.version === seen)
  return index === -1 ? [CURRENT_RELEASE] : RELEASES.slice(0, index)
}

export function markVersionSeen(): void {
  try {
    localStorage.setItem(SEEN_KEY, APP_VERSION)
  } catch {
    // nothing to do
  }
}
