import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { PageBackdrop } from '../components/site/SiteShell'
import { Icon } from '../components/ui/Icon'
import { Pic } from '../components/ui/Pic'
import { Reveal } from '../components/ui/Reveal'
import { fetchOrgs, type Org } from '../lib/orgs'

const STEPS: Array<[string, string]> = [
  ['A local group registers', 'Neighbours set up a group in the app and draw the area they look after. A Resolve admin checks it before it appears.'],
  ['The council offers safe jobs', 'For a report in that area that is safe for volunteers, like litter, council staff can offer it to the group. The group decides whether to take it on.'],
  ['They clear it, and show it', 'The group posts updates and marks it done with a before-and-after photo. The person who reported it confirms it is clear.'],
]
const DO = ['Litter, bottles and cans', 'Bagged rubbish that is safe to lift', 'Picks with gloves, grabbers and hi-vis']
const DONT = ['Needles, chemicals or asbestos', 'Gas bottles or anything heavy', 'Working alone near a busy road']

// The public page about community groups, built around people and places: photo prints from a
// litter pick scattered beside the intro, the steps as pins along a walking trail, the groups list
// (or an empty outline), what groups do and don't do beside a photo, and a plain band about
// joining. Joining and taking on jobs happen in the app, after signing in.
export function CommunityPage() {
  const [groups, setGroups] = useState<Org[] | null>(null)
  useEffect(() => {
    let alive = true
    void fetchOrgs().then((list) => {
      if (alive) setGroups((list ?? []).filter((o) => o.kind === 'community'))
    })
    return () => {
      alive = false
    }
  }, [])

  return (
    <div className="relative">
      <PageBackdrop />
      <main className="mx-auto max-w-7xl px-5 pb-24 pt-32 sm:px-8 sm:pt-40">
        {/* Hero, beside volunteers out picking */}
        <Reveal className="grid gap-5 lg:grid-cols-[1.25fr_1fr]">
          <div className="accent-panel rounded-3xl p-8 sm:p-12">
            <p className="eyebrow">Community groups</p>
            <h1 className="mt-4 max-w-xl text-4xl sm:text-5xl">Some problems, a local group can just clear.</h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed opacity-90">
              A report that is safe for volunteers, such as litter, stays with the council as normal, but the council can also offer it to a checked local group. If the group takes it on, the report shows who cleared it and how, with photos, instead of waiting in a queue.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/app/community" className="btn btn-ink">
                Find a group near you <Icon name="arrow" className="size-4" />
              </Link>
              <Link to="/app/community/new?kind=community" className="btn btn-ink-ghost">
                Start a group
              </Link>
            </div>
          </div>
<div className="relative min-h-[360px] lg:min-h-0" aria-label="Photos from litter picks">
            <figure className="snap left-0 top-[2%] h-[52%] w-[52%] -rotate-[4deg]">
              <Pic name="litter-picking-cumbria" widths={[400, 640]} width={640} height={427} alt="Volunteers in hi-vis picking litter from a verge" className="h-full" sizes="(min-width: 1024px) 26vw, 60vw" />
              <figcaption>Saturday pick, Cumbria</figcaption>
            </figure>
            <figure className="snap right-0 top-[6%] h-[48%] w-[45%] rotate-[3.5deg]">
              <Pic name="trash-picking" widths={[400, 700]} width={700} height={467} alt="A volunteer with gloves and a grabber filling a bag" className="h-full" sizes="(min-width: 1024px) 20vw, 45vw" />
              <figcaption>Gloves and grabbers</figcaption>
            </figure>
            <figure className="snap bottom-[1%] left-[24%] h-[42%] w-[50%] rotate-[-1.5deg]">
              <Pic name="litter-bottles" widths={[400, 640]} width={640} height={427} alt="Bottles and cans along a footpath, before the pick" className="h-full" sizes="(min-width: 1024px) 20vw, 45vw" />
              <figcaption>Before: the river path</figcaption>
            </figure>
          </div>
        </Reveal>

        {/* How it works: the steps as pins along a walking trail */}
        <Reveal className="panel-neutral mt-14 rounded-3xl p-7 sm:p-10">
          <h2 className="text-3xl">How it works</h2>
          <ol className="relative mt-8 grid gap-8 md:grid-cols-3 md:gap-8">
            <span className="trail-line hidden md:block" aria-hidden="true" />
            {STEPS.map(([title, text], i) => (
              <li key={title} className="relative">
                <span className="trail-pin">
                  <span className="num">{i + 1}</span>
                </span>
                <span className="mt-4 block text-lg font-semibold">{title}</span>
                <span className="mt-1 block leading-relaxed text-soft">{text}</span>
              </li>
            ))}
          </ol>
        </Reveal>

        {/* The groups on Resolve */}
        <Reveal className="mt-14">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <h2 className="text-3xl">Groups on Resolve</h2>
            {groups && groups.length > 0 && (
              <Link to="/app/community" className="font-semibold text-soft hover:text-ink">
                See them on the map →
              </Link>
            )}
          </div>
          {groups === null ? (
            <div className="mt-5 h-32 animate-pulse rounded-3xl bg-[var(--c-field)]" />
          ) : groups.length === 0 ? (
            <div className="panel-dashed mt-5 flex flex-wrap items-center justify-between gap-5 rounded-3xl p-7">
              <div className="max-w-lg">
                <p className="text-lg font-semibold">No groups have registered yet</p>
                <p className="mt-1 text-soft">Already pick litter with your neighbours? Register your group and be the first on the map.</p>
              </div>
              <Link to="/app/community/new?kind=community" className="btn btn-primary">
                Register your group
              </Link>
            </div>
          ) : (
            <ul className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {groups.map((g) => (
                <li key={g.id} className="card rounded-2xl p-5">
                  <p className="text-lg font-semibold">{g.name}</p>
                  <p className="text-sm text-soft">{g.area_label}</p>
                  {g.description && <p className="mt-2 line-clamp-2 leading-relaxed">{g.description}</p>}
                  <p className="mt-2 text-sm text-soft">
                    <span className="num">{g.member_count}</span> {g.member_count === 1 ? 'member' : 'members'}
                    {g.meets && ` · ${g.meets}`}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Reveal>

        {/* What groups do and don't do, beside a photo */}
        <Reveal className="mt-14 grid items-stretch gap-5 lg:grid-cols-[1fr_1.2fr]">
          <figure className="relative min-h-[280px] overflow-hidden rounded-3xl">
            <Pic name="roadside-litter" widths={[400, 480]} width={480} height={320} alt="Litter scattered along a roadside verge" className="absolute inset-0 size-full object-cover" sizes="(min-width: 1024px) 40vw, 100vw" />
            <figcaption className="photo-chip absolute bottom-4 left-4">Verge litter: fine for a group, away from traffic</figcaption>
          </figure>
          <div className="card rounded-3xl p-7 sm:p-9">
            <h2 className="text-3xl">What groups do, and don't do</h2>
            <p className="mt-2 text-soft">Anything unsafe stays with the council or a licensed waste carrier.</p>
            <div className="mt-6 grid gap-6 sm:grid-cols-2">
              <ul className="grid content-start gap-3">
                {DO.map((t) => (
                  <li key={t} className="flex items-start gap-3">
                    <span className="mark-do grid size-7 shrink-0 place-items-center rounded-full">
                      <Icon name="check" className="size-4" />
                    </span>
                    <span className="pt-0.5">{t}</span>
                  </li>
                ))}
              </ul>
              <ul className="grid content-start gap-3">
                {DONT.map((t) => (
                  <li key={t} className="flex items-start gap-3">
                    <span className="mark-dont grid size-7 shrink-0 place-items-center rounded-full">
                      <Icon name="x" className="size-4" />
                    </span>
                    <span className="pt-0.5">{t}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Reveal>

        {/* Joining: a plain band */}
        <Reveal className="page-band mt-14 -mx-5 px-5 py-8 sm:-mx-8 sm:px-8">
          <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center sm:gap-6">
            <span className="tile-icon hidden size-16 shrink-0 rounded-2xl sm:grid"><Icon name="users" className="size-7" /></span>
            <div className="min-w-0 flex-1">
              <h2 className="text-2xl">Joining a group</h2>
              <p className="mt-1 max-w-2xl leading-relaxed text-soft">It takes a free account. You answer a few short questions, confirm you're 18 or over (or have a parent's agreement) and agree to the safety rules, and the group's leads decide. Groups never see your email address.</p>
            </div>
            <Link to="/app/create-account" className="btn btn-primary">
              Create a free account
            </Link>
          </div>
        </Reveal>
      </main>
    </div>
  )
}
