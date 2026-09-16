export type ReportCategory = 'fly-tipping' | 'pothole' | 'other'

export type ReportStatus = 'Reported'

export interface Report {
  id: string
  category: ReportCategory
  description: string
  photo_url: string | null
  lat: number
  lng: number
  status: ReportStatus
  created_at: string
}
