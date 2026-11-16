// Release notes for the prototype. No real versioning scheme has been decided yet, so these
// numbers are a placeholder (x.y.z, oldest to newest) — just a running count so "what changed
// and when" has somewhere to live. The newest entry is the current version: it's what the footer
// shows, and what the "What's new" pop-up (see WhatsNewModal) shows once per device after an
// update. This list is compiled from the project's real history, grouped into the moments that
// actually changed something you'd notice — not one entry per code change.
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
    version: '3.4.1',
    date: '2026-11-16',
    title: "Fixed cards that were blending into the page",
    highlights: [
      {
        icon: 'eye',
        title: 'Clearer cards in light mode',
        body: "Several of the pale cards on the homepage were almost the same colour as the page behind them, so they were hard to tell apart from the background and the text on them was hard to read. They now stand out properly against the page in both light and dark mode.",
      },
    ],
  },
  {
    version: '3.3.0',
    date: '2026-11-16',
    title: 'Removed a stray dark shadow from text',
    highlights: [
      {
        icon: 'eye',
        title: 'Cleaner text everywhere',
        body: "A dark shadow meant for text sitting directly on a photo, with nothing behind it, had ended up applied to text that already had its own card background underneath, and to body text that never needed it. It's gone from everywhere it didn't belong — any shadow now comes from the card itself, not from the words.",
      },
    ],
  },
  {
    version: '3.2.0',
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
      {
        icon: 'camera',
        title: 'The browser tab icon finally updated',
        body: 'The little icon in the browser tab was still the old placeholder logo even after the real one went in elsewhere. It now shows the real logo, and is set up so this kind of thing updates properly from now on.',
      },
    ],
  },
  {
    version: '3.1.0',
    date: '2026-11-16',
    title: 'Colours matched exactly to the brand sheet',
    highlights: [
      {
        icon: 'palette',
        title: 'The logo and a couple of other colours, corrected',
        body: "The logo was switching between a dark colour and plain white depending on light or dark mode, and two colours used for buttons and a background illustration turned out to be custom picks rather than the colours actually on your brand sheet. All of them now use the real brand colours.",
      },
      {
        icon: 'eye',
        title: 'Easier to read over photos',
        body: "Headings sitting on top of the tree photo were hard to read wherever the photo was lighter or busier behind the letters. That's been corrected so it stays readable no matter what's behind it.",
      },
      {
        icon: 'check',
        title: "Sample reports stay put for now",
        body: "The reported-problems page was switching to real reports the moment even a single one existed, which made the page look sparse. It now keeps showing the full sample set until there are enough real reports for the page to look right.",
      },
    ],
  },
  {
    version: '3.0.0',
    date: '2026-11-16',
    title: 'The real logo replaced the placeholder',
    highlights: [
      {
        icon: 'palette',
        title: 'Your actual brand mark is now in the site',
        body: 'The site was using a placeholder logo that did not match your branding. The real logo — the R shape with the location pin and the two leaves — is now traced directly from your branding materials and in place across the site.',
      },
      {
        icon: 'moon',
        title: 'Switches with light and dark mode on its own',
        body: 'The logo now changes its own colours depending on whether someone is viewing the site in light or dark mode, with nothing extra to manage.',
      },
    ],
  },
  {
    version: '2.2.0',
    date: '2026-11-12',
    title: 'Another big homepage rework, with sample reports to preview it',
    highlights: [
      {
        icon: 'layers',
        title: 'A much bigger rework of the homepage',
        body: "A large pass on the homepage's layout and content, closer to how it looks today.",
      },
      {
        icon: 'camera',
        title: 'Realistic sample reports',
        body: "Added a set of realistic example reports, so the site has something believable to show before real reports exist, instead of looking empty.",
      },
    ],
  },
  {
    version: '2.1.0',
    date: '2026-11-11',
    title: 'Signing in and your account got a proper once-over',
    highlights: [
      {
        icon: 'eye-off',
        title: 'A real password field',
        body: 'Signing in now has a proper password box, with a show/hide toggle, instead of a plain text field.',
      },
      {
        icon: 'users',
        title: 'Sign in with Google, and a fuller account page',
        body: 'Added the option to sign in with a Google account, and filled out the account page with more of what it needs.',
      },
    ],
  },
  {
    version: '2.0.0',
    date: '2026-11-09',
    title: 'Real brand colours and photos replaced the placeholders',
    highlights: [
      {
        icon: 'palette',
        title: 'Your actual colours and photos, in place of placeholders',
        body: "Swapped the placeholder colours and stock-ish images for your real brand colours and proper photos.",
      },
      {
        icon: 'layers',
        title: "The homepage's first major redesign",
        body: 'A substantial rework of the homepage layout, moving it away from the very first version.',
      },
    ],
  },
  {
    version: '1.1.0',
    date: '2026-11-07',
    title: 'Small fixes to the map and the report form',
    highlights: [
      {
        icon: 'map',
        title: 'Map and report-form corrections',
        body: 'A handful of small fixes to the location map and the report form.',
      },
      {
        icon: 'check',
        title: 'The database stays awake on its own',
        body: "Set up an automatic check-in so the database that powers the site doesn't fall asleep from inactivity and slow down the first visit of the day.",
      },
    ],
  },
  {
    version: '1.0.0',
    date: '2026-10-09',
    title: 'A full redesign: accounts, and two new ways a report gets resolved',
    highlights: [
      {
        icon: 'users',
        title: 'Accounts',
        body: 'Added the ability to sign in and manage your own account and the reports linked to it.',
      },
      {
        icon: 'building',
        title: 'Two new routes to getting a problem fixed',
        body: "Alongside reporting to a council, added the Community route (a local group can claim and clear a safe, suitable report) and the Commercial route (a paid service, mainly for private land).",
      },
    ],
  },
  {
    version: '0.3.0',
    date: '2026-10-05',
    title: 'Added a step-by-step install guide, and tightened up security',
    highlights: [
      {
        icon: 'upload',
        title: 'A proper "how to install it" page',
        body: 'Added a page walking through installing the site on a phone like an app, with screenshots for each step.',
      },
      {
        icon: 'shield',
        title: 'Tightened up security behind the scenes',
        body: "Locked down how the site is allowed to load its own code, as a security precaution, and cleaned out a couple of files (a pitch deck, some original photos) that had ended up publicly accessible by mistake.",
      },
    ],
  },
  {
    version: '0.2.0',
    date: '2026-09-18',
    title: 'Made it look and feel like a proper site',
    highlights: [
      {
        icon: 'moon',
        title: 'Fixed light and dark mode on the form',
        body: 'The report form was showing a mismatched mix of light and dark styling. Fixed so it follows whichever mode you\'re using properly.',
      },
      {
        icon: 'palette',
        title: 'First real pass on how it looks',
        body: 'An early round of visual polish on layout and icons, moving away from the very first bare-bones version.',
      },
    ],
  },
  {
    version: '0.1.0',
    date: '2026-09-16',
    title: 'The very first version: report something, see it on a list',
    highlights: [
      {
        icon: 'camera',
        title: 'A simple way to send in a report',
        body: 'The very first working version: a form to send in a problem with a photo and a type, nothing more.',
      },
      {
        icon: 'layers',
        title: 'A list to see what had been sent in',
        body: 'A plain list showing every report that had been sent in so far, and the site itself set up as an installable app from day one.',
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
