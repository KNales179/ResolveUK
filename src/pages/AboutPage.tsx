import { Link } from 'react-router-dom'
import { PageBackdrop } from '../components/site/SiteShell'
import { Reveal } from '../components/ui/Reveal'

const PRINCIPLES: Array<[string, string]> = [
  ['Cleared and verified stay separate', 'A council or contractor saying a job is done is one thing. Someone independent confirming it is another. The site shows both, rather than treating the first as proof.'],
  ['Every step is on record', 'From a report being sent to it being acknowledged, scheduled, cleared and verified, each change is saved with the time it happened and cannot be edited afterwards.'],
  ['No claims ahead of what is built', 'Features that are not working yet are shown as placeholders, not hidden or implied. This is an early prototype, and it says so.'],
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
