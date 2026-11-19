import { useEffect, useState } from 'react'
import { Icon } from '../../components/ui/Icon'
import { applyToJoin, type Org } from '../../lib/orgs'
import { useAppSession } from '../session'

// Applying to join a community group: a few questions, the age and safety confirmations, then the
// group's leads decide. In the demo nothing is sent.
export function JoinDialog({ org, onClose, onSent }: { org: Org; onClose: () => void; onSent: () => void }) {
  const s = useAppSession()
  const [why, setWhy] = useState('')
  const [when, setWhen] = useState('')
  const [help, setHelp] = useState('')
  const [adult, setAdult] = useState(false)
  const [safety, setSafety] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', esc)
    return () => document.removeEventListener('keydown', esc)
  }, [onClose])

  async function send() {
    setError(null)
    if (why.trim().length < 5) return setError('Tell the group a little about why you would like to join.')
    if (!adult || !safety) return setError('Please tick both boxes to confirm your age and the safety rules.')
    if (!s.demo) {
      setBusy(true)
      const problem = await applyToJoin(org.id, { why: why.trim(), when: when.trim(), help: help.trim(), adult, safety })
      setBusy(false)
      if (problem) return setError(problem)
    }
    setDone(true)
    onSent()
  }

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/55 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
        <div role="dialog" aria-modal="true" aria-labelledby="join-title" data-lenis-prevent className="card rise max-h-[90svh] w-full max-w-2xl overflow-y-auto overscroll-contain rounded-3xl p-6 sm:p-8">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-soft">Apply to join</p>
              <h2 id="join-title" className="font-serif text-3xl">{org.name}</h2>
            </div>
            <button type="button" className="icon-btn shrink-0" onClick={onClose} aria-label="Close">
              <Icon name="x" />
            </button>
          </div>
          {done ? (
            <div className="mt-6">
              <p className="msg msg-info" role="status">
                {s.demo ? "Demo: in the real app the group's leads would now see your application. Nothing was sent." : "Sent. The group's leads will look at your application, and you'll see here when you're in."}
              </p>
              <button type="button" className="btn btn-primary mt-5" onClick={onClose}>
                Done
              </button>
            </div>
          ) : (
            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label htmlFor="join-why" className="mb-1.5 block text-sm font-semibold">
                  Why would you like to join?
                </label>
                <textarea id="join-why" className="input min-h-24" maxLength={400} value={why} onChange={(e) => setWhy(e.target.value)} placeholder="For example: I walk the river path every day and want to help keep it clear." />
              </div>
              <div>
                <label htmlFor="join-when" className="mb-1.5 block text-sm font-semibold">
                  When are you usually free?
                </label>
                <input id="join-when" className="input" maxLength={120} value={when} onChange={(e) => setWhen(e.target.value)} placeholder="Weekends, some evenings" />
              </div>
              <div>
                <label htmlFor="join-help" className="mb-1.5 block text-sm font-semibold">
                  Anything you can help with? <span className="font-normal text-soft">(optional)</span>
                </label>
                <input id="join-help" className="input" maxLength={120} value={help} onChange={(e) => setHelp(e.target.value)} placeholder="A car, organising, taking photos" />
              </div>
              <label className="flex items-start gap-2.5 text-sm sm:col-span-2">
                <input type="checkbox" className="mt-1 size-4 accent-[var(--c-accent-ink)]" checked={adult} onChange={(e) => setAdult(e.target.checked)} />
                I'm 18 or over, or a parent or guardian has agreed to me joining.
              </label>
              <label className="flex items-start gap-2.5 text-sm sm:col-span-2">
                <input type="checkbox" className="mt-1 size-4 accent-[var(--c-accent-ink)]" checked={safety} onChange={(e) => setSafety(e.target.checked)} />
                I'll follow the safety rules: gloves and a grabber, never touch needles, chemicals or anything hazardous, and never alone near a busy road.
              </label>
              {error && (
                <p className="msg msg-error sm:col-span-2" role="alert">
                  {error}
                </p>
              )}
              <div className="flex flex-wrap gap-2 sm:col-span-2">
                <button type="button" className="btn btn-primary" disabled={busy} onClick={() => void send()}>
                  {busy ? 'Sending…' : 'Send application'}
                </button>
                <button type="button" className="btn btn-ghost" onClick={onClose}>
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
