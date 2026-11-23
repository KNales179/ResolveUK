import { useCallback, useEffect, useRef, useState } from 'react'
import { onOtherTab, tellOtherTabs } from '../../lib/tabSync'
import { Link } from 'react-router-dom'
import { Icon } from '../../components/ui/Icon'
import { timeAgo } from '../../lib/format'
import { fetchNotices, markNoticesRead, noticeLink, sampleNotices, type Notice } from '../../lib/notifications'
import { useAppSession } from '../session'

// The bell in the app's header: a count of unread notifications, and the latest ones in a panel.
// Opening the panel marks them read. Checks again whenever the tab comes back into view.
export function NotificationBell() {
  const s = useAppSession()
  const [list, setList] = useState<Notice[]>(() => (s.demo ? sampleNotices(s.role) : []))
  const [open, setOpen] = useState(false)
  const box = useRef<HTMLDivElement>(null)

  const load = useCallback(() => {
    if (s.demo || !s.userId) return
    void fetchNotices().then(setList)
  }, [s.demo, s.userId])

  useEffect(() => {
    if (s.demo) setList(sampleNotices(s.role))
  }, [s.demo, s.role])

  useEffect(() => {
    load()
    const again = () => document.visibilityState === 'visible' && load()
    document.addEventListener('visibilitychange', again)
    const t = window.setInterval(load, 120_000)
    return () => {
      document.removeEventListener('visibilitychange', again)
      window.clearInterval(t)
    }
  }, [load])

  // Notifications read in another tab show as read here too.
  useEffect(
    () =>
      onOtherTab((msg) => {
        if (msg.type === 'notifications-read') setList((l) => l.map((n) => ({ ...n, read_at: n.read_at ?? new Date().toISOString() })))
      }),
    [],
  )

  useEffect(() => {
    if (!open) return
    const away = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false)
    }
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', away)
    document.addEventListener('keydown', esc)
    return () => {
      document.removeEventListener('mousedown', away)
      document.removeEventListener('keydown', esc)
    }
  }, [open])

  const unread = list.filter((n) => !n.read_at).length

  function toggle() {
    const next = !open
    setOpen(next)
    if (next && unread) {
      if (!s.demo) void markNoticesRead()
      tellOtherTabs({ type: 'notifications-read' })
      // shown as read from the next time the panel opens, so the new ones stay highlighted now
      window.setTimeout(() => setList((l) => l.map((n) => ({ ...n, read_at: n.read_at ?? new Date().toISOString() }))), 1500)
    }
  }

  return (
    <div ref={box} className="relative">
      <button type="button" className="icon-btn relative" aria-haspopup="dialog" aria-expanded={open} aria-label={unread ? `Notifications, ${unread} new` : 'Notifications'} onClick={toggle}>
        <Icon name="bell" />
        {unread > 0 && <span className="bell-count num">{unread > 9 ? '9+' : unread}</span>}
      </button>
      {open && (
        <div role="dialog" aria-label="Notifications" className="card absolute right-0 top-12 z-50 w-[min(22rem,calc(100vw-2rem))] rounded-2xl p-2 shadow-xl">
          <p className="px-3 pb-1 pt-2 font-semibold">Notifications</p>
          {list.length === 0 ? (
            <p className="px-3 pb-3 text-sm text-soft">Nothing yet. Follow a report to hear each time it moves on.</p>
          ) : (
            <ul className="max-h-[60svh] overflow-y-auto" data-lenis-prevent>
              {list.map((n) => (
                <li key={n.id}>
                  <Link to={noticeLink(n)} onClick={() => setOpen(false)} className={`notice-item ${n.read_at ? '' : 'notice-new'}`}>
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold">{n.title}</span>
                      {n.body && <span className="mt-0.5 line-clamp-2 block text-sm text-soft">{n.body}</span>}
                      <span className="mt-0.5 block text-xs text-soft">{timeAgo(n.created_at)}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
