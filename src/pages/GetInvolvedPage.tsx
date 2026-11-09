import { Link } from 'react-router-dom'
import { PageBackdrop } from '../components/site/SiteShell'
import { Icon, type IconName } from '../components/ui/Icon'
import { Reveal } from '../components/ui/Reveal'
import { CornerHover } from '../components/ui/CornerHover'

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
        <CornerHover as="li" key={title} className="card flex gap-4 rounded-2xl p-5">
          <span className="tile-icon size-11 shrink-0 rounded-xl">
            <Icon name={icon} className="size-5" />
          </span>
          <div>
            <p className="font-semibold">{title}</p>
            <p className="mt-1 leading-relaxed text-soft">{text}</p>
          </div>
        </CornerHover>
      ))}
    </ul>
  )
}

export function GetInvolvedPage() {
  return (
    <div className="relative">
      <PageBackdrop />
      <main className="cv grid-texture grid-shimmer mx-auto max-w-7xl px-5 pb-24 pt-32 sm:px-8 sm:pt-40">
        <Reveal className="accent-panel rounded-3xl p-8 sm:p-12">
          <p className="eyebrow">Get involved</p>
          <h1 className="mt-4 max-w-2xl text-4xl sm:text-5xl">Things you can do, on your own or with others.</h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed opacity-90">
            Reporting a problem is the first step, not the only one. Some things are quickest to fix alone, and some only get fixed when a few people act together.
          </p>
        </Reveal>

        <Reveal className="mt-14">
          <h2 className="text-halo font-serif text-2xl">On your own</h2>
          <ActionList items={INDIVIDUAL} />
        </Reveal>

        <Reveal className="mt-14">
          <h2 className="text-halo font-serif text-2xl">With your community</h2>
          {/* A bento grid rather than a third copy of the same row list — the litter-pick entry
              carries the one concrete number here, so it gets the large, emphasised tile; the
              other two sit stacked beside it. CornerHover wraps a plain outer layer rather than
              carrying accent-panel/card itself, so its hover tint never overrides the tile's own
              solid background (see the same pattern on the homepage's "Three ways" section). */}
          <div className="mt-6 grid gap-5 lg:grid-cols-[1.3fr_1fr]">
            <CornerHover className="block">
              <div className="accent-panel hover-lift flex h-full flex-col justify-center rounded-3xl p-8 sm:p-10">
                <span className="tile-icon size-14 rounded-2xl bg-black/10">
                  <Icon name={COMMUNITY[0][0]} className="size-7" />
                </span>
                <h3 className="mt-6 font-serif text-3xl">{COMMUNITY[0][1]}</h3>
                <p className="mt-3 max-w-md leading-relaxed opacity-85">{COMMUNITY[0][2]}</p>
              </div>
            </CornerHover>
            <div className="grid gap-5">
              {COMMUNITY.slice(1).map(([icon, title, text], i) => (
                <CornerHover key={title} className="block">
                  <div className="card hover-lift flex h-full gap-4 rounded-3xl p-6">
                    <span className="tile-icon size-11 shrink-0 rounded-xl">
                      <Icon name={icon} className="size-5" />
                    </span>
                    <div>
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <p className="font-semibold">{title}</p>
                        {i === 1 && <span className="pill pill-reported">Planned</span>}
                      </div>
                      <p className="mt-1 leading-relaxed text-soft">{text}</p>
                    </div>
                  </div>
                </CornerHover>
              ))}
            </div>
          </div>
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
    </div>
  )
}
