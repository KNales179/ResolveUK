import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Icon, type IconName } from '../ui/Icon'
import { markVersionSeen, unseenReleases, type Release } from '../../lib/changelog'

// Shown once per device, the first time someone opens the site after an update: a plain-language
// summary of whatever changed since their last visit (every release they missed, not just the
// newest one — see unseenReleases). A first-ever visit sees just the current release's notes,
// same as a short "here's where things stand" blurb would read.
export function WhatsNewModal() {
  const [releases, setReleases] = useState<Release[]>([])

  useEffect(() => {
    setReleases(unseenReleases())
  }, [])

  const close = () => {
    markVersionSeen()
    setReleases([])
  }

  useEffect(() => {
    if (releases.length === 0) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [releases.length])

  if (releases.length === 0) return null

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/55 backdrop-blur-sm" onClick={close} aria-hidden="true" />
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
        <div role="dialog" aria-modal="true" aria-labelledby="whats-new-title" className="card rise max-h-[85svh] w-full max-w-md overflow-y-auto p-6">
          <div className="flex items-start justify-between gap-3">
            <h2 id="whats-new-title" className="flex items-center gap-2 text-lg font-semibold">
              <Icon name="sparkles" className="size-5" /> What's new
            </h2>
            <button type="button" className="icon-btn" onClick={close} aria-label="Close">
              <Icon name="x" />
            </button>
          </div>
          <div className="mt-4 space-y-6">
            {releases.map((release) => (
              <div key={release.version}>
                {releases.length > 1 && <p className="text-xs font-semibold tracking-wide text-soft uppercase">v{release.version}</p>}
                <p className="mt-1 font-semibold">{release.title}</p>
                <ul className="mt-2 space-y-3">
                  {release.highlights.map((h, i) => (
                    <HighlightRow key={i} icon={h.icon} title={h.title} body={h.body} />
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="mt-6 flex items-center justify-between gap-3">
            <Link to="/updates" className="text-sm font-semibold text-soft hover:text-ink" onClick={close}>
              See everything that's changed
            </Link>
            <button type="button" className="btn btn-primary btn-sm" onClick={close}>
              Got it
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

function HighlightRow({ icon, title, body }: { icon: IconName; title: string; body: string }) {
  return (
    <li className="flex gap-3">
      <span className="icon-btn mt-0.5 shrink-0" aria-hidden="true">
        <Icon name={icon} className="size-4" />
      </span>
      <div className="min-w-0">
        <p className="text-sm font-semibold">{title}</p>
        <p className="mt-0.5 text-sm text-soft">{body}</p>
      </div>
    </li>
  )
}
