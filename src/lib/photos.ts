import { supabase } from './supabase'

export function photoUrl(path: string): string {
  return supabase.storage.from('report-photos').getPublicUrl(path).data.publicUrl
}
