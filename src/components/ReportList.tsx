import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Report } from '../types'

const CATEGORY_LABELS: Record<Report['category'], string> = {
  'fly-tipping': 'Fly-tipping',
  pothole: 'Pothole',
  other: 'Other',
}

interface ReportListProps {
  refreshKey: number
}

export function ReportList({ refreshKey }: ReportListProps) {
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function fetchReports() {
      setLoading(true)
      setError(null)
      const { data, error: fetchError } = await supabase
        .from('reports')
        .select('*')
        .order('created_at', { ascending: false })

      if (cancelled) return
      if (fetchError) {
        setError(fetchError.message)
      } else {
        setReports(data ?? [])
      }
      setLoading(false)
    }

    fetchReports()
    return () => {
      cancelled = true
    }
  }, [refreshKey])

  if (loading) return <p className="field-hint">Loading reports…</p>
  if (error) return <p className="field-error">{error}</p>
  if (reports.length === 0) return <p className="field-hint">No reports yet. Submit one to see it here.</p>

  return (
    <ul className="report-list">
      {reports.map((report) => (
        <li key={report.id} className="report-card">
          {report.photo_url && (
            <img className="report-thumb" src={report.photo_url} alt={CATEGORY_LABELS[report.category]} />
          )}
          <div className="report-details">
            <div className="report-meta">
              <span className="report-category">{CATEGORY_LABELS[report.category]}</span>
              <span className="report-status">{report.status}</span>
            </div>
            <p className="report-description">{report.description}</p>
            <p className="report-date">{new Date(report.created_at).toLocaleString('en-GB')}</p>
          </div>
        </li>
      ))}
    </ul>
  )
}
