import type { IconName } from '../components/ui/Icon'

// What works today and what is planned. Shown on the Updates page (it used to sit on the homepage,
// where it read like an internal changelog to a resident).
export const WORKING_NOW = [
  'Reports with a photo, a type and a place on the map',
  'A check for the same problem nearby, before a report is sent',
  'Adding your support to someone else’s report',
  'A public history of every step on each report',
  'Routing a report to any responsible organisation, not just a council',
  'Sign-in for council, contractor and Resolve staff, to handle reports',
  'An optional account, to keep track of the reports you have sent',
  'Report data stored in the UK',
]

export const PLANNED = [
  'A local group claiming and clearing a safe problem itself',
  'A registered waste carrier quoting to clear private land, and getting chosen',
  'Sending each report to the right organisation automatically',
  'Residents confirming a fix with a photo',
  'A map inside each report, and updates with photos of the work',
  'Suggesting the type of problem from the photo',
  'Public pages comparing how quickly problems get fixed',
]

// The three ways a problem gets resolved: shown on the Get involved page.
export const ROUTES: Array<{ icon: IconName; title: string; text: string; href: string; cta: string; live: boolean }> = [
  { icon: 'map', title: 'Public', text: 'A report on public land goes to the council or contractor responsible for it. This is what already works today.', href: '/report', cta: 'Report a problem', live: true },
  { icon: 'users', title: 'Community', text: 'A safe, non-hazardous problem, such as litter, can be offered by the council to a checked local group, which clears it and shows how with photos.', href: '/community', cta: 'How community groups work', live: true },
  { icon: 'building', title: 'Commercial', text: 'On private land, where a council has no duty to clear it, licensed waste carriers covering the spot quote a price and the landowner picks one.', href: '/commercial', cta: 'How private land quotes work', live: true },
]
