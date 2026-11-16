import { useCallback, useEffect, useState } from 'react'
import { listBodies, listReports } from './api'
import { useStaffMe } from './auth'
import { ReportRow } from './ReportRow'
import { FALLBACK_CATEGORIES } from '../lib/categories'
import type { ResponsibleBody, StaffReport } from '../types'

export function StaffDashboard() {
  const me = useStaffMe()
  const [reports, setReports] = useState<StaffReport[] | null>(null)
  const [bodies, setBodies] = useState<ResponsibleBody[]>([])
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const reload = useCallback(async () => {
    try {
      const [r, b] = await Promise.all([listReports(), listBodies()])
      setReports(r)
      setBodies(b)
      setError('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.')
    }
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  async function act(run: () => Promise<void>) {
    setBusy(true)
    setError('')
    try {
      await run()
      await reload()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'That did not save. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  if (!reports) {
    return error ? (
      <p className="msg msg-error" role="alert">
        {error}
      </p>
    ) : (
      <p className="text-soft">Loading…</p>
    )
  }

  const unassigned = reports.filter((r) => r.current_status === 'reported')
  const mine = reports.filter((r) => me.role === 'staff' && r.responsible_body_id === me.body_id && r.current_status !== 'reported')
  const awaitingReview = reports.filter((r) => r.current_status === 'cleared')
  const shown = new Set([...unassigned, ...mine, ...awaitingReview].map((r) => r.id))
  const everythingElse = reports.filter((r) => !shown.has(r.id))

  const section = (id: string, title: string, hint: string, list: StaffReport[]) =>
    list.length === 0 ? null : (
      <section className="staff-section" id={id}>
        <h2 className="flex items-center gap-3 text-xl font-bold">
          {title}
          <span className="rounded-full bg-surface2 px-3 py-0.5 text-sm font-semibold text-soft">{list.length}</span>
        </h2>
        <p className="mt-1 text-sm text-soft">{hint}</p>
        <ul className="mt-5 grid gap-4">
          {list.map((r) => (
            <ReportRow key={r.id} report={r} me={me} categories={FALLBACK_CATEGORIES} bodies={bodies} onAction={act} busy={busy} />
          ))}
        </ul>
      </section>
    )

  const isReviewOrAdmin = me.role === 'reviewer' || me.role === 'resolve_admin'

  return (
    <div className="space-y-12">
      {error && (
        <p className="msg msg-error" role="alert">
          {error}
        </p>
      )}

      {section(
        'section-unassigned',
        'Unassigned reports',
        me.role === 'staff' ? 'Nobody has claimed these yet. Claim one for your council or contractor, or reject it if nobody can act on it.' : 'Nobody has claimed these yet.',
        unassigned,
      )}
      {section('section-mine', 'My council’s reports', 'Reports assigned to you, in progress.', mine)}
      {isReviewOrAdmin && section('section-awaiting', 'Awaiting verification', 'The responsible body says these are cleared. Check the photos and confirm.', awaitingReview)}
      {isReviewOrAdmin && section('section-else', 'Everything else', 'Every other report, at any stage, for oversight.', everythingElse)}

      {reports.length === 0 && <p className="text-soft">No reports yet.</p>}
    </div>
  )
}
