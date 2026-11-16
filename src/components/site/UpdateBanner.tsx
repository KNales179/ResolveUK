import { useEffect, useState } from 'react'
import { Icon } from '../ui/Icon'
import { applyPendingUpdate, SW_UPDATE_EVENT } from '../../lib/swUpdate'

// A small, dismissable corner message instead of a full dialog — an update being ready is never
// urgent enough to block whatever someone is doing, and "Not now" just leaves it to show up again
// next visit (the service worker itself keeps the update waiting either way).
export function UpdateBanner() {
  const [visible, setVisible] = useState(false)
  const [installing, setInstalling] = useState(false)

  useEffect(() => {
    const onNeedRefresh = () => setVisible(true)
    window.addEventListener(SW_UPDATE_EVENT, onNeedRefresh)
    return () => window.removeEventListener(SW_UPDATE_EVENT, onNeedRefresh)
  }, [])

  if (!visible) return null

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex justify-center px-4 sm:justify-end sm:px-6">
      <div role="status" className="card pointer-events-auto flex w-full max-w-sm items-start gap-3 p-4 shadow-2xl">
        <span className="icon-btn shrink-0" aria-hidden="true">
          <Icon name="rotate" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">An update is ready</p>
          <p className="mt-0.5 text-sm text-soft">There's a newer version of the site. Install it whenever suits you — nothing changes until you do.</p>
          <div className="mt-3 flex gap-2">
            <button type="button" className="btn btn-primary btn-sm" disabled={installing} onClick={() => { setInstalling(true); void applyPendingUpdate() }}>
              {installing ? 'Installing…' : 'Install update'}
            </button>
            <button type="button" className="btn btn-ghost btn-sm" disabled={installing} onClick={() => setVisible(false)}>
              Not now
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
