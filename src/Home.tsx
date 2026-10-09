import { Link } from 'react-router-dom'
import { Icon, type IconName } from './components/ui/Icon'
import { Pic } from './components/ui/Pic'
import { Reveal } from './components/ui/Reveal'

const STAGES: Array<[string, string]> = [
  ['Reported', 'A resident sends it in with a photo and a place.'],
  ['Responsible body named', 'The council, contractor or other organisation that looks after it is identified.'],
  ['Acknowledged', 'They confirm they have seen it.'],
  ['Clearance scheduled', 'A date for the work is set.'],
  ['Cleared', 'They say the job is done.'],
  ['Verified', 'Someone independent confirms it is fixed.'],
]

const STEPS: Array<[string, string, string]> = [
  ['1', 'Describe it', 'Choose the type of problem, add a photo and write a line or two about it.'],
  ['2', 'Mark the place', 'The map starts where you are. Drag the pin if it is a little off. If someone has already reported the same thing nearby, you can add your support to theirs.'],
  ['3', 'Follow it', 'Every step is added to the report’s history, from picked up to cleared to verified, with the date and time, whoever ends up resolving it.'],
]

const ROUTES: Array<[IconName, string, string, string, string]> = [
  ['map', 'Public', 'A report on public land goes to the council or contractor responsible for it. This is what already works today.', '/report', 'Report a problem'],
  ['users', 'Community', 'A safe, non-hazardous problem, such as litter, can be claimed and cleared by a registered local group instead of waiting on a council.', '/community', 'See how it would work'],
  ['building', 'Commercial', 'On private land, where a council has no duty to clear it, registered waste carriers can quote a price and the landowner picks one.', '/commercial', 'See how it would work'],
]

const OTHER_TYPES: Array<[string, string]> = [
  ['Potholes', 'Holes and cracks in the road'],
  ['Graffiti', 'On walls, signs and street furniture'],
  ['Abandoned vehicles', 'Left on the street with no sign of an owner'],
  ['Damaged infrastructure', 'Street lights, barriers, bins and benches'],
]

const TODAY = [
  'Reports with a photo, a type and a place on the map',
  'A check for the same problem nearby, before a report is sent',
  'Adding your support to someone else’s report',
  'A public history of every step on each report',
  'Routing a report to any responsible organisation, not just a council',
  'Sign-in for council, contractor and Resolve staff, to handle reports',
  'An optional account, to keep track of the reports you have sent',
  'Report data stored in the UK',
]
const NEXT = [
  'A local group claiming and clearing a safe problem itself',
  'A registered waste carrier quoting to clear private land, and getting chosen',
  'Sending each report to the right organisation automatically',
  'Residents confirming a fix with a photo',
  'A map inside each report, and updates with photos of the work',
  'Suggesting the type of problem from the photo',
  'Public pages comparing how quickly problems get fixed',
]

export default function Home() {
  return (
    <main>
      {/* ---- hero ---- */}
      <section className="relative isolate flex min-h-[100svh] items-center overflow-hidden">
        <div className="hero-bg absolute inset-0 -z-20" role="img" aria-label="A city skyline, bright by day and lit up at night" />
        <div className="hero-veil absolute inset-0 -z-10" />
        <div className="mx-auto grid w-full max-w-7xl items-center gap-14 px-5 pb-20 pt-32 sm:px-8 lg:grid-cols-[1.15fr_.85fr]">
          <div className="rise">
            <p className="eyebrow mb-6">Early prototype</p>
            <h1 className="text-[3.4rem] leading-[1.02] sm:text-7xl lg:text-[5.6rem]">
              See it.
              <br />
              Report it.
              <br />
              <em className="font-medium italic text-accent-display">Resolve it.</em>
            </h1>
            <p className="mt-7 max-w-xl text-lg leading-relaxed text-ink/80 sm:text-xl">
              Fly-tipping in a lay-by, a pothole that catches bike wheels, graffiti that stays for months. Report it in about a minute, then follow it through to whoever actually resolves it: a council, a local group, or a commercial service for private land.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link to="/report" className="btn btn-primary text-base">
                Report a problem <Icon name="arrow" />
              </Link>
              <Link to="/reports" className="btn btn-ghost text-base">
                See reported problems
              </Link>
            </div>
          </div>

          <div className="rise relative mx-auto w-full max-w-md lg:ml-auto" style={{ animationDelay: '.2s' }}>
            <div className="card relative rounded-2xl p-4 shadow-xl">
              <span className="absolute -top-3 right-5 rounded-md bg-ink px-2.5 py-1 text-[0.65rem] font-semibold uppercase tracking-widest text-bg">Sample</span>
              <div className="flex gap-3.5">
                <Pic name="rubbish-street" widths={[400]} width={400} height={267} alt="Rubbish bags piled on a residential street" className="size-24 shrink-0 rounded-xl object-cover" sizes="96px" eager />
                <div className="min-w-0">
                  <span className="pill pill-progress">Acknowledged</span>
                  <h3 className="mt-2 text-base font-semibold leading-snug">Rubbish bags piled on a residential street</h3>
                  <p className="mt-1 text-xs text-soft">Reported 2 hours ago</p>
                </div>
              </div>
              <ol className="mt-5 grid grid-cols-4 gap-1.5 text-[0.65rem] font-medium text-soft" aria-label="Progress">
                {['Reported', 'Acknowledged', 'Cleared', 'Verified'].map((s, i) => (
                  <li key={s} className="text-center">
                    <span className={`mb-1.5 block h-1 rounded-full ${i < 2 ? 'bg-accent' : 'bg-line'}`} />
                    {s}
                  </li>
                ))}
              </ol>
              <div className="mt-4 flex items-center justify-between border-t border-line pt-4">
                <p className="text-sm font-medium">12 people back this</p>
                <span className="btn btn-ghost btn-sm">I have seen this too</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---- how it works ---- */}
      <section id="how" className="cv mx-auto max-w-7xl scroll-mt-24 px-5 py-24 sm:px-8 sm:py-32">
        <div className="grid gap-12 lg:grid-cols-[.8fr_1.2fr] lg:gap-20">
          <Reveal>
            <p className="eyebrow">How it works</p>
            <h2 className="mt-4 text-4xl leading-[1.1] sm:text-5xl">Report it in a minute, then follow it.</h2>
            <p className="mt-5 max-w-md text-lg leading-relaxed text-soft">Each report has a public history. Whoever takes it on, whether that is a council, a contractor or another organisation, adds to that history as it moves towards fixed.</p>
          </Reveal>
          <ol className="divide-y divide-line border-y border-line">
            {STEPS.map(([n, title, text], i) => (
              <Reveal as="li" key={n} delay={i * 70} className="grid grid-cols-[3rem_1fr] gap-4 py-7 sm:grid-cols-[4rem_1fr]">
                <span className="font-serif text-4xl leading-none text-accent sm:text-5xl">{n}</span>
                <div>
                  <h3 className="text-xl font-semibold">{title}</h3>
                  <p className="mt-2 leading-relaxed text-soft">{text}</p>
                </div>
              </Reveal>
            ))}
          </ol>
        </div>
      </section>

      {/* ---- three ways a problem gets resolved ---- */}
      <section className="cv border-y border-line bg-surface2/50">
        <div className="mx-auto max-w-7xl px-5 py-24 sm:px-8 sm:py-32">
          <Reveal className="max-w-2xl">
            <p className="eyebrow">Not just a reporting form</p>
            <h2 className="mt-4 text-4xl leading-[1.1] sm:text-5xl">Three ways a problem gets resolved.</h2>
            <p className="mt-5 text-lg leading-relaxed text-soft">Who should act on a report depends on who is actually responsible for the place it happened. Resolve UK is built around that, not just around one route to a council.</p>
          </Reveal>

          <ul className="mt-14 grid gap-5 sm:grid-cols-3">
            {ROUTES.map(([icon, title, text, href, cta], i) => (
              <Reveal as="li" key={title} delay={i * 70} className="card group relative overflow-hidden rounded-3xl p-7 transition hover:-translate-y-1">
                <span className="absolute -right-2 -top-6 select-none text-[6rem] font-serif font-medium leading-none text-ink/[0.05]">0{i + 1}</span>
                <span className="tile-icon size-12 rounded-2xl">
                  <Icon name={icon} className="size-6" />
                </span>
                <h3 className="mt-6 font-serif text-2xl">{title}</h3>
                <p className="mt-2 leading-relaxed text-soft">{text}</p>
                <Link to={href} className="mt-5 inline-flex items-center gap-1.5 font-semibold text-accent hover:underline">
                  {cta} <Icon name="arrow" className="size-4" />
                </Link>
              </Reveal>
            ))}
          </ul>

          <Reveal className="mt-10 flex max-w-3xl gap-4 rounded-3xl border border-accent/30 bg-accent/10 p-6">
            <Icon name="shield" className="mt-0.5 size-6 shrink-0 text-accent" />
            <p className="leading-relaxed">
              Public routing already works. Community and commercial routing are not built yet; the pages above show what they would look like. Reporting itself does not change either way, and stays open to anyone with no account needed.
            </p>
          </Reveal>
        </div>
      </section>

      {/* ---- what people report ---- */}
      <section className="cv mx-auto max-w-7xl px-5 py-24 sm:px-8 sm:py-32">
        <Reveal className="max-w-2xl">
          <p className="eyebrow">What you can report</p>
          <h2 className="mt-4 text-4xl leading-[1.1] sm:text-5xl">The everyday problems that wear a place down.</h2>
        </Reveal>
        <div className="mt-12 grid gap-4 md:grid-cols-3 md:grid-rows-2">
          <Reveal as="figure" className="group relative min-h-[20rem] overflow-hidden rounded-2xl md:col-span-2 md:row-span-2">
            <Pic name="rubbish-street" widths={[400, 678]} width={678} height={452} alt="Piles of black rubbish bags on a residential street" className="absolute inset-0 size-full object-cover transition duration-700 group-hover:scale-105" sizes="(min-width:768px) 66vw, 100vw" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
            <figcaption className="absolute bottom-0 p-6 text-white">
              <p className="font-serif text-3xl">Fly-tipping and dumped waste</p>
              <p className="mt-1 max-w-md text-sm text-white/80">Rubbish left on pavements and in lay-bys, and bags piled beside bins.</p>
            </figcaption>
          </Reveal>
          <Reveal as="figure" className="group relative min-h-[12rem] overflow-hidden rounded-2xl">
            <Pic name="litter-bottles" widths={[400, 640]} width={640} height={427} alt="Bottles and cans on the kerb next to rubbish bags" className="absolute inset-0 size-full object-cover transition duration-700 group-hover:scale-105" sizes="(min-width:768px) 33vw, 100vw" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/5 to-transparent" />
            <figcaption className="absolute bottom-0 p-5 text-white">
              <p className="font-serif text-2xl">Litter</p>
            </figcaption>
          </Reveal>
          <Reveal as="figure" className="group relative min-h-[12rem] overflow-hidden rounded-2xl">
            <Pic name="roadside-litter" widths={[400, 480]} width={480} height={639} alt="Litter scattered along a roadside verge" className="absolute inset-0 size-full object-cover transition duration-700 group-hover:scale-105" sizes="(min-width:768px) 33vw, 100vw" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/5 to-transparent" />
            <figcaption className="absolute bottom-0 p-5 text-white">
              <p className="font-serif text-2xl">Roadside litter</p>
            </figcaption>
          </Reveal>
        </div>
        <ul className="mt-10 grid grid-cols-1 gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-4">
          {OTHER_TYPES.map(([title, text]) => (
            <Reveal as="li" key={title} className="border-t border-line pt-4">
              <p className="font-semibold">{title}</p>
              <p className="mt-1 text-sm leading-relaxed text-soft">{text}</p>
            </Reveal>
          ))}
        </ul>
      </section>

      {/* ---- the journey ---- */}
      <section className="cv border-y border-line bg-surface2/50">
        <div className="mx-auto max-w-7xl px-5 py-24 sm:px-8 sm:py-32">
          <Reveal className="max-w-2xl">
            <p className="eyebrow">What happens to a report</p>
            <h2 className="mt-4 text-4xl leading-[1.1] sm:text-5xl">From reported to fixed, one step at a time.</h2>
          </Reveal>
          <ol className="mt-14 grid gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-6">
            {STAGES.map(([title, text], n) => (
              <Reveal as="li" key={title} delay={n * 50} className="border-t border-ink/30 pt-4">
                <p className="font-serif text-2xl text-accent">{n + 1}</p>
                <h3 className="mt-2 text-base font-semibold leading-snug">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-soft">{text}</p>
              </Reveal>
            ))}
          </ol>
          <Reveal className="mt-14 max-w-3xl border-l-2 border-accent pl-6">
            <p className="text-lg leading-relaxed">
              <b className="font-semibold">Cleared and verified mean different things.</b> Cleared is the responsible body saying the work is done. Verified is someone else confirming it. The site shows both, so you can see the difference.
            </p>
          </Reveal>
        </div>
      </section>

      {/* ---- where the project is ---- */}
      <section className="cv mx-auto max-w-7xl px-5 py-24 sm:px-8 sm:py-32">
        <Reveal className="max-w-2xl">
          <p className="eyebrow">Where it stands</p>
          <h2 className="mt-4 text-4xl leading-[1.1] sm:text-5xl">An early prototype, built in stages.</h2>
          <p className="mt-5 text-lg leading-relaxed text-soft">Some of this works now. The rest is planned and is not available yet.</p>
        </Reveal>
        <div className="mt-12 grid gap-12 md:grid-cols-2 md:gap-16">
          {(
            [
              ['Working now', TODAY],
              ['Planned', NEXT],
            ] as Array<[string, string[]]>
          ).map(([title, items]) => (
            <Reveal key={title}>
              <h3 className="font-serif text-2xl">{title}</h3>
              <ul className="mt-4 divide-y divide-line border-y border-line">
                {items.map((x) => (
                  <li key={x} className="py-3.5 leading-relaxed text-soft">
                    {x}
                  </li>
                ))}
              </ul>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ---- closing call to action ---- */}
      <section className="cv px-3 pb-24 sm:px-6">
        <div className="relative isolate mx-auto max-w-7xl overflow-hidden rounded-2xl">
          <div className="cta-bg absolute inset-0 -z-20" role="img" aria-label="A city at sunrise or dusk" />
          <div className="absolute inset-0 -z-10 bg-gradient-to-r from-bg/95 via-bg/70 to-bg/10" />
          <div className="px-7 py-20 sm:px-14 sm:py-28">
            <h2 className="max-w-xl text-4xl leading-[1.08] sm:text-6xl">Seen something that needs fixing?</h2>
            <p className="mt-4 max-w-md text-lg text-soft">Reporting takes about a minute.</p>
            <Link to="/report" className="btn btn-primary mt-8 text-base">
              Report a problem <Icon name="arrow" />
            </Link>
          </div>
        </div>
      </section>
    </main>
  )
}
