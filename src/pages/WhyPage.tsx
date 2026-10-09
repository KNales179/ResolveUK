import { Link } from 'react-router-dom'
import { PageBackdrop } from '../components/site/SiteShell'
import { Icon, type IconName } from '../components/ui/Icon'
import { Reveal } from '../components/ui/Reveal'

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
    <>
      <PageBackdrop />
      <main className="mx-auto max-w-4xl px-5 pb-24 pt-32 sm:px-8 sm:pt-40">
        <Reveal className="max-w-2xl">
          <p className="eyebrow">Why Resolve UK exists</p>
          <h1 className="mt-4 text-4xl sm:text-5xl">Reported isn't the same as fixed.</h1>
          <p className="mt-6 text-lg leading-relaxed text-soft">
            Fly-tipping, potholes, litter and abandoned vehicles aren't rare. They're some of the most reported problems in the country, and some of the hardest to see through to the end. Resolve UK exists to close that gap: not just to collect a report, but to show what happened to it.
          </p>
        </Reveal>

        <Reveal className="mt-14">
          <h2 className="font-serif text-2xl">The scale of it</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {STATS.map(([icon, title, stat, detail, source, url]) => (
              <div key={title} className="card rounded-2xl p-6">
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
            ))}
          </div>
        </Reveal>

        <Reveal className="mt-14">
          <h2 className="font-serif text-2xl">In the news</h2>
          <ul className="mt-6 divide-y divide-line border-y border-line">
            {HEADLINES.map(([headline, source, url]) => (
              <li key={headline} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-4">
                <a href={url} target="_blank" rel="noreferrer" className="font-semibold hover:underline">
                  {headline}
                </a>
                <span className="text-sm text-soft">{source}</span>
              </li>
            ))}
          </ul>
        </Reveal>

        <Reveal className="mt-14 border-l-2 border-accent pl-6">
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
    </>
  )
}
