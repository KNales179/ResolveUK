import { supabase } from './supabase'

// Comments and thanks on stories (see supabase/comments.sql). Comments appear straight away; the
// safety net is reporting (which hides a comment until an admin looks) and hiding by whoever looks
// after the story.
export interface StoryComment {
  id: string
  story_id: string
  author_id: string
  author_name: string
  author_role: 'resident' | 'organisation' | 'staff'
  body: string
  status: 'visible' | 'reported' | 'hidden'
  created_at: string
}

const plain = (msg: string | undefined, fallback: string) => (msg && /^[A-Z][^\n]{8,160}$/.test(msg) && !/violates|syntax|relation|column|function/i.test(msg) ? msg : fallback)

export async function fetchComments(storyId: string): Promise<StoryComment[]> {
  const { data } = await supabase.from('story_comments').select('*').eq('story_id', storyId).neq('status', 'hidden').order('created_at', { ascending: true })
  return (data as StoryComment[]) ?? []
}

export async function postComment(storyId: string, body: string): Promise<StoryComment | string> {
  const { data, error } = await supabase.from('story_comments').insert({ story_id: storyId, body: body.trim() }).select('*').single()
  if (error) return /check constraint|between/i.test(error.message) ? 'Write a little more.' : "Your comment didn't post. Please try again."
  return data as StoryComment
}

export async function deleteComment(id: string): Promise<boolean> {
  const { error } = await supabase.from('story_comments').delete().eq('id', id)
  return !error
}

const rpc = async (name: string, args: Record<string, unknown>, fallback: string) => {
  const { error } = await supabase.rpc(name, args)
  return error ? plain(error.message, fallback) : null
}
export const reportComment = (id: string, reason?: string) => rpc('report_comment', { p_comment: id, p_reason: reason ?? null }, "That didn't send. Please try again.")
export const hideComment = (id: string) => rpc('hide_comment', { p_comment: id }, "That comment couldn't be hidden. Please try again.")
export const reviewComment = (id: string, keep: boolean) => rpc('review_comment', { p_comment: id, p_keep: keep }, "That decision didn't save. Please try again.")

export async function canModerate(storyId: string): Promise<boolean> {
  const { data } = await supabase.rpc('can_moderate_story', { p_story: storyId })
  return data === true
}

export async function setThanks(storyId: string, on: boolean, userId: string): Promise<boolean> {
  const { error } = on ? await supabase.from('story_thanks').insert({ story_id: storyId }) : await supabase.from('story_thanks').delete().eq('story_id', storyId).eq('user_id', userId)
  return !error
}

export async function fetchMyThanks(userId: string): Promise<Set<string>> {
  const { data } = await supabase.from('story_thanks').select('story_id').eq('user_id', userId)
  return new Set(((data as Array<{ story_id: string }>) ?? []).map((r) => r.story_id))
}

// Admin: comments people have reported, with the post they're on.
export interface ReportedComment extends StoryComment {
  stories?: { body: string; author_name: string } | null
  comment_flags?: Array<{ reason: string | null }>
}
export async function fetchReportedComments(): Promise<ReportedComment[] | null> {
  const { data, error } = await supabase.from('story_comments').select('*, stories(body, author_name), comment_flags(reason)').eq('status', 'reported').order('created_at')
  return error ? null : (data as unknown as ReportedComment[])
}

// Before posting: does the comment look like it points at a person? Comments that name who did it
// put people at risk and can't be checked, so the composer asks the writer to think again.
export function riskyComment(text: string): string | null {
  const t = text.trim()
  if (/\b[A-Z]{2}[0-9]{2}\s?[A-Z]{3}\b/i.test(t)) return 'This looks like it includes a number plate.'
  if (/\b(no\.?|number|num)\s*\d{1,4}\b/i.test(t) || /\b\d{1,4}[a-z]?\s+[A-Z][a-z]+\s+(street|st|road|rd|lane|ln|terrace|avenue|ave|close|way|drive|court|crescent|place|gardens)\b/i.test(t)) return 'This looks like it includes a house number.'
  if (/\b(i know who|it was (him|her|them|the)|(he|she|they) (did|dumped|left) (it|this))\b/i.test(t)) return 'This looks like it says who did it.'
  return null
}

// Sample comments for the demo, keyed by sample story id.
const ago = (h: number) => new Date(Date.now() - h * 36e5).toISOString()
export const SAMPLE_COMMENTS: Record<string, StoryComment[]> = {
  'sample-update-0': [
    { id: 'sc1', story_id: 'sample-update-0', author_id: 'u1', author_name: 'Ruth', author_role: 'resident', body: "I'll be there with my two lads. Do we need to bring our own gloves?", status: 'visible', created_at: ago(1.5) },
    { id: 'sc2', story_id: 'sample-update-0', author_id: 'u2', author_name: 'Keswick Pickers', author_role: 'organisation', body: "No need, we'll have gloves, grabbers and bags for everyone. See you at 10!", status: 'visible', created_at: ago(1.2) },
  ],
  'sample-update-1': [{ id: 'sc3', story_id: 'sample-update-1', author_id: 'u3', author_name: 'Dev', author_role: 'resident', body: 'Brilliant, the bay has been blocked for a fortnight. Thank you.', status: 'visible', created_at: ago(6) }],
  'sample-story-approved-0': [{ id: 'sc4', story_id: 'sample-story-approved-0', author_id: 'u4', author_name: 'Sample District Council', author_role: 'staff', body: "Thanks Jo, we've passed this to the street-cleaning team for this week.", status: 'visible', created_at: ago(3) }],
}
