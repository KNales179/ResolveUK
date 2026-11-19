import { Link } from 'react-router-dom'
import { PageBackdrop } from '../components/site/SiteShell'
import { Logo } from '../components/site/Logo'
import { Icon, type IconName } from '../components/ui/Icon'
import { Reveal } from '../components/ui/Reveal'
import { CornerHover } from '../components/ui/CornerHover'
import { LogoMeaning, Mission, PurposeArt, StorySection, Vision } from '../components/about/Story'
import { Devices } from '../components/about/Devices'
import { openInstallDialog } from '../lib/install'

const TODAY_TILES: Array<[IconName, string, string]> = [
  ['camera', 'Report it', 'Anyone can report fly-tipping, potholes, graffiti, abandoned vehicles and damaged street infrastructure, with a photo and a location.'],
  ['user', 'The right people handle it', 'The council or contractor responsible takes it on, schedules it and clears it, or hands a safe job to a checked local group. On private land, licensed clearance companies quote for it.'],
  ['eye', 'Everyone can see it', 'The same public record of what has been reported and where it stands is visible to anyone, not just the people handling it.'],
]

// "Getting it resolved, and quickly": the focus Kay asked the About page to spell out. Written as
// what Resolve UK is built to do, without claiming the parts that are still planned are live.
const RESOLUTION: Array<[IconName, string, string]> = [
  ['rotate', 'Fewer steps between seeing it and fixing it', 'One report reaches the people responsible, with the photo and exact spot they need to act. If the same problem has already been reported, you add your support instead of starting again, so nobody waits on a pile of duplicates.'],
  ['map', 'Public land and private land', 'Not every problem is the council’s to fix. Rubbish on a road goes to the council or its contractor; rubbish on a supermarket car park is the landowner’s. Resolve UK follows the problem to whoever is actually responsible, wherever it is.'],
  ['users', 'With the community', 'Checked local groups take on safe jobs like litter in their own area and show the result with before-and-after photos, and the person who reported it confirms it is really clear. The quickest way to get something cleared is often the people who live next to it.'],
]

const FAQS: Array<[string, string]> = [
  ['Is this a council website?', 'No. Resolve UK is not run by a council. It sends a report to the council or contractor responsible for the area, the same as writing to them yourself would.'],
  ['Do I need an account to report something?', 'No. Anyone can report a problem without signing in. An account is optional: it keeps your reports together and tells you when they move on, and it lets you follow other reports, comment, join a community group, or ask for quotes to clear private land.'],
  ["What shouldn't I report here?", "Anything urgent or dangerous, such as a gas leak, a dangerous structure, or a fallen tree blocking a road, should go straight to the emergency services or the relevant utility, not through this site. Anything that isn't a physical problem in a public place, such as noise, a missed bin collection, or a complaint about a council decision, should go directly to the council instead."],
  ['What can council and contractor staff do?', 'Staff sign in to the same app, where they see the reports for their council or contractor. They take each one on, schedule the work and mark it cleared, post official updates, or offer a safe job to a local group. The person who reported it is then asked to confirm it is really clear. Staff cannot change what was originally reported.'],
  ['Is there an app?', 'Resolve UK is a website, but you can install it like an app on a phone, tablet or computer. It gets its own icon and opens full screen, with nothing to download from an app store. Use the Install button further up this page for the steps on your device.'],
]

export function AboutPage() {
  return (
    <div className="relative">
      <PageBackdrop />
      <main className="cv grid-texture grid-shimmer mx-auto max-w-7xl px-5 pb-24 pt-32 sm:px-8 sm:pt-40">
        <Reveal className="accent-panel grid gap-8 rounded-3xl p-8 sm:p-12 lg:grid-cols-[1.1fr_.9fr] lg:items-center">
          <div>
            <p className="eyebrow">About</p>
            <h1 className="mt-4 text-4xl sm:text-5xl">A plain record of local problems, from reported to fixed.</h1>
          </div>
          <div>
            <p className="leading-relaxed opacity-90">
              Reporting a problem to a council is often the easy part. What happens afterwards, whether it was picked up, when, and whether it was actually fixed, is usually invisible once the form is submitted. Resolve UK exists to make that part visible: one place to report a problem with a photo and a place on the map, and to follow it through every step a council or contractor takes.
            </p>
            <p className="mt-4">
              <Link to="/why" className="font-semibold underline underline-offset-2">
                Why this matters, with the numbers behind it
              </Link>
            </p>
          </div>
        </Reveal>

        {/* ---- Purpose, mission, vision ---- */}
        <div className="mt-6">
          <StorySection id="purpose" label="Our purpose" title="Reporting shouldn't be the end of the story" art={<PurposeArt />}>
            <p>
              Everyone has walked past the same mattress in the same lay-by for weeks. Someone probably reported it. Did they? Did anything happen? Was it actually cleared, or just marked as done? Once a report is sent, the answers usually disappear into an inbox.
            </p>
            <p>
              Resolve UK exists to give every street <strong className="text-ink">one public record</strong> of what has been reported and where it stands, so nobody has to wonder, chase or report the same thing twice.
            </p>
          </StorySection>

        </div>

        <Reveal className="mt-4">
          <Mission />
        </Reveal>

        <Reveal className="mt-10">
          <Vision />
        </Reveal>

        {/* ---- Getting it resolved, and quickly ---- */}
        <Reveal className="mt-10">
          <section id="resolution" className="panel-tint scroll-mt-28 grid gap-10 rounded-3xl p-8 sm:p-12 lg:grid-cols-[.9fr_1.1fr]">
            <div>
              <p className="eyebrow">Our focus</p>
              <h2 className="mt-3 text-3xl sm:text-4xl">Getting it resolved, and quickly</h2>
              <p className="mt-5 leading-relaxed text-soft">
                Plenty of ways already exist to report a problem. What's missing is knowing it actually gets fixed, and how long it takes. That is the part Resolve UK is built around: not collecting reports, but making sure each one reaches the right people and ends in a real fix, as quickly as possible.
              </p>
              <p className="mt-4 leading-relaxed text-soft">
                Every step is timed and shown in public, so a report that has stalled is easy to spot, and so is a place where problems keep coming back.
              </p>
            </div>
            <ul className="space-y-6">
              {RESOLUTION.map(([icon, title, text]) => (
                <li key={title} className="flex gap-4">
                  <span className="tile-icon size-11 shrink-0 rounded-xl">
                    <Icon name={icon} className="size-5" />
                  </span>
                  <div>
                    <h3 className="font-serif text-2xl">{title}</h3>
                    <p className="mt-1.5 leading-relaxed text-soft">{text}</p>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </Reveal>

        <Reveal className="mt-16">
          <h2 className="font-serif text-2xl">What it does today</h2>
          {/* Below `lg` the three tiles are one compact divided list; from `lg` up, a bento grid. */}
          <ul className="panel-tint divide-y divide-line mt-6 overflow-hidden rounded-3xl lg:hidden">
            {TODAY_TILES.map(([icon, title, text]) => (
              <CornerHover as="li" key={title} className="flex items-start gap-3.5 px-5 py-4">
                <span className="tile-icon size-10 shrink-0 rounded-lg">
                  <Icon name={icon} className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{title}</p>
                  <p className="mt-1 text-sm leading-relaxed text-soft">{text}</p>
                </div>
              </CornerHover>
            ))}
          </ul>

          <div className="mt-6 hidden gap-5 lg:grid lg:grid-cols-[1.3fr_1fr_1fr]">
            {TODAY_TILES.map(([icon, title, text], i) => (
              <CornerHover key={title} className="block">
                <div className={`hover-lift flex h-full flex-col rounded-3xl p-7 sm:p-8 ${i === 0 ? 'accent-panel' : 'card'}`}>
                  <span className="tile-icon size-12 rounded-2xl">
                    <Icon name={icon} className="size-6" />
                  </span>
                  <h3 className="mt-5 font-serif text-2xl">{title}</h3>
                  <p className={`mt-2.5 leading-relaxed ${i === 0 ? '' : 'text-soft'}`}>{text}</p>
                </div>
              </CornerHover>
            ))}
          </div>
        </Reveal>

        {/* ---- The meaning behind the logo ---- */}
        <Reveal className="story-glass mt-16">
          <p className="eyebrow">The mark</p>
          <h2 className="mt-3 text-3xl sm:text-4xl">What the logo stands for</h2>
          <p className="mt-3 max-w-2xl leading-relaxed text-soft">Four shapes, one idea. Point at each one to see where it sits in the mark.</p>
          <div className="mt-8">
            <LogoMeaning />
          </div>
        </Reveal>

        {/* ---- On every screen, and the install button ---- */}
        <section id="app" className="mt-20 scroll-mt-28">
          <Reveal className="mx-auto max-w-2xl text-center">
            <p className="eyebrow justify-center">Any device</p>
            <h2 className="mt-3 text-3xl sm:text-4xl">Resolve UK on every screen</h2>
            <p className="mt-3 leading-relaxed text-soft">A laptop at home, a tablet on the sofa, your phone in the lay-by: the same reports and the same record everywhere. Install it and it works like an app.</p>
          </Reveal>
          <div className="mt-12">
            <Devices />
          </div>
          <div className="mt-10 flex flex-col items-center gap-2 text-center">
            <button type="button" className="btn btn-primary px-6 text-base" onClick={openInstallDialog}>
              <Icon name="plus" className="size-4" /> Install Resolve UK
            </button>
            <p className="text-sm text-soft">Free. Its own icon, opens full screen, nothing to download from an app store.</p>
          </div>
        </section>

        {/* ---- Questions ---- */}
        <section className="mx-auto mt-20 max-w-3xl">
          <Reveal className="text-center">
            <p className="eyebrow justify-center">Questions</p>
            <h2 className="mt-3 text-3xl sm:text-4xl">Questions, answered</h2>
          </Reveal>
          <div className="mt-8 space-y-3">
            {FAQS.map(([q, a]) => (
              <details key={q} className="faq card rounded-2xl">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-6 py-5 font-semibold">
                  {q}
                  <Icon name="chevron" className="dd-chevron size-5 shrink-0 text-soft transition-transform" />
                </summary>
                <p className="px-6 pb-6 leading-relaxed text-soft">{a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* ---- Where it stands ---- */}
        <Reveal className="stand-panel mt-20 rounded-3xl px-6 py-12 text-center sm:px-12">
          <Logo className="mx-auto !h-14" />
          <h2 className="mt-4 font-serif text-3xl">Where it stands</h2>
          <p className="mx-auto mt-3 max-w-xl leading-relaxed text-soft">
            Resolve UK is an early prototype, built in stages and tested with sample data. Report data is hosted in the UK. It is not yet connected to real councils, and nothing on it should be treated as a finished product.
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Link to="/report" className="btn btn-primary">
              Report a problem <Icon name="arrow" />
            </Link>
            <button type="button" className="btn btn-ghost" onClick={openInstallDialog}>
              Install the app
            </button>
          </div>
        </Reveal>
      </main>
    </div>
  )
}
