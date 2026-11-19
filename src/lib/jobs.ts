import { supabase } from './supabase'
import { SAMPLE_REPORTS } from './sampleReports'
import type { Org, OrgKind } from './orgs'
import type { Report } from '../types'

// Jobs: a report that council staff (or a Resolve admin) have offered to a community group or a
// clearance company (see supabase/jobs.sql). A lead accepts or declines; once accepted the group
// posts updates and marks it done, which clears the report. Plus following a report and the
// signed-in person's notifications.

export type JobStatus = 'offered' | 'accepted' | 'declined' | 'withdrawn' | 'done'
export interface Job {
  id: string
  report_id: string
  org_id: string
  status: JobStatus
  note: string | null
  reply_note: string | null
  created_at: string
  responded_at: string | null
  completed_at: string | null
  organisations?: { name: string; kind: OrgKind } | null
  reports?: Pick<Report, 'id' | 'description' | 'photo_path' | 'category_code' | 'current_status' | 'created_at'> | null
}

export const JOB_STATUS_LABEL: Record<JobStatus, string> = {
  offered: 'Offered, waiting for an answer',
  accepted: 'Under way',
  declined: 'Declined',
  withdrawn: 'Withdrawn',
  done: 'Done',
}

// Categories a community group may be offered. Anything else (roads, vehicles, structures) is
// for the council or a licensed company, and the app doesn't offer it to volunteers at all.
export const VOLUNTEER_SAFE = new Set(['fly-tipping', 'graffiti', 'other'])

const plain = (msg: string | undefined, fallback: string) => (msg && /^[A-Z][^\n]{8,160}$/.test(msg) && !/violates|syntax|relation|column|function/i.test(msg) ? msg : fallback)

export async function fetchJobsForReport(reportId: string): Promise<Job[]> {
  const { data } = await supabase.from('report_jobs').select('*, organisations(name, kind)').eq('report_id', reportId).order('created_at', { ascending: false })
  return (data as unknown as Job[]) ?? []
}

export async function fetchOrgJobs(orgId: string): Promise<Job[]> {
  const { data } = await supabase.from('report_jobs').select('*, reports(id, description, photo_path, category_code, current_status, created_at)').eq('org_id', orgId).order('created_at', { ascending: false })
  return (data as unknown as Job[]) ?? []
}

async function rpc(name: string, args: Record<string, unknown>, fallback: string): Promise<string | null> {
  const { error } = await supabase.rpc(name, args)
  return error ? plain(error.message, fallback) : null
}

export const offerJob = (reportId: string, orgId: string, note: string, safe: boolean) => rpc('offer_job', { p_report: reportId, p_org: orgId, p_note: note || null, p_safe: safe }, 'The job could not be offered. Please try again.')
export const respondToJob = (jobId: string, accept: boolean, note?: string) => rpc('respond_to_job', { p_job: jobId, p_accept: accept, p_note: note || null }, 'Your answer did not save. Please try again.')
export const withdrawJob = (jobId: string) => rpc('withdraw_job', { p_job: jobId }, 'The job could not be withdrawn. Please try again.')
export const postJobUpdate = (jobId: string, body: string) => rpc('post_job_update', { p_job: jobId, p_body: body }, 'Your update did not post. Please try again.')
export const completeJob = (jobId: string, body: string, photo: string | null) => rpc('complete_job', { p_job: jobId, p_body: body, p_photo: photo }, 'The job could not be marked done. Please try again.')
export const postStaffUpdate = (reportId: string, kind: 'progress' | 'resolved', body: string) => rpc('post_staff_update', { p_report: reportId, p_kind: kind, p_body: body }, 'Your update did not post. Please try again.')
export const checkCleared = (reportId: string, clear: boolean, note?: string) => rpc('check_cleared', { p_report: reportId, p_clear: clear, p_note: note || null }, 'Your answer did not save. Please try again.')

// Uploads an after photo to the same public bucket as report photos, under a random name.
export async function uploadPhoto(file: Blob): Promise<string | null> {
  const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg'
  const path = `${crypto.randomUUID()}.${ext}`
  const { error } = await supabase.storage.from('report-photos').upload(path, file, { contentType: file.type || undefined })
  return error ? null : path
}

// ---- following ----
export async function isFollowing(reportId: string): Promise<boolean> {
  const { data } = await supabase.from('report_follows').select('report_id').eq('report_id', reportId).maybeSingle()
  return !!data
}
export async function setFollowing(reportId: string, on: boolean, userId: string): Promise<boolean> {
  const { error } = on
    ? await supabase.from('report_follows').insert({ report_id: reportId })
    : await supabase.from('report_follows').delete().eq('report_id', reportId).eq('user_id', userId)
  return !error
}

// ---- where a report sits relative to groups' areas ----
function inside(pt: [number, number], ring: number[][]) {
  let hit = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i]
    const [xj, yj] = ring[j]
    if (yi > pt[1] !== yj > pt[1] && pt[0] < ((xj - xi) * (pt[1] - yi)) / (yj - yi) + xi) hit = !hit
  }
  return hit
}
const km = (a: [number, number], b: [number, number]) => {
  const R = 6371
  const dLat = ((b[1] - a[1]) * Math.PI) / 180
  const dLng = ((b[0] - a[0]) * Math.PI) / 180
  const h = Math.sin(dLat / 2) ** 2 + Math.cos((a[1] * Math.PI) / 180) * Math.cos((b[1] * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}
// Groups and companies for a report: the ones whose area covers the spot first, then the rest by
// distance from the report.
export function orgsForReport(orgs: Org[], r: Pick<Report, 'lat' | 'lng'>): Array<{ org: Org; covers: boolean; km: number }> {
  const pt: [number, number] = [r.lng, r.lat]
  return orgs
    .map((org) => {
      const ring = org.area.coordinates[0]
      const c = ring.slice(0, -1).reduce((s, p) => [s[0] + p[0] / (ring.length - 1), s[1] + p[1] / (ring.length - 1)], [0, 0]) as [number, number]
      return { org, covers: inside(pt, ring), km: km(pt, c) }
    })
    .sort((a, b) => Number(b.covers) - Number(a.covers) || a.km - b.km)
}

// ---- demo ----
// A few jobs for the demo so every view has something to show: Keswick Pickers (the group the
// demo's community view leads) has one offer waiting, one under way and one done.
const ago = (h: number) => new Date(Date.now() - h * 36e5).toISOString()
const pick = (id: string) => {
  const r = SAMPLE_REPORTS.find((x) => x.id === id)!
  return { id: r.id, description: r.description, photo_path: r.photo_path, category_code: r.category_code, current_status: r.current_status, created_at: r.created_at }
}
export function sampleJobs(): Job[] {
  return [
    { id: 'sample-job-1', report_id: 'sample-2', org_id: 'sample-org-1', status: 'offered', note: 'Bottles and glass along the river path. Bring a sharps-safe bucket for the glass.', reply_note: null, created_at: ago(5), responded_at: null, completed_at: null, organisations: { name: 'Keswick Pickers', kind: 'community' }, reports: pick('sample-2') },
    { id: 'sample-job-2', report_id: 'sample-3', org_id: 'sample-org-1', status: 'accepted', note: null, reply_note: 'We can do Saturday morning.', created_at: ago(50), responded_at: ago(46), completed_at: null, organisations: { name: 'Keswick Pickers', kind: 'community' }, reports: pick('sample-3') },
    { id: 'sample-job-3', report_id: 'sample-5', org_id: 'sample-org-1', status: 'done', note: null, reply_note: null, created_at: ago(400), responded_at: ago(390), completed_at: ago(330), organisations: { name: 'Keswick Pickers', kind: 'community' }, reports: pick('sample-5') },
  ]
}
