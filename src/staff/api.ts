import { supabase } from '../lib/supabase'
import type { ResponsibleBody, StaffProfile, StaffReport } from '../types'

async function unwrap<T>(query: PromiseLike<{ data: T | null; error: { message: string } | null }>): Promise<T> {
  const { data, error } = await query
  if (error) throw new Error(error.message)
  return data as T
}

export const listReports = () =>
  unwrap<StaffReport[]>(
    supabase
      .from('reports')
      .select('*, report_events(id, seq, status, note, created_at), report_supports(count), responsible_bodies(name, kind)')
      .order('created_at', { ascending: false }),
  )

export const listBodies = () =>
  unwrap<ResponsibleBody[]>(supabase.from('responsible_bodies').select('*').order('name', { ascending: true }))

export const listStaff = () =>
  unwrap<StaffProfile[]>(supabase.from('staff_profiles').select('*').order('display_name', { ascending: true }))

// Every action a staff member can take goes through one of the database functions below. The
// database decides whether it is actually allowed; a rejection here always means the server said no.
async function call(fn: string, args: Record<string, unknown>): Promise<void> {
  const { error } = await supabase.rpc(fn, args)
  if (error) throw new Error(error.message)
}

export const claimReport = (reportId: string) => call('claim_report', { p_report_id: reportId })
export const rejectReport = (reportId: string, note?: string) => call('reject_report', { p_report_id: reportId, p_note: note ?? null })
export const advanceReport = (reportId: string, status: string, note?: string) =>
  call('advance_report', { p_report_id: reportId, p_status: status, p_note: note ?? null })
export const reassignReport = (reportId: string, bodyId: string) => call('admin_reassign_report', { p_report_id: reportId, p_body_id: bodyId })

export const linkStaff = (email: string, role: string, bodyId: string | null, displayName: string) =>
  call('admin_link_staff', { p_email: email, p_role: role, p_body_id: bodyId, p_display_name: displayName })
export const setStaffActive = (staffId: string, active: boolean) => call('admin_set_staff_active', { p_staff_id: staffId, p_active: active })

export const addBody = async (body: { name: string; kind: 'council' | 'contractor' | 'other'; tier: string | null; works_for_id: string | null }) => {
  const { error } = await supabase.from('responsible_bodies').insert(body)
  if (error) throw new Error(error.message)
}
