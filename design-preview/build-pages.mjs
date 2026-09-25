// Builds the three sample pages (index.html, report.html, reports.html) from shared parts.
// Run:  node design-preview/build-pages.mjs   then   npm run sample:css
import { writeFileSync, readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))

/* ------------------------------------------------------------------ icons */
const ICONS = {
  camera: '<path d="M4 8h3l1.5-2h7L17 8h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>',
  pin: '<path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/>',
  users: '<circle cx="9" cy="8" r="3.2"/><path d="M3 20c0-3.6 2.7-6 6-6s6 2.4 6 6"/><circle cx="17" cy="9" r="2.4"/><path d="M16 14.2c3 .2 5 2.2 5 5.3"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/>',
  trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6"/>',
  road: '<path d="M3 20 8 4M21 20 16 4M12 5v3M12 11v3M12 17v3"/>',
  spray: '<rect x="8" y="10" width="8" height="11" rx="1.5"/><path d="M10 10V7h4v3M11 4h2M18 6h2M18 9l2-1"/>',
  car: '<path d="M3 15v-4l2-5h14l2 5v4M3 15h18M3 15v3h3v-3M18 15v3h3v-3"/><circle cx="7.5" cy="12.5" r=".8"/><circle cx="16.5" cy="12.5" r=".8"/>',
  lamp: '<path d="M12 21V8M12 8c0-3 5-4 7-2M9 21h6"/><path d="M17 5.5l4 1.5-1.5 3z"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M5 19l1.5-1.5M17.5 6.5L19 5"/>',
  moon: '<path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z"/>',
  search: '<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  chevron: '<path d="M6 9l6 6 6-6"/>',
  upload: '<path d="M12 16V4M7 9l5-5 5 5M4 16v4h16v-4"/>',
  crosshair: '<circle cx="12" cy="12" r="7"/><path d="M12 2v5M12 17v5M2 12h5M17 12h5"/>',
  shield: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M8.5 12l2.5 2.5 4.5-5"/>',
  building: '<path d="M4 21V9l8-5 8 5v12M9 21v-6h6v6M8 12h.01M12 12h.01M16 12h.01"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  eye: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  map: '<path d="M9 4L3 6v14l6-2 6 2 6-2V4l-6 2z"/><path d="M9 4v14M15 6v14"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  layers: '<path d="M12 3l9 5-9 5-9-5z"/><path d="M3 13l9 5 9-5"/>',
  more: '<circle cx="6" cy="12" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="18" cy="12" r="1.2"/>',
}
const sprite = `<svg width="0" height="0" style="position:absolute" aria-hidden="true">${Object.entries(ICONS)
  .map(([k, v]) => `<symbol id="i-${k}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${v}</symbol>`)
  .join('')}</svg>`
const ic = (name, cls = 'size-5') => `<svg class="${cls}" aria-hidden="true"><use href="#i-${name}"/></svg>`

const logoMark = `<span class="grid size-9 place-items-center rounded-xl dark:bg-white/95"><img src="img/logo-mark.png" width="28" height="32" alt="" class="h-7 w-auto"></span>`

/* ------------------------------------------------------------------ pictures */
const pic = (name, widths, w, h, alt, cls = '', sizes = '100vw', eager = false) => {
  const set = (ext) => widths.map((x) => `img/${name}-${x}.${ext} ${x}w`).join(', ')
  const last = widths[widths.length - 1]
  return `<picture><source type="image/avif" srcset="${set('avif')}" sizes="${sizes}"><source type="image/webp" srcset="${set('webp')}" sizes="${sizes}"><img src="img/${name}-${last}.webp" width="${w}" height="${h}" alt="${alt}" class="${cls}" ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async"></picture>`
}

/* ------------------------------------------------------------------ shared page parts */
const head = (title, description, hero = false) => `<!doctype html>
<html lang="en-GB" data-theme="light">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<meta name="description" content="${description}">
<script>document.documentElement.dataset.theme = matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'; document.documentElement.classList.add('js')</script>
${
  hero
    ? `<link rel="preload" as="image" type="image/avif" href="img/hero-morning-720.avif" media="(prefers-color-scheme: light) and (max-width: 720px)">
<link rel="preload" as="image" type="image/avif" href="img/hero-morning-1280.avif" media="(prefers-color-scheme: light) and (min-width: 721px) and (max-width: 1299px)">
<link rel="preload" as="image" type="image/avif" href="img/hero-morning-1920.avif" media="(prefers-color-scheme: light) and (min-width: 1300px)">
<link rel="preload" as="image" type="image/avif" href="img/hero-night-720.avif" media="(prefers-color-scheme: dark) and (max-width: 720px)">
<link rel="preload" as="image" type="image/avif" href="img/hero-night-1280.avif" media="(prefers-color-scheme: dark) and (min-width: 721px) and (max-width: 1299px)">
<link rel="preload" as="image" type="image/avif" href="img/hero-night-1620.avif" media="(prefers-color-scheme: dark) and (min-width: 1300px)">`
    : ''
}
<link rel="stylesheet" href="styles.css">
</head>
<body class="min-h-svh antialiased">
${sprite}`

const nav = (active) => {
  const link = (href, label, key) =>
    `<a href="${href}" class="rounded-full px-3.5 py-2 transition ${active === key ? 'bg-surface2 text-ink' : 'text-soft hover:text-ink'}">${label}</a>`
  return `<header class="fixed inset-x-0 top-0 z-40">
<div class="mx-auto mt-3 max-w-7xl px-3 sm:px-6">
<nav class="glass flex items-center justify-between rounded-full py-2 pl-4 pr-2" aria-label="Main">
<a href="index.html" class="flex items-center gap-2.5 text-[1.05rem] font-extrabold tracking-tight">${logoMark}<span>Resolve UK</span></a>
<div class="hidden items-center gap-1 text-sm font-semibold md:flex">
${link('index.html', 'Home', 'home')}${link('index.html#how', 'How it works', 'how')}${link('reports.html', 'Reported problems', 'reports')}${link('report.html', 'Report', 'report')}
</div>
<div class="flex items-center gap-2">
<button class="icon-btn" data-theme-toggle aria-label="Switch between light and dark mode" type="button"><span class="dark:hidden">${ic('moon')}</span><span class="hidden dark:block">${ic('sun')}</span></button>
<a class="btn btn-primary btn-sm hidden sm:inline-flex" href="report.html">Report a problem ${ic('arrow', 'size-4')}</a>
<button class="icon-btn md:hidden" data-menu-btn aria-expanded="false" aria-controls="mobile-menu" aria-label="Open menu" type="button">${ic('menu')}</button>
</div>
</nav>
<div id="mobile-menu" hidden class="glass mt-2 rounded-3xl p-3 md:hidden">
<div class="grid gap-1 text-base font-semibold">
<a class="rounded-2xl px-4 py-3 hover:bg-surface2" href="index.html">Home</a>
<a class="rounded-2xl px-4 py-3 hover:bg-surface2" href="index.html#how">How it works</a>
<a class="rounded-2xl px-4 py-3 hover:bg-surface2" href="reports.html">Reported problems</a>
<a class="btn btn-primary mt-1" href="report.html">Report a problem</a>
</div></div>
</div>
</header>`
}

const footer = `<footer class="border-t border-line bg-surface/60">
<div class="mx-auto grid max-w-7xl gap-8 px-5 py-12 sm:px-8 md:grid-cols-[1.4fr_1fr_1fr]">
<div>
<a href="index.html" class="flex items-center gap-2.5 text-lg font-extrabold tracking-tight">${logoMark}<span>Resolve UK</span></a>
<p class="mt-3 max-w-sm text-sm leading-relaxed text-soft">Report local problems, follow them to the end, and see whether they were really fixed. An early prototype, built step by step.</p>
</div>
<div class="text-sm">
<p class="font-bold">Explore</p>
<ul class="mt-3 space-y-2 text-soft"><li><a class="hover:text-ink" href="report.html">Report a problem</a></li><li><a class="hover:text-ink" href="reports.html">Reported problems</a></li><li><a class="hover:text-ink" href="index.html#how">How it works</a></li></ul>
</div>
<div class="text-sm">
<p class="font-bold">For councils</p>
<ul class="mt-3 space-y-2 text-soft"><li><a class="hover:text-ink" href="#">Staff sign-in</a></li></ul>
<p class="mt-6 text-xs text-soft">Photo credits: being confirmed. Pictures on this sample page are placeholders until their licences are checked.</p>
</div>
</div>
</footer>
<script src="app.js" defer></script>
</body>
</html>`

/* ------------------------------------------------------------------ landing page */
const stages = [
  ['camera', 'Reported', 'A resident sends it in with a photo and a pin.'],
  ['building', 'Responsible body identified', 'A council or contractor takes it on.'],
  ['eye', 'Acknowledged', 'They confirm they have seen it.'],
  ['clock', 'Clearance scheduled', 'A date for the work is set.'],
  ['check', 'Cleared', 'They say the job is done.'],
  ['shield', 'Outcome verified', 'Independent people confirm it is really fixed.'],
]

const index =
  head('Resolve UK · See it. Report it. Resolve it.', 'Report local problems in a minute, follow them to the end, and see whether they were really fixed.', true) +
  nav('home') +
  `<main>
<section class="relative isolate flex min-h-[100svh] items-center overflow-hidden">
<div class="hero-bg absolute inset-0 -z-20" role="img" aria-label="A city skyline, bright by day and lit up at night"></div>
<div class="hero-veil absolute inset-0 -z-10"></div>
<div class="mx-auto grid w-full max-w-7xl items-center gap-12 px-5 pb-20 pt-32 sm:px-8 lg:grid-cols-[1.1fr_.9fr]">
<div class="rise">
<p class="glass mb-6 inline-flex items-center gap-2.5 rounded-full px-4 py-1.5 text-xs font-bold tracking-widest"><span class="relative flex size-2"><span class="absolute inline-flex size-full rounded-full bg-accent opacity-70" style="animation:pulse-ring 1.8s ease-out infinite"></span><span class="relative inline-flex size-2 rounded-full bg-accent"></span></span>EARLY PROTOTYPE · FREE FOR CITIZENS</p>
<h1 class="text-[3.2rem] font-extrabold leading-[1] tracking-[-0.04em] sm:text-7xl lg:text-[5.4rem]">See it.<br>Report it.<br><span class="bg-gradient-to-r from-accent to-sky-400 bg-clip-text text-transparent">Resolve it.</span></h1>
<p class="mt-7 max-w-xl text-lg leading-relaxed text-soft sm:text-xl">Fly-tipping in the lay-by. A pothole that swallows bikes. Graffiti that never goes. Report it in a minute, then follow it step by step until it is really gone.</p>
<div class="mt-9 flex flex-wrap gap-3">
<a href="report.html" class="btn btn-primary text-base">Report a problem ${ic('arrow', 'size-5')}</a>
<a href="reports.html" class="btn btn-ghost text-base">See reported problems</a>
</div>
<ul class="mt-10 flex flex-wrap gap-2.5 text-sm font-semibold">
<li class="glass inline-flex items-center gap-2 rounded-full px-3.5 py-2">${ic('camera', 'size-4 text-accent')}Photo and pin</li>
<li class="glass inline-flex items-center gap-2 rounded-full px-3.5 py-2">${ic('clock', 'size-4 text-accent')}Every step on record</li>
<li class="glass inline-flex items-center gap-2 rounded-full px-3.5 py-2">${ic('shield', 'size-4 text-accent')}Fixes checked, not just claimed</li>
</ul>
</div>

<div class="rise relative mx-auto w-full max-w-md lg:ml-auto" style="animation-delay:.2s">
<div class="floaty glass relative rounded-[1.75rem] p-4 shadow-2xl">
<span class="absolute -top-3 right-5 rounded-full bg-ink px-3 py-1 text-[0.65rem] font-bold uppercase tracking-widest text-bg">Sample</span>
<div class="flex gap-3.5">
${pic('rubbish-street', [400], 400, 267, 'Rubbish bags piled on a residential street', 'size-24 shrink-0 rounded-2xl object-cover', '96px', true)}
<div class="min-w-0">
<span class="pill pill-progress">Acknowledged</span>
<h3 class="mt-2 text-base font-bold leading-snug">Rubbish bags piled on a residential street</h3>
<p class="mt-1 text-xs text-soft">Reported 2 hours ago</p>
</div>
</div>
<ol class="mt-5 grid grid-cols-4 gap-1.5 text-[0.65rem] font-semibold text-soft" aria-label="Progress">
<li class="text-center"><span class="mb-1.5 block h-1.5 rounded-full bg-accent"></span>Reported</li>
<li class="text-center"><span class="mb-1.5 block h-1.5 rounded-full bg-accent"></span>Picked up</li>
<li class="text-center"><span class="mb-1.5 block h-1.5 rounded-full bg-line"></span>Cleared</li>
<li class="text-center"><span class="mb-1.5 block h-1.5 rounded-full bg-line"></span>Verified</li>
</ol>
<div class="mt-4 flex items-center justify-between border-t border-line pt-4">
<p class="flex items-center gap-2 text-sm font-semibold">${ic('users', 'size-4 text-accent')}12 people back this</p>
<span class="btn btn-ghost btn-sm">${ic('eye', 'size-4')}I have seen this too</span>
</div>
</div>
</div>
</div>
</section>

<section id="how" class="cv mx-auto max-w-7xl scroll-mt-24 px-5 py-24 sm:px-8">
<div class="reveal max-w-2xl">
<p class="text-sm font-bold uppercase tracking-widest text-accent">How it works</p>
<h2 class="mt-3 text-4xl font-extrabold tracking-tight sm:text-5xl">Three steps. Every one on record.</h2>
<p class="mt-4 text-lg text-soft">Reporting is the easy part. The hard part is knowing what happens next. Here it is written down where everyone can see it.</p>
</div>
<ol class="mt-14 grid gap-5 md:grid-cols-3">
${[
  ['camera', '01', 'Snap it', 'Choose the type of problem, add a photo and a short note. It takes about a minute.'],
  ['pin', '02', 'Pin it', 'Use your phone’s location or drop a pin. If it is already reported nearby, add your support instead of a duplicate.'],
  ['clock', '03', 'Follow it', 'Every step is written to the report’s history, from “picked up” to “cleared” to “verified”.'],
]
  .map(
    ([icon, n, t, d], i) => `<li class="reveal card group relative overflow-hidden rounded-3xl p-7 transition hover:-translate-y-1" style="animation-delay:${i * 60}ms">
<span class="absolute -right-2 -top-6 select-none text-[7rem] font-extrabold leading-none tracking-tighter text-ink/[0.05]">${n}</span>
<span class="tile-icon size-12 rounded-2xl">${ic(icon, 'size-6')}</span>
<h3 class="mt-6 text-2xl font-bold tracking-tight">${t}</h3>
<p class="mt-2 leading-relaxed text-soft">${d}</p>
</li>`,
  )
  .join('')}
</ol>
</section>

<section class="cv mx-auto max-w-7xl px-5 pb-24 sm:px-8">
<div class="reveal max-w-2xl">
<p class="text-sm font-bold uppercase tracking-widest text-accent">What people report</p>
<h2 class="mt-3 text-4xl font-extrabold tracking-tight sm:text-5xl">The everyday things that wear a place down.</h2>
</div>
<div class="mt-12 grid gap-4 md:grid-cols-3 md:grid-rows-2">
<figure class="reveal group relative min-h-[20rem] overflow-hidden rounded-3xl md:col-span-2 md:row-span-2">
${pic('rubbish-street', [400, 678], 678, 452, 'Piles of black rubbish bags on a residential street', 'absolute inset-0 size-full object-cover transition duration-700 group-hover:scale-105', '(min-width:768px) 66vw, 100vw')}
<div class="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent"></div>
<figcaption class="absolute bottom-0 p-6 text-white"><p class="text-2xl font-bold">Fly-tipping and bagged waste</p><p class="mt-1 max-w-md text-sm text-white/80">Dumped rubbish, overflowing bins and bags left on the pavement.</p></figcaption>
</figure>
<figure class="reveal group relative min-h-[12rem] overflow-hidden rounded-3xl">
${pic('litter-bottles', [400, 640], 640, 427, 'Bottles and cans on the kerb next to rubbish bags', 'absolute inset-0 size-full object-cover transition duration-700 group-hover:scale-105', '(min-width:768px) 33vw, 100vw')}
<div class="absolute inset-0 bg-gradient-to-t from-black/75 via-black/5 to-transparent"></div>
<figcaption class="absolute bottom-0 p-5 text-white"><p class="text-lg font-bold">Litter</p></figcaption>
</figure>
<figure class="reveal group relative min-h-[12rem] overflow-hidden rounded-3xl">
${pic('roadside-litter', [400, 480], 480, 639, 'Litter scattered along a roadside verge', 'absolute inset-0 size-full object-cover transition duration-700 group-hover:scale-105', '(min-width:768px) 33vw, 100vw')}
<div class="absolute inset-0 bg-gradient-to-t from-black/75 via-black/5 to-transparent"></div>
<figcaption class="absolute bottom-0 p-5 text-white"><p class="text-lg font-bold">Roadside mess</p></figcaption>
</figure>
</div>
<ul class="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
${[
  ['road', 'Potholes', 'Damaged or broken roads'],
  ['spray', 'Graffiti', 'Vandalism on walls and signs'],
  ['car', 'Abandoned vehicles', 'Cars left to rot'],
  ['lamp', 'Damaged infrastructure', 'Lamps, barriers, bins and benches'],
]
  .map(
    ([i, t, d]) => `<li class="reveal card flex items-start gap-4 rounded-3xl p-5 transition hover:-translate-y-0.5"><span class="tile-icon shrink-0">${ic(i, 'size-5')}</span><div><p class="font-bold">${t}</p><p class="mt-0.5 text-sm text-soft">${d}</p></div></li>`,
  )
  .join('')}
</ul>
</section>

<section class="cv border-y border-line bg-surface2/50">
<div class="mx-auto max-w-7xl px-5 py-24 sm:px-8">
<div class="reveal max-w-2xl">
<p class="text-sm font-bold uppercase tracking-widest text-accent">The journey of a report</p>
<h2 class="mt-3 text-4xl font-extrabold tracking-tight sm:text-5xl">From “reported” to “really fixed”.</h2>
</div>
<ol class="relative mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
${stages
  .map(
    ([i, t, d], n) => `<li class="reveal card relative rounded-3xl p-5"><span class="tile-icon">${ic(i, 'size-5')}</span><p class="mt-4 text-xs font-bold text-accent">STEP ${n + 1}</p><h3 class="mt-1 text-base font-bold leading-snug">${t}</h3><p class="mt-2 text-sm leading-relaxed text-soft">${d}</p></li>`,
  )
  .join('')}
</ol>
<div class="reveal mt-8 flex gap-4 rounded-3xl border border-accent/30 bg-accent/10 p-6">
${ic('shield', 'mt-0.5 size-6 shrink-0 text-accent')}
<p class="leading-relaxed"><b>“Cleared” and “verified” are not the same thing.</b> A council saying a job is done is its own word. A fix only counts as verified once it has been independently checked. Keeping the two apart is what makes the results trustworthy.</p>
</div>
</div>
</section>

<section class="cv mx-auto max-w-7xl px-5 py-24 sm:px-8">
<div class="reveal max-w-2xl">
<p class="text-sm font-bold uppercase tracking-widest text-accent">Where the project is</p>
<h2 class="mt-3 text-4xl font-extrabold tracking-tight sm:text-5xl">An early prototype, built step by step.</h2>
</div>
<div class="mt-12 grid gap-5 md:grid-cols-2">
<div class="reveal card rounded-3xl p-7">
<h3 class="flex items-center gap-2.5 text-xl font-bold">${ic('check', 'size-6 text-accent')}Working today</h3>
<ul class="mt-5 space-y-3 text-soft">${['Reporting with a photo and a location', '“Is this the same problem?” check', 'Backing someone else’s report', 'A full history for every report', 'Sign-in for council and contractor staff']
  .map((x) => `<li class="flex gap-3">${ic('check', 'mt-1 size-4 shrink-0 text-accent')}<span>${x}</span></li>`)
  .join('')}</ul>
</div>
<div class="reveal card rounded-3xl p-7">
<h3 class="flex items-center gap-2.5 text-xl font-bold">${ic('clock', 'size-6 text-soft')}Coming next</h3>
<ul class="mt-5 space-y-3 text-soft">${['Sending each report to the right council', 'Residents confirming a fix with a photo', 'Help sorting reports from the photo', 'Public pages comparing how quickly problems get fixed', 'Storing report data in the UK']
  .map((x) => `<li class="flex gap-3">${ic('clock', 'mt-1 size-4 shrink-0 text-soft')}<span>${x}</span></li>`)
  .join('')}</ul>
</div>
</div>
</section>

<section class="cv px-3 pb-24 sm:px-6">
<div class="relative isolate mx-auto max-w-7xl overflow-hidden rounded-[2rem]">
<div class="cta-bg absolute inset-0 -z-20" role="img" aria-label="A city at sunrise or dusk"></div>
<div class="absolute inset-0 -z-10 bg-gradient-to-r from-bg/95 via-bg/70 to-bg/10"></div>
<div class="px-7 py-20 sm:px-14 sm:py-28">
<h2 class="max-w-xl text-4xl font-extrabold tracking-tight sm:text-6xl">Spotted something? It takes a minute.</h2>
<p class="mt-4 max-w-md text-lg text-soft">Help keep your area clean, and see what happens next.</p>
<a href="report.html" class="btn btn-primary mt-8 text-base">Report a problem ${ic('arrow')}</a>
</div>
</div>
</section>
</main>` +
  footer

/* ------------------------------------------------------------------ report page */
const types = [
  ['trash', 'Fly-tipping', 'Dumped rubbish'],
  ['road', 'Pothole', 'Damaged road'],
  ['spray', 'Graffiti', 'Vandalism'],
  ['car', 'Abandoned vehicle', 'Left to rot'],
  ['lamp', 'Damaged infrastructure', 'Lamps, barriers, bins'],
  ['more', 'Something else', 'Anything else'],
]

const report =
  head('Report a problem · Resolve UK', 'Report a local problem with a photo and a location.') +
  nav('report') +
  `<div class="page-bg fixed inset-0 -z-20"></div>
<div class="fixed inset-0 -z-10" style="background:linear-gradient(0deg,var(--c-bg) 8%,color-mix(in oklab,var(--c-bg) 88%,transparent))"></div>
<main class="mx-auto max-w-7xl px-5 pb-24 pt-32 sm:px-8">
<div class="rise max-w-2xl">
<p class="text-sm font-bold uppercase tracking-widest text-accent">Report a problem</p>
<h1 class="mt-3 text-4xl font-extrabold tracking-tight sm:text-5xl">Tell us what you have seen.</h1>
<p class="mt-4 text-lg text-soft">It takes about a minute. Reports are public, so please do not include names or personal details.</p>
</div>

<div class="mt-10 grid items-start gap-6 lg:grid-cols-[1.2fr_.8fr]">
<form class="space-y-5" onsubmit="return false" novalidate>

<section class="card rounded-3xl p-6 sm:p-7">
<h2 class="flex items-center gap-3 text-lg font-bold"><span class="grid size-8 place-items-center rounded-full bg-accent text-sm font-extrabold text-accent-ink">1</span>What is the problem?</h2>
<div class="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3" role="radiogroup" aria-label="Type of problem">
${types
  .map(
    ([i, t, d], n) => `<label class="tile"><input type="radio" name="type" value="${t}" ${n === 0 ? 'checked' : ''}><span class="tile-icon">${ic(i, 'size-5')}</span><span class="font-bold leading-tight">${t}</span><span class="text-xs text-soft">${d}</span></label>`,
  )
  .join('')}
</div>
</section>

<section class="card rounded-3xl p-6 sm:p-7">
<h2 class="flex items-center gap-3 text-lg font-bold"><span class="grid size-8 place-items-center rounded-full bg-accent text-sm font-extrabold text-accent-ink">2</span>Describe it</h2>
<div class="mt-5">
<label class="sr-only" for="desc">Description</label>
<textarea id="desc" class="input" maxlength="1000" placeholder="For example: black bags piled against the wall, blocking the pavement." data-counter="desc-count"></textarea>
<p class="mt-2 text-right text-xs text-soft"><span id="desc-count">0</span> / 1000</p>
</div>
</section>

<section class="card rounded-3xl p-6 sm:p-7">
<h2 class="flex items-center gap-3 text-lg font-bold"><span class="grid size-8 place-items-center rounded-full bg-accent text-sm font-extrabold text-accent-ink">3</span>Add a photo</h2>
<label class="dropzone mt-5" data-dropzone>
<input class="sr-only" type="file" accept="image/*" capture="environment">
<span class="tile-icon size-12 rounded-2xl">${ic('upload', 'size-6')}</span>
<span class="font-bold" data-dz-title>Drop a photo here, or browse</span>
<span class="text-sm text-soft" data-dz-hint>Photos are shrunk before they are sent, so this stays fast on mobile data.</span>
</label>
</section>

<section class="card rounded-3xl p-6 sm:p-7">
<h2 class="flex items-center gap-3 text-lg font-bold"><span class="grid size-8 place-items-center rounded-full bg-accent text-sm font-extrabold text-accent-ink">4</span>Where is it?</h2>
<div class="mt-5 flex flex-wrap gap-3">
<button type="button" class="btn btn-ghost">${ic('crosshair', 'size-5 text-accent')}Use my location</button>
<button type="button" class="btn btn-ghost">${ic('pin', 'size-5 text-accent')}Drop a pin on the map</button>
</div>
<p class="mt-3 text-sm text-soft">Your phone’s location is usually accurate to a few metres. You can adjust the pin afterwards.</p>
</section>

<section class="card rounded-3xl border-dashed p-6 sm:p-7" aria-label="Example of the same-problem check">
<p class="text-xs font-bold uppercase tracking-widest text-soft">Shown only when something similar is nearby</p>
<h2 class="mt-2 text-lg font-bold">Is this the same problem?</h2>
<div class="mt-4 flex gap-4 rounded-2xl border border-line bg-surface2/60 p-3">
${pic('litter-bottles', [400], 400, 267, 'Bottles and litter by the kerb', 'size-20 shrink-0 rounded-xl object-cover', '80px')}
<div class="min-w-0"><p class="font-semibold">Bottles and litter by the kerb</p><p class="mt-0.5 text-xs text-soft">About 12 m away · Reported · Backed by 3 people</p><button type="button" class="btn btn-ghost btn-sm mt-2">Yes, add my support</button></div>
</div>
</section>
</form>

<aside class="space-y-5 lg:sticky lg:top-24">
<section class="card overflow-hidden rounded-3xl" aria-label="Map">
<div class="map-grid relative grid aspect-[4/3] place-items-center bg-surface2">
<div class="absolute inset-0 bg-gradient-to-br from-accent/10 via-transparent to-sky-400/10"></div>
<div class="relative text-center">
<span class="relative mx-auto flex size-14 items-center justify-center"><span class="absolute inline-flex size-full rounded-full bg-accent/40" style="animation:pulse-ring 2s ease-out infinite"></span><span class="relative grid size-11 place-items-center rounded-full bg-accent text-accent-ink shadow-lg">${ic('pin', 'size-5')}</span></span>
<p class="mt-3 font-bold">The map opens here</p>
<p class="mt-0.5 text-sm text-soft">Tap it to drop a pin on the exact spot.</p>
</div>
<div class="absolute right-3 top-3 grid gap-2"><span class="icon-btn">${ic('plus', 'size-4')}</span><span class="icon-btn">${ic('minus', 'size-4')}</span></div>
</div>
</section>

<section class="card rounded-3xl p-6">
<h2 class="text-lg font-bold">Your report</h2>
<dl class="mt-4 space-y-3 text-sm">
<div class="flex justify-between gap-4"><dt class="text-soft">Type</dt><dd class="font-semibold" id="sum-type">Fly-tipping</dd></div>
<div class="flex justify-between gap-4"><dt class="text-soft">Description</dt><dd class="font-semibold" id="sum-desc">Not written yet</dd></div>
<div class="flex justify-between gap-4"><dt class="text-soft">Photo</dt><dd class="font-semibold" id="sum-photo">None yet</dd></div>
<div class="flex justify-between gap-4"><dt class="text-soft">Location</dt><dd class="font-semibold">Not set</dd></div>
</dl>
<button type="button" class="btn btn-primary mt-6 w-full text-base">Send report ${ic('arrow')}</button>
<p class="mt-3 text-center text-xs text-soft">You will see it appear in the list straight away.</p>
</section>
</aside>
</div>
</main>` +
  footer

/* ------------------------------------------------------------------ reports list */
const reports = [
  { id: 1, title: 'Rubbish bags piled on a residential street', type: 'Fly-tipping', icon: 'trash', status: 'progress', label: 'Acknowledged', backers: 12, ago: '2 hours ago', img: ['rubbish-street', 400, 678, 678, 452],
    history: [['Reported', '2 hours ago'], ['Responsible body identified', '1 hour ago'], ['Acknowledged', '40 minutes ago']] },
  { id: 2, title: 'Bottles and litter by the kerb', type: 'Litter', icon: 'trash', status: 'reported', label: 'Reported', backers: 3, ago: '5 hours ago', img: ['litter-bottles', 400, 640, 640, 427],
    history: [['Reported', '5 hours ago']] },
  { id: 3, title: 'Litter scattered along a roadside verge', type: 'Fly-tipping', icon: 'trash', status: 'cleared', label: 'Cleared', backers: 7, ago: 'Yesterday', img: ['roadside-litter', 400, 480, 480, 639],
    history: [['Reported', 'Yesterday'], ['Responsible body identified', 'Yesterday'], ['Acknowledged', 'Yesterday'], ['Clearance scheduled', 'Today'], ['Cleared', 'Today']] },
  { id: 4, title: 'Deep pothole that has damaged a bike wheel', type: 'Pothole', icon: 'road', status: 'reported', label: 'Reported', backers: 21, ago: '1 day ago', img: null,
    history: [['Reported', '1 day ago']] },
  { id: 5, title: 'Graffiti on a shop shutter', type: 'Graffiti', icon: 'spray', status: 'progress', label: 'Clearance scheduled', backers: 4, ago: '2 days ago', img: null,
    history: [['Reported', '2 days ago'], ['Responsible body identified', '2 days ago'], ['Acknowledged', '1 day ago'], ['Clearance scheduled', 'Today']] },
  { id: 6, title: 'Abandoned car left in a lay-by', type: 'Abandoned vehicle', icon: 'car', status: 'verified', label: 'Outcome verified', backers: 9, ago: '2 weeks ago', img: null,
    history: [['Reported', '2 weeks ago'], ['Responsible body identified', '2 weeks ago'], ['Acknowledged', '2 weeks ago'], ['Cleared', '1 week ago'], ['Outcome verified', '5 days ago']] },
]

const card = (r) => `<li>
<button type="button" class="card group flex h-full w-full flex-col overflow-hidden rounded-3xl text-left transition hover:-translate-y-1 hover:shadow-2xl" data-report="${r.id}" data-status="${r.status}" data-type="${r.type}" data-text="${(r.title + ' ' + r.type).toLowerCase()}">
<span class="relative block aspect-[4/3] w-full overflow-hidden bg-surface2">
${
  r.img
    ? pic(r.img[0], [r.img[1], r.img[2]], r.img[3], r.img[4], r.title, 'absolute inset-0 size-full object-cover transition duration-700 group-hover:scale-105', '(min-width:1024px) 33vw, (min-width:640px) 50vw, 100vw')
    : `<span class="absolute inset-0 grid place-items-center bg-gradient-to-br from-accent/20 via-surface2 to-sky-400/20 text-accent">${ic(r.icon, 'size-14 opacity-80')}</span><span class="absolute bottom-3 left-3 rounded-full bg-bg/80 px-2.5 py-1 text-[0.65rem] font-bold uppercase tracking-wider text-soft">Photo shown here</span>`
}
<span class="absolute left-3 top-3"><span class="pill pill-${r.status}">${r.label}</span></span>
</span>
<span class="flex flex-1 flex-col gap-3 p-5">
<span class="text-xs font-bold uppercase tracking-widest text-soft">${r.type}</span>
<span class="text-lg font-bold leading-snug">${r.title}</span>
<span class="mt-auto flex items-center justify-between pt-2 text-sm text-soft"><span class="flex items-center gap-1.5">${ic('users', 'size-4')}${r.backers} back this</span><span>${r.ago}</span></span>
</span>
</button>
</li>`

const dd = (id, label, opts) => `<div class="dd" data-dropdown="${id}" data-open="false">
<button type="button" class="btn btn-ghost dd-btn" data-dd-btn aria-haspopup="listbox" aria-expanded="false"><span><span class="text-soft">${label}: </span><b data-dd-label>${opts[0]}</b></span>${ic('chevron', 'dd-chevron size-4')}</button>
<div class="dd-list" role="listbox" aria-label="${label}">${opts
  .map((o, i) => `<button type="button" role="option" class="dd-opt" data-value="${o}" aria-selected="${i === 0}"><span>${o}</span>${ic('check', 'dd-check size-4')}</button>`)
  .join('')}</div>
</div>`

const reportsPage =
  head('Reported problems · Resolve UK', 'Browse reported problems and follow them to the end.') +
  nav('reports') +
  `<div class="page-bg fixed inset-0 -z-20"></div>
<div class="fixed inset-0 -z-10" style="background:linear-gradient(0deg,var(--c-bg) 8%,color-mix(in oklab,var(--c-bg) 88%,transparent))"></div>
<main class="mx-auto max-w-7xl px-5 pb-24 pt-32 sm:px-8">
<div class="rise flex flex-wrap items-end justify-between gap-6">
<div class="max-w-2xl">
<p class="text-sm font-bold uppercase tracking-widest text-accent">Reported problems</p>
<h1 class="mt-3 text-4xl font-extrabold tracking-tight sm:text-5xl">See what is being reported.</h1>
<p class="mt-4 text-lg text-soft">Open any report to follow it from first report to fix. <span class="whitespace-nowrap font-semibold">Sample data.</span></p>
</div>
<a href="report.html" class="btn btn-primary">Report a problem ${ic('arrow')}</a>
</div>

<div class="rise relative z-20 mt-10 flex flex-wrap items-center gap-3" style="animation-delay:.1s">
<label class="relative min-w-[14rem] flex-1 sm:max-w-sm">
<span class="sr-only">Search reports</span>
<span class="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-soft">${ic('search', 'size-5')}</span>
<input id="search" class="input pl-12" type="search" placeholder="Search reports" autocomplete="off">
</label>
<div class="glass flex flex-wrap gap-1 rounded-full p-1" role="group" aria-label="Filter by status" id="status-filter">
${[['all', 'All'], ['reported', 'Reported'], ['progress', 'In progress'], ['cleared', 'Cleared'], ['verified', 'Verified']]
  .map(([v, l], i) => `<button type="button" data-filter="${v}" aria-pressed="${i === 0}" class="rounded-full px-4 py-2 text-sm font-semibold text-soft transition hover:text-ink aria-pressed:bg-accent aria-pressed:text-accent-ink">${l}</button>`)
  .join('')}
</div>
${dd('type', 'Type', ['All types', 'Fly-tipping', 'Litter', 'Pothole', 'Graffiti', 'Abandoned vehicle'])}
${dd('sort', 'Sort', ['Newest', 'Most backed'])}
</div>

<p id="count" class="mt-8 text-sm font-semibold text-soft" aria-live="polite"></p>
<ul id="grid" class="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
${reports.map(card).join('\n')}
</ul>
<div id="empty" hidden class="card mt-6 rounded-3xl p-12 text-center">
<span class="tile-icon mx-auto size-14 rounded-2xl">${ic('search', 'size-6')}</span>
<p class="mt-5 text-xl font-bold">No reports match that</p>
<p class="mt-1 text-soft">Try a different word or clear the filters.</p>
</div>
</main>

<div id="scrim" hidden class="fixed inset-0 z-50 bg-black/55 opacity-0 backdrop-blur-sm transition-opacity duration-300"></div>
<aside id="drawer" role="dialog" aria-modal="true" aria-labelledby="dr-title" aria-hidden="true" class="fixed inset-y-0 right-0 z-[60] flex w-[min(34rem,100vw)] translate-x-full flex-col border-l border-line bg-surface shadow-2xl transition-transform duration-300 ease-out">
<div class="flex items-center justify-between border-b border-line px-6 py-4">
<p class="text-sm font-bold uppercase tracking-widest text-soft" id="dr-type">Report</p>
<button type="button" class="icon-btn" data-close aria-label="Close">${ic('x')}</button>
</div>
<div class="flex-1 overflow-y-auto">
<div class="relative aspect-[16/10] bg-surface2" id="dr-photo"></div>
<div class="space-y-9 px-6 py-7">
<div>
<span class="pill" id="dr-pill">Reported</span>
<h2 class="mt-3 text-2xl font-extrabold leading-tight tracking-tight" id="dr-title">Title</h2>
<p class="mt-2 text-sm text-soft" id="dr-meta"></p>
<div class="mt-5 flex flex-wrap gap-3">
<button type="button" class="btn btn-primary btn-sm" data-back>${ic('eye', 'size-4')}I have seen this too</button>
<button type="button" class="btn btn-ghost btn-sm" disabled>Share</button>
</div>
</div>

<section>
<h3 class="text-base font-bold">Progress</h3>
<ol class="mt-4 space-y-0" id="dr-history"></ol>
</section>

<section>
<h3 class="text-base font-bold">Where</h3>
<div class="placeholder-box map-grid mt-3 grid aspect-[16/9] place-items-center text-center">
<div class="px-6"><span class="mx-auto grid size-11 place-items-center rounded-full bg-surface2 text-soft">${ic('map', 'size-5')}</span><p class="mt-3 font-semibold">Location on a map</p><p class="mt-0.5 text-sm text-soft">The exact spot will be marked here. Coming soon.</p></div>
</div>
</section>

<section>
<h3 class="text-base font-bold">Responsible body</h3>
<div class="placeholder-box mt-3 flex items-center gap-4 p-4">
<span class="grid size-11 shrink-0 place-items-center rounded-full bg-surface2 text-soft">${ic('building', 'size-5')}</span>
<div class="min-w-0 flex-1"><p class="font-semibold">Not shown yet</p><p class="text-sm text-soft">The council or contractor handling this will appear here.</p></div>
</div>
</section>

<section>
<h3 class="text-base font-bold">Updates</h3>
<div class="placeholder-box mt-3 space-y-3 p-5">
<div class="skeleton h-3 w-3/4"></div><div class="skeleton h-3 w-full"></div><div class="skeleton h-3 w-2/3"></div>
<p class="pt-2 text-sm text-soft">Updates from the council or contractor, with photos of the work, will appear here.</p>
</div>
</section>
</div>
</div>
</aside>
<script type="application/json" id="reports-data">${JSON.stringify(reports.map(({ id, title, type, status, label, backers, ago, history, img }) => ({ id, title, type, status, label, backers, ago, history, img: img ? { name: img[0], w: img[3], h: img[4], src: `img/${img[0]}-${img[2]}.webp` } : null })))}</script>` +
  footer

// The font, embedded so the sample works when opened straight from disk.
const font = readFileSync(join(here, 'fonts', 'plus-jakarta-sans-latin-wght-normal.woff2')).toString('base64')
writeFileSync(
  join(here, 'src', 'font.css'),
  `@font-face{font-family:"Plus Jakarta Sans Variable";font-style:normal;font-display:swap;font-weight:200 800;src:url(data:font/woff2;base64,${font}) format("woff2")}
`,
)

writeFileSync(join(here, 'index.html'), index)
writeFileSync(join(here, 'report.html'), report)
writeFileSync(join(here, 'reports.html'), reportsPage)
console.log('built index.html, report.html, reports.html')
