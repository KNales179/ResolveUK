import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Icon } from '../ui/Icon'
import { gsap, reducedMotion } from '../../lib/gsap'
import { APP_VERSION, seenVersion } from '../../lib/changelog'
import { isRunningInstalled, openInstallDialog } from '../../lib/install'

const SNOOZE_KEY = 'resolve.installNudgeAt'
const VISITS_KEY = 'resolve.visits'
const SNOOZE_MS = 14 * 24 * 60 * 60 * 1000
const DELAY_MS = 25 * 1000

function snoozed(): boolean {
  try {
    return Date.now() - Number(localStorage.getItem(SNOOZE_KEY) || 0) < SNOOZE_MS
  } catch {
    return true
  }
}

// Counted once per browser session, so "sometimes" means returning visitors, not a first look.
function visitCount(): number {
  try {
    if (!sessionStorage.getItem(VISITS_KEY)) {
      sessionStorage.setItem(VISITS_KEY, '1')
      localStorage.setItem(VISITS_KEY, String(Number(localStorage.getItem(VISITS_KEY) || 0) + 1))
    }
    return Number(localStorage.getItem(VISITS_KEY) || 0)
  } catch {
    return 0
  }
}

// A small "Install Resolve UK" card that now and then slides in at the bottom corner: only from a
// visitor's second visit on, 25 seconds into it, never when the site is already installed, never on
// top of the What's new pop-up, and "Not now" rests it for two weeks. "See how" opens the details
// popup (InstallDialog). Adapted from Fico's install prompt.
export function InstallNudge() {
  const [show, setShow] = useState(false)
  const card = useRef<HTMLDivElement>(null)
  const { pathname } = useLocation()
  const staffArea = pathname.startsWith('/staff')

  useEffect(() => {
    if (staffArea || isRunningInstalled() || snoozed() || visitCount() < 2) return
    const timer = window.setTimeout(() => {
      // Closed drawers stay in the page with aria-hidden, so only an open pop-up counts.
      if (seenVersion() === APP_VERSION && !document.querySelector('[role="dialog"]:not([aria-hidden="true"])')) setShow(true)
    }, DELAY_MS)
    return () => window.clearTimeout(timer)
  }, [staffArea])

  useEffect(() => {
    if (!show || !card.current || reducedMotion()) return
    const tween = gsap.from(card.current, { autoAlpha: 0, y: 30, duration: 0.5, ease: 'back.out(1.6)' })
    return () => {
      tween.kill()
    }
  }, [show])

  function close(after?: () => void) {
    try {
      localStorage.setItem(SNOOZE_KEY, String(Date.now()))
    } catch {
      // storage blocked: it simply may show again next visit
    }
    const done = () => {
      setShow(false)
      after?.()
    }
    if (!card.current || reducedMotion()) return done()
    gsap.to(card.current, { autoAlpha: 0, y: 20, duration: 0.25, onComplete: done })
  }

  if (!show || staffArea) return null

  return (
    <div ref={card} role="region" aria-label="Install Resolve UK" className="card fixed inset-x-3 bottom-4 z-40 mx-auto max-w-sm rounded-2xl p-4 shadow-2xl sm:inset-x-auto sm:right-5 sm:bottom-5">
      <button type="button" onClick={() => close()} aria-label="Not now" className="icon-btn absolute right-2.5 top-2.5 size-8">
        <Icon name="x" className="size-4" />
      </button>
      <div className="flex gap-3 pr-8">
        <img src="/icons/icon-192.png" alt="" className="size-11 shrink-0 rounded-xl" />
        <div className="min-w-0">
          <p className="font-semibold">Use Resolve UK like an app</p>
          <p className="mt-0.5 text-sm text-soft">Its own icon, opens full screen, and nothing to download from an app store.</p>
          <div className="mt-3 flex gap-2">
            <button type="button" className="btn btn-primary btn-sm" onClick={() => close(openInstallDialog)}>
              See how
            </button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => close()}>
              Not now
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
