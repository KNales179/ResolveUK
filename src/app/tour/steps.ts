import type { IconName } from '../../components/ui/Icon'
import type { AppRole } from '../session'

// The guided tours' scripts (modelled on Fico's). Each step points at part of the page by a CSS
// selector; the first match that is actually on screen is used. A step whose part isn't on screen
// (the desktop nav on a phone, an empty list) is skipped, so one script works on every screen.
// `target: null` is a card in the middle over a fully dimmed screen (the welcome and the end).
//
// When they run: in the demo, a page's tour starts by itself the first time that page is opened
// (once per demo session). With a real account they only run from "How Resolve works".

export interface TourStep {
  target: string | null
  title: string
  body: string
}

export interface Tour {
  id: string
  title: string
  description: string
  icon: IconName
  /** The page this tour belongs to (opened first when started from "How Resolve works"). */
  route: string
  /** Something that only exists once the page has loaded; the tour waits for it. */
  ready: string
  /** Only for these roles (shown to everyone when missing). */
  roles?: AppRole[]
  steps: TourStep[]
}

const NAV = 'nav[aria-label="App sections"]'

export const TOURS: Tour[] = [
  {
    id: 'home',
    title: 'Home',
    description: 'The feed, posting, thanking and the menus around it.',
    icon: 'home',
    route: '/app',
    ready: '#feed-title',
    steps: [
      { target: null, title: 'Welcome to Resolve', body: 'A quick look around. Tap Next to move along, or Skip any time. In the demo everything is sample data, and nothing you do is sent anywhere.' },
      { target: '#feed-title', title: "What's happening near you", body: 'Your home: the latest problems people have reported, and updates from councils and local groups as they deal with them.' },
      { target: '[data-tour="composer"]', title: 'Seen something?', body: 'Report a problem with a photo and a spot on the map, or post an update on one that is already reported.' },
      { target: '[role="group"][aria-label="Show"]', title: 'Choose what you see', body: 'Everything, or just new problems, updates, or problems that have been resolved.' },
      { target: '.feed-post', title: 'A post', body: 'Who posted it, what it is about, and the report it belongs to, with where that report stands.' },
      { target: '.feed-post .feed-actions', title: 'Join in', body: 'Say thanks for an update, or "I\'ve seen it too" so the council knows how many people it affects. Comment to add detail, or open the full report.' },
      { target: NAV, title: 'Getting around', body: 'Reports, the Map, Community groups and more. Each section has its own short tour.' },
      { target: 'button[aria-label^="Notifications"]', title: 'Notifications', body: 'When a report you sent or follow moves on, you hear about it here.' },
      { target: 'button[aria-label="Your account"]', title: 'Your menu', body: 'Your account, Private land, and "How Resolve works" to replay any of these tours.' },
      { target: '.demo-roles', title: 'Try other roles', body: 'In the demo, switch to see Resolve the way a community group, council staff or an admin would.' },
      { target: null, title: "You're all set", body: 'That is Home. Open any section to see what it does.' },
    ],
  },
  {
    id: 'report',
    title: 'Report a problem',
    description: 'Photo, type, the spot on the map, and sending it.',
    icon: 'camera',
    route: '/app/report',
    ready: '#step-category',
    steps: [
      { target: null, title: 'Report a problem', body: 'About a minute, four short steps. Reports are public, so leave out names and personal details.' },
      { target: '#step-category', title: '1. What is it?', body: 'Pick the type: fly-tipping, a pothole, graffiti and so on. It decides who the report goes to.' },
      { target: '#step-description', title: '2. Describe it', body: 'A line or two is enough: what it is and anything that helps find it.' },
      { target: '#step-photo', title: '3. Add a photo', body: 'A photo makes it much quicker to deal with. Big photos are shrunk, and the hidden location inside them is removed.' },
      { target: '#step-location', title: '4. Where is it?', body: 'Use your location, or open the big map: search a street or postcode and drag the map until the pin sits on the spot.' },
      { target: 'form button[type="submit"]', title: 'Send it', body: 'If someone has already reported the same thing nearby, you can add your support to theirs instead of sending it twice.' },
    ],
  },
  {
    id: 'reports',
    title: 'Reports',
    description: 'Every report, searching, filtering and opening one.',
    icon: 'layers',
    route: '/app/reports',
    ready: '[data-report]',
    steps: [
      { target: null, title: 'Reports', body: 'Every problem reported, newest first, and where each one stands.' },
      { target: '[aria-label="Filter by status"]', title: 'Filter', body: 'Show only reported, in progress, cleared or verified problems, or search for a place or a type.' },
      { target: '[data-report]', title: 'A report', body: 'The photo, the type, and the step it is on. Tap it to open the full history, who is dealing with it, and to follow it.' },
    ],
  },
  {
    id: 'map',
    title: 'Map',
    description: 'Reports on the map, their colours, and group areas.',
    icon: 'map',
    route: '/app/map',
    ready: '[aria-label="Map of reports"]',
    steps: [
      { target: '[aria-label="Map of reports"]', title: 'The map', body: 'Every report where it is. Pins are coloured by where they stand. Tap a pin to open the report.' },
      { target: '[aria-label="Show on the map"]', title: 'What to show', body: 'Turn each kind on or off, and show the areas local groups and clearance companies cover.' },
      { target: 'aside.card', title: 'The list', body: 'The same reports as a list, for when the map is busy.' },
    ],
  },
  {
    id: 'community',
    title: 'Community',
    description: 'Local groups, the areas they cover, joining and starting one.',
    icon: 'users',
    route: '/app/community',
    ready: '.maplibregl-map',
    steps: [
      { target: null, title: 'Community', body: 'Local groups who take on safe jobs like litter picks, and licensed companies that clear private land. Every one is checked before it appears.' },
      { target: '.maplibregl-map', title: 'Who covers where', body: 'Each group and company, with the area it covers. Tap one to open it.' },
      { target: '[data-tour="org-list"]', title: 'Groups and companies', body: 'Open one to see what they do, when they meet, and to ask to join.' },
      { target: 'a[href="/app/community/new?kind=community"]', title: 'Start your own', body: 'Start a group for your area. A Resolve admin checks it before it appears on the map.' },
    ],
  },
  {
    id: 'clearance',
    title: 'Private land',
    description: 'Asking clearance companies for quotes.',
    icon: 'truck',
    route: '/app/clearance',
    ready: 'main h1',
    steps: [
      { target: null, title: 'Private land', body: 'On private land the landowner chooses who clears it. Post what was dumped, and licensed companies covering that spot send you quotes.' },
      { target: 'main .btn-primary', title: 'Ask for quotes', body: 'A photo, a pin on the map and a few words. Your contact details stay private until you choose a company.' },
      { target: '[data-tour="requests"]', title: 'Your requests', body: 'Each request, its quotes and where it stands. Pick one quote and only that company gets your details.' },
    ],
  },
  {
    id: 'staff',
    title: 'Staff',
    description: 'The queue of reports for your council or contractor.',
    icon: 'building',
    route: '/app/staff',
    ready: '.stat-tile',
    roles: ['staff', 'admin'],
    steps: [
      { target: null, title: 'Staff', body: 'Reports for your council or contractor, and the tools to move each one on.' },
      { target: '.stat-tile', title: 'At a glance', body: 'How many are new, in progress, overdue and done. Tap a tile to show just those.' },
      { target: '[data-tour="staff-queue"]', title: 'The queue', body: 'Acknowledge a report, schedule it, mark it cleared, or offer a safe one to a local group.' },
    ],
  },
  {
    id: 'admin',
    title: 'Admin',
    description: 'Approving stories, groups, companies and comments.',
    icon: 'shield',
    route: '/app/admin',
    ready: '[aria-label="Queue"]',
    roles: ['admin'],
    steps: [
      { target: null, title: 'Admin', body: 'Everything waiting for a Resolve admin to check.' },
      { target: '[aria-label="Queue"]', title: 'The queues', body: 'Stories to approve, new groups and companies, reported comments, and people.' },
    ],
  },
]

export const tourForRoute = (path: string) => TOURS.find((t) => t.route === path)
export const findTour = (id: string) => TOURS.find((t) => t.id === id)
export const toursFor = (role: AppRole) => TOURS.filter((t) => !t.roles || t.roles.includes(role))
