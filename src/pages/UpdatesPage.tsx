import { Icon } from '../components/ui/Icon'
import { PageBackdrop } from '../components/site/SiteShell'
import { APP_VERSION, RELEASES } from '../lib/changelog'

// The full history behind the "What's new" pop-up — every release in plain language, newest
// first. Plain <details> rather than a hand-rolled collapsible: it's one page, visited rarely,
// and <details> gets the expand/collapse behaviour (and keyboard support) for free.
export function UpdatesPage() {
  return (
    <div className="relative">
      <PageBackdrop />
      <section className="relative mx-auto max-w-2xl px-5 pt-28 pb-20 sm:px-8 sm:pt-36">
        <div className="accent-panel rounded-3xl p-6 sm:p-8">
          <h1 className="flex items-center gap-2.5 text-3xl font-semibold tracking-tight">
            <Icon name="sparkles" className="size-7" /> Updates
          </h1>
          <p className="mt-3 opacity-85">Everything that's changed on the site so far, in plain language. This is still an early prototype — version numbers here are just a running count, not a finished release scheme.</p>
        </div>
        <div className="mt-8 space-y-3">
          {RELEASES.map((release) => (
            <details key={release.version} className="card overflow-hidden p-0" open={release.version === APP_VERSION}>
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-5">
                <span>
                  <span className="font-semibold">{release.title}</span>
                  {release.version === APP_VERSION && <span className="ml-2 rounded-full bg-surface2 px-2 py-0.5 text-xs font-semibold text-soft align-middle">Current</span>}
                </span>
                <span className="flex shrink-0 items-center gap-3 text-xs text-soft">
                  {release.date} <Icon name="chevron" className="dd-chevron size-4" />
                </span>
              </summary>
              <ul className="space-y-4 border-t border-line p-5 pt-4">
                {release.highlights.map((h, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="icon-btn mt-0.5 shrink-0" aria-hidden="true">
                      <Icon name={h.icon} className="size-4" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold">{h.title}</p>
                      <p className="mt-0.5 text-sm text-soft">{h.body}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </details>
          ))}
        </div>
      </section>
    </div>
  )
}
