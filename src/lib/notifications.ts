import { supabase } from './supabase'

// The signed-in person's notifications (see supabase/jobs.sql): a report they made or follow
// moved on, a job was offered to their group, a job they offered was answered.
export interface Notice {
  id: string
  report_id: string | null
  org_id: string | null
  title: string
  body: string | null
  created_at: string
  read_at: string | null
}

export async function fetchNotices(): Promise<Notice[]> {
  const { data } = await supabase.from('notifications').select('*').order('created_at', { ascending: false }).limit(30)
  return (data as Notice[]) ?? []
}

export async function markNoticesRead(): Promise<void> {
  await supabase.rpc('mark_notifications_read')
}

// Where a notice opens: its group's page, or the report it's about.
export const noticeLink = (n: Notice) => (n.org_id && !n.report_id ? `/app/community/${n.org_id}` : n.report_id ? `/app/reports/${n.report_id}` : '/app')

const ago = (h: number) => new Date(Date.now() - h * 36e5).toISOString()
export function sampleNotices(role: string): Notice[] {
  const list: Notice[] = [
    { id: 'n1', report_id: 'sample-4', org_id: null, title: 'Cleared', body: 'Is it clear now? Open the report to confirm or say it is still there.', created_at: ago(3), read_at: null },
    { id: 'n2', report_id: 'sample-3', org_id: null, title: 'Clearance is scheduled', body: 'Keswick Pickers will clear this on Saturday.', created_at: ago(46), read_at: null },
    { id: 'n3', report_id: 'sample-5', org_id: null, title: 'Confirmed clear', body: 'Litter scattered along the lane has been cleared and checked.', created_at: ago(300), read_at: ago(200) },
  ]
  if (role === 'community') list.unshift({ id: 'n0', report_id: null, org_id: 'sample-org-1', title: 'New job offered to Keswick Pickers', body: 'Bottles and glass along the river path.', created_at: ago(5), read_at: null })
  if (role === 'staff' || role === 'admin') list.unshift({ id: 'n0', report_id: 'sample-3', org_id: 'sample-org-1', title: 'Keswick Pickers accepted the job', body: 'We can do Saturday morning.', created_at: ago(46), read_at: null })
  return list
}
