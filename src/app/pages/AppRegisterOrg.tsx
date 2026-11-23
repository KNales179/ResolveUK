import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Icon } from '../../components/ui/Icon'
import { registerOrg, type OrgKind, type Polygon } from '../../lib/orgs'
import { AreaPicker } from '../components/AreaMap'
import { useAppSession } from '../session'
import { BackLink } from '../../components/ui/BackLink'

// Registering a community group or a clearance company: the details on one side, the area it
// covers drawn on a map on the other. A Resolve admin checks it before it appears; the person who
// registers it becomes its first lead.
export function AppRegisterOrg() {
  const s = useAppSession()
  const [params, setParams] = useSearchParams()
  const kind: OrgKind = params.get('kind') === 'commercial' ? 'commercial' : 'community'
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [areaLabel, setAreaLabel] = useState('')
  const [meets, setMeets] = useState('')
  const [email, setEmail] = useState('')
  const [carrier, setCarrier] = useState('')
  const [area, setArea] = useState<Polygon | null>(null)
  const [agree, setAgree] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  async function submit() {
    setError(null)
    if (name.trim().length < 2) return setError('Give it a name.')
    if (areaLabel.trim().length < 2) return setError('Say which area it covers, in a few words.')
    if (!area) return setError('Outline the area it covers on the map: click at least three points.')
    // Accept it however it is typed ("cbdu 123-456", stray spaces in an email) and tidy it here,
    // rather than making the person fix the format.
    const carrierClean = carrier.replace(/[\s\-./]/g, '').toUpperCase()
    const emailClean = email.trim().toLowerCase()
    if (kind === 'commercial' && carrierClean.length < 4) return setError('A clearance company needs its waste carrier registration number.')
    if (!agree) return setError('Please tick the box to confirm.')
    if (!s.demo) {
      setBusy(true)
      const problem = await registerOrg({ kind, name: name.trim(), description: description.trim(), area, areaLabel: areaLabel.trim(), meets: meets.trim(), contactEmail: emailClean, wasteCarrierNumber: carrierClean })
      setBusy(false)
      if (problem) return setError(problem)
    }
    setDone(true)
  }

  if (done)
    return (
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <div className="card max-w-2xl rounded-3xl p-8">
          <span className="tile-icon size-12 rounded-2xl">
            <Icon name="check" className="size-6" />
          </span>
          <h1 className="mt-4 font-serif text-3xl">Sent for checking</h1>
          <p className="mt-2 text-soft">
            {s.demo ? 'Demo: in the real app a Resolve admin would now check this. Nothing was sent.' : `A Resolve admin will check ${name.trim()} and its area${kind === 'commercial' ? ', including its waste carrier registration,' : ''}. Once it's approved it appears on the map, and you'll manage it as its lead.`}
          </p>
          <Link to="/app/community" className="btn btn-primary mt-6">
            Back to Community
          </Link>
        </div>
      </div>
    )

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
      <BackLink to="/app/community">Community</BackLink>
      <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
        <h1 className="font-serif text-4xl">{kind === 'community' ? 'Start a community group' : 'Register a clearance company'}</h1>
        <div className="seg flex flex-wrap gap-1 rounded-xl border border-line bg-[var(--c-field)] p-1" role="group" aria-label="What are you registering">
          {(['community', 'commercial'] as const).map((k) => (
            <button key={k} type="button" aria-pressed={kind === k} onClick={() => setParams({ kind: k })} className="rounded-lg px-4 py-2 text-sm font-semibold text-soft hover:text-ink aria-pressed:bg-accent-vivid aria-pressed:text-accent-ink">
              {k === 'community' ? 'Community group' : 'Clearance company'}
            </button>
          ))}
        </div>
      </div>
      <p className="mt-2 max-w-3xl text-soft">
        {kind === 'community' ? 'For neighbours who want to take on safe jobs, like litter, in their own area.' : 'For licensed waste carriers who clear fly-tipping from private land: farms, car parks, business premises.'} A Resolve admin checks every registration before it appears.
      </p>

      <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_1.2fr]">
        <section className="card grid content-start gap-4 rounded-3xl p-6">
          <div>
            <label htmlFor="org-name" className="mb-1.5 block text-sm font-semibold">
              Name
            </label>
            <input id="org-name" className="input" maxLength={80} value={name} onChange={(e) => setName(e.target.value)} placeholder={kind === 'community' ? 'Keswick Pickers' : 'Fellside Clearances Ltd'} />
          </div>
          <div>
            <label htmlFor="org-desc" className="mb-1.5 block text-sm font-semibold">
              What you do
            </label>
            <textarea id="org-desc" className="input min-h-24" maxLength={600} value={description} onChange={(e) => setDescription(e.target.value)} placeholder={kind === 'community' ? 'Litter picks along the lake shore and the town centre.' : 'Clearance of dumped waste from farms and private land.'} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="org-area" className="mb-1.5 block text-sm font-semibold">
                Area, in a few words
              </label>
              <input id="org-area" className="input" maxLength={80} value={areaLabel} onChange={(e) => setAreaLabel(e.target.value)} placeholder="Keswick and Derwentwater" />
            </div>
            {kind === 'community' ? (
              <div>
                <label htmlFor="org-meets" className="mb-1.5 block text-sm font-semibold">
                  When you meet <span className="font-normal text-soft">(optional)</span>
                </label>
                <input id="org-meets" className="input" maxLength={120} value={meets} onChange={(e) => setMeets(e.target.value)} placeholder="First Saturday, 10am" />
              </div>
            ) : (
              <div>
                <label htmlFor="org-carrier" className="mb-1.5 block text-sm font-semibold">
                  Waste carrier registration no.
                </label>
                <input id="org-carrier" className="input num uppercase" maxLength={30} value={carrier} onChange={(e) => setCarrier(e.target.value)} placeholder="CBDU123456" />
              </div>
            )}
          </div>
          <div>
            <label htmlFor="org-email" className="mb-1.5 block text-sm font-semibold">
              Contact email <span className="font-normal text-soft">{kind === 'community' ? '(optional, shown publicly)' : '(shown publicly)'}</span>
            </label>
            <input id="org-email" className="input" type="email" maxLength={120} value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <label className="flex items-start gap-2.5 text-sm">
            <input type="checkbox" className="mt-1 size-4 accent-[var(--c-accent-ink)]" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
            {kind === 'community' ? "Our group only takes on safe jobs: no needles, chemicals, asbestos or anything hazardous, and we'll follow the safety rules." : "We're registered with the Environment Agency as a waste carrier, and we'll dispose of everything we collect legally."}
          </label>
          {error && (
            <p className="msg msg-error" role="alert">
              {error}
            </p>
          )}
          <button type="button" className="btn btn-primary justify-self-start" disabled={busy} onClick={() => void submit()}>
            {busy ? 'Sending…' : 'Send for checking'}
          </button>
        </section>
        <section className="card rounded-3xl p-6">
          <h2 className="font-semibold">The area you cover</h2>
          <div className="mt-3">
            <AreaPicker value={area} onChange={setArea} />
          </div>
          <p className="mt-2 text-sm text-soft">{area ? `Outlined with ${area.coordinates[0].length - 1} points.` : 'No area yet.'}</p>
        </section>
      </div>
    </div>
  )
}
