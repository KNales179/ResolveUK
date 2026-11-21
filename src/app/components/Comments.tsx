import { useEffect, useState } from 'react'
import { Icon } from '../../components/ui/Icon'
import { timeAgo } from '../../lib/format'
import { canModerate, deleteComment, fetchComments, hideComment, postComment, reportComment, riskyComment, SAMPLE_COMMENTS, type StoryComment } from '../../lib/comments'
import { useAppSession } from '../session'

// The comments under a post in the feed: read them, add one, report one, and (for whoever looks
// after the post) hide one. Before posting, a comment that looks like it names a house, a number
// plate or who did it gets a warning and a second chance. In the demo nothing is sent.
export function Comments({ storyId, onCount }: { storyId: string; onCount: (n: number) => void }) {
  const s = useAppSession()
  const demo = s.demo || storyId.startsWith('sample-')
  const [list, setList] = useState<StoryComment[] | null>(() => (demo ? (SAMPLE_COMMENTS[storyId] ?? []) : null))
  const [mod, setMod] = useState(false)
  const [text, setText] = useState('')
  const [warning, setWarning] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  useEffect(() => {
    if (demo) {
      setMod(s.role === 'admin' || s.role === 'staff')
      return
    }
    let alive = true
    void fetchComments(storyId).then((c) => {
      if (alive) setList(c)
    })
    if (s.userId)
      void canModerate(storyId).then((m) => {
        if (alive) setMod(m)
      })
    return () => {
      alive = false
    }
  }, [storyId, demo, s.userId, s.role])

  const visible = (list ?? []).filter((c) => c.status === 'visible' || c.author_id === (s.userId ?? 'demo'))
  useEffect(() => {
    if (list) onCount(list.filter((c) => c.status === 'visible').length)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [list])

  async function send(anyway = false) {
    setError(null)
    setNotice(null)
    if (text.trim().length < 2) return
    const risk = riskyComment(text)
    if (risk && !anyway) return setWarning(risk)
    setWarning(null)
    if (demo) {
      setList((l) => [...(l ?? []), { id: `local-${Date.now()}`, story_id: storyId, author_id: 'demo', author_name: s.name.replace(' (demo)', '') || 'You', author_role: s.role === 'staff' || s.role === 'admin' ? 'staff' : 'resident', body: text.trim(), status: 'visible', created_at: new Date().toISOString() }])
      setText('')
      return
    }
    setBusy(true)
    const result = await postComment(storyId, text)
    setBusy(false)
    if (typeof result === 'string') return setError(result)
    setList((l) => [...(l ?? []), result])
    setText('')
  }

  async function act(c: StoryComment, what: 'report' | 'hide' | 'delete') {
    setError(null)
    if (!demo) {
      const problem = what === 'report' ? await reportComment(c.id) : what === 'hide' ? await hideComment(c.id) : (await deleteComment(c.id)) ? null : "That comment couldn't be deleted."
      if (problem) return setError(problem)
    }
    setList((l) => (l ?? []).filter((x) => x.id !== c.id))
    setNotice(what === 'report' ? 'Thanks. The comment is hidden until a Resolve admin has looked at it.' : what === 'hide' ? 'Comment hidden.' : 'Comment deleted.')
  }

  const initial = (s.name || s.email || '?').trim().charAt(0).toUpperCase()
  return (
    <div className="comments border-t border-line px-4 pb-4 pt-3">
      {list === null && (
        <div className="flex gap-3" aria-hidden="true">
          <div className="skeleton size-8 shrink-0 rounded-full" />
          <div className="grid flex-1 gap-2 pt-1"><div className="skeleton h-3 w-1/4" /><div className="skeleton h-3 w-3/4" /></div>
        </div>
      )}
      {visible.length > 0 && (
        <ul className="grid gap-3">
          {visible.map((c) => {
            const mine = c.author_id === (s.userId ?? 'demo')
            return (
              <li key={c.id} className="flex gap-2.5">
                <span className={`app-avatar size-8 text-xs ${c.author_role !== 'resident' ? 'app-avatar-org' : ''}`}>{c.author_role === 'resident' ? c.author_name.charAt(0).toUpperCase() : <Icon name={c.author_role === 'staff' ? 'building' : 'users'} className="size-3.5" />}</span>
                <div className="min-w-0 flex-1">
                  <div className="comment-bubble rounded-2xl px-3.5 py-2">
                    <p className="text-sm font-semibold">
                      {c.author_name}
                      {c.author_role === 'staff' && <span className="ml-1.5 text-xs font-semibold text-soft">Official</span>}
                    </p>
                    <p className="text-sm leading-relaxed">{c.body}</p>
                  </div>
                  <p className="mt-1 flex flex-wrap gap-x-3 px-2 text-xs text-soft">
                    <span>{timeAgo(c.created_at)}</span>
                    {c.status === 'reported' && <span>Hidden while an admin checks it</span>}
                    {mine ? (
                      <button type="button" className="comment-link" onClick={() => void act(c, 'delete')}>
                        Delete
                      </button>
                    ) : (
                      <>
                        {s.userId || s.demo ? (
                          <button type="button" className="comment-link" onClick={() => void act(c, 'report')}>
                            Report
                          </button>
                        ) : null}
                        {mod && (
                          <button type="button" className="comment-link" onClick={() => void act(c, 'hide')}>
                            Hide
                          </button>
                        )}
                      </>
                    )}
                  </p>
                </div>
              </li>
            )
          })}
        </ul>
      )}
      {list !== null && visible.length === 0 && <p className="text-sm text-soft">No comments yet. Add something useful, like where exactly it is.</p>}
      {notice && (
        <p className="msg msg-info mt-3" role="status">
          {notice}
        </p>
      )}

      <form
        className="mt-3 flex items-start gap-2.5"
        onSubmit={(e) => {
          e.preventDefault()
          void send()
        }}
      >
        <span className="app-avatar size-8 text-xs">{initial}</span>
        <div className="min-w-0 flex-1">
          <label htmlFor={`comment-${storyId}`} className="sr-only">
            Write a comment
          </label>
          <div className="flex gap-2">
            <input id={`comment-${storyId}`} className="input min-w-0 flex-1 !rounded-full !py-2" maxLength={500} value={text} onChange={(e) => { setText(e.target.value); setWarning(null) }} placeholder="Write a comment…" />
            <button type="submit" className="btn btn-primary btn-sm shrink-0" disabled={busy || text.trim().length < 2}>
              {busy ? 'Posting…' : 'Post'}
            </button>
          </div>
          {warning && (
            <div className="comment-warning mt-2 rounded-xl p-3 text-sm" role="alert">
              <p className="font-semibold">{warning}</p>
              <p className="mt-1">Comments about who did it can't be checked and can put people at risk. If you know something, tell the council instead. Please edit your comment, or post it if you're sure it's fine.</p>
              <div className="mt-2 flex gap-2">
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setWarning(null)}>
                  Edit it
                </button>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => void send(true)}>
                  Post anyway
                </button>
              </div>
            </div>
          )}
          {error && (
            <p className="msg msg-error mt-2" role="alert">
              {error}
            </p>
          )}
          <p className="mt-1.5 px-2 text-xs text-soft">
            Be kind and useful. Leave out names, house numbers and number plates.
          </p>
        </div>
      </form>
    </div>
  )
}
