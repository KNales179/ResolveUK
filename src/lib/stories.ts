import { supabase } from './supabase'
import { SAMPLE_REPORTS } from './sampleReports'
import { SAMPLE_COMMENTS } from './comments'
import type { Report } from '../types'

// Stories: posts about a report (see supabase/stories.sql and jobs.sql). Three kinds: a problem
// (what's wrong), progress (what's being done) and resolved (how it was fixed, often with an after
// photo). A resident's story is only public once a Resolve admin approves it; a community group,
// clearance company or council posting about its own job publishes straight away.

export type StoryKind = 'problem' | 'progress' | 'resolved'
export type StoryStatus = 'pending' | 'approved' | 'changes_requested' | 'rejected'
export interface Story {
  id: string
  report_id: string
  author_name: string
  kind: StoryKind
  body: string
  author_role?: 'resident' | 'organisation' | 'staff'
  org_id?: string | null
  photo_path?: string | null
  story_comments?: { count: number }[]
  story_thanks?: { count: number }[]
  status: StoryStatus
  review_note: string | null
  created_at: string
  reports?: Pick<Report, 'id' | 'description' | 'photo_path' | 'category_code' | 'current_status' | 'created_at' | 'report_supports'> | null
}

export const STORY_STATUS_LABEL: Record<StoryStatus, string> = {
  pending: 'Waiting for approval',
  approved: 'Published',
  changes_requested: 'Changes asked for',
  rejected: 'Not published',
}

// What the card says the author did.
export const STORY_KIND_VERB: Record<StoryKind, string> = { problem: 'Posted a problem', progress: 'Posted an update', resolved: 'Posted how it was resolved' }
export const STORY_KIND_LABEL: Record<StoryKind, string> = { problem: 'Problem', progress: 'Update', resolved: 'Resolved' }

const WITH_REPORT = '*, reports(id, description, photo_path, category_code, current_status, created_at, report_supports(count))'

// With comment and thanks counts. If comments.sql hasn't been run yet, falls back to the stories
// alone, so the feed never goes empty because of it.
export async function fetchPublishedStories(limit = 20): Promise<Story[] | null> {
  const withCounts = await supabase.from('stories').select(`${WITH_REPORT}, story_comments(count), story_thanks(count)`).eq('status', 'approved').order('created_at', { ascending: false }).limit(limit)
  if (!withCounts.error) return withCounts.data as unknown as Story[]
  const { data, error } = await supabase.from('stories').select(WITH_REPORT).eq('status', 'approved').order('created_at', { ascending: false }).limit(limit)
  return error ? null : (data as unknown as Story[])
}

// The signed-in person's own stories on one report, whatever their status.
export async function fetchMyStories(reportId: string, authorId: string): Promise<Story[]> {
  const { data } = await supabase.from('stories').select('*').eq('report_id', reportId).eq('author_id', authorId).order('created_at', { ascending: false })
  return (data as unknown as Story[]) ?? []
}

// Every published story on one report, oldest first: the report's story so far.
export async function fetchReportStories(reportId: string): Promise<Story[]> {
  const { data } = await supabase.from('stories').select('*').eq('report_id', reportId).eq('status', 'approved').order('created_at', { ascending: true })
  return (data as unknown as Story[]) ?? []
}

export async function postStory(reportId: string, body: string, kind: StoryKind = 'problem'): Promise<string | null> {
  const { error } = await supabase.from('stories').insert({ report_id: reportId, body: body.trim(), kind })
  if (!error) return null
  if (/check constraint|between/i.test(error.message)) return 'Write a little more: at least a few words about what you saw.'
  return "Your story couldn't be sent just now. Please try again."
}

// Admin: stories waiting for a decision.
export async function fetchReviewQueue(): Promise<Story[] | null> {
  const { data, error } = await supabase.from('stories').select(WITH_REPORT).in('status', ['pending']).order('created_at', { ascending: true })
  return error ? null : (data as unknown as Story[])
}

export async function reviewStory(id: string, decision: 'approved' | 'changes_requested' | 'rejected', note?: string): Promise<string | null> {
  const { error } = await supabase.rpc('review_story', { p_story: id, p_decision: decision, p_note: note ?? null })
  return error ? 'That decision did not save. Please try again.' : null
}

// Sample stories for the demo (and for an empty feed), built on the shared sample reports so a
// "View report" link always opens something real-looking. Never sent anywhere.
const SAMPLE_TEXT = [
  ['Jo', 'Someone has dumped about ten black bags in the lay-by again. They are split open and spreading onto the verge, and the foxes have been at them.'],
  ['Priya', 'Bottles and cans all along the path by the river crossing. There is broken glass right where people walk their dogs, so please mind your step.'],
  ['Dev', 'Rubbish piled outside the terraced houses for over a week now. It is blocking the pavement for anyone with a pushchair or wheelchair.'],
  ['Morgan', 'Graffiti on the underpass wall has been there for months. It would be good to see it cleared before the school holidays.'],
] as const

export function sampleStories(status: StoryStatus = 'approved'): Story[] {
  const problems = sampleProblems(status)
  if (status !== 'approved') return problems
  return [...SAMPLE_UPDATES.map((u, i) => {
    const r = SAMPLE_REPORTS.find((x) => x.id === u.report)!
    return { id: `sample-update-${i}`, report_id: r.id, author_name: u.name, kind: u.kind, body: u.body, status: 'approved' as const, review_note: null, author_role: u.role, org_id: u.role === 'organisation' ? 'sample-org-1' : null, photo_path: null, created_at: new Date(Date.now() - u.hours * 3600 * 1000).toISOString(), reports: r }
  }), ...problems]
    .map((st, i): Story => ({ ...st, story_comments: [{ count: SAMPLE_COMMENTS[st.id]?.length ?? 0 }], story_thanks: [{ count: st.kind === 'problem' ? 0 : [12, 7, 23][i % 3] }] }))
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
}

// Updates from a group and a council in the demo feed.
const SAMPLE_UPDATES: Array<{ report: string; name: string; role: 'organisation' | 'staff'; kind: StoryKind; body: string; hours: number }> = [
  { report: 'sample-3', name: 'Keswick Pickers', role: 'organisation', kind: 'progress', body: "We've taken this one on. Six of us will be there Saturday at 10am with grabbers and bags. Come and help if you're nearby.", hours: 2 },
  { report: 'sample-4', name: 'Sample District Council', role: 'staff', kind: 'resolved', body: 'Our crew cleared the rubbish from the car park this morning and the bay is open again. Thanks to everyone who reported it.', hours: 8 },
  { report: 'sample-5', name: 'Keswick Pickers', role: 'organisation', kind: 'resolved', body: 'Four bags of litter collected from the lane, and the bin is being emptied weekly again. Thanks to Ruth and Tom for coming out.', hours: 30 },
]

function sampleProblems(status: StoryStatus): Story[] {
  return SAMPLE_REPORTS.slice(0, SAMPLE_TEXT.length).map((r, i) => ({
    id: `sample-story-${status}-${i}`,
    report_id: r.id,
    author_name: SAMPLE_TEXT[i][0],
    kind: 'problem',
    body: SAMPLE_TEXT[i][1],
    status,
    review_note: null,
    created_at: new Date(Date.now() - (i + 1) * 5 * 3600 * 1000).toISOString(),
    reports: r,
  }))
}
