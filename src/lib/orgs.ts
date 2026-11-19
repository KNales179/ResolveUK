import { supabase } from './supabase'

// Organisations: community groups and clearance companies (see supabase/organisations.sql). Each
// covers an area drawn on the map, and is checked by a Resolve admin before it appears.

export type OrgKind = 'community' | 'commercial'
export type OrgStatus = 'pending' | 'approved' | 'rejected'
export interface Polygon {
  type: 'Polygon'
  coordinates: number[][][]
}
export interface Org {
  id: string
  kind: OrgKind
  name: string
  description: string
  area: Polygon
  area_label: string
  meets: string | null
  contact_email: string | null
  waste_carrier_number: string | null
  status: OrgStatus
  review_note: string | null
  member_count: number
  created_at: string
}
export interface Membership {
  org_id: string
  user_id: string
  role: 'lead' | 'member'
  status: 'pending' | 'active' | 'declined' | 'left'
  display_name: string
  answers: { why?: string; when?: string; help?: string; adult?: boolean; safety?: boolean }
  created_at: string
}

export const KIND_LABEL: Record<OrgKind, string> = { community: 'Community group', commercial: 'Clearance company' }

export async function fetchOrgs(): Promise<Org[] | null> {
  const { data, error } = await supabase.from('organisations').select('*').eq('status', 'approved').order('name')
  return error ? null : (data as Org[])
}
export async function fetchOrg(id: string): Promise<Org | null> {
  const { data } = await supabase.from('organisations').select('*').eq('id', id).maybeSingle()
  return (data as Org | null) ?? null
}
export async function fetchMyMemberships(userId: string): Promise<Membership[]> {
  const { data } = await supabase.from('organisation_members').select('*').eq('user_id', userId)
  return (data as Membership[]) ?? []
}
export async function fetchMembers(orgId: string): Promise<Membership[]> {
  const { data } = await supabase.from('organisation_members').select('*').eq('org_id', orgId).order('created_at')
  return (data as Membership[]) ?? []
}
export async function fetchPendingOrgs(): Promise<Org[] | null> {
  const { data, error } = await supabase.from('organisations').select('*').eq('status', 'pending').order('created_at')
  return error ? null : (data as Org[])
}

const plain = (msg: string, fallback: string) => (/[A-Z][a-z]+ [a-z]/.test(msg) && msg.length < 120 && !/violates|syntax|relation|column/i.test(msg) ? msg : fallback)

export async function registerOrg(f: { kind: OrgKind; name: string; description: string; area: Polygon; areaLabel: string; meets?: string; contactEmail?: string; wasteCarrierNumber?: string }): Promise<string | null> {
  const { error } = await supabase.rpc('register_organisation', {
    p_kind: f.kind, p_name: f.name, p_description: f.description, p_area: f.area, p_area_label: f.areaLabel,
    p_meets: f.meets ?? null, p_contact_email: f.contactEmail ?? null, p_waste_carrier_number: f.wasteCarrierNumber ?? null,
  })
  return error ? plain(error.message, "That couldn't be sent just now. Please check the details and try again.") : null
}
export async function applyToJoin(orgId: string, answers: Membership['answers']): Promise<string | null> {
  const { error } = await supabase.rpc('apply_to_join', { p_org: orgId, p_answers: answers })
  return error ? plain(error.message, "Your application couldn't be sent just now. Please try again.") : null
}
export async function decideMember(orgId: string, userId: string, decision: 'approve' | 'decline' | 'make_lead'): Promise<string | null> {
  const { error } = await supabase.rpc('decide_member', { p_org: orgId, p_user: userId, p_decision: decision })
  return error ? 'That did not save. Please try again.' : null
}
export async function leaveOrg(orgId: string): Promise<string | null> {
  const { error } = await supabase.rpc('leave_organisation', { p_org: orgId })
  return error ? 'That did not save. Please try again.' : null
}
export async function reviewOrg(orgId: string, decision: 'approved' | 'rejected', note?: string): Promise<string | null> {
  const { error } = await supabase.rpc('review_organisation', { p_org: orgId, p_decision: decision, p_note: note ?? null })
  return error ? 'That decision did not save. Please try again.' : null
}

// The middle of an area, for labels and for centring a map on it.
export function centreOf(p: Polygon): [number, number] {
  const ring = p.coordinates[0].slice(0, -1)
  const lng = ring.reduce((s, c) => s + c[0], 0) / ring.length
  const lat = ring.reduce((s, c) => s + c[1], 0) / ring.length
  return [lng, lat]
}

// ---- Sample organisations for the demo (never sent anywhere) ----
function blob(lng: number, lat: number, rx: number, ry: number): Polygon {
  const pts = Array.from({ length: 9 }, (_, i) => {
    const a = (i / 9) * Math.PI * 2
    const wobble = 1 + 0.18 * Math.sin(a * 3 + lng)
    return [+(lng + Math.cos(a) * rx * wobble).toFixed(4), +(lat + Math.sin(a) * ry * wobble).toFixed(4)]
  })
  return { type: 'Polygon', coordinates: [[...pts, pts[0]]] }
}
const day = (n: number) => new Date(Date.now() - n * 86400000).toISOString()

export const SAMPLE_ORGS: Org[] = [
  { id: 'sample-org-1', kind: 'community', name: 'Keswick Pickers', description: 'Litter picks around Keswick and the Derwentwater shore. Grabbers, gloves and hi-vis provided.', area: blob(-3.11, 54.6, 0.05, 0.03), area_label: 'Keswick and Derwentwater', meets: 'First Saturday of the month, 10am', contact_email: null, waste_carrier_number: null, status: 'approved', review_note: null, member_count: 18, created_at: day(120) },
  { id: 'sample-org-2', kind: 'community', name: 'Tyneside Litter Heroes', description: 'Quick evening picks along the Quayside and the river paths, plus a big spring clean every March.', area: blob(-1.61, 54.975, 0.06, 0.025), area_label: 'Newcastle Quayside', meets: 'Wednesday evenings, 6pm', contact_email: null, waste_carrier_number: null, status: 'approved', review_note: null, member_count: 34, created_at: day(200) },
  { id: 'sample-org-3', kind: 'commercial', name: 'Fellside Clearances Ltd', description: 'Licensed clearance of fly-tipped waste from farms, estates and private land across Cumbria.', area: blob(-3.25, 54.5, 0.35, 0.2), area_label: 'West and central Cumbria', meets: null, contact_email: 'hello@fellside.example', waste_carrier_number: 'CBDU123456', status: 'approved', review_note: null, member_count: 4, created_at: day(90) },
  { id: 'sample-org-4', kind: 'community', name: 'Ancoats Street Team', description: 'Neighbours keeping the streets and canal paths of Ancoats tidy.', area: blob(-2.23, 53.484, 0.025, 0.014), area_label: 'Ancoats, Manchester', meets: 'Sunday mornings', contact_email: null, waste_carrier_number: null, status: 'pending', review_note: null, member_count: 1, created_at: day(1) },
  { id: 'sample-org-5', kind: 'commercial', name: 'Avon Waste Away', description: 'Same-week clearance of dumped rubbish on private car parks and business premises in Bristol.', area: blob(-2.59, 51.455, 0.08, 0.045), area_label: 'Bristol and Bath', meets: null, contact_email: 'jobs@avonwaste.example', waste_carrier_number: 'CBDL998877', status: 'pending', review_note: null, member_count: 1, created_at: day(2) },
]
