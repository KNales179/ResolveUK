import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Icon } from '../../components/ui/Icon'
import { timeAgo } from '../../lib/format'
import { completeJob, fetchOrgJobs, JOB_STATUS_LABEL, postJobUpdate, respondToJob, sampleJobs, uploadPhoto, type Job } from '../../lib/jobs'
import { preparePhoto } from '../../lib/photo'
import { photoUrl } from '../../lib/photos'
import { STATUS_LABELS, statusGroup } from '../../lib/status'

// A group's or company's jobs, on its page, for its members: offers waiting for a lead's answer,
// jobs under way (post an update, or mark it done with an after photo and a few words, which
// clears the report and publishes the write-up), and jobs already done.
export function OrgJobs({ orgId, lead, demo }: { orgId: string; lead: boolean; demo: boolean }) {
  const [jobs, setJobs] = useState<Job[] | null>(() => (demo ? sampleJobs().filter((j) => j.org_id === orgId) : null))
  const [tick, setTick] = useState(0)

  useEffect(() => {
    if (demo) return
    let alive = true
    void fetchOrgJobs(orgId).then((list) => {
      if (alive) setJobs(list)
    })
    return () => {
      alive = false
    }
  }, [orgId, demo, tick])

  const change = (id: string, patch: Partial<Job>) => {
    setJobs((list) => (list ?? []).map((j) => (j.id === id ? { ...j, ...patch } : j)))
    if (!demo) setTick((t) => t + 1)
  }

  const offered = (jobs ?? []).filter((j) => j.status === 'offered')
  const underway = (jobs ?? []).filter((j) => j.status === 'accepted')
  const finished = (jobs ?? []).filter((j) => j.status === 'done')

  return (
    <section className="card mt-5 rounded-3xl p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-serif text-2xl">Jobs</h2>
          <p className="mt-1 text-sm text-soft">Reports the council has offered to you. {lead ? 'As a lead, you accept or decline each one.' : 'A lead accepts or declines each one.'}</p>
        </div>
        <p className="text-sm font-semibold text-soft">
          {offered.length} waiting · {underway.length} under way · {finished.length} done
        </p>
      </div>
      {jobs === null && <div className="skeleton mt-4 h-24 rounded-2xl" aria-hidden="true" />}
      {jobs?.length === 0 && <p className="mt-4 text-sm text-soft">No jobs yet. When the council offers you one, it shows here and your leads get a notification.</p>}
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        {[...offered, ...underway, ...finished].map((j) => (
          <JobCard key={j.id} job={j} lead={lead} demo={demo} onChange={(p) => change(j.id, p)} />
        ))}
      </div>
    </section>
  )
}

function JobCard({ job, lead, demo, onChange }: { job: Job; lead: boolean; demo: boolean; onChange: (p: Partial<Job>) => void }) {
  const r = job.reports
  const [mode, setMode] = useState<'none' | 'reply' | 'update' | 'done'>('none')
  const [text, setText] = useState('')
  const [photo, setPhoto] = useState<{ file: File; url: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => () => {
    if (photo) URL.revokeObjectURL(photo.url)
  }, [photo])

  const reset = () => {
    setMode('none')
    setText('')
    setPhoto(null)
  }

  async function answer(accept: boolean) {
    setError(null)
    if (!demo) {
      setBusy(true)
      const problem = await respondToJob(job.id, accept, text)
      setBusy(false)
      if (problem) return setError(problem)
    }
    onChange({ status: accept ? 'accepted' : 'declined', reply_note: text || null, responded_at: new Date().toISOString(), reports: r ? { ...r, current_status: accept ? 'scheduled' : r.current_status } : r })
    setMessage(accept ? 'Accepted. The report now shows you are clearing it.' : 'Declined. The council will find someone else.')
    reset()
  }

  async function update() {
    setError(null)
    if (text.trim().length < 10) return setError('Write a little more: at least a few words.')
    if (!demo) {
      setBusy(true)
      const problem = await postJobUpdate(job.id, text)
      setBusy(false)
      if (problem) return setError(problem)
    }
    setMessage('Update posted on the report.')
    reset()
  }

  async function finish() {
    setError(null)
    if (text.trim().length < 10) return setError('Say a few words about what you did: it becomes the report\'s "resolved" story.')
    let path: string | null = null
    if (!demo && photo) {
      setBusy(true)
      const prepared = await preparePhoto(photo.file)
      path = await uploadPhoto(prepared.blob)
      if (!path) {
        setBusy(false)
        return setError('The photo did not upload. Try again, or finish without it.')
      }
    }
    if (!demo) {
      setBusy(true)
      const problem = await completeJob(job.id, text, path)
      setBusy(false)
      if (problem) return setError(problem)
    }
    onChange({ status: 'done', completed_at: new Date().toISOString(), reports: r ? { ...r, current_status: 'cleared' } : r })
    setMessage('Done. The report is cleared, your write-up is published, and the person who reported it is asked to check.')
    reset()
  }

  return (
    <article className="rounded-2xl border border-line bg-[var(--c-field)] p-4">
      {r && (
        <Link to={`/app/reports/${r.id}`} className="flex gap-3" data-tag="Open the report">
          <img src={photoUrl(r.photo_path)} alt="" loading="lazy" className="size-20 shrink-0 rounded-xl object-cover" />
          <span className="min-w-0 text-sm">
            <span className={`pill pill-${statusGroup(r.current_status)}`}>{STATUS_LABELS[r.current_status]}</span>
            <span className="mt-1 line-clamp-2 block font-semibold leading-snug">{r.description}</span>
            <span className="mt-0.5 block text-xs text-soft">
              {JOB_STATUS_LABEL[job.status]} · {timeAgo(job.completed_at ?? job.responded_at ?? job.created_at)}
            </span>
          </span>
        </Link>
      )}
      {job.note && <p className="mt-3 rounded-xl bg-[var(--c-surface)] p-3 text-sm"><span className="font-semibold">From the council:</span> {job.note}</p>}
      {job.reply_note && job.status !== 'offered' && <p className="mt-2 text-sm text-soft">Your reply: "{job.reply_note}"</p>}

      {message && (
        <p className="msg msg-info mt-3" role="status">
          {message}
          {demo && ' (Demo: nothing was sent.)'}
        </p>
      )}

      {mode === 'reply' && (
        <div className="mt-3">
          <label htmlFor={`reply-${job.id}`} className="mb-1.5 block text-sm font-semibold">
            Message for the council <span className="font-normal text-soft">(optional)</span>
          </label>
          <input id={`reply-${job.id}`} className="input" maxLength={500} value={text} onChange={(e) => setText(e.target.value)} placeholder="For example: we can do Saturday morning" />
        </div>
      )}
      {(mode === 'update' || mode === 'done') && (
        <div className="mt-3">
          <label htmlFor={`text-${job.id}`} className="mb-1.5 block text-sm font-semibold">
            {mode === 'update' ? "What's the latest?" : 'What did you do?'}
          </label>
          <textarea id={`text-${job.id}`} className="input min-h-20" maxLength={1000} value={text} onChange={(e) => setText(e.target.value)} placeholder={mode === 'update' ? 'For example: booked for Saturday at 10am, come and help.' : 'For example: six bags and a mattress gone. Thanks to everyone who came.'} />
          <p className="mt-1 text-xs text-soft">Published on the report straight away, under your group's name. Leave out names, faces and number plates.</p>
          {mode === 'done' && (
            <div className="mt-3">
              <input ref={fileRef} type="file" accept="image/*" capture="environment" className="sr-only" onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) setPhoto({ file: f, url: URL.createObjectURL(f) })
              }} />
              {photo ? (
                <div className="flex items-center gap-3">
                  <img src={photo.url} alt="Your after photo" className="size-20 rounded-xl object-cover" />
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => setPhoto(null)}>
                    Remove photo
                  </button>
                </div>
              ) : (
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => fileRef.current?.click()}>
                  <Icon name="camera" className="size-4" /> Add an after photo
                </button>
              )}
            </div>
          )}
        </div>
      )}
      {error && (
        <p className="msg msg-error mt-3" role="alert">
          {error}
        </p>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        {job.status === 'offered' &&
          (lead ? (
            mode === 'reply' ? (
              <>
                <button type="button" className="btn btn-primary btn-sm" disabled={busy} onClick={() => void answer(true)}>
                  <Icon name="check" className="size-4" /> Accept the job
                </button>
                <button type="button" className="btn btn-ghost btn-sm" disabled={busy} onClick={() => void answer(false)}>
                  Decline
                </button>
                <button type="button" className="btn btn-ghost btn-sm" onClick={reset}>
                  Cancel
                </button>
              </>
            ) : (
              <button type="button" className="btn btn-primary btn-sm" onClick={() => setMode('reply')}>
                Answer this offer
              </button>
            )
          ) : (
            <span className="text-sm text-soft">Waiting for a lead to answer.</span>
          ))}
        {job.status === 'accepted' &&
          (mode === 'none' ? (
            <>
              <button type="button" className="btn btn-primary btn-sm" onClick={() => setMode('done')}>
                <Icon name="check" className="size-4" /> Mark it done
              </button>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setMode('update')}>
                Post an update
              </button>
            </>
          ) : (
            <>
              <button type="button" className="btn btn-primary btn-sm" disabled={busy} onClick={() => void (mode === 'done' ? finish() : update())}>
                {busy ? 'Sending…' : mode === 'done' ? 'Mark done and publish' : 'Post the update'}
              </button>
              <button type="button" className="btn btn-ghost btn-sm" onClick={reset}>
                Cancel
              </button>
            </>
          ))}
      </div>
    </article>
  )
}
