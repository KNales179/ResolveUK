import { useCallback, useEffect, useState } from 'react'
import { SAMPLE_REPORTS } from './sampleReports'
import { supabase } from './supabase'
import type { Report } from '../types'

// Every report, newest first, shared by the website's reports page, the app's Reports section and
// the app's Map. Shows the sample reports straight away (no empty screen while it loads), then
// swaps in the real ones if there are at least 3 of them. `samplesOnly` keeps it on the samples
// (the demo shows sample data only and never touches the real records).
export function useReports({ samplesOnly = false }: { samplesOnly?: boolean } = {}) {
  const [reports, setReports] = useState<Report[]>(SAMPLE_REPORTS)
  const [usingSamples, setUsingSamples] = useState(true)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    if (samplesOnly) return
    let alive = true
    supabase
      .from('reports')
      .select('*, report_events(id, seq, status, note, created_at), report_supports(count), responsible_bodies(name, kind)')
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (!alive || error || !data || data.length < 3) return
        setReports(data as unknown as Report[])
        setUsingSamples(false)
      })
    return () => {
      alive = false
    }
  }, [samplesOnly, tick])

  // Called after someone backs a report, so its count goes up without reloading everything.
  const markBacked = useCallback(
    (id: string) => setReports((list) => list.map((r) => (r.id === id ? { ...r, report_supports: [{ count: (r.report_supports?.[0]?.count ?? 0) + 1 }] } : r))),
    [],
  )

  // After an action that moves a report on (a job accepted, a report checked): change it here
  // straight away, then fetch the real records again so the history is exact.
  const patchReport = useCallback((id: string, patch: Partial<Report>) => setReports((list) => list.map((r) => (r.id === id ? { ...r, ...patch } : r))), [])
  const refresh = useCallback(() => setTick((t) => t + 1), [])

  return { reports, usingSamples, markBacked, patchReport, refresh }
}
