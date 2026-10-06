import { Link } from 'react-router-dom'

const ROUTES: Array<[string, string, string, string]> = [
  ['Public', 'Works the same as today. A report on public land goes to the council or contractor responsible for it.', '/report', 'See the real reporting form'],
  ['Community', 'A safe, non-hazardous problem, such as litter, could be claimed and cleared by a registered local group instead of waiting on a council.', '/v2/community', 'See the idea'],
  ['Commercial', 'On private land, where a council has no duty to clear it, registered waste carriers could quote a price and the landowner picks one.', '/v2/commercial', 'See the idea'],
]

export function V2Landing() {
  return (
    <div className="max-w-3xl">
      <p className="eyebrow">Concept, not a decision yet</p>
      <h1 className="mt-4 text-4xl sm:text-5xl">A resolution network, not just a reporting form.</h1>
      <p className="mt-6 text-lg leading-relaxed text-soft">
        FixMyStreet already does public reporting well, and Resolve UK's own version does too. The idea on this page is to stop competing on that alone, and add two more ways a problem gets resolved, depending on who is actually responsible for it. Nothing here is built into the real site yet. This exists so you can react to it before anything is.
      </p>

      <ul className="mt-14 space-y-4">
        {ROUTES.map(([title, text, href, cta]) => (
          <li key={title} className="card rounded-2xl p-6 sm:p-7">
            <h2 className="font-serif text-2xl">{title}</h2>
            <p className="mt-2 leading-relaxed text-soft">{text}</p>
            <Link to={href} className="mt-4 inline-block font-semibold text-accent hover:underline">
              {cta} →
            </Link>
          </li>
        ))}
      </ul>

      <div className="mt-14 border-l-2 border-accent pl-6">
        <p className="leading-relaxed text-soft">
          Two things the commercial route needs before it could actually work: a way for whoever sent in a report to come back and pick a quote (the <Link to="/v2/account" className="font-semibold text-accent hover:underline">account idea</Link> on this preview), and a registered company able to legally hold the money that changes hands.
        </p>
      </div>
    </div>
  )
}
