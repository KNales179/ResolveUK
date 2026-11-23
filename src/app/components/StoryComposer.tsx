import { useEffect, useState } from 'react'
import { Icon } from '../../components/ui/Icon'
import { timeAgo } from '../../lib/format'
import { fetchMyStories, postStory, STORY_KIND_LABEL, STORY_STATUS_LABEL, type Story, type StoryKind } from '../../lib/stories'
import { useAppSession } from '../session'
import type { Report } from '../../types'

const MAX = 1000
const KINDS: Array<[StoryKind, string, string]> = [
  ['problem', 'The problem', "For example: someone has dumped about ten bags here again, and they are spreading onto the verge."],
  ['progress', 'An update', 'For example: I saw a council van here this morning, and half of it has gone.'],
  ['resolved', "It's been fixed", 'For example: all cleared now, and the path is open again. Thank you!'],
]

// "Tell the neighbourhood": inside a report's panel in the app. A signed-in person writes a few
// lines about the problem, an update on it, or how it was fixed; it goes to a Resolve admin, and appears publicly once approved. They
// can see where their own stories on this report stand. In the demo it works the same way on screen
// but nothing is sent.
export function StoryComposer({ report }: { report: Report }) {
  const s = useAppSession()
  const [mine, setMine] = useState<Story[]>([])
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const [kind, setKind] = useState<StoryKind>('problem')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)

  useEffect(() => {
    if (s.demo || !s.userId || report.id.startsWith('sample-')) return
    let alive = true
    void fetchMyStories(report.id, s.userId).then((list) => {
      if (alive) setMine(list)
    })
    return () => {
      alive = false
    }
  }, [report.id, s.userId, s.demo, sent])

  async function send() {
    setError(null)
    if (text.trim().length < 10) {
      setError('Write a little more: at least a few words about what you saw.')
      return
    }
    if (s.demo || report.id.startsWith('sample-')) {
      setSent(true)
      setOpen(false)
      setText('')
      return
    }
    setBusy(true)
    const problem = await postStory(report.id, text, kind)
    setBusy(false)
    if (problem) return setError(problem)
    setSent(true)
    setOpen(false)
    setText('')
  }

  return (
    <section className="story-box rounded-2xl p-5">
      <h3 className="flex items-center gap-2 text-base font-bold">
        <Icon name="sparkles" className="size-4" /> Tell the neighbourhood
      </h3>
      <p className="mt-1 text-sm text-soft">Post about this problem, an update on it, or how it was fixed, so people nearby know. A Resolve admin checks it before it appears.</p>

      {mine.length > 0 && (
        <ul className="mt-4 space-y-2">
          {mine.map((st) => (
            <li key={st.id} className="rounded-xl bg-[var(--c-field)] p-3 text-sm">
              <span className={`pill ${st.status === 'approved' ? 'pill-cleared' : st.status === 'pending' ? 'pill-progress' : 'pill-reported'}`}>{STORY_STATUS_LABEL[st.status]}</span>
              <span className="ml-2 text-xs font-semibold text-soft">{STORY_KIND_LABEL[st.kind]}</span>
              <p className="mt-2 line-clamp-3">{st.body}</p>
              {st.review_note && <p className="mt-1.5 text-soft">Note from the admin: {st.review_note}</p>}
              <p className="mt-1 text-xs text-soft">{timeAgo(st.created_at)}</p>
            </li>
          ))}
        </ul>
      )}

      {sent && (
        <p className="msg msg-info mt-4" role="status">
          {s.demo ? "Demo: in the real app your story would now wait for an admin's approval. Nothing was sent." : "Thanks. Your story is waiting for an admin's approval, and you'll see it here when it's published."}
        </p>
      )}

      {open ? (
        <div className="mt-4">
          <div className="mb-3 seg flex flex-wrap gap-1 rounded-xl border border-line bg-[var(--c-field)] p-1" role="group" aria-label="What are you posting?">
            {KINDS.map(([k, label]) => (
              <button key={k} type="button" aria-pressed={kind === k} onClick={() => setKind(k)} className="flex-1 rounded-lg px-3 py-1.5 text-sm font-semibold text-soft hover:text-ink aria-pressed:bg-accent-vivid aria-pressed:text-accent-ink">
                {label}
              </button>
            ))}
          </div>
          <label htmlFor="story-text" className="mb-1.5 block text-sm font-semibold">
            {kind === 'problem' ? "What's happening here?" : kind === 'progress' ? "What's changed?" : 'How was it fixed?'}
          </label>
          <textarea id="story-text" className="input min-h-28" maxLength={MAX} value={text} onChange={(e) => setText(e.target.value)} placeholder={KINDS.find(([k]) => k === kind)![2]} />
          <p className="mt-1.5 text-xs text-soft">Leave out other people's names, faces and number plates. {text.length} / {MAX}</p>
          {error && (
            <p className="msg msg-error mt-3" role="alert">
              {error}
            </p>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" className="btn btn-primary btn-sm" onClick={() => void send()} disabled={busy}>
              {busy ? 'Sending…' : 'Send for approval'}
            </button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setOpen(false)}>
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button type="button" className="btn btn-ghost btn-sm mt-4" onClick={() => setOpen(true)}>
          <Icon name="plus" className="size-4" /> Post a story
        </button>
      )}
    </section>
  )
}
