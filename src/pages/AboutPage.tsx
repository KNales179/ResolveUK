import { Link } from 'react-router-dom'
import { PageBackdrop } from '../components/site/SiteShell'
import { Reveal } from '../components/ui/Reveal'

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

export function AboutPage() {
  return (
    <>
      <PageBackdrop />
      <main className="mx-auto max-w-3xl px-5 pb-24 pt-32 sm:px-8 sm:pt-40">
        <Reveal>
          <p className="eyebrow">About</p>
          <h1 className="mt-4 text-4xl sm:text-5xl">A plain record of local problems, from reported to fixed.</h1>
          <p className="mt-6 text-lg leading-relaxed text-soft">
            Reporting a problem to a council is often the easy part. What happens afterwards, whether it was picked up, when, and whether it was actually fixed, is usually invisible once the form is submitted. Resolve UK exists to make that part visible: one place to report a problem with a photo and a place on the map, and to follow it through every step a council or contractor takes.
          </p>
          <p className="mt-4">
            <Link to="/why" className="font-semibold text-accent hover:underline">
              Why this matters, with the numbers behind it
            </Link>
          </p>
        </Reveal>

        <Reveal className="mt-14">
          <h2 className="font-serif text-2xl">What it does today</h2>
          <p className="mt-4 leading-relaxed text-soft">
            Anyone can report fly-tipping, potholes, graffiti, abandoned vehicles and damaged street infrastructure, with a photo and a location. Councils, contractors and Resolve reviewers have their own sign-in to claim, acknowledge, schedule and clear reports, and to verify that a cleared report was genuinely fixed. Everyone can see the same public record of what has been reported and where it stands.
          </p>
        </Reveal>

        <Reveal className="mt-14">
          <h2 className="font-serif text-2xl">What it stands for</h2>
          <ul className="mt-6 divide-y divide-line border-y border-line">
            {PRINCIPLES.map(([title, text]) => (
              <li key={title} className="py-5">
                <p className="font-semibold">{title}</p>
                <p className="mt-1.5 leading-relaxed text-soft">{text}</p>
              </li>
            ))}
          </ul>
        </Reveal>

        <Reveal className="mt-14">
          <h2 className="font-serif text-2xl">Questions</h2>

          <div className="mt-6 space-y-8 divide-y divide-line [&>div]:pt-8 [&>div:first-child]:pt-0">
            <div>
              <p className="font-semibold">Is this a council website?</p>
              <p className="mt-1.5 leading-relaxed text-soft">No. Resolve UK is not run by a council. It sends a report to the council or contractor responsible for the area, the same as writing to them yourself would.</p>
            </div>

            <div>
              <p className="font-semibold">Do I need an account to report something?</p>
              <p className="mt-1.5 leading-relaxed text-soft">No. Reporting is open to anyone, with no sign-in. An account is only needed by council and contractor staff, to handle the reports that come in.</p>
            </div>

            <div>
              <p className="font-semibold">What shouldn't I report here?</p>
              <p className="mt-1.5 leading-relaxed text-soft">
                Anything urgent or dangerous, such as a gas leak, a dangerous structure, or a fallen tree blocking a road, should go straight to the emergency services or the relevant utility, not through this site. Anything that isn't a physical problem in a public place, such as noise, a missed bin collection, or a complaint about a council decision, should go directly to the council instead.
              </p>
            </div>

            <div>
              <p className="font-semibold">What can council and contractor staff do?</p>
              <p className="mt-1.5 leading-relaxed text-soft">
                Staff have their own sign-in, separate from the public site. Once a report is claimed for their council or contractor, they can acknowledge it, schedule the work and mark it cleared. A Resolve reviewer then checks a cleared report before it counts as verified. Staff can only act on a report; they cannot change what the public sees was originally reported.
              </p>
              <p className="mt-3">
                <Link to="/staff" className="font-semibold text-accent hover:underline">
                  Staff sign-in
                </Link>
              </p>
            </div>

            <div>
              <p className="font-semibold">Is there an app?</p>
              <p className="mt-1.5 leading-relaxed text-soft">
                Resolve UK is a website rather than something from an app store, but a phone's browser can install it like one. Open the site, then use the browser's "Add to Home Screen" or "Install" option. An icon is added to the home screen, and it opens full-screen from there, the same as any other app. The exact wording differs between phones; here is what it looks like on Android.
              </p>
              <ol className="mt-5 grid grid-cols-2 gap-x-4 gap-y-5 sm:grid-cols-3" aria-label="Steps to install Resolve UK">
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
            </div>
          </div>
        </Reveal>

        <Reveal className="mt-14">
          <h2 className="font-serif text-2xl">Where it stands</h2>
          <p className="mt-4 leading-relaxed text-soft">
            Resolve UK is an early prototype, built in stages and tested with sample data. Report data is hosted in the UK. It is not yet connected to real councils, and nothing on it should be treated as a finished product.
          </p>
          <p className="mt-6">
            <Link to="/report" className="font-semibold text-accent hover:underline">
              Report a problem
            </Link>
          </p>
        </Reveal>
      </main>
    </>
  )
}
