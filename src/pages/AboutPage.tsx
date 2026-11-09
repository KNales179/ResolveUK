import { Link } from 'react-router-dom'
import { PageBackdrop } from '../components/site/SiteShell'
import { Icon, type IconName } from '../components/ui/Icon'
import { Reveal } from '../components/ui/Reveal'
import { CornerHover } from '../components/ui/CornerHover'

const TODAY_TILES: Array<[IconName, string, string]> = [
  ['camera', 'Report it', 'Anyone can report fly-tipping, potholes, graffiti, abandoned vehicles and damaged street infrastructure, with a photo and a location.'],
  ['user', 'Staff handle it', 'Councils, contractors and Resolve reviewers have their own sign-in to claim, acknowledge, schedule and clear reports, and to verify that a cleared report was genuinely fixed.'],
  ['eye', 'Everyone can see it', 'The same public record of what has been reported and where it stands is visible to anyone, not just the people handling it.'],
]

const PRINCIPLES: Array<[string, string]> = [
  ['Cleared and verified stay separate', 'A council or contractor saying a job is done is one thing. Someone independent confirming it is another. The site shows both, rather than treating the first as proof.'],
  ['Every step is on record', 'From a report being sent to it being acknowledged, scheduled, cleared and verified, each change is saved with the time it happened and cannot be edited afterwards.'],
  ['No claims ahead of what is built', 'Features that are not working yet are shown as placeholders, not hidden or implied. This is an early prototype, and it says so.'],
]

const INSTALL_STEPS: Array<[string, string]> = [
  ['step0', 'Open the site. Some browsers offer to install it straight away.'],
  ['step1-marked', "If not, open the browser's own menu."],
  ['step2-marked', 'Choose "Install and create shortcut" (the wording varies by browser).'],
  ['step3-marked', 'Pick "Install".'],
  ['step4-marked', 'Confirm by tapping "Install" again.'],
  ['step5', 'Done. Resolve UK now opens full-screen, the same as any other app.'],
]

const FAQS: Array<[string, string]> = [
  ['Is this a council website?', 'No. Resolve UK is not run by a council. It sends a report to the council or contractor responsible for the area, the same as writing to them yourself would.'],
  ['Do I need an account to report something?', 'No. Reporting is open to anyone, with no sign-in. An account is only needed by council and contractor staff, to handle the reports that come in.'],
  ["What shouldn't I report here?", "Anything urgent or dangerous, such as a gas leak, a dangerous structure, or a fallen tree blocking a road, should go straight to the emergency services or the relevant utility, not through this site. Anything that isn't a physical problem in a public place, such as noise, a missed bin collection, or a complaint about a council decision, should go directly to the council instead."],
  ['What can council and contractor staff do?', 'Staff have their own sign-in, separate from the public site. Once a report is claimed for their council or contractor, they can acknowledge it, schedule the work and mark it cleared. A Resolve reviewer then checks a cleared report before it counts as verified. Staff can only act on a report; they cannot change what the public sees was originally reported.'],
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

        <Reveal className="mt-10">
          <h2 className="font-serif text-2xl">What it does today</h2>
          {/* A bento rather than one dense paragraph: three distinct moments (reporting, staff
              handling it, the public record) as their own tiles, first one emphasised. CornerHover
              wraps a plain outer layer, not accent-panel/card itself, so its hover tint can't
              override the tile's own solid background. */}
          <div className="mt-6 grid gap-5 lg:grid-cols-[1.3fr_1fr_1fr]">
            {TODAY_TILES.map(([icon, title, text], i) => (
              <CornerHover key={title} className="block">
                <div className={`hover-lift flex h-full flex-col rounded-3xl p-7 sm:p-8 ${i === 0 ? 'accent-panel' : 'card'}`}>
                  <span className={`tile-icon size-12 rounded-2xl ${i === 0 ? 'bg-black/10' : ''}`}>
                    <Icon name={icon} className="size-6" />
                  </span>
                  <h3 className="mt-5 font-serif text-2xl">{title}</h3>
                  <p className={`mt-2.5 leading-relaxed ${i === 0 ? 'opacity-85' : 'text-soft'}`}>{text}</p>
                </div>
              </CornerHover>
            ))}
          </div>
        </Reveal>

        <Reveal className="mt-14">
          <h2 className="font-serif text-2xl">What it stands for</h2>
          <ul className="text-halo panel-tint mt-6 divide-y divide-line overflow-hidden rounded-3xl">
            {PRINCIPLES.map(([title, text]) => (
              <CornerHover as="li" key={title} className="block px-5 py-5 sm:px-7">
                <p className="font-semibold">{title}</p>
                <p className="mt-1.5 leading-relaxed text-soft">{text}</p>
              </CornerHover>
            ))}
          </ul>
        </Reveal>

        <Reveal className="mt-14">
          <h2 className="font-serif text-2xl">Questions</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {FAQS.map(([q, a]) => (
              <CornerHover key={q} className="card rounded-2xl p-6">
                <p className="font-semibold">{q}</p>
                <p className="mt-1.5 leading-relaxed text-soft">{a}</p>
              </CornerHover>
            ))}
          </div>
        </Reveal>

        <Reveal className="glass-panel mt-10 rounded-3xl p-8 sm:p-10">
          <h2 className="font-serif text-2xl">Is there an app?</h2>
          <p className="mt-4 max-w-3xl leading-relaxed text-soft">
            Resolve UK is a website rather than something from an app store, but a phone's browser can install it like one. Open the site, then use the browser's "Add to Home Screen" or "Install" option. An icon is added to the home screen, and it opens full-screen from there, the same as any other app. The exact wording differs between phones; here is what it looks like on Android.
          </p>
          <p className="mt-3">
            <Link to="/staff" className="font-semibold text-accent hover:underline">
              Staff sign-in
            </Link>
          </p>
          <ol className="mt-6 grid grid-cols-2 gap-x-4 gap-y-5 sm:grid-cols-3 lg:grid-cols-6" aria-label="Steps to install Resolve UK">
            {INSTALL_STEPS.map(([file, caption], i) => (
              <li key={file}>
                <img src={`/install/${file}.jpg`} alt={caption} loading="lazy" className="aspect-[1080/2460] w-full rounded-xl border border-line object-cover" />
                <p className="mt-2 text-xs leading-snug text-soft">
                  <span className="font-semibold text-ink">{i + 1}. </span>
                  {caption}
                </p>
              </li>
            ))}
          </ol>
        </Reveal>

        <Reveal className="accent-panel mt-10 flex flex-wrap items-center justify-between gap-6 rounded-3xl p-8 sm:p-10">
          <div>
            <h2 className="font-serif text-2xl">Where it stands</h2>
            <p className="mt-3 max-w-xl leading-relaxed opacity-90">
              Resolve UK is an early prototype, built in stages and tested with sample data. Report data is hosted in the UK. It is not yet connected to real councils, and nothing on it should be treated as a finished product.
            </p>
          </div>
          <Link to="/report" className="btn btn-primary shrink-0">
            Report a problem
          </Link>
        </Reveal>
      </main>
    </div>
  )
}
