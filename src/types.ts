export type ReportStatus =
  | 'reported'
  | 'routed'
  | 'acknowledged'
  | 'scheduled'
  | 'cleared'
  | 'verified'
  | 'reopened'
  | 'duplicate'
  | 'rejected'

export type LocationSource = 'gps' | 'manual'

export interface Category {
  code: string
  label: string
  position: number
}

export interface ReportEvent {
  id: string
  seq: number
  status: ReportStatus
  note: string | null
  created_at: string
}

export interface Report {
  id: string
  category_code: string
  description: string
  photo_path: string
  lat: number
  lng: number
  location_accuracy_m: number | null
  location_source: LocationSource
  responsible_body_id: string | null
  current_status: ReportStatus
  created_at: string
  report_events?: ReportEvent[]
  report_supports?: { count: number }[]
  responsible_bodies?: { name: string } | null
}

export interface Position {
  lat: number
  lng: number
  accuracy: number | null
  source: LocationSource
}

export interface ResponsibleBody {
  id: string
  name: string
  kind: 'council' | 'contractor'
  tier: 'unitary' | 'county' | 'district' | null
  works_for_id: string | null
  functions: string[]
  active: boolean
}

export type StaffRole = 'staff' | 'reviewer' | 'resolve_admin'

export interface StaffProfile {
  id: string
  body_id: string | null
  role: StaffRole
  display_name: string
  active: boolean
}

// A report as the staff dashboard sees it: with its history and the name of whoever holds it.
export interface StaffReport extends Report {
  responsible_bodies: { name: string } | null
}

// A result of the "is this the same problem?" search.
export interface NearbyReport {
  id: string
  category_code: string
  description: string
  photo_path: string
  current_status: ReportStatus
  created_at: string
  distance_m: number
  backers: number
}
