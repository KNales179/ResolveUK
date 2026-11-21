import { useEffect, useState } from 'react'
import { Icon } from '../../components/ui/Icon'
import { fetchPendingOrgs, KIND_LABEL, reviewOrg, SAMPLE_ORGS, type Org } from '../../lib/orgs'
import { fetchReviewQueue, reviewStory, sampleStories, type Story } from '../../lib/stories'
import { AreaMap } from '../components/AreaMap'
import { ManagePeople } from '../../staff/Manage'
import { fetchReportedComments, reviewComment, type ReportedComment } from '../../lib/comments'
import { timeAgo } from '../../lib/format'
import { StoryCard } from '../components/StoryCard'
import { useAppSession } from '../session'

type Decision = 'approved' | 'changes_requested' | 'rejected'
const DONE: Record<Decision, string> = { approved: 'Published', changes_requested: 'Asked for changes', rejected: 'Not published' }

// Admin: residents' stories waiting for a decision (approve to publish; ask for changes with a
// note the author sees; or reject), newly registered community groups and clearance companies
// (each shown with its area on a map), and People: councils, contractors and staff accounts.
// In the demo nothing is saved.
export function AppAdmin() {
  const s = useAppSession()
  const [tab, setTab] = useState<'stories' | 'orgs' | 'comments' | 'people'>('stories')
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow mb-2">Checks and approvals</p>
          <h1 className="font-serif text-4xl sm:text-5xl">Admin</h1>
        </div>
        <div className="flex gap-1 rounded-xl border border-line bg-[var(--c-field)] p-1" role="group" aria-label="Queue">
          {(
            [
              ['stories', 'Stories'],
              ['orgs', 'Groups and companies'],
              ['comments', 'Reported comments'],
              ['people', 'People'],
            ] as const
          ).map(([id, label]) => (
            <button key={id} type="button" aria-pressed={tab === id} onClick={() => setTab(id)} className="rounded-lg px-4 py-2 text-sm font-semibold text-soft hover:text-ink aria-pressed:bg-accent-vivid aria-pressed:text-accent-ink">
              {label}
            </button>
          ))}
        </div>
      </div>
      {tab === 'stories' && <StoryQueue />}
      {tab === 'orgs' && <OrgQueue />}
      {tab === 'comments' && <CommentQueue />}
      {tab === 'people' && (
        <>
          <p className="mt-2 max-w-3xl text-soft">Councils and contractors that reports can go to, and the staff accounts that work on them. Switching someone off stops them signing in to the staff tools straight away.</p>
          {s.demo && (
            <p className="msg msg-info mt-5" role="status">
              Demo: these are sample people. Adding or switching someone off only changes this screen.
            </p>
          )}
          <div className="mt-6">
            <ManagePeople meId={s.userId ?? 'demo'} demo={s.demo} />
          </div>
        </>
      )}
    </div>
  )
}

function OrgQueue() {
  const s = useAppSession()
  const [queue, setQueue] = useState<Org[] | null>(() => (s.demo ? SAMPLE_ORGS.filter((o) => o.status === 'pending') : null))
  const [failed, setFailed] = useState(false)
  const [decided, setDecided] = useState<Record<string, 'approved' | 'rejected'>>({})
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (s.demo) return
    let alive = true
    void fetchPendingOrgs().then((list) => {
      if (!alive) return
      if (list === null) setFailed(true)
      else setQueue(list)
    })
    return () => {
      alive = false
    }
  }, [s.demo])

  async function decide(o: Org, d: 'approved' | 'rejected') {
    setError(null)
    if (!s.demo) {
      const problem = await reviewOrg(o.id, d)
      if (problem) return setError(problem)
    }
    setDecided((m) => ({ ...m, [o.id]: d }))
  }

  const waiting = (queue ?? []).filter((o) => !decided[o.id]).length

  return (
    <>
      <p className="mt-2 max-w-3xl text-soft">New community groups and clearance companies appear on the map only once you approve them. Check the area makes sense, and for a company, that its waste carrier number is on the Environment Agency's public register.</p>
      {s.demo && (
        <p className="msg msg-info mt-5" role="status">
          Demo: these are sample registrations. Your decisions only change what this screen shows.
        </p>
      )}
      {failed && (
        <p className="msg msg-error mt-5" role="alert">
          The registrations couldn't be loaded. Check that organisations.sql has been run, then reload.
        </p>
      )}
      {error && (
        <p className="msg msg-error mt-5" role="alert">
          {error}
        </p>
      )}
      {queue && (
        <p className="mt-6 text-sm font-semibold text-soft" aria-live="polite">
          {waiting === 0 ? 'Nothing waiting. All caught up.' : `${waiting} waiting for a decision`}
        </p>
      )}
      <div className="mt-4 grid gap-4">
        {(queue ?? []).map((o) => (
          <article key={o.id} className="card grid overflow-hidden rounded-3xl p-0 md:grid-cols-[1.1fr_1fr]">
            <div className="p-6">
              <span className={`pill ${o.kind === 'community' ? 'pill-cleared' : 'pill-progress'}`}>{KIND_LABEL[o.kind]}</span>
              <h2 className="mt-2 font-serif text-2xl">{o.name}</h2>
              <p className="text-sm text-soft">{o.area_label}</p>
              <p className="mt-3 text-sm leading-relaxed">{o.description}</p>
              <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-5 gap-y-1.5 text-sm">
                {o.meets && (
                  <>
                    <dt className="text-soft">Meets</dt>
                    <dd className="font-semibold">{o.meets}</dd>
                  </>
                )}
                {o.contact_email && (
                  <>
                    <dt className="text-soft">Contact</dt>
                    <dd className="font-semibold">{o.contact_email}</dd>
                  </>
                )}
                {o.waste_carrier_number && (
                  <>
                    <dt className="text-soft">Waste carrier no.</dt>
                    <dd className="num font-semibold">{o.waste_carrier_number}</dd>
                  </>
                )}
              </dl>
              {decided[o.id] ? (
                <p className="mt-5 flex items-center gap-2 text-sm font-semibold">
                  <Icon name="check" className="size-4 text-accent" /> {decided[o.id] === 'approved' ? 'Approved: now on the map' : 'Not approved'}
                </p>
              ) : (
                <div className="mt-5 flex flex-wrap gap-2">
                  <button type="button" className="btn btn-primary btn-sm" onClick={() => void decide(o, 'approved')}>
                    <Icon name="check" className="size-4" /> Approve
                  </button>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => void decide(o, 'rejected')}>
                    Reject
                  </button>
                </div>
              )}
            </div>
            <AreaMap orgs={[o]} focus={o.area} className="min-h-[260px] border-t border-line md:border-t-0 md:border-l" />
          </article>
        ))}
      </div>
    </>
  )
}

function StoryQueue() {
  const s = useAppSession()
  const [queue, setQueue] = useState<Story[] | null>(() => (s.demo ? sampleStories('pending') : null))
  const [failed, setFailed] = useState(false)
  const [decided, setDecided] = useState<Record<string, Decision>>({})

  useEffect(() => {
    if (s.demo) return
    let alive = true
    void fetchReviewQueue().then((list) => {
      if (!alive) return
      if (list === null) setFailed(true)
      else setQueue(list)
    })
    return () => {
      alive = false
    }
  }, [s.demo])

  const waiting = (queue ?? []).filter((st) => !decided[st.id]).length

  return (
    <>
      <p className="mt-2 max-w-3xl text-soft">Residents' stories stay private until you approve them. Check each one leaves out names, faces and number plates, and is about the problem it's attached to.</p>
      {s.demo && (
        <p className="msg msg-info mt-5" role="status">
          Demo: these are sample stories. Your decisions only change what this screen shows.
        </p>
      )}
      {failed && (
        <p className="msg msg-error mt-5" role="alert">
          The queue couldn't be loaded. Check that stories.sql has been run, then reload.
        </p>
      )}
      {queue && (
        <p className="mt-6 text-sm font-semibold text-soft" aria-live="polite">
          {waiting === 0 ? 'Nothing waiting. All caught up.' : `${waiting} waiting for a decision`}
        </p>
      )}
      <div className="mt-4 grid items-start gap-4 md:grid-cols-2">
        {(queue ?? []).map((st) => (
          <StoryCard key={st.id} story={st} footer={<Decide story={st} demo={s.demo} done={decided[st.id]} onDone={(d) => setDecided((m) => ({ ...m, [st.id]: d }))} />} />
        ))}
      </div>
    </>
  )
}

function Decide({ story, demo, done, onDone }: { story: Story; demo: boolean; done?: Decision; onDone: (d: Decision) => void }) {
  const [asking, setAsking] = useState(false)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function decide(d: Decision) {
    setError(null)
    if (d === 'changes_requested' && note.trim().length < 5) {
      setError('Say what needs changing, so the author knows what to fix.')
      return
    }
    if (demo) return onDone(d)
    setBusy(true)
    const problem = await reviewStory(story.id, d, d === 'changes_requested' ? note : undefined)
    setBusy(false)
    if (problem) setError(problem)
    else onDone(d)
  }

  if (done)
    return (
      <p className="flex items-center gap-2 border-t border-line px-4 py-3 text-sm font-semibold">
        <Icon name="check" className="size-4 text-accent" /> {DONE[done]}
      </p>
    )

  return (
    <div className="border-t border-line px-4 py-3">
      {asking ? (
        <div>
          <label htmlFor={`note-${story.id}`} className="mb-1.5 block text-sm font-semibold">
            What needs changing?
          </label>
          <textarea id={`note-${story.id}`} className="input min-h-20" maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} placeholder="For example: please leave out the house number." />
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" className="btn btn-primary btn-sm" disabled={busy} onClick={() => void decide('changes_requested')}>
              Send to the author
            </button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setAsking(false)}>
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn btn-primary btn-sm" disabled={busy} onClick={() => void decide('approved')}>
            <Icon name="check" className="size-4" /> Approve and publish
          </button>
          <button type="button" className="btn btn-ghost btn-sm" disabled={busy} onClick={() => setAsking(true)}>
            Ask for changes
          </button>
          <button type="button" className="btn btn-ghost btn-sm" disabled={busy} onClick={() => void decide('rejected')}>
            Reject
          </button>
        </div>
      )}
      {error && (
        <p className="msg msg-error mt-3" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}

// Comments people have reported. Each is hidden until decided: keep it (it comes back) or remove it.
const DEMO_REPORTED: ReportedComment[] = [
  { id: 'rc1', story_id: 'sample-story-approved-0', author_id: 'u9', author_name: 'Tam', author_role: 'resident', body: 'I know who did this, it was the lot at number 12 again.', status: 'reported', created_at: new Date(Date.now() - 2 * 36e5).toISOString(), stories: { body: 'Someone has dumped about ten black bags in the lay-by again.', author_name: 'Jo' }, comment_flags: [{ reason: 'Names a house' }, { reason: null }] },
  { id: 'rc2', story_id: 'sample-update-0', author_id: 'u8', author_name: 'Kit', author_role: 'resident', body: 'Is the car park open on Saturday morning?', status: 'reported', created_at: new Date(Date.now() - 5 * 36e5).toISOString(), stories: { body: "We've taken this one on. Six of us will be there Saturday at 10am.", author_name: 'Keswick Pickers' }, comment_flags: [{ reason: null }] },
]

function CommentQueue() {
  const s = useAppSession()
  const [queue, setQueue] = useState<ReportedComment[] | null>(() => (s.demo ? DEMO_REPORTED : null))
  const [failed, setFailed] = useState(false)
  const [decided, setDecided] = useState<Record<string, boolean>>({})
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (s.demo) return
    let alive = true
    void fetchReportedComments().then((list) => {
      if (!alive) return
      if (list === null) setFailed(true)
      else setQueue(list)
    })
    return () => {
      alive = false
    }
  }, [s.demo])

  async function decide(c: ReportedComment, keep: boolean) {
    setError(null)
    if (!s.demo) {
      const problem = await reviewComment(c.id, keep)
      if (problem) return setError(problem)
    }
    setDecided((d) => ({ ...d, [c.id]: keep }))
  }

  const waiting = (queue ?? []).filter((c) => decided[c.id] === undefined).length
  return (
    <>
      <p className="mt-2 max-w-3xl text-soft">A comment someone has reported is hidden from everyone but its author until you decide. Remove anything that names or points at a person, a house or a number plate, or that is abusive. Keep anything that was reported by mistake.</p>
      {s.demo && (
        <p className="msg msg-info mt-5" role="status">
          Demo: these are sample comments. Your decisions only change what this screen shows.
        </p>
      )}
      {failed && (
        <p className="msg msg-error mt-5" role="alert">
          Reported comments couldn't be loaded. Check that comments.sql has been run, then reload.
        </p>
      )}
      {error && (
        <p className="msg msg-error mt-5" role="alert">
          {error}
        </p>
      )}
      {queue && (
        <p className="mt-6 text-sm font-semibold text-soft" aria-live="polite">
          {waiting === 0 ? 'Nothing waiting. All caught up.' : `${waiting} waiting for a decision`}
        </p>
      )}
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {(queue ?? []).map((c) => (
          <article key={c.id} className="card rounded-2xl p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-honey-text">On {c.stories?.author_name ?? 'a post'}'s post</p>
            <p className="mt-1 line-clamp-2 text-sm text-soft">{c.stories?.body}</p>
            <div className="comment-bubble mt-3 rounded-2xl px-4 py-3">
              <p className="text-sm font-semibold">
                {c.author_name} <span className="font-normal text-soft">· {timeAgo(c.created_at)}</span>
              </p>
              <p className="mt-0.5">{c.body}</p>
            </div>
            <p className="mt-2 text-sm text-soft">
              Reported by {c.comment_flags?.length ?? 1} {(c.comment_flags?.length ?? 1) === 1 ? 'person' : 'people'}
              {c.comment_flags?.some((f) => f.reason) && `: ${c.comment_flags.filter((f) => f.reason).map((f) => `"${f.reason}"`).join(', ')}`}
            </p>
            {decided[c.id] !== undefined ? (
              <p className="mt-4 flex items-center gap-2 text-sm font-semibold">
                <Icon name="check" className="size-4 text-accent" /> {decided[c.id] ? 'Kept: it is back on the post' : 'Removed'}
              </p>
            ) : (
              <div className="mt-4 flex flex-wrap gap-2">
                <button type="button" className="btn btn-primary btn-sm" onClick={() => void decide(c, false)}>
                  Remove it
                </button>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => void decide(c, true)}>
                  Keep it
                </button>
              </div>
            )}
          </article>
        ))}
      </div>
    </>
  )
}
