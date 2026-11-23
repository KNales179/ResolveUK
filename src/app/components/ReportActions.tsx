import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Icon } from '../../components/ui/Icon'
import { timeAgo } from '../../lib/format'
import { photoUrl } from '../../lib/photos'
import { celebrate } from '../../lib/feedback'
import { checkCleared, fetchJobsForReport, isFollowing, JOB_STATUS_LABEL, offerJob, orgsForReport, postStaffUpdate, sampleJobs, setFollowing, VOLUNTEER_SAFE, withdrawJob, type Job } from '../../lib/jobs'
import { KIND_LABEL } from '../../lib/orgs'
import { fetchReportStories, sampleStories, STORY_KIND_LABEL, type Story } from '../../lib/stories'
import type { ReportTools } from '../../pages/ReportsPage'
import type { Report } from '../../types'
import { useOrgs } from '../orgsData'
import { canSee, useAppSession } from '../session'
import { StoryComposer } from './StoryComposer'

const OFFERABLE = ['routed', 'acknowledged', 'scheduled', 'reopened']
const isSample = (id: string) => id.startsWith('sample-')

// Everything the app adds to a report's panel, in the order people need it: who is dealing with
// it (and following it), the reporter's "is it clear now?" check, staff tools (offer it as a job,
// post an official update), the report's story so far, and posting your own story.
export function ReportActions({ report, tools }: { report: Report; tools: ReportTools }) {
  const s = useAppSession()
  const demo = s.demo || isSample(report.id)
  const [jobs, setJobs] = useState<Job[]>(() => (demo ? sampleJobs().filter((j) => j.report_id === report.id && j.status !== 'offered') : []))
  const [stories, setStories] = useState<Story[]>(() => (demo ? sampleStories('approved').filter((st) => st.report_id === report.id && st.kind !== 'problem').reverse() : []))
  const [tick, setTick] = useState(0)

  useEffect(() => {
    if (demo) return
    let alive = true
    void Promise.all([fetchJobsForReport(report.id), fetchReportStories(report.id)]).then(([j, st]) => {
      if (!alive) return
      setJobs(j)
      setStories(st)
    })
    return () => {
      alive = false
    }
  }, [report.id, demo, tick])

  const live = jobs.find((j) => j.status === 'offered' || j.status === 'accepted')
  const done = jobs.find((j) => j.status === 'done')
  const after = () => {
    setTick((t) => t + 1)
    tools.refresh()
  }

  return (
    <div className="grid gap-5">
      <WhoHasIt report={report} live={live} done={done} demo={demo} />
      <CheckPanel report={report} demo={demo} onDone={(clear) => {
        tools.patch(report.id, { current_status: clear ? 'verified' : 'reopened' })
        after()
      }} />
      {canSee(s.role, 'staff') && (
        <StaffPanel
          report={report}
          live={live}
          demo={demo}
          onJobs={(j) => {
            setJobs(j)
            if (!demo) after()
          }}
          jobs={jobs}
          onStory={(st) => {
            if (demo) setStories((list) => [...list, st])
            else after()
          }}
        />
      )}
      {stories.length > 0 && <StorySoFar stories={stories} report={report} />}
      <StoryComposer key={report.id} report={report} />
    </div>
  )
}

// "Who's dealing with it": the body, the group or company with the job, and a Follow button.
function WhoHasIt({ report, live, done, demo }: { report: Report; live?: Job; done?: Job; demo: boolean }) {
  const s = useAppSession()
  const [following, setFollow] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (demo || !s.userId) return
    let alive = true
    void isFollowing(report.id).then((f) => {
      if (alive) setFollow(f)
    })
    return () => {
      alive = false
    }
  }, [report.id, demo, s.userId])

  // Switches straight away, then switches back if the server says no.
  async function toggle(el?: HTMLElement) {
    const next = !following
    if (next) celebrate(el ?? null)
    setFollow(next)
    if (demo || !s.userId) return
    setBusy(true)
    if (!(await setFollowing(report.id, next, s.userId))) setFollow(!next)
    setBusy(false)
  }

  const team = live?.status === 'accepted' ? live : done
  return (
    <section className="rounded-2xl border border-line bg-[var(--c-field)] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-honey-text">Who's dealing with it</p>
          <p className="mt-1 font-semibold">{report.responsible_bodies?.name ?? 'Not assigned yet'}</p>
          {team?.organisations && (
            <p className="mt-1 flex items-center gap-1.5 text-sm">
              <Icon name="users" className="size-4 text-accent" />
              <Link to={`/app/community/${team.org_id}`} className="font-semibold underline-offset-2 hover:underline">
                {team.organisations.name}
              </Link>
              <span className="text-soft">{team.status === 'done' ? 'cleared it' : 'is clearing it'}</span>
            </p>
          )}
        </div>
        <button type="button" aria-pressed={following} className="btn btn-ghost btn-sm" onClick={(e) => void toggle(e.currentTarget)} disabled={busy}>
          <Icon name={following ? 'check' : 'bell'} className="size-4" /> {following ? 'Following' : 'Follow'}
        </button>
      </div>
      {following && <p className="mt-2 text-xs text-soft">You'll get a notification each time this report moves on.</p>}
    </section>
  )
}

// The person who reported it is asked to check once it's cleared.
function CheckPanel({ report, demo, onDone }: { report: Report; demo: boolean; onDone: (clear: boolean) => void }) {
  const s = useAppSession()
  const [still, setStill] = useState(false)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [answered, setAnswered] = useState<boolean | null>(null)
  // In the demo the resident view stands in for whoever reported the cleared sample report.
  const mine = demo ? s.role === 'resident' : !!s.userId && report.reporter_id === s.userId
  if (!mine || (report.current_status !== 'cleared' && answered === null)) return null

  async function answer(clear: boolean) {
    setError(null)
    if (!demo) {
      setBusy(true)
      const problem = await checkCleared(report.id, clear, note)
      setBusy(false)
      if (problem) return setError(problem)
    }
    setAnswered(clear)
    onDone(clear)
  }

  if (answered !== null)
    return (
      <p className="msg msg-info" role="status">
        {answered ? 'Thanks for checking. The report is now marked as confirmed clear.' : "Thanks. The report is reopened, so the council can send someone back."}
        {demo && ' (Demo: nothing was sent.)'}
      </p>
    )

  return (
    <section className="check-panel rounded-2xl p-5">
      <h3 className="flex items-center gap-2 text-base font-bold">
        <Icon name="eye" className="size-4" /> You reported this. Is it clear now?
      </h3>
      <p className="mt-1 text-sm">It's been marked as cleared. If you can, take a look and let everyone know.</p>
      {still && (
        <div className="mt-3">
          <label htmlFor="still-note" className="mb-1.5 block text-sm font-semibold">
            What's still there? <span className="font-normal text-soft">(optional)</span>
          </label>
          <input id="still-note" className="input" maxLength={300} value={note} onChange={(e) => setNote(e.target.value)} placeholder="For example: half the bags are still behind the wall" />
        </div>
      )}
      {error && (
        <p className="msg msg-error mt-3" role="alert">
          {error}
        </p>
      )}
      <div className="mt-4 flex flex-wrap gap-2">
        {still ? (
          <>
            <button type="button" className="btn btn-primary btn-sm" disabled={busy} onClick={() => void answer(false)}>
              Reopen the report
            </button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setStill(false)}>
              Cancel
            </button>
          </>
        ) : (
          <>
            <button type="button" className="btn btn-primary btn-sm" disabled={busy} onClick={() => void answer(true)}>
              <Icon name="check" className="size-4" /> Yes, it's clear
            </button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setStill(true)}>
              No, it's still there
            </button>
          </>
        )}
      </div>
    </section>
  )
}

// Staff and admins: offer the report as a job to a group or company, withdraw it, or post an
// official update.
function StaffPanel({ report, live, jobs, demo, onJobs, onStory }: { report: Report; live?: Job; jobs: Job[]; demo: boolean; onJobs: (j: Job[]) => void; onStory: (st: Story) => void }) {
  const s = useAppSession()
  const { orgs } = useOrgs()
  const [offering, setOffering] = useState(false)
  const [pick, setPick] = useState<string | null>(null)
  const [safe, setSafe] = useState(false)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [kind, setKind] = useState<'progress' | 'resolved'>('progress')
  const [text, setText] = useState('')
  const [posted, setPosted] = useState(false)

  const ranked = useMemo(() => orgsForReport(orgs ?? [], report).slice(0, 8), [orgs, report])
  const safeForVolunteers = VOLUNTEER_SAFE.has(report.category_code)
  const chosen = ranked.find((x) => x.org.id === pick)?.org
  const canOffer = OFFERABLE.includes(report.current_status)

  async function offer() {
    setError(null)
    if (!chosen) return setError('Choose a group or company first.')
    if (chosen.kind === 'community' && !safe) return setError('Tick the box to confirm the job is safe for volunteers.')
    if (!demo) {
      setBusy(true)
      const problem = await offerJob(report.id, chosen.id, note, safe)
      setBusy(false)
      if (problem) return setError(problem)
    }
    const job: Job = { id: `local-${Date.now()}`, report_id: report.id, org_id: chosen.id, status: 'offered', note: note || null, reply_note: null, created_at: new Date().toISOString(), responded_at: null, completed_at: null, organisations: { name: chosen.name, kind: chosen.kind } }
    onJobs([job, ...jobs])
    setOffering(false)
    setPick(null)
    setSafe(false)
    setNote('')
  }

  async function withdraw(j: Job) {
    setError(null)
    if (!demo) {
      const problem = await withdrawJob(j.id)
      if (problem) return setError(problem)
    }
    onJobs(jobs.map((x) => (x.id === j.id ? { ...x, status: 'withdrawn' } : x)))
  }

  async function post() {
    setError(null)
    if (text.trim().length < 10) return setError('Write a little more: at least a few words.')
    if (!demo) {
      setBusy(true)
      const problem = await postStaffUpdate(report.id, kind, text)
      setBusy(false)
      if (problem) return setError(problem)
    }
    onStory({ id: `local-${Date.now()}`, report_id: report.id, author_name: s.role === 'admin' ? 'Resolve UK' : (report.responsible_bodies?.name ?? 'The council'), kind, body: text.trim(), status: 'approved', review_note: null, author_role: 'staff', created_at: new Date().toISOString() })
    setText('')
    setPosted(true)
  }

  return (
    <section className="staff-panel rounded-2xl p-5">
      <h3 className="flex items-center gap-2 text-base font-bold">
        <Icon name="building" className="size-4" /> {s.role === 'admin' ? 'Admin' : 'Staff'} tools
      </h3>

      {/* The job */}
      <div className="mt-3">
        {live ? (
          <div className="rounded-xl border border-line bg-[var(--c-surface)] p-3 text-sm">
            <p className="font-semibold">{live.organisations?.name}</p>
            <p className="text-soft">
              {JOB_STATUS_LABEL[live.status]} · offered {timeAgo(live.created_at)}
            </p>
            {live.reply_note && <p className="mt-1">"{live.reply_note}"</p>}
            <button type="button" className="btn btn-ghost btn-sm mt-2" onClick={() => void withdraw(live)}>
              Withdraw the job
            </button>
          </div>
        ) : !canOffer ? (
          <p className="text-sm text-soft">
            {report.current_status === 'reported' ? 'Claim this report for your council or contractor first, in the staff area; then it can be offered as a job.' : 'This report is past the point where it can be offered as a job.'}
          </p>
        ) : offering ? (
          <div>
            <p className="text-sm font-semibold">Offer it to</p>
            {!safeForVolunteers && <p className="mt-1 text-xs text-soft">This kind of problem isn't offered to volunteer groups, only to licensed companies.</p>}
            <ul className="mt-2 grid gap-2" role="radiogroup" aria-label="Group or company">
              {ranked.length === 0 && <li className="text-sm text-soft">No approved groups or companies yet.</li>}
              {ranked.map(({ org, covers, km }) => {
                const blocked = org.kind === 'community' && !safeForVolunteers
                return (
                  <li key={org.id}>
                    <button
                      type="button"
                      role="radio"
                      aria-checked={pick === org.id}
                      disabled={blocked}
                      onClick={() => setPick(org.id)}
                      className="org-choice flex w-full items-center justify-between gap-3 rounded-xl p-3 text-left text-sm"
                    >
                      <span className="min-w-0">
                        <span className="block truncate font-semibold">{org.name}</span>
                        <span className="text-xs text-soft">
                          {KIND_LABEL[org.kind]} · {covers ? 'Covers this spot' : `${km < 10 ? km.toFixed(1) : Math.round(km)} km away`}
                        </span>
                      </span>
                      {covers && <span className="pill pill-cleared shrink-0">Local</span>}
                    </button>
                  </li>
                )
              })}
            </ul>
            {chosen?.kind === 'community' && (
              <label className="mt-3 flex items-start gap-2.5 text-sm">
                <input type="checkbox" className="mt-1 size-4 accent-[var(--c-accent-ink)]" checked={safe} onChange={(e) => setSafe(e.target.checked)} />
                I've checked this is safe for volunteers: no needles, chemicals, asbestos, heavy items or busy road.
              </label>
            )}
            <label htmlFor="job-note" className="mb-1.5 mt-3 block text-sm font-semibold">
              Note for them <span className="font-normal text-soft">(optional, shown with the job)</span>
            </label>
            <input id="job-note" className="input" maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} placeholder="For example: the bags are behind the bus shelter" />
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" className="btn btn-primary btn-sm" disabled={busy} onClick={() => void offer()}>
                {busy ? 'Sending…' : 'Offer the job'}
              </button>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setOffering(false)}>
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button type="button" className="btn btn-primary btn-sm" onClick={() => setOffering(true)}>
            <Icon name="users" className="size-4" /> Offer as a job to a group or company
          </button>
        )}
      </div>

      {/* An official update */}
      <div className="mt-5 border-t border-line pt-4">
        <p className="text-sm font-semibold">Post an official update</p>
        <div className="mt-2 seg flex flex-wrap gap-1 rounded-xl border border-line bg-[var(--c-field)] p-1" role="group" aria-label="Kind of update">
          {(['progress', 'resolved'] as const).map((k) => (
            <button key={k} type="button" aria-pressed={kind === k} onClick={() => setKind(k)} className="flex-1 rounded-lg px-3 py-1.5 text-sm font-semibold text-soft hover:text-ink aria-pressed:bg-accent-vivid aria-pressed:text-accent-ink">
              {k === 'progress' ? 'Progress' : 'Resolved'}
            </button>
          ))}
        </div>
        <textarea className="input mt-2 min-h-20" maxLength={1000} value={text} onChange={(e) => setText(e.target.value)} aria-label="Your update" placeholder={kind === 'progress' ? 'For example: a crew is booked for Tuesday morning.' : 'For example: cleared this morning, and the bay is open again.'} />
        <p className="mt-1 text-xs text-soft">Published straight away under {s.role === 'admin' ? 'Resolve UK' : 'your council or contractor'}'s name.</p>
        <button type="button" className="btn btn-ghost btn-sm mt-2" disabled={busy} onClick={() => void post()}>
          Post the update
        </button>
        {posted && (
          <p className="msg msg-info mt-3" role="status">
            Posted.{demo && ' Demo: nothing was sent.'}
          </p>
        )}
      </div>
      {error && (
        <p className="msg msg-error mt-3" role="alert">
          {error}
        </p>
      )}
    </section>
  )
}

// The report's story so far: every published update and resolved write-up, oldest first.
function StorySoFar({ stories, report }: { stories: Story[]; report: Report }) {
  return (
    <section>
      <h3 className="text-base font-bold">Updates</h3>
      <ol className="mt-3 grid gap-3">
        {stories.map((st) => (
          <li key={st.id} className="rounded-2xl border border-line bg-[var(--c-field)] p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="truncate text-sm font-semibold">{st.author_name}</p>
              <span className={`pill shrink-0 ${st.kind === 'resolved' ? 'pill-cleared' : st.kind === 'progress' ? 'pill-progress' : 'pill-reported'}`}>{STORY_KIND_LABEL[st.kind]}</span>
            </div>
            <p className="mt-1.5 text-sm leading-relaxed">{st.body}</p>
            {st.photo_path && (
              <div className="mt-3 grid grid-cols-2 gap-2">
                {[
                  ['Before', report.photo_path],
                  ['After', st.photo_path],
                ].map(([label, path]) => (
                  <figure key={label} className="relative overflow-hidden rounded-xl">
                    <img src={photoUrl(path)} alt={`${label}`} loading="lazy" className="aspect-[4/3] w-full object-cover" />
                    <figcaption className="photo-tag absolute left-2 top-2">{label}</figcaption>
                  </figure>
                ))}
              </div>
            )}
            <p className="mt-1.5 text-xs text-soft">{timeAgo(st.created_at)}</p>
          </li>
        ))}
      </ol>
    </section>
  )
}
