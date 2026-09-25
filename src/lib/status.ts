import type { ReportStatus } from '../types'

// The stages a report moves through. "Cleared" is the responsible body's own word;
// "Outcome verified" only happens once independent people have confirmed it with photos.
export const STATUS_LABELS: Record<ReportStatus, string> = {
  reported: 'Reported',
  routed: 'Responsible body identified',
  acknowledged: 'Acknowledged',
  scheduled: 'Clearance scheduled',
  cleared: 'Cleared',
  verified: 'Outcome verified',
  reopened: 'Reopened',
  duplicate: 'Duplicate',
  rejected: 'Rejected',
}

// Reports that can still be backed: not cleared, verified, a duplicate or rejected.
export const OPEN_STATUSES: ReportStatus[] = ['reported', 'routed', 'acknowledged', 'scheduled', 'reopened']

// The five groups the public list filters by, and the colour of the label for each.
export type StatusGroup = 'reported' | 'progress' | 'cleared' | 'verified' | 'closed'

export function statusGroup(status: ReportStatus): StatusGroup {
  if (status === 'reported') return 'reported'
  if (status === 'cleared') return 'cleared'
  if (status === 'verified') return 'verified'
  if (status === 'duplicate' || status === 'rejected') return 'closed'
  return 'progress' // responsible body identified, acknowledged, scheduled, reopened
}
