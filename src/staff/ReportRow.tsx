import { useState } from 'react'
import { advanceReport, claimReport, reassignReport, rejectReport } from './api'
import { Icon } from '../components/ui/Icon'
import { Select } from '../components/ui/Select'
import { FALLBACK_CATEGORIES } from '../lib/categories'
import { formatDateTime } from '../lib/format'
import { photoUrl } from '../lib/photos'
import { STATUS_LABELS, statusGroup } from '../lib/status'
import type { Category, ResponsibleBody, StaffProfile, StaffReport } from '../types'

interface Props {
  report: StaffReport
  me: StaffProfile
  categories: Category[]
  bodies: ResponsibleBody[]
  onAction: (action: () => Promise<void>) => void
  busy: boolean
}

export function ReportRow({ report, me, categories, bodies, onAction, busy }: Props) {
  const [note, setNote] = useState('')
  const [reassignTo, setReassignTo] = useState('')
  const label =
    categories.find((c) => c.code === report.category_code)?.label ??
    FALLBACK_CATEGORIES.find((c) => c.code === report.category_code)?.label ??
    report.category_code
  const backers = 1 + (report.report_supports?.[0]?.count ?? 0)
  const mine = me.role === 'staff' && report.responsible_body_id === me.body_id
  const history = [...(report.report_events ?? [])].sort((a, b) => a.seq - b.seq)
  const withNote = note.trim() || undefined
  const go = (fn: () => Promise<void>) => () => onAction(fn)

  return (
    <li className="staff-report card flex flex-col gap-5 rounded-3xl p-5 sm:flex-row">
      <img className="aspect-[4/3] w-full shrink-0 rounded-2xl object-cover sm:size-40" src={photoUrl(report.photo_path)} alt="" loading="lazy" />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="report-category text-xs font-semibold uppercase tracking-widest text-soft">{label}</span>
          <span className={`report-status pill pill-${statusGroup(report.current_status)}`}>{STATUS_LABELS[report.current_status]}</span>
        </div>
        <p className="report-description mt-2 text-lg font-bold leading-snug">{report.description}</p>
        <p className="report-date mt-1 text-sm text-soft">
          {formatDateTime(report.created_at)} · Backed by {backers} {backers === 1 ? 'person' : 'people'}
          {report.responsible_bodies && <> · {report.responsible_bodies.name}</>}
        </p>

        {history.length > 0 && (
          <details className="report-history mt-3 text-sm">
            <summary className="cursor-pointer font-semibold text-accent">History</summary>
            <ol className="mt-3 space-y-2 border-l-2 border-line pl-4">
              {history.map((event) => (
                <li key={event.id}>
                  <span className="font-semibold">{STATUS_LABELS[event.status]}</span>
                  <time className="ml-2 text-soft" dateTime={event.created_at}>
                    {formatDateTime(event.created_at)}
                  </time>
                  {event.note && <span className="report-history-note block text-soft">{event.note}</span>}
                </li>
              ))}
            </ol>
          </details>
        )}

        <label className="staff-note mt-4 block">
          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-widest text-soft">Note (optional)</span>
          <input className="input" type="text" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add a note with this action" />
        </label>

        <div className="staff-actions mt-4 flex flex-wrap items-center gap-2">
          {report.current_status === 'reported' && me.role === 'staff' && (
            <button type="button" className="btn btn-primary btn-sm" disabled={busy} onClick={go(() => claimReport(report.id))}>
              Claim for my council
            </button>
          )}
          {report.current_status === 'reported' && (
            <button type="button" className="btn btn-ghost btn-sm" disabled={busy} onClick={go(() => rejectReport(report.id, withNote))}>
              Reject: not actionable
            </button>
          )}

          {mine && (report.current_status === 'routed' || report.current_status === 'reopened') && (
            <button type="button" className="btn btn-primary btn-sm" disabled={busy} onClick={go(() => advanceReport(report.id, 'acknowledged', withNote))}>
              {report.current_status === 'reopened' ? 'Acknowledge again' : 'Acknowledge'}
            </button>
          )}
          {mine && report.current_status === 'acknowledged' && (
            <>
              <button type="button" className="btn btn-ghost btn-sm" disabled={busy} onClick={go(() => advanceReport(report.id, 'scheduled', withNote))}>
                Schedule clearance
              </button>
              <button type="button" className="btn btn-primary btn-sm" disabled={busy} onClick={go(() => advanceReport(report.id, 'cleared', withNote))}>
                Mark cleared
              </button>
            </>
          )}
          {mine && report.current_status === 'scheduled' && (
            <button type="button" className="btn btn-primary btn-sm" disabled={busy} onClick={go(() => advanceReport(report.id, 'cleared', withNote))}>
              Mark cleared
            </button>
          )}

          {(me.role === 'reviewer' || me.role === 'resolve_admin') && report.current_status === 'cleared' && (
            <>
              <button type="button" className="btn btn-primary btn-sm" disabled={busy} onClick={go(() => advanceReport(report.id, 'verified', withNote))}>
                <Icon name="shield" className="size-4" />
                Verify
              </button>
              <button type="button" className="btn btn-ghost btn-sm" disabled={busy} onClick={go(() => advanceReport(report.id, 'reopened', withNote))}>
                Reopen: not actually fixed
              </button>
            </>
          )}

          {me.role === 'resolve_admin' && (
            <span className="staff-reassign flex items-center gap-2">
              <Select
                label="Move to a different council or contractor"
                className="w-56"
                choices={bodies.filter((b) => b.id !== report.responsible_body_id).map((b) => ({ value: b.id, label: b.name }))}
                value={reassignTo}
                onChange={setReassignTo}
                placeholder={report.current_status === 'reported' ? 'Assign to…' : 'Move to…'}
              />
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                disabled={busy || !reassignTo}
                onClick={() => {
                  const target = reassignTo
                  setReassignTo('')
                  onAction(() => reassignReport(report.id, target))
                }}
              >
                Go
              </button>
            </span>
          )}
        </div>
      </div>
    </li>
  )
}
