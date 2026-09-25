import { Link } from 'react-router-dom'
import { Icon, type IconName } from './components/ui/Icon'
import { Pic } from './components/ui/Pic'
import { Reveal } from './components/ui/Reveal'

const STAGES: Array<[IconName, string, string]> = [
  ['camera', 'Reported', 'A resident sends it in with a photo and a pin.'],
  ['building', 'Responsible body identified', 'A council or contractor takes it on.'],
  ['eye', 'Acknowledged', 'They confirm they have seen it.'],
  ['clock', 'Clearance scheduled', 'A date for the work is set.'],
  ['check', 'Cleared', 'They say the job is done.'],
  ['shield', 'Outcome verified', 'Independent people confirm it is really fixed.'],
]

const STEPS: Array<[IconName, string, string, string]> = [
  ['camera', '01', 'Snap it', 'Choose the type of problem, add a photo and a short note. It takes about a minute.'],
  ['pin', '02', 'Pin it', 'Use your phone’s location or drop a pin. If it is already reported nearby, add your support instead of a duplicate.'],
  ['clock', '03', 'Follow it', 'Every step is written to the report’s history, from “picked up” to “cleared” to “verified”.'],
]

const OTHER_TYPES: Array<[IconName, string, string]> = [
  ['road', 'Potholes', 'Damaged or broken roads'],
  ['spray', 'Graffiti', 'Vandalism on walls and signs'],
  ['car', 'Abandoned vehicles', 'Cars left to rot'],
  ['lamp', 'Damaged infrastructure', 'Lamps, barriers, bins and benches'],
]

const TODAY = ['Reporting with a photo and a location', '“Is this the same problem?” check', 'Backing someone else’s report', 'A full history for every report', 'Sign-in for council and contractor staff']
const NEXT = ['Sending each report to the right council', 'Residents confirming a fix with a photo', 'Help sorting reports from the photo', 'Public pages comparing how quickly problems get fixed', 'Storing report data in the UK']

function Eyebrow({ children }: { children: string }) {
  return <p className="text-sm font-bold uppercase tracking-widest text-accent">{children}</p>
}

export default function Home() {
  return (
    <main>
      {/* ---- hero ---- */}
      <section className="relative isolate flex min-h-[100svh] items-center overflow-hidden">
        <div className="hero-bg absolute inset-0 -z-20" role="img" aria-label="A city skyline, bright by day and lit up at night" />
        <div className="hero-veil absolute inset-0 -z-10" />
        <div className="mx-auto grid w-full max-w-7xl items-center gap-12 px-5 pb-20 pt-32 sm:px-8 lg:grid-cols-[1.1fr_.9fr]">
          <div className="rise">
            <p className="glass mb-6 inline-flex items-center gap-2.5 rounded-full px-4 py-1.5 text-xs font-bold tracking-widest">
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-full rounded-full bg-accent opacity-70" style={{ animation: 'pulse-ring 1.8s ease-out infinite' }} />
                <span className="relative inline-flex size-2 rounded-full bg-accent" />
              </span>
              EARLY PROTOTYPE · FREE FOR CITIZENS
            </p>
            <h1 className="text-[3.2rem] font-extrabold leading-[1] tracking-[-0.04em] sm:text-7xl lg:text-[5.4rem]">
              See it.
              <br />
              Report it.
              <br />
              <span className="bg-gradient-to-r from-accent to-sky-400 bg-clip-text text-transparent">Resolve it.</span>
            </h1>
            <p className="mt-7 max-w-xl text-lg leading-relaxed text-soft sm:text-xl">
              Fly-tipping in the lay-by. A pothole that swallows bikes. Graffiti that never goes. Report it in a minute, then follow it step by step until it is really gone.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link to="/report" className="btn btn-primary text-base">
                Report a problem <Icon name="arrow" />
              </Link>
              <Link to="/reports" className="btn btn-ghost text-base">
                See reported problems
              </Link>
            </div>
            <ul className="mt-10 flex flex-wrap gap-2.5 text-sm font-semibold">
              {(
                [
                  ['camera', 'Photo and pin'],
                  ['clock', 'Every step on record'],
                  ['shield', 'Fixes checked, not just claimed'],
                ] as Array<[IconName, string]>
              ).map(([icon, text]) => (
                <li key={text} className="glass inline-flex items-center gap-2 rounded-full px-3.5 py-2">
                  <Icon name={icon} className="size-4 text-accent" />
                  {text}
                </li>
              ))}
            </ul>
          </div>

          <div className="rise relative mx-auto w-full max-w-md lg:ml-auto" style={{ animationDelay: '.2s' }}>
            <div className="floaty glass relative rounded-[1.75rem] p-4 shadow-2xl">
              <span className="absolute -top-3 right-5 rounded-full bg-ink px-3 py-1 text-[0.65rem] font-bold uppercase tracking-widest text-bg">Sample</span>
              <div className="flex gap-3.5">
                <Pic name="rubbish-street" widths={[400]} width={400} height={267} alt="Rubbish bags piled on a residential street" className="size-24 shrink-0 rounded-2xl object-cover" sizes="96px" eager />
                <div className="min-w-0">
                  <span className="pill pill-progress">Acknowledged</span>
                  <h3 className="mt-2 text-base font-bold leading-snug">Rubbish bags piled on a residential street</h3>
                  <p className="mt-1 text-xs text-soft">Reported 2 hours ago</p>
                </div>
              </div>
              <ol className="mt-5 grid grid-cols-4 gap-1.5 text-[0.65rem] font-semibold text-soft" aria-label="Progress">
                {['Reported', 'Picked up', 'Cleared', 'Verified'].map((s, i) => (
                  <li key={s} className="text-center">
                    <span className={`mb-1.5 block h-1.5 rounded-full ${i < 2 ? 'bg-accent' : 'bg-line'}`} />
                    {s}
                  </li>
                ))}
              </ol>
              <div className="mt-4 flex items-center justify-between border-t border-line pt-4">
                <p className="flex items-center gap-2 text-sm font-semibold">
                  <Icon name="users" className="size-4 text-accent" />
                  12 people back this
                </p>
                <span className="btn btn-ghost btn-sm">
                  <Icon name="eye" className="size-4" />I have seen this too
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---- how it works ---- */}
      <section id="how" className="cv mx-auto max-w-7xl scroll-mt-24 px-5 py-24 sm:px-8">
        <Reveal className="max-w-2xl">
          <Eyebrow>How it works</Eyebrow>
          <h2 className="mt-3 text-4xl font-extrabold tracking-tight sm:text-5xl">Three steps. Every one on record.</h2>
          <p className="mt-4 text-lg text-soft">Reporting is the easy part. The hard part is knowing what happens next. Here it is written down where everyone can see it.</p>
        </Reveal>
        <ol className="mt-14 grid gap-5 md:grid-cols-3">
          {STEPS.map(([icon, n, title, text], i) => (
            <Reveal as="li" key={n} delay={i * 70} className="card group relative overflow-hidden rounded-3xl p-7 transition hover:-translate-y-1">
              <span className="absolute -right-2 -top-6 select-none text-[7rem] font-extrabold leading-none tracking-tighter text-ink/[0.05]">{n}</span>
              <span className="tile-icon size-12 rounded-2xl">
                <Icon name={icon} className="size-6" />
              </span>
              <h3 className="mt-6 text-2xl font-bold tracking-tight">{title}</h3>
              <p className="mt-2 leading-relaxed text-soft">{text}</p>
            </Reveal>
          ))}
        </ol>
      </section>

      {/* ---- what people report ---- */}
      <section className="cv mx-auto max-w-7xl px-5 pb-24 sm:px-8">
        <Reveal className="max-w-2xl">
          <Eyebrow>What people report</Eyebrow>
          <h2 className="mt-3 text-4xl font-extrabold tracking-tight sm:text-5xl">The everyday things that wear a place down.</h2>
        </Reveal>
        <div className="mt-12 grid gap-4 md:grid-cols-3 md:grid-rows-2">
          <Reveal as="figure" className="group relative min-h-[20rem] overflow-hidden rounded-3xl md:col-span-2 md:row-span-2">
            <Pic name="rubbish-street" widths={[400, 678]} width={678} height={452} alt="Piles of black rubbish bags on a residential street" className="absolute inset-0 size-full object-cover transition duration-700 group-hover:scale-105" sizes="(min-width:768px) 66vw, 100vw" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
            <figcaption className="absolute bottom-0 p-6 text-white">
              <p className="text-2xl font-bold">Fly-tipping and bagged waste</p>
              <p className="mt-1 max-w-md text-sm text-white/80">Dumped rubbish, overflowing bins and bags left on the pavement.</p>
            </figcaption>
          </Reveal>
          <Reveal as="figure" className="group relative min-h-[12rem] overflow-hidden rounded-3xl">
            <Pic name="litter-bottles" widths={[400, 640]} width={640} height={427} alt="Bottles and cans on the kerb next to rubbish bags" className="absolute inset-0 size-full object-cover transition duration-700 group-hover:scale-105" sizes="(min-width:768px) 33vw, 100vw" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/5 to-transparent" />
            <figcaption className="absolute bottom-0 p-5 text-white">
              <p className="text-lg font-bold">Litter</p>
            </figcaption>
          </Reveal>
          <Reveal as="figure" className="group relative min-h-[12rem] overflow-hidden rounded-3xl">
            <Pic name="roadside-litter" widths={[400, 480]} width={480} height={639} alt="Litter scattered along a roadside verge" className="absolute inset-0 size-full object-cover transition duration-700 group-hover:scale-105" sizes="(min-width:768px) 33vw, 100vw" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/5 to-transparent" />
            <figcaption className="absolute bottom-0 p-5 text-white">
              <p className="text-lg font-bold">Roadside mess</p>
            </figcaption>
          </Reveal>
        </div>
        <ul className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {OTHER_TYPES.map(([icon, title, text]) => (
            <Reveal as="li" key={title} className="card flex items-start gap-4 rounded-3xl p-5 transition hover:-translate-y-0.5">
              <span className="tile-icon shrink-0">
                <Icon name={icon} />
              </span>
              <div>
                <p className="font-bold">{title}</p>
                <p className="mt-0.5 text-sm text-soft">{text}</p>
              </div>
            </Reveal>
          ))}
        </ul>
      </section>

      {/* ---- the journey ---- */}
      <section className="cv border-y border-line bg-surface2/50">
        <div className="mx-auto max-w-7xl px-5 py-24 sm:px-8">
          <Reveal className="max-w-2xl">
            <Eyebrow>The journey of a report</Eyebrow>
            <h2 className="mt-3 text-4xl font-extrabold tracking-tight sm:text-5xl">From “reported” to “really fixed”.</h2>
          </Reveal>
          <ol className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
            {STAGES.map(([icon, title, text], n) => (
              <Reveal as="li" key={title} delay={n * 50} className="card relative rounded-3xl p-5">
                <span className="tile-icon">
                  <Icon name={icon} />
                </span>
                <p className="mt-4 text-xs font-bold text-accent">STEP {n + 1}</p>
                <h3 className="mt-1 text-base font-bold leading-snug">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-soft">{text}</p>
              </Reveal>
            ))}
          </ol>
          <Reveal className="mt-8 flex gap-4 rounded-3xl border border-accent/30 bg-accent/10 p-6">
            <Icon name="shield" className="mt-0.5 size-6 shrink-0 text-accent" />
            <p className="leading-relaxed">
              <b>“Cleared” and “verified” are not the same thing.</b> A council saying a job is done is its own word. A fix only counts as verified once it has been independently checked. Keeping the two apart is what makes the results trustworthy.
            </p>
          </Reveal>
        </div>
      </section>

      {/* ---- where the project is ---- */}
      <section className="cv mx-auto max-w-7xl px-5 py-24 sm:px-8">
        <Reveal className="max-w-2xl">
          <Eyebrow>Where the project is</Eyebrow>
          <h2 className="mt-3 text-4xl font-extrabold tracking-tight sm:text-5xl">An early prototype, built step by step.</h2>
        </Reveal>
        <div className="mt-12 grid gap-5 md:grid-cols-2">
          {(
            [
              ['Working today', 'check', TODAY, 'text-accent'],
              ['Coming next', 'clock', NEXT, 'text-soft'],
            ] as Array<[string, IconName, string[], string]>
          ).map(([title, icon, items, tone]) => (
            <Reveal key={title} className="card rounded-3xl p-7">
              <h3 className="flex items-center gap-2.5 text-xl font-bold">
                <Icon name={icon} className={`size-6 ${tone}`} />
                {title}
              </h3>
              <ul className="mt-5 space-y-3 text-soft">
                {items.map((x) => (
                  <li key={x} className="flex gap-3">
                    <Icon name={icon} className={`mt-1 size-4 shrink-0 ${tone}`} />
                    <span>{x}</span>
                  </li>
                ))}
              </ul>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ---- closing call to action ---- */}
      <section className="cv px-3 pb-24 sm:px-6">
        <div className="relative isolate mx-auto max-w-7xl overflow-hidden rounded-[2rem]">
          <div className="cta-bg absolute inset-0 -z-20" role="img" aria-label="A city at sunrise or dusk" />
          <div className="absolute inset-0 -z-10 bg-gradient-to-r from-bg/95 via-bg/70 to-bg/10" />
          <div className="px-7 py-20 sm:px-14 sm:py-28">
            <h2 className="max-w-xl text-4xl font-extrabold tracking-tight sm:text-6xl">Spotted something? It takes a minute.</h2>
            <p className="mt-4 max-w-md text-lg text-soft">Help keep your area clean, and see what happens next.</p>
            <Link to="/report" className="btn btn-primary mt-8 text-base">
              Report a problem <Icon name="arrow" />
            </Link>
          </div>
        </div>
      </section>
    </main>
  )
}
