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
    version: '3.11.0',
    date: '2026-11-19',
    title: 'Community and Commercial, each with their own look',
    highlights: [
      {
        icon: 'users',
        title: 'Community: people and places',
        body: "The Community page opens with photo prints from a litter pick, shows how it works as pins along a walking trail, and sets what groups do and don't do (with green ticks and red crosses) beside a photo.",
      },
      {
        icon: 'truck',
        title: 'Commercial: the business side',
        body: "The Commercial page opens on a wide photo of farmland, and sets how it works beside an example waste transfer note, the document every landowner should ask for. The duty of care advice sits in its own warm panel.",
      },
      {
        icon: 'sparkles',
        title: 'Fewer identical green cards',
        body: "Each part of these pages now has its own shape and colour: a neutral panel for the steps, an outline for an empty list, a warm panel for advice to take note of, and a plain band for the last step, instead of the same green card over and over.",
      },
    ],
  },
  {
    version: '3.10.4',
    date: '2026-11-19',
    title: 'Contour lines that scroll with the page',
    highlights: [
      {
        icon: 'map',
        title: 'One long map behind every page',
        body: "The contour lines used to stay still while the page scrolled over them. They now run the whole length of the page and move with it, like a long map, on the homepage and every other public page. The green glow still follows your mouse as you scroll.",
      },
    ],
  },
  {
    version: '3.10.3',
    date: '2026-11-19',
    title: 'The glow on the homepage too',
    highlights: [
      {
        icon: 'sparkles',
        title: 'Contour lines light up on the homepage',
        body: 'The green glow that follows your mouse across the contour lines on the other public pages now works on the homepage as well.',
      },
    ],
  },
  {
    version: '3.10.2',
    date: '2026-11-19',
    title: 'The landscape photo is back on the public pages',
    highlights: [
      {
        icon: 'map',
        title: 'Photo and contour lines, with the glow',
        body: "Every public page apart from the homepage has the landscape photo back at the top, fading out as you scroll, with the contour lines from the homepage drawn over it where the grid used to be. Move your mouse and the contour lines near it light up green, like the grid used to. On phones the photo steps aside, as before.",
      },
    ],
  },
  {
    version: '3.10.1',
    date: '2026-11-19',
    title: 'The public site only shows public things',
    highlights: [
      {
        icon: 'users',
        title: 'Community and Commercial pages, rewritten',
        body: "The public Community and Commercial pages had old previews with Claim and Choose buttons from before the app existed. They're now plain explanations of how community groups and private land quotes work, the approved groups and companies on Resolve, and buttons into the app to join, start a group, ask for quotes or register a company.",
      },
      {
        icon: 'camera',
        title: 'Reporting from inside the app stays in the app',
        body: "Report a problem in the app now opens the report form inside the app instead of the public site. If you're signed in, the report is linked to your account, so you're told each time it moves on and asked to confirm it's clear.",
      },
    ],
  },
  {
    version: '3.10.0',
    date: '2026-11-19',
    title: 'Comments, and quotes for private land',
    highlights: [
      {
        icon: 'chat',
        title: 'Comments and thanks on posts',
        body: "Every post in the feed now has comments, and updates and resolved posts have a Thanks button. Comments appear straight away. Anyone can report one, which hides it until a Resolve admin decides; councils and the group that posted can hide comments on their own posts. If a comment looks like it names a house, a number plate or who did it, you're asked to think again before it posts.",
      },
      {
        icon: 'truck',
        title: 'Private land: get clearance quotes',
        body: "Rubbish dumped on a farm, a car park or a business's land is the owner's to clear, not the council's. The new Private land section lets you post it with a photo and a pin, and licensed clearance companies covering that spot send quotes. Choose one and only that company gets your contact details; they mark it cleared with an after photo.",
      },
    ],
  },
  {
    version: '3.9.0',
    date: '2026-11-19',
    title: 'The staff queue in the app, and a proper home feed',
    highlights: [
      {
        icon: 'building',
        title: 'Staff page',
        body: "Council and contractor staff now work through their reports in the app. The numbers that matter sit along the top: reports to claim, open, overdue, the average days to clear, and jobs out with groups. Below is the queue, with each report's next step on its row (claim, acknowledge, schedule, mark cleared), an optional note, and the jobs with community groups beside it. Resolve reviewers and admins see every report and can verify, reopen or move one to another council.",
      },
      {
        icon: 'users',
        title: 'People, in Admin',
        body: 'Admins can add councils and contractors and link or switch off staff accounts from the app, without opening the old staff area.',
      },
      {
        icon: 'sparkles',
        title: 'The home page is a feed',
        body: "Posts now run down one column you scroll through, like a social feed: who posted it, what they said, the photo large (before and after side by side once it's fixed), and buttons to back the report or open it. There's a \"seen something?\" box at the top, filters for problems, updates and resolved posts, and on wide screens your shortcuts on the left with groups near you on the right.",
      },
    ],
  },
  {
    version: '3.8.0',
    date: '2026-11-19',
    title: 'Jobs for groups, updates, and checking it is clear',
    highlights: [
      {
        icon: 'users',
        title: 'Councils can hand a job to a group or company',
        body: "Council staff can offer a report to a community group or a clearance company, with the ones that cover that spot listed first. Volunteer groups are only offered safe jobs, and staff confirm that before offering. A lead of the group accepts or declines; once accepted, the report shows who is clearing it.",
      },
      {
        icon: 'camera',
        title: 'Updates and before-and-after write-ups',
        body: "Groups post progress updates while they work, and mark the job done with a few words and an after photo. That clears the report and publishes the write-up with the before and after photos side by side. Councils can post official updates too. Residents can now post an update or a 'fixed' story as well as a problem; theirs still wait for an admin.",
      },
      {
        icon: 'check',
        title: 'Is it clear now?',
        body: "When a report is cleared, the person who reported it is asked to check: 'Yes, it's clear' marks it confirmed, and 'No, it's still there' reopens it so someone can go back.",
      },
      {
        icon: 'bell',
        title: 'Follow reports and get notifications',
        body: "Follow any report to get a notification each time it moves on; your own reports notify you automatically. Group leads are told when they're offered a job, and staff when a job is answered or finished. The bell is in the app's header.",
      },
    ],
  },
  {
    version: '3.7.1',
    date: '2026-11-19',
    title: 'Smoother sign-in animation, steadier map pins',
    highlights: [
      {
        icon: 'sparkles',
        title: 'The sign-in logo closes cleanly',
        body: "Each round now closes as a mirror of how it opened, without pieces flying off or a stray mark left behind. The sample report below it also shows every step: Reported, In progress, Cleared and Verified.",
      },
      {
        icon: 'pin',
        title: 'Map pins stay where they belong',
        body: "Pins on the app's Map drifted away from their places as you zoomed in or out. They now stay fixed to the spot that was reported. Group areas also show as a named dot when you're zoomed out to the whole country, and there's a key in the map's corner.",
      },
      {
        icon: 'arrow',
        title: 'Proper back buttons',
        body: 'Every "Back" link is now an outlined button with an arrow, easy to see and easy to tap, instead of small grey text.',
      },
    ],
  },
  {
    version: '3.7.0',
    date: '2026-11-19',
    title: 'Community groups and clearance companies',
    highlights: [
      {
        icon: 'users',
        title: 'Community in the app',
        body: "The app's Community page now lists every approved community group and clearance company, with the area each one covers shaded on a map beside the list. You can apply to join a group: a few questions about why you'd like to join and when you're free, plus a confirmation of your age and the safety rules. The group's leads then decide.",
      },
      {
        icon: 'map',
        title: 'Register a group or company, and draw its area',
        body: "Anyone can start a community group, or register a clearance company with its waste carrier number. You outline the area it covers by clicking points on a map. A Resolve admin checks every registration before it appears, and whoever registers it becomes its first lead. Leads approve applications and can make other members leads too.",
      },
      {
        icon: 'shield',
        title: 'Admins check new groups',
        body: "The admin page has a second queue for new groups and companies, each shown with its area on a map. The main Map can now also show the group areas, with a button to hide them.",
      },
      {
        icon: 'sparkles',
        title: 'A livelier sign-in page',
        body: "On the sign-in page the logo now plays the site's three opening animations in turn: it opens, rests, then closes and the next one begins. The sample report below it moves along with it, from Reported to Cleared to Verified.",
      },
      {
        icon: 'sun',
        title: 'Light mode fixed in the app',
        body: "If you'd picked a dark background shade and then switched to light mode inside the app, the dark shade stayed and the headings were hard to read. The shade now follows the theme everywhere, and the header's Report button stands out from the light header.",
      },
    ],
  },
  {
    version: '3.6.0',
    date: '2026-11-17',
    title: 'A new opening, and a calmer homepage',
    highlights: [
      {
        icon: 'sparkles',
        title: 'A new opening animation',
        body: "The first time you open the site in a visit, the logo arrives with a short animation before the page appears: the pin drops in and the logo opens out around it, or the logo is drawn and filled with colour, or the R is laid down like a route on a map. They take turns from one visit to the next. A tap or any key skips it, and anyone with reduced motion turned on goes straight to the page.",
      },
      {
        icon: 'bell',
        title: 'The header logo reacts when you point at it',
        body: 'Pointing at the logo in the header now plays a small move, a different one each time: the pin hops, the leaves sway in a breeze, or the pin spins and lands. This replaces the growing vine.',
      },
      {
        icon: 'map',
        title: 'The hills and river, redrawn',
        body: "The landscape behind the homepage had a photo, hills, a river, a grid and tiny figures all piled on top of each other, which made it look muddy. It's now a clean drawing: soft rolling hills that change colour from section to section, a proper river with banks and moving glints of water, trees, and a few people out walking.",
      },
      {
        icon: 'rotate',
        title: 'Smoother scrolling',
        body: 'The background used to be redrawn from scratch several times while you scrolled, which made the page stutter. It is now drawn once, and only the moving water and walkers update, and only while they are on screen.',
      },
      {
        icon: 'eye',
        title: 'Easier to read on every page',
        body: "Panels and cards now stand out clearly from the background in light mode, headings that were sitting straight on the picture have a panel behind them, and the green panels are solid so nothing shows through them. Form fields, buttons and icons inside a panel now always use a different colour from the panel itself, so they never blend in.",
      },
      {
        icon: 'palette',
        title: 'Pick your background shade',
        body: 'Under the opening section there is a row of colour circles for choosing how bright or dark the page background is, with separate choices for light and dark mode. Your choice is now remembered on your device and used on every page.',
      },
      {
        icon: 'check',
        title: 'Clearer when a report is missing something',
        body: 'Pressing Send with something left out now shows exactly what is missing, right under each question, takes you to the first one, and marks it as needed in the summary. Nothing is picked for you any more, and a report you have started is kept on your device, photo included, so switching apps to take the photo or reloading the page does not lose it.',
      },
      {
        icon: 'map',
        title: 'Reports, the map and stories, in the app',
        body: 'Every report, with search, filters and its full history, now lives in the app, along with a map showing where each one is and where it stands. You can post a story about a report so the neighbourhood knows; a Resolve admin checks it before it appears in the feed. The website keeps a shorter list of the most recent reports for anyone to see.',
      },
      {
        icon: 'user',
        title: 'The Resolve UK app, first look',
        body: 'Signing in now opens the Resolve UK app at /app, with its own home, sections and a tab bar on phones. There are new screens to sign in, create an account and reset a password. You can also try the app without an account: the demo uses sample data on your device only and lets you see it as a resident, community member, staff member or admin. Reporting a problem still needs no account at all.',
      },
      {
        icon: 'sparkles',
        title: 'New backgrounds across the site',
        body: 'The hills and river are gone. The homepage now sits on soft contour lines, like an Ordnance Survey map. Every other page has gentle colour in the brand greens with dappled leaf shadows, like sunlight through a tree. The navbar and footer carry a fine leaf-vein pattern, and the closing panel on the homepage uses one landscape photo toned green.',
      },
      {
        icon: 'rotate',
        title: 'Our focus: getting it resolved, and quickly',
        body: 'The About page has a new section on what Resolve UK is really for: making sure a report ends in a real fix, as quickly as possible, whether the problem is on public or private land, with local people involved.',
      },
      {
        icon: 'layers',
        title: 'Fly-tipping in numbers, on Why it matters',
        body: 'The Why it matters page now has four charts from the government\'s official figures: fly-tipping rising while prosecutions fall, how each region compares, where fly-tipping happens, and how big each fly-tip is. Each one links to its source and can be opened as a table.',
      },
      {
        icon: 'layers',
        title: 'The numbers behind it, on the homepage',
        body: 'A new chart on the homepage shows how many fly-tipping incidents councils in England dealt with each year from 2018/19 to 2024/25, using the government\'s official figures, with a link to the source. Point at a bar for the exact number, or open it as a table.',
      },
      {
        icon: 'map',
        title: 'A shorter, clearer homepage',
        body: 'The homepage now opens with why Resolve UK exists, and ends with links to About, Why it matters and Get involved. The three ways a problem gets resolved moved to the Get involved page, and the list of what works today and what is planned moved to the Updates page.',
      },
      {
        icon: 'eye',
        title: 'A fuller About page',
        body: 'The About page now tells the story properly: why Resolve UK exists, what it promises, and what it is working towards, each with a picture made from the site itself. It also explains what each part of the logo stands for, and answers common questions in a list you can open one at a time.',
      },
      {
        icon: 'plus',
        title: 'Install it like an app',
        body: 'The About page shows the site on a laptop, a tablet and a phone, with an Install button underneath. It opens a short guide: one tap where your browser allows it, or the exact steps for your phone or computer. Now and then a small card offers the same thing; "Not now" hides it for two weeks.',
      },
      {
        icon: 'crosshair',
        title: 'Neater hover highlights',
        body: 'When you point at a button, link or card, its corner marks now sit just outside it instead of being drawn over it. The colour circles light up with a soft ring instead.',
      },
      {
        icon: 'user',
        title: 'Only the sign-in options that work',
        body: 'Signing in with Google and creating a new account are not switched on yet, so those buttons are hidden for now. They will appear by themselves once they are turned on.',
      },
    ],
  },
  {
    version: '3.5.0',
    date: '2026-11-17',
    title: 'The logo, redrawn, and it grows in',
    highlights: [
      {
        icon: 'palette',
        title: 'A properly drawn logo',
        body: "The logo has been redrawn from the brand artwork as clean shapes, so its edges stay smooth at every size instead of looking jagged up close. The location pin has its round hole again, and the R's foot and both leaves now sit on one flat line.",
      },
      {
        icon: 'sparkles',
        title: 'The logo grows in when the site opens',
        body: "The logo in the header now grows in: a vine sprouts from the ground and climbs the R, the letter fills in, the two leaves open, and the pin drops into place. Anyone who has reduced motion turned on sees the finished logo straight away.",
      },
      {
        icon: 'camera',
        title: 'Matching browser tab and home-screen icons',
        body: 'The small icons in the browser tab and on a phone home screen use the same redrawn logo.',
      },
    ],
  },
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
