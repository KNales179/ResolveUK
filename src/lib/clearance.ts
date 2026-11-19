import { supabase } from './supabase'

// Private land clearance (see supabase/requests.sql): a landowner, or someone acting for them,
// asks for quotes; licensed clearance companies whose area covers the spot quote; the asker
// accepts one; that company clears it and marks it done.

export type LandType = 'farm' | 'car_park' | 'business' | 'garden' | 'estate' | 'other'
export const LAND_LABEL: Record<LandType, string> = {
  farm: 'Farm or field',
  car_park: 'Car park',
  business: 'Business premises',
  garden: 'Private garden or drive',
  estate: 'Estate or woodland',
  other: 'Other private land',
}
export type RequestStatus = 'open' | 'accepted' | 'done' | 'cancelled'
export const REQUEST_STATUS_LABEL: Record<RequestStatus, string> = { open: 'Taking quotes', accepted: 'Company chosen', done: 'Cleared', cancelled: 'Cancelled' }

export interface ClearanceRequest {
  id: string
  requester_id: string
  requester_name: string
  land_type: LandType
  description: string
  waste_note: string | null
  photo_path: string | null
  lat: number
  lng: number
  place_label: string
  access_note: string | null
  status: RequestStatus
  accepted_quote_id: string | null
  created_at: string
  done_at: string | null
  done_note: string | null
  done_photo_path: string | null
  clearance_quotes?: { count: number }[]
}

export interface Quote {
  id: string
  request_id: string
  org_id: string
  price_pence: number
  when_text: string
  message: string | null
  status: 'sent' | 'accepted' | 'declined' | 'withdrawn'
  created_at: string
  organisations?: { name: string; waste_carrier_number: string | null; area_label: string } | null
}

export const pounds = (pence: number) => `£${(pence / 100).toLocaleString('en-GB', { minimumFractionDigits: pence % 100 ? 2 : 0, maximumFractionDigits: 2 })}`

const plain = (msg: string | undefined, fallback: string) => (msg && /^[A-Z][^\n]{8,160}$/.test(msg) && !/violates|syntax|relation|column|function/i.test(msg) ? msg : fallback)

export async function fetchRequests(): Promise<ClearanceRequest[] | null> {
  const { data, error } = await supabase.from('clearance_requests').select('*, clearance_quotes(count)').order('created_at', { ascending: false })
  return error ? null : (data as unknown as ClearanceRequest[])
}
export async function fetchRequest(id: string): Promise<ClearanceRequest | null> {
  const { data } = await supabase.from('clearance_requests').select('*').eq('id', id).maybeSingle()
  return (data as ClearanceRequest) ?? null
}
export async function fetchQuotes(requestId: string): Promise<Quote[]> {
  const { data } = await supabase.from('clearance_quotes').select('*, organisations(name, waste_carrier_number, area_label)').eq('request_id', requestId).order('price_pence')
  return (data as unknown as Quote[]) ?? []
}

export async function createRequest(f: { landType: LandType; description: string; placeLabel: string; lat: number; lng: number; wasteNote?: string; accessNote?: string; photo?: string | null }): Promise<string | { error: string }> {
  const { data, error } = await supabase.rpc('create_clearance_request', {
    p_land_type: f.landType, p_description: f.description, p_place_label: f.placeLabel, p_lat: f.lat, p_lng: f.lng,
    p_waste_note: f.wasteNote || null, p_access_note: f.accessNote || null, p_photo: f.photo ?? null, p_report: null,
  })
  if (error) return { error: /check constraint/i.test(error.message) ? 'Check the details: the description needs a few words, and the spot must be in Great Britain.' : plain(error.message, 'Your request could not be sent. Please try again.') }
  return data as string
}

const rpc = async (name: string, args: Record<string, unknown>, fallback: string) => {
  const { error } = await supabase.rpc(name, args)
  return error ? plain(error.message, fallback) : null
}
export const sendQuote = (requestId: string, orgId: string, pence: number, when: string, message: string) => rpc('send_quote', { p_request: requestId, p_org: orgId, p_price_pence: pence, p_when: when, p_message: message || null }, 'Your quote could not be sent. Please try again.')
export const withdrawQuote = (id: string) => rpc('withdraw_quote', { p_quote: id }, 'The quote could not be withdrawn.')
export const acceptQuote = (id: string) => rpc('accept_quote', { p_quote: id }, 'That quote could not be accepted. Please try again.')
export const cancelRequest = (id: string) => rpc('cancel_clearance_request', { p_request: id }, 'The request could not be cancelled.')
export const completeClearance = (id: string, note: string, photo: string | null) => rpc('complete_clearance', { p_request: id, p_note: note || null, p_photo: photo }, 'The job could not be marked done. Please try again.')
export async function fetchContact(id: string): Promise<{ name: string; email: string; access_note: string | null } | null> {
  const { data } = await supabase.rpc('request_contact', { p_request: id })
  return (data as Array<{ name: string; email: string; access_note: string | null }> | null)?.[0] ?? null
}

// ---- demo ----
const ago = (h: number) => new Date(Date.now() - h * 36e5).toISOString()
export const SAMPLE_REQUESTS: ClearanceRequest[] = [
  { id: 'sample-req-1', requester_id: 'demo', requester_name: 'Sam (demo)', land_type: 'farm', description: 'About twenty old tyres and a pile of builders rubble dumped inside the field gate overnight. The gate is now blocked for the tractor.', waste_note: 'Tyres, rubble, some plasterboard', photo_path: '/img/roadside-litter-480.webp', lat: 54.52, lng: -3.2, place_label: 'High Fell Farm, near Cockermouth', access_note: 'Gate is on the left past the cattle grid. Ring before you come.', status: 'open', accepted_quote_id: null, created_at: ago(20), done_at: null, done_note: null, done_photo_path: null, clearance_quotes: [{ count: 2 }] },
  { id: 'sample-req-2', requester_id: 'demo', requester_name: 'Sam (demo)', land_type: 'car_park', description: 'Mattresses and black bags left by the recycling bins at the back of the shop car park.', waste_note: 'Two mattresses, about eight bags', photo_path: '/img/rubbish-street-678.webp', lat: 54.6, lng: -3.14, place_label: 'Lakeside Stores car park, Keswick', access_note: null, status: 'done', accepted_quote_id: 'sample-q-3', created_at: ago(200), done_at: ago(150), done_note: 'Two mattresses and nine bags taken to the licensed site at Flusco. Waste transfer note emailed to you.', done_photo_path: '/img/trash-picking-700.webp', clearance_quotes: [{ count: 1 }] },
  { id: 'sample-req-3', requester_id: 'someone-else', requester_name: 'Pat', land_type: 'estate', description: 'Garden waste and an old sofa tipped at the woodland entrance on our estate road.', waste_note: 'Sofa, green waste', photo_path: '/img/litter-bottles-640.webp', lat: 54.48, lng: -3.3, place_label: 'Brackenthwaite Estate road', access_note: null, status: 'open', accepted_quote_id: null, created_at: ago(5), done_at: null, done_note: null, done_photo_path: null, clearance_quotes: [{ count: 0 }] },
]
export const SAMPLE_QUOTES: Quote[] = [
  { id: 'sample-q-1', request_id: 'sample-req-1', org_id: 'sample-org-3', price_pence: 32000, when_text: 'Thursday morning', message: 'Tyres go to a licensed recycler; the price includes disposal and a waste transfer note.', status: 'sent', created_at: ago(14), organisations: { name: 'Fellside Clearances Ltd', waste_carrier_number: 'CBDU123456', area_label: 'West and central Cumbria' } },
  { id: 'sample-q-2', request_id: 'sample-req-1', org_id: 'sample-org-x', price_pence: 28500, when_text: 'Within 3 working days', message: null, status: 'sent', created_at: ago(9), organisations: { name: 'Derwent Waste Services', waste_carrier_number: 'CBDU778812', area_label: 'Allerdale' } },
  { id: 'sample-q-3', request_id: 'sample-req-2', org_id: 'sample-org-3', price_pence: 14000, when_text: 'Tomorrow', message: null, status: 'accepted', created_at: ago(190), organisations: { name: 'Fellside Clearances Ltd', waste_carrier_number: 'CBDU123456', area_label: 'West and central Cumbria' } },
]
