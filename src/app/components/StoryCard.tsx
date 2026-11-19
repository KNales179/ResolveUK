import { useEffect, useState, type ReactNode } from 'react'
import { setThanks } from '../../lib/comments'
import { useAppSession } from '../session'
import { Comments } from './Comments'
import { Link } from 'react-router-dom'
import { Icon } from '../../components/ui/Icon'
import { photoUrl } from '../../lib/photos'
import { timeAgo } from '../../lib/format'
import { backReport } from '../../lib/nearby'
import { backedReportIds } from '../../lib/device'
import { OPEN_STATUSES, STATUS_LABELS, statusGroup } from '../../lib/status'
import { STORY_KIND_VERB, type Story } from '../../lib/stories'

// One story, Facebook-post style: who posted it and when, what they said, the report's photo and
// where it stands, and an "I've seen this too" button that backs the report. A group's, company's
// or council's post is marked as theirs; a resolved story with an after photo shows it beside
// the report's own (before) photo. `footer` lets the
// admin queue put its decision buttons underneath.
// `variant="feed"` is the home feed's post: the photo large across the post (before and after
// side by side when there is an after photo), the report it's about as a line beneath, and an
// action bar along the bottom, like a post in Facebook or Instagram.
export function StoryCard({ story, reportBase = '/app/reports', footer, variant = 'compact', thanked = false }: { story: Story; reportBase?: string; footer?: ReactNode; variant?: 'compact' | 'feed'; thanked?: boolean }) {
  const r = story.reports
  const [backed, setBacked] = useState(() => (r ? backedReportIds().has(r.id) : false))
  const [added, setAdded] = useState(0)
  const [busy, setBusy] = useState(false)
  const canBack = r ? OPEN_STATUSES.includes(r.current_status) : false
  const people = r ? 1 + (r.report_supports?.[0]?.count ?? 0) + added : 0

  if (variant === 'feed') return <FeedPost story={story} reportBase={reportBase} backed={backed} busy={busy} canBack={canBack} people={people} onBack={() => void back()} thanked={thanked} />

  async function back() {
    if (!r) return
    setBusy(true)
    try {
      if ((await backReport(r.id)) === 'added') setAdded(1)
      setBacked(true)
    } catch {
      // stays as it was; the button can be pressed again
    } finally {
      setBusy(false)
    }
  }

  return (
    <article className="card flex flex-col overflow-hidden rounded-2xl">
      <header className="flex items-center gap-3 px-4 pt-4">
        {story.author_role === 'organisation' || story.author_role === 'staff' ? (
          <span className="app-avatar app-avatar-org size-9">
            <Icon name={story.author_role === 'staff' ? 'building' : 'users'} className="size-4" />
          </span>
        ) : (
          <span className="app-avatar size-9 text-sm">{story.author_name.charAt(0).toUpperCase()}</span>
        )}
        <div className="min-w-0 flex-1">
          <p className="font-semibold leading-tight">{story.author_name}</p>
          <p className="text-xs text-soft">
            {STORY_KIND_VERB[story.kind]}
            {story.author_role === 'organisation' ? ' · Community' : story.author_role === 'staff' ? ' · Official' : ''} · {timeAgo(story.created_at)}
          </p>
        </div>
        {story.kind !== 'problem' && <span className={`pill shrink-0 ${story.kind === 'resolved' ? 'pill-cleared' : 'pill-progress'}`}>{story.kind === 'resolved' ? 'Resolved' : 'Update'}</span>}
      </header>
      <p className="px-4 pt-2.5 text-[0.95rem] leading-relaxed">{story.body}</p>
      {r && story.photo_path && (
        <div className="mx-4 mt-3 grid grid-cols-2 gap-2">
          {[
            ['Before', r.photo_path],
            ['After', story.photo_path],
          ].map(([label, path]) => (
            <figure key={label} className="relative overflow-hidden rounded-xl">
              <img src={photoUrl(path)} alt={`${label}: ${r.description}`} loading="lazy" decoding="async" className="aspect-[4/3] w-full object-cover" />
              <figcaption className="photo-tag absolute left-2 top-2">{label}</figcaption>
            </figure>
          ))}
        </div>
      )}
      {/* The report it's about: a thumbnail beside its details, not a full-width photo. */}
      {r && (
        <Link to={`${reportBase}/${r.id}`} className="mx-4 mt-3 flex gap-3 rounded-xl border border-line bg-[var(--c-field)] p-2" data-tag="View the report">
          <img src={photoUrl(r.photo_path)} alt="" loading="lazy" decoding="async" className="size-20 shrink-0 rounded-lg object-cover" />
          <span className="min-w-0 py-0.5 text-sm">
            <span className={`pill pill-${statusGroup(r.current_status)}`}>{STATUS_LABELS[r.current_status]}</span>
            <span className="mt-1 line-clamp-2 block font-semibold leading-snug">{r.description}</span>
            <span className="mt-0.5 block text-xs text-soft">Reported {timeAgo(r.created_at)} · {people} {people === 1 ? 'person has' : 'people have'} seen this</span>
          </span>
        </Link>
      )}
      <div className="mt-auto flex flex-wrap items-center gap-2 px-4 py-3">
        {r && canBack && (
          backed ? (
            <span className="btn btn-ghost btn-sm cursor-default">
              <Icon name="check" className="size-4 text-accent" /> You've seen this too
            </span>
          ) : (
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => void back()} disabled={busy}>
              <Icon name="eye" className="size-4" /> {busy ? 'Saving…' : "I've seen this too"}
            </button>
          )
        )}
        {r && (
          <Link to={`${reportBase}/${r.id}`} className="btn btn-ghost btn-sm">
            View the report
          </Link>
        )}
      </div>
      {footer}
    </article>
  )
}

function FeedPost({ story, reportBase, backed, busy, canBack, people, onBack, thanked }: { story: Story; reportBase: string; backed: boolean; busy: boolean; canBack: boolean; people: number; onBack: () => void; thanked: boolean }) {
  const s = useAppSession()
  const r = story.reports
  const [open, setOpen] = useState(false)
  const [comments, setComments] = useState(story.story_comments?.[0]?.count ?? 0)
  const [thanks, setThanksCount] = useState(story.story_thanks?.[0]?.count ?? 0)
  const [mine, setMine] = useState(thanked)
  const thankable = story.kind !== 'problem'
  useEffect(() => setMine(thanked), [thanked])

  async function thank() {
    const next = !mine
    setMine(next)
    setThanksCount((n) => n + (next ? 1 : -1))
    if (s.demo || story.id.startsWith('sample-') || !s.userId) return
    if (!(await setThanks(story.id, next, s.userId))) {
      setMine(!next)
      setThanksCount((n) => n + (next ? -1 : 1))
    }
  }
  const official = story.author_role === 'organisation' || story.author_role === 'staff'
  return (
    <article className="feed-post card overflow-hidden rounded-2xl">
      <header className="flex items-center gap-3 px-4 pt-4">
        {official ? (
          <span className="app-avatar app-avatar-org size-10">
            <Icon name={story.author_role === 'staff' ? 'building' : 'users'} className="size-4" />
          </span>
        ) : (
          <span className="app-avatar size-10">{story.author_name.charAt(0).toUpperCase()}</span>
        )}
        <div className="min-w-0 flex-1">
          <p className="font-semibold leading-tight">
            {story.author_name}
            {official && <span className="ml-1.5 align-middle text-xs font-semibold text-soft">{story.author_role === 'staff' ? 'Official' : 'Community group'}</span>}
          </p>
          <p className="text-xs text-soft">
            {STORY_KIND_VERB[story.kind]} · {timeAgo(story.created_at)}
          </p>
        </div>
        {story.kind !== 'problem' && <span className={`pill shrink-0 ${story.kind === 'resolved' ? 'pill-cleared' : 'pill-progress'}`}>{story.kind === 'resolved' ? 'Resolved' : 'Update'}</span>}
      </header>
      <p className="px-4 pb-3 pt-2.5 text-[0.95rem] leading-relaxed">{story.body}</p>

      {r && (
        <Link to={`${reportBase}/${r.id}`} className="block" data-tag="View the report">
          {story.photo_path ? (
            <div className="grid grid-cols-2 gap-0.5">
              {[
                ['Before', r.photo_path],
                ['After', story.photo_path],
              ].map(([label, path]) => (
                <figure key={label} className="relative">
                  <img src={photoUrl(path)} alt={`${label}: ${r.description}`} loading="lazy" decoding="async" className="aspect-square w-full object-cover" />
                  <figcaption className="photo-tag absolute left-2.5 top-2.5">{label}</figcaption>
                </figure>
              ))}
            </div>
          ) : (
            <img src={photoUrl(r.photo_path)} alt={r.description} loading="lazy" decoding="async" className="aspect-[16/10] max-h-[26rem] w-full object-cover" />
          )}
          <span className="feed-report flex items-center gap-3 px-4 py-3">
            <span className="min-w-0 flex-1">
              <span className="line-clamp-1 block text-sm font-semibold">{r.description}</span>
              <span className="block text-xs text-soft">
                Reported {timeAgo(r.created_at)} · {people} {people === 1 ? 'person has' : 'people have'} seen this
              </span>
            </span>
            <span className={`pill pill-${statusGroup(r.current_status)} shrink-0`}>{STATUS_LABELS[r.current_status]}</span>
          </span>
        </Link>
      )}

      {(thanks > 0 || comments > 0) && (
        <p className="flex justify-between gap-3 px-4 pt-2.5 text-xs text-soft">
          <span>{thanks > 0 && `${thanks} ${thanks === 1 ? 'person says' : 'people say'} thanks`}</span>
          <button type="button" className="comment-link" onClick={() => setOpen((o) => !o)}>
            {comments > 0 && `${comments} ${comments === 1 ? 'comment' : 'comments'}`}
          </button>
        </p>
      )}
      <div className="feed-actions mt-2 grid grid-cols-3 border-t border-line">
        {thankable ? (
          <button type="button" aria-pressed={mine} className="feed-action" onClick={() => void thank()}>
            <Icon name={mine ? 'check' : 'sparkles'} className={`size-4 ${mine ? 'text-accent' : ''}`} /> {mine ? 'Thanked' : 'Thanks'}
          </button>
        ) : r && canBack ? (
          backed ? (
            <span className="feed-action cursor-default">
              <Icon name="check" className="size-4 text-accent" /> Seen it too
            </span>
          ) : (
            <button type="button" className="feed-action" onClick={onBack} disabled={busy}>
              <Icon name="eye" className="size-4" /> {busy ? 'Saving…' : "I've seen it too"}
            </button>
          )
        ) : (
          <span className="feed-action cursor-default">
            <Icon name="check" className="size-4" /> {r?.current_status === 'verified' ? 'Confirmed clear' : r?.current_status === 'cleared' ? 'Cleared' : 'Closed'}
          </span>
        )}
        <button type="button" aria-expanded={open} className="feed-action" onClick={() => setOpen((o) => !o)}>
          <Icon name="chat" className="size-4" /> Comment
        </button>
        {r ? (
          <Link to={`${reportBase}/${r.id}`} className="feed-action">
            <Icon name="layers" className="size-4" /> Report
          </Link>
        ) : (
          <span />
        )}
      </div>
      {open && <Comments storyId={story.id} onCount={setComments} />}
    </article>
  )
}
