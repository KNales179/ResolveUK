import { Link } from 'react-router-dom'
import { PageBackdrop } from '../components/site/SiteShell'
import { Icon, type IconName } from '../components/ui/Icon'
import { Reveal } from '../components/ui/Reveal'
import { CornerHover } from '../components/ui/CornerHover'

const STATS: Array<[IconName, string, string, string, string, string]> = [
  ['trash', 'Fly-tipping', '1.26 million', 'incidents dealt with by English councils in 2024/25, up 9% on the year before. Over a third happened on pavements and roads.', 'DEFRA, official statistics, 2025', 'https://www.gov.uk/government/statistics/fly-tipping-statistics-for-england/fly-tipping-statistics-for-england-2024-to-2025'],
  ['road', 'Potholes', '91% more claims', 'in pothole compensation claims to councils between 2021 and 2024. Only 26% were ever paid out, at an average of £390 each.', 'RAC, reporting council FOI data, 2024', 'https://www.hellorayo.co.uk/clyde/uk/news/pothole-compensation-rises-hugely-while-some-authorities-turn-down-99percent-of-claims'],
  ['layers', 'Litter', '9 in 10 places', 'checked by Keep Britain Tidy had litter in them, and 77% of people think the problem has got worse.', 'Keep Britain Tidy, national survey', 'https://www.irishnews.com/news/uk/litter-found-in-90-of-surveyed-spots-as-campaigners-call-for-national-strategy-BHIPETWEEFLCFNTDWN57Q4FOIM/'],
  ['car', 'Abandoned vehicles', 'Almost 100,000', 'vehicles reported abandoned across the UK in 2024, up 18% on 2023. Only around 1 in 5 are ever reclaimed.', 'Direct Line Group, 2025', 'https://www.directlinegroup.co.uk/en/news/brand-news/2025/17112025.html'],
]

const HEADLINES: Array<[string, string, string]> = [
  ['"Fly-tipping cases up almost 10% across England"', 'Bauer Radio News, 2025', 'https://www.hellorayo.co.uk/hits-radio/uk/news/fly-tipping-cases-up-almost-10percent'],
  ['"‘Pothole scourge’ on local roads revealed in new figures"', 'Express & Star, 2024', 'https://www.expressandstar.com/uk-news/pothole-scourge-on-local-roads-revealed-in-new-figures-5742778'],
  ['"More than 26.8 million UK adults, nearly half, admit to littering"', 'Keep Britain Tidy, 2024', 'https://keepbritaintidy.org/about-us/news-and-media/more-268-million-uk-adults-nearly-half-admit-littering-0'],
  ['"New figures reveal 18% rise in abandoned vehicles"', 'Bodyshop Magazine, 2025', 'https://www.bodyshopmag.com/?p=54137'],
]

export function WhyPage() {
  return (
    <div className="relative">
      <PageBackdrop />
      <main className="cv grid-texture grid-shimmer mx-auto max-w-7xl px-5 pb-24 pt-32 sm:px-8 sm:pt-40">
        <Reveal className="accent-panel rounded-3xl p-8 sm:p-12">
          <p className="eyebrow">Why Resolve UK exists</p>
          <h1 className="mt-4 max-w-2xl text-4xl sm:text-5xl">Reported isn't the same as fixed.</h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed opacity-90">
            Fly-tipping, potholes, litter and abandoned vehicles aren't rare. They're some of the most reported problems in the country, and some of the hardest to see through to the end. Resolve UK exists to close that gap: not just to collect a report, but to show what happened to it.
          </p>
        </Reveal>

        <Reveal className="mt-14">
          <h2 className="font-serif text-2xl">The scale of it</h2>
          {/* A bento rather than four equal cards: fly-tipping carries the headline number (and is
              the site's main use case), so it gets one large tile on top; the other three stay
              smaller underneath. CornerHover wraps a plain outer layer here, not accent-panel/card
              itself, so its hover tint can't override the tile's own solid background. */}
          <div className="mt-6 grid gap-4">
            <CornerHover className="block">
              <div className="accent-panel hover-lift grid gap-5 rounded-3xl p-7 sm:p-9 lg:grid-cols-[auto_1fr] lg:items-center">
                <span className="tile-icon size-16 shrink-0 rounded-2xl bg-black/10">
                  <Icon name={STATS[0][0]} className="size-8" />
                </span>
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest opacity-75">{STATS[0][1]}</p>
                  <p className="mt-1 font-serif text-5xl">{STATS[0][2]}</p>
                  <p className="mt-2 max-w-2xl leading-relaxed opacity-85">{STATS[0][3]}</p>
                  <a href={STATS[0][5]} target="_blank" rel="noreferrer" className="mt-3 inline-block text-xs font-semibold hover:underline">
                    {STATS[0][4]} ↗
                  </a>
                </div>
              </div>
            </CornerHover>
            {/* Three more full cards stacking below the featured one is clutter at phone width,
                so below `sm` they collapse into one compact divided list instead. */}
            <ul className="panel-tint divide-y divide-line overflow-hidden rounded-3xl sm:hidden">
              {STATS.slice(1).map(([icon, title, stat, detail, source, url]) => (
                <CornerHover as="li" key={title} className="flex items-start gap-3.5 px-5 py-4">
                  <span className="tile-icon size-10 shrink-0 rounded-lg">
                    <Icon name={icon} className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold uppercase tracking-widest text-soft">{title}</p>
                    <p className="font-serif text-2xl">{stat}</p>
                    <p className="mt-1 text-sm leading-relaxed text-soft">{detail}</p>
                    <a href={url} target="_blank" rel="noreferrer" className="mt-1.5 inline-block text-xs font-semibold text-accent hover:underline">
                      {source} ↗
                    </a>
                  </div>
                </CornerHover>
              ))}
            </ul>
            <div className="hidden gap-4 sm:grid sm:grid-cols-3">
              {STATS.slice(1).map(([icon, title, stat, detail, source, url]) => (
                <CornerHover key={title} className="block">
                  <div className="card hover-lift h-full rounded-2xl p-6">
                    <span className="tile-icon size-11 rounded-xl">
                      <Icon name={icon} className="size-5" />
                    </span>
                    <p className="mt-4 text-xs font-bold uppercase tracking-widest text-soft">{title}</p>
                    <p className="mt-1 font-serif text-3xl">{stat}</p>
                    <p className="mt-2 leading-relaxed text-soft">{detail}</p>
                    <a href={url} target="_blank" rel="noreferrer" className="mt-3 inline-block text-xs font-semibold text-accent hover:underline">
                      {source} ↗
                    </a>
                  </div>
                </CornerHover>
              ))}
            </div>
          </div>
        </Reveal>

        <Reveal className="mt-14">
          <h2 className="font-serif text-2xl">In the news</h2>
          <ul className="text-halo panel-tint mt-6 divide-y divide-line overflow-hidden rounded-3xl">
            {HEADLINES.map(([headline, source, url]) => (
              <CornerHover as="li" key={headline} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-5 py-4 sm:px-7">
                <a href={url} target="_blank" rel="noreferrer" className="font-semibold hover:underline">
                  {headline}
                </a>
                <span className="text-sm text-soft">{source}</span>
              </CornerHover>
            ))}
          </ul>
        </Reveal>

        <Reveal className="glass-panel mt-14 rounded-3xl border-l-4 border-accent p-6 sm:p-8">
          <p className="text-lg leading-relaxed">
            In a 2024 survey of more than 71,000 residents, over a third of English council areas scored 10% or lower for satisfaction with how often potholes are dealt with locally. Three areas scored as low as 5%.
          </p>
          <a href="https://www.expressandstar.com/uk-news/pothole-scourge-on-local-roads-revealed-in-new-figures-5742778" target="_blank" rel="noreferrer" className="mt-2 inline-block text-sm font-semibold text-accent hover:underline">
            National Highways and Transport Network survey, reported 2024 ↗
          </a>
        </Reveal>

        <Reveal className="mt-14 flex flex-wrap gap-3">
          <Link to="/report" className="btn btn-primary">
            Report a problem <Icon name="arrow" />
          </Link>
          <Link to="/get-involved" className="btn btn-ghost">
            What you can do
          </Link>
        </Reveal>
      </main>
    </div>
  )
}
