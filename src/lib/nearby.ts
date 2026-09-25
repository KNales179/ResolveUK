import { backedReportIds, deviceToken, rememberBacked } from './device'
import { supabase } from './supabase'
import type { NearbyReport, Position } from '../types'

// Open reports of the same type close to this spot. If the search fails for any reason the person is not
// stopped from sending their report, so this returns nothing rather than an error.
export async function findNearby(position: Position, category: string): Promise<NearbyReport[]> {
  const { data, error } = await supabase.rpc('nearby_reports', {
    p_lat: position.lat,
    p_lng: position.lng,
    p_category: category,
    p_accuracy_m: position.accuracy,
  })
  if (error || !Array.isArray(data)) return []
  return data as NearbyReport[]
}

// Adds this device's support to a report. Returns "already" if this device backed it before.
export async function backReport(reportId: string): Promise<'added' | 'already'> {
  if (backedReportIds().has(reportId)) return 'already'
  const { error } = await supabase
    .from('report_supports')
    .insert({ report_id: reportId, device_token: deviceToken(), kind: 'same_issue' })
  if (error) {
    if (error.code === '23505') {
      rememberBacked(reportId)
      return 'already'
    }
    throw new Error(error.message)
  }
  rememberBacked(reportId)
  return 'added'
}
