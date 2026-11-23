// Keeps every open tab of the site in step. When something changes in one tab (the demo is
// started, left or switched to another role, the theme is switched, notifications are read), the
// other tabs hear about it straight away and update without a reload.
//
// Uses BroadcastChannel (every current browser). Where it is missing it falls back to the
// localStorage "storage" event, which other tabs of the same site receive whenever one writes.
// Signing in and out of a real account is already shared between tabs by the Supabase client;
// see reporterAuth.tsx for the note shown when that happens.

export type TabMessage =
  | { type: 'demo'; role: string | null }
  | { type: 'theme'; theme: 'light' | 'dark' }
  | { type: 'notifications-read' }

type Listener = (msg: TabMessage) => void

const NAME = 'resolve'
const KEY = 'resolve.tabSync'
const listeners = new Set<Listener>()
let channel: BroadcastChannel | null = null
let started = false

function deliver(msg: unknown) {
  if (!msg || typeof msg !== 'object' || !('type' in msg)) return
  for (const fn of listeners) fn(msg as TabMessage)
}

function start() {
  if (started || typeof window === 'undefined') return
  started = true
  if (typeof BroadcastChannel !== 'undefined') {
    channel = new BroadcastChannel(NAME)
    channel.onmessage = (e) => deliver(e.data)
  } else {
    window.addEventListener('storage', (e) => {
      if (e.key !== KEY || !e.newValue) return
      try {
        deliver(JSON.parse(e.newValue).msg)
      } catch {
        // not one of ours
      }
    })
  }
}

/** Tell the other tabs. The tab that sends a message does not receive it itself. */
export function tellOtherTabs(msg: TabMessage): void {
  start()
  if (channel) {
    channel.postMessage(msg)
    return
  }
  try {
    // A changing timestamp so the same message twice in a row still fires the event.
    localStorage.setItem(KEY, JSON.stringify({ msg, at: Date.now() }))
  } catch {
    // storage blocked: this tab just won't share the change
  }
}

/** Listen for changes made in other tabs. Returns a function that stops listening. */
export function onOtherTab(fn: Listener): () => void {
  start()
  listeners.add(fn)
  return () => listeners.delete(fn)
}
