import { Link } from 'react-router-dom'
import { PageBackdrop } from '../components/site/SiteShell'
import { Icon, type IconName } from '../components/ui/Icon'
import { Pic } from '../components/ui/Pic'
import { Reveal } from '../components/ui/Reveal'
import { ConceptBanner } from './ConceptBanner'

const ROUTES: Array<[IconName, string, string, string, string]> = [
  ['map', 'Public', 'Works the same as today. A report on public land goes to the council or contractor responsible for it.', '/report', 'See the real reporting form'],
  ['users', 'Community', 'A safe, non-hazardous problem, such as litter, could be claimed and cleared by a registered local group instead of waiting on a council.', '/v2/community', 'See the idea'],
  ['building', 'Commercial', 'On private land, where a council has no duty to clear it, registered waste carriers could quote a price and the landowner picks one.', '/v2/commercial', 'See the idea'],
]

export function V2Landing() {
  return (
    <>
      <PageBackdrop />
      <main className="mx-auto max-w-5xl px-5 pb-24 pt-32 sm:px-8 sm:pt-40">
        <ConceptBanner />
        <Reveal className="max-w-3xl">
          <p className="eyebrow">Concept, not a decision yet</p>
          <h1 className="mt-4 text-4xl sm:text-5xl">A resolution network, not just a reporting form.</h1>
          <p className="mt-6 text-lg leading-relaxed text-soft">
            FixMyStreet already does public reporting well, and Resolve UK's own version does too. The idea on this page is to stop competing on that alone, and add two more ways a problem gets resolved, depending on who is actually responsible for it. Nothing here is built into the real site yet. This exists so you can react to it before anything is.
          </p>
        </Reveal>

        <Reveal className="relative mt-10 overflow-hidden rounded-3xl">
          <Pic name="roadside-litter" widths={[400, 480]} width={480} height={639} alt="Litter scattered along a roadside verge" className="h-48 w-full object-cover sm:h-64" sizes="(min-width:1024px) 960px, 100vw" />
          <figcaption className="absolute inset-0 flex items-end bg-gradient-to-t from-black/70 via-black/10 to-transparent p-6">
            <p className="text-lg font-semibold text-white">This is what already gets reported. The question is what happens to it next.</p>
          </figcaption>
        </Reveal>

        <ul className="mt-10 grid gap-5 sm:grid-cols-3">
          {ROUTES.map(([icon, title, text, href, cta], i) => (
            <Reveal as="li" key={title} delay={i * 70} className="card group relative overflow-hidden rounded-3xl p-7 transition hover:-translate-y-1">
              <span className="absolute -right-2 -top-6 select-none text-[6rem] font-serif font-medium leading-none text-ink/[0.05]">0{i + 1}</span>
              <span className="tile-icon size-12 rounded-2xl">
                <Icon name={icon} className="size-6" />
              </span>
              <h2 className="mt-6 font-serif text-2xl">{title}</h2>
              <p className="mt-2 leading-relaxed text-soft">{text}</p>
              <Link to={href} className="mt-5 inline-flex items-center gap-1.5 font-semibold text-accent hover:underline">
                {cta} <Icon name="arrow" className="size-4" />
              </Link>
            </Reveal>
          ))}
        </ul>

        <Reveal className="mt-14 flex max-w-3xl gap-4 rounded-3xl border border-accent/30 bg-accent/10 p-6">
          <Icon name="shield" className="mt-0.5 size-6 shrink-0 text-accent" />
          <p className="leading-relaxed">
            Two things the commercial route needs before it could actually work: a way for whoever sent in a report to come back and pick a quote (the{' '}
            <Link to="/v2/account" className="font-semibold text-accent hover:underline">
              account idea
            </Link>{' '}
            on this preview), and a registered company able to legally hold the money that changes hands.
          </p>
        </Reveal>
      </main>
    </>
  )
}
