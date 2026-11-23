import { Icon } from '../components/ui/Icon'
import { PageBackdrop } from '../components/site/SiteShell'
import { APP_VERSION, RELEASES, type Release } from '../lib/changelog'
import { PLANNED, WORKING_NOW } from '../lib/roadmap'

// One card per important update: a main release (x.y.0) with its small follow-ups (x.y.1 and up)
// folded inside it as "Smaller changes". If a group has no x.y.0 entry, its oldest one leads.
const GROUPS = (() => {
  const byMinor = new Map<string, Release[]>()
  for (const r of RELEASES) {
    const key = r.version.split('.').slice(0, 2).join('.')
    byMinor.set(key, [...(byMinor.get(key) ?? []), r])
  }
  return [...byMinor.values()].map((releases) => {
    const lead = releases.find((r) => r.version.endsWith('.0')) ?? releases[releases.length - 1]
    return { lead, small: releases.filter((r) => r !== lead), releases }
  })
})()

const dayLabel = (date: string) =>
  new Date(`${date}T12:00:00`).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })

// The full history behind the "What's new" pop-up — every release in plain language, newest
// first, grouped by important update (see GROUPS). Plain <details> rather than a hand-rolled
// collapsible: <details> gets the expand/collapse behaviour (and keyboard support) for free.
// `inApp`: shown inside the app (its own header is in the page flow, and it has its own background).
export function UpdatesPage({ inApp = false }: { inApp?: boolean }) {
  return (
    <div className="relative">
      {!inApp && <PageBackdrop />}
      <section className={`relative mx-auto max-w-4xl px-5 pb-20 sm:px-8 ${inApp ? 'pt-8 sm:pt-10' : 'pt-28 sm:pt-36'}`}>
        <div className="accent-panel rounded-3xl p-6 sm:p-8">
          <h1 className="flex items-center gap-2.5 text-3xl font-semibold tracking-tight">
            <Icon name="sparkles" className="size-7" /> Updates
          </h1>
          <p className="mt-3 opacity-85">Everything that's changed on the site so far, in plain language. This is still an early prototype — version numbers here are just a running count, not a finished release scheme.</p>
        </div>
        <div className="panel-tint mt-8 grid gap-8 rounded-3xl p-6 sm:p-8 md:grid-cols-2 md:gap-0 md:divide-x md:divide-line">
          <div className="md:pr-8">
            <h2 className="flex items-center gap-2 font-serif text-2xl">
              <Icon name="check" className="size-5 text-accent" /> Working now
            </h2>
            <ul className="mt-4 space-y-2.5 text-sm leading-relaxed">
              {WORKING_NOW.map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
          </div>
          <div className="md:pl-8">
            <h2 className="flex items-center gap-2 font-serif text-2xl">
              <Icon name="clock" className="size-5 text-soft" /> Planned
            </h2>
            <ul className="mt-4 space-y-2.5 text-sm leading-relaxed text-soft">
              {PLANNED.map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
          </div>
        </div>

        <h2 className="mt-12 font-serif text-2xl">What has <span className="hl">changed</span></h2>
        <div className="mt-4 space-y-2">
          {GROUPS.map((g, i) => (
            <details key={g.lead.version} className="acc card overflow-hidden p-0" open={i === 0}>
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-3.5">
                <span className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
                  <span className="font-semibold">{g.lead.title}</span>
                  {g.releases.some((r) => r.version === APP_VERSION) && (
                    <span className="rounded-full bg-honey-soft px-2 py-0.5 text-xs font-semibold text-honey-text">Current</span>
                  )}
                </span>
                <span className="flex shrink-0 items-center gap-3 text-xs text-soft">
                  <span className="num hidden sm:inline">{dayLabel(g.lead.date)}</span>
                  <Icon name="chevron" className="dd-chevron size-4" />
                </span>
              </summary>
              <div className="space-y-4 border-t border-line px-5 py-4">
                <ul className="space-y-1.5">
                  {g.lead.highlights.map((h, k) => (
                    <li key={k} className="flex gap-2.5 text-sm leading-relaxed">
                      <Icon name={h.icon} className="mt-1 size-3.5 shrink-0 text-accent" />
                      <span className="min-w-0 text-soft">
                        <span className="font-semibold text-ink">{h.title}.</span> {h.body}
                      </span>
                    </li>
                  ))}
                </ul>
                <p className="num text-xs text-soft">v{g.lead.version} · {dayLabel(g.lead.date)}</p>
                {g.small.length > 0 && (
                  <details className="acc rounded-xl border border-line">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-2.5 text-sm font-semibold">
                      Smaller changes ({g.small.length})
                      <Icon name="chevron" className="dd-chevron size-4 shrink-0 text-soft" />
                    </summary>
                    <ul className="divide-y divide-line border-t border-line">
                      {g.small.map((r) => (
                        <li key={r.version} className="px-4 py-2.5 text-sm">
                          <span className="font-medium">{r.title}</span> <span className="num text-xs text-soft">v{r.version}</span>
                          <p className="mt-0.5 text-xs leading-relaxed text-soft">{r.highlights.map((h) => h.title).join(' · ')}</p>
                        </li>
                      ))}
                    </ul>
                  </details>
                )}
              </div>
            </details>
          ))}
        </div>
      </section>
    </div>
  )
}
