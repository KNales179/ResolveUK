import { supabase } from './supabase'

// A real storage key is a plain filename with no leading slash. A path that already looks like a
// URL (used by the temporary sample reports on ReportsPage, which point at the site's own local
// images rather than a Supabase storage key) is returned as-is instead of being run through the
// storage client.
export function photoUrl(path: string): string {
  if (path.startsWith('/') || path.startsWith('http')) return path
  return supabase.storage.from('report-photos').getPublicUrl(path).data.publicUrl
}
