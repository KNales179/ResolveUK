import { useEffect, useRef, useState } from 'react'
import { backedReportIds } from '../lib/device'
import { formatDateTime, timeAgo } from '../lib/format'
import { backReport } from '../lib/nearby'
import { photoUrl } from '../lib/photos'
import { OPEN_STATUSES, STATUS_LABELS, statusGroup } from '../lib/status'
import type { Category, Report } from '../types'
import { Icon } from './ui/Icon'

interface Props {
  report: Report | null
  categories: Category[]
  onClose: () => void
  onBacked: (id: string) => void
}

// The side panel that opens when a report is chosen: its photo, its whole history, and places for the
// map, the responsible body and updates, which fill in as those parts of the project are built.
export function ReportDrawer({ report, categories, onClose, onBacked }: Props) {
  const [shown, setShown] = useState<Report | null>(report)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [backed, setBacked] = useState(() => backedReportIds())
  const panel = useRef<HTMLElement>(null)
  const closeBtn = useRef<HTMLButtonElement>(null)
  const opener = useRef<Element | null>(null)
  const open = report !== null

  // Keep showing the last report while the panel slides away.
  useEffect(() => {
    if (report) setShown(report)
  }, [report])

  useEffect(() => {
    if (!open) return
    opener.current = document.activeElement
    document.body.style.overflow = 'hidden'
    closeBtn.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'Tab' && panel.current) {
        const items = panel.current.querySelectorAll<HTMLElement>('button:not([disabled]), a[href]')
        if (!items.length) return
        const first = items[0]
        const last = items[items.length - 1]
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
      if (opener.current instanceof HTMLElement) opener.current.focus()
    }
  }, [open, onClose])

  const r = shown
  const label = r ? (categories.find((c) => c.code === r.category_code)?.label ?? r.category_code) : ''
  const people = r ? 1 + (r.report_supports?.[0]?.count ?? 0) : 0
  const history = r ? [...(r.report_events ?? [])].sort((a, b) => a.seq - b.seq) : []
  const canBack = r ? OPEN_STATUSES.includes(r.current_status) : false
  const alreadyBacked = r ? backed.has(r.id) : false

  const back = async () => {
    if (!r) return
    setBusy(true)
    setError('')
    try {
      const result = await backReport(r.id)
      setBacked(backedReportIds())
      if (result === 'added') onBacked(r.id)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'That did not save. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <div className={`fixed inset-0 z-50 bg-black/55 backdrop-blur-sm transition-opacity duration-300 ${open ? 'opacity-100' : 'pointer-events-none opacity-0'}`} onClick={onClose} aria-hidden="true" />
      <aside
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="drawer-title"
        aria-hidden={!open}
        className={`fixed inset-x-0 bottom-0 z-[60] flex max-h-[92svh] flex-col rounded-t-3xl border-t border-line bg-surface shadow-2xl transition-[transform,visibility] duration-300 ease-out sm:inset-y-0 sm:left-auto sm:right-0 sm:max-h-none sm:w-[min(34rem,100vw)] sm:rounded-none sm:border-l sm:border-t-0 ${open ? 'visible translate-x-0 translate-y-0' : 'invisible translate-y-full sm:translate-x-full sm:translate-y-0'}`}
      >
        <div className="mx-auto mt-2.5 h-1.5 w-12 shrink-0 rounded-full bg-line sm:hidden" aria-hidden="true" />
        <div className="flex items-center justify-between border-b border-line px-6 py-3 sm:py-4">
          <p className="text-sm font-semibold uppercase tracking-widest text-soft">{label || 'Report'}</p>
          <button ref={closeBtn} type="button" className="icon-btn" onClick={onClose} aria-label="Close" tabIndex={open ? 0 : -1}>
            <Icon name="x" />
          </button>
        </div>

        {r && (
          <div className="flex-1 overflow-y-auto">
            <div className="relative aspect-[16/10] bg-surface2">
              <img src={photoUrl(r.photo_path)} alt={r.description} className="absolute inset-0 size-full object-cover" decoding="async" />
            </div>
            <div className="space-y-9 px-6 py-7">
              <div>
                <span className={`pill pill-${statusGroup(r.current_status)}`}>{STATUS_LABELS[r.current_status]}</span>
                <h2 id="drawer-title" className="mt-3 text-3xl leading-tight">
                  {r.description}
                </h2>
                <p className="mt-2 text-sm text-soft">
                  Reported {timeAgo(r.created_at)} · Backed by {people} {people === 1 ? 'person' : 'people'}
                </p>
                {canBack && (
                  <div className="mt-5">
                    {alreadyBacked ? (
                      <span className="btn btn-ghost btn-sm cursor-default">
                        <Icon name="check" className="size-4 text-accent" />
                        You have backed this
                      </span>
                    ) : (
                      <button type="button" className="btn btn-primary btn-sm" onClick={back} disabled={busy}>
                        <Icon name="eye" className="size-4" />
                        {busy ? 'Saving…' : 'I have seen this too'}
                      </button>
                    )}
                  </div>
                )}
                {error && (
                  <p className="msg msg-error mt-4" role="alert">
                    {error}
                  </p>
                )}
              </div>

              <section>
                <h3 className="text-base font-bold">Progress</h3>
                <ol className="mt-4">
                  {history.map((e, i) => {
                    const last = i === history.length - 1
                    return (
                      <li key={e.id} className="flex gap-4 pb-6 last:pb-0">
                        <span className="flex flex-col items-center">
                          <span className={`grid size-6 place-items-center rounded-full ${last ? 'bg-accent text-accent-ink ring-4 ring-accent/20' : 'bg-surface2 text-accent'}`}>
                            <Icon name="check" className="size-3.5" />
                          </span>
                          {!last && <span className="mt-1 w-px flex-1 bg-line" />}
                        </span>
                        <div>
                          <p className="font-semibold">{STATUS_LABELS[e.status]}</p>
                          <p className="text-sm text-soft">{formatDateTime(e.created_at)}</p>
                          {e.note && <p className="mt-1 text-sm">{e.note}</p>}
                        </div>
                      </li>
                    )
                  })}
                </ol>
              </section>

              <section>
                <h3 className="text-base font-bold">Where</h3>
                <div className="placeholder-box map-grid mt-3 grid aspect-[16/9] place-items-center text-center">
                  <div className="px-6">
                    <span className="mx-auto grid size-11 place-items-center rounded-full bg-surface2 text-soft">
                      <Icon name="map" />
                    </span>
                    <p className="mt-3 font-semibold">Location on a map</p>
                    <p className="mt-0.5 text-sm text-soft">The exact spot will be marked here. Coming soon.</p>
                  </div>
                </div>
              </section>

              <section>
                <h3 className="text-base font-bold">Responsible body</h3>
                <div className="placeholder-box mt-3 flex items-center gap-4 p-4">
                  <span className="grid size-11 shrink-0 place-items-center rounded-full bg-surface2 text-soft">
                    <Icon name="building" />
                  </span>
                  <div className="min-w-0 flex-1">
                    {r.responsible_bodies ? (
                      <p className="font-semibold">{r.responsible_bodies.name}</p>
                    ) : (
                      <>
                        <p className="font-semibold">Not shown yet</p>
                        <p className="text-sm text-soft">The council or contractor handling this will appear here.</p>
                      </>
                    )}
                  </div>
                </div>
              </section>

              <section>
                <h3 className="text-base font-bold">Updates</h3>
                <div className="placeholder-box mt-3 space-y-3 p-5">
                  <div className="skeleton h-3 w-3/4" />
                  <div className="skeleton h-3 w-full" />
                  <div className="skeleton h-3 w-2/3" />
                  <p className="pt-2 text-sm text-soft">Updates from the council or contractor, with photos of the work, will appear here.</p>
                </div>
              </section>
            </div>
          </div>
        )}
      </aside>
    </>
  )
}
