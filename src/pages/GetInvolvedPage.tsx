import { Link } from 'react-router-dom'
import { PageBackdrop } from '../components/site/SiteShell'
import { Icon, type IconName } from '../components/ui/Icon'
import { Reveal } from '../components/ui/Reveal'

const INDIVIDUAL: Array<[IconName, string, string]> = [
  ['camera', 'Report what you see', 'A photo, a type and a place on the map is enough. It takes about a minute, and you do not need an account.'],
  ['eye', 'Back a report instead of duplicating it', 'If someone has already reported the same problem nearby, add your support to theirs rather than sending a second report. It shows how many people are affected.'],
  ['clock', 'Keep an eye on it', 'Open a report any time to see what step it is on, from reported to acknowledged to cleared to verified.'],
  ['shield', 'Go straight to the right people for anything urgent', 'A gas leak, a dangerous structure or a fallen tree blocking a road needs the emergency services or the relevant utility, not a report here.'],
]

const COMMUNITY: Array<[IconName, string, string]> = [
  ['users', 'Organise or join a litter pick', 'Keep Britain Tidy runs the Great British Spring Clean every March, with over 460,000 bags of litter collected by volunteers in 2025. Local groups run picks throughout the year too.'],
  ['building', 'Start or join a residents’ group', 'A group that already knows its own streets is often the fastest way to notice a problem early and press for it to be dealt with.'],
  ['pin', 'Follow an area, not just one report', 'Planned, not built yet: a way to see every open problem within a chosen distance of a place, for residents’ groups and parish councils to use.'],
]

function ActionList({ items }: { items: Array<[IconName, string, string]> }) {
  return (
    <ul className="mt-6 space-y-4">
      {items.map(([icon, title, text]) => (
        <li key={title} className="card flex gap-4 rounded-2xl p-5">
          <span className="tile-icon size-11 shrink-0 rounded-xl">
            <Icon name={icon} className="size-5" />
          </span>
          <div>
            <p className="font-semibold">{title}</p>
            <p className="mt-1 leading-relaxed text-soft">{text}</p>
          </div>
        </li>
      ))}
    </ul>
  )
}

export function GetInvolvedPage() {
  return (
    <>
      <PageBackdrop />
      <main className="mx-auto max-w-3xl px-5 pb-24 pt-32 sm:px-8 sm:pt-40">
        <Reveal>
          <p className="eyebrow">Get involved</p>
          <h1 className="mt-4 text-4xl sm:text-5xl">Things you can do, on your own or with others.</h1>
          <p className="mt-6 text-lg leading-relaxed text-soft">
            Reporting a problem is the first step, not the only one. Some things are quickest to fix alone, and some only get fixed when a few people act together.
          </p>
        </Reveal>

        <Reveal className="mt-14">
          <h2 className="font-serif text-2xl">On your own</h2>
          <ActionList items={INDIVIDUAL} />
        </Reveal>

        <Reveal className="mt-14">
          <h2 className="font-serif text-2xl">With your community</h2>
          <ActionList items={COMMUNITY} />
        </Reveal>

        <Reveal className="mt-14 flex flex-wrap gap-3">
          <Link to="/report" className="btn btn-primary">
            Report a problem <Icon name="arrow" />
          </Link>
          <Link to="/why" className="btn btn-ghost">
            Why this matters
          </Link>
        </Reveal>
      </main>
    </>
  )
}
