import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { BackLink } from '../../components/ui/BackLink'
import { Icon } from '../../components/ui/Icon'
import { acceptQuote, cancelRequest, completeClearance, createRequest, fetchContact, fetchQuotes, fetchRequest, fetchRequests, LAND_LABEL, pounds, REQUEST_STATUS_LABEL, SAMPLE_QUOTES, SAMPLE_REQUESTS, sendQuote, withdrawQuote, type ClearanceRequest, type LandType, type Quote, type RequestStatus } from '../../lib/clearance'
import { timeAgo } from '../../lib/format'
import { uploadPhoto } from '../../lib/jobs'
import { preparePhoto } from '../../lib/photo'
import { photoUrl } from '../../lib/photos'
import type { Org } from '../../lib/orgs'
import { PointPicker } from '../components/AreaMap'
import { useOrgs } from '../orgsData'
import { useAppSession } from '../session'

const PILL: Record<RequestStatus, string> = { open: 'pill-reported', accepted: 'pill-progress', done: 'pill-cleared', cancelled: 'pill-closed' }
const DEMO_VIEW_KEY = 'resolve.clearanceView'

// Which clearance companies the signed-in person works for (approved ones only). In the demo the
// "company" view stands in as a member of Fellside Clearances.
function useMyCompanies(companyView: boolean): Org[] {
  const s = useAppSession()
  const { orgs, mine } = useOrgs()
  return useMemo(() => {
    if (s.demo) return companyView ? [{ id: 'sample-org-3', kind: 'commercial', name: 'Fellside Clearances Ltd', area_label: 'West and central Cumbria' } as Org] : []
    return (orgs ?? []).filter((o) => o.kind === 'commercial' && mine.some((m) => m.org_id === o.id && m.status === 'active'))
  }, [s.demo, companyView, orgs, mine])
}

function useDemoView(): [boolean, (v: boolean) => void] {
  const [company, setCompany] = useState(() => {
    try {
      return sessionStorage.getItem(DEMO_VIEW_KEY) === 'company'
    } catch {
      return false
    }
  })
  const set = (v: boolean) => {
    setCompany(v)
    try {
      sessionStorage.setItem(DEMO_VIEW_KEY, v ? 'company' : 'asker')
    } catch {
      /* fine */
    }
  }
  return [company, set]
}

function DemoViewSwitch({ company, onChange }: { company: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="msg msg-info mt-5 flex flex-wrap items-center justify-between gap-3" role="status">
      <span>Demo: sample requests and quotes. Nothing is sent.</span>
      <span className="flex max-w-full flex-wrap gap-1 rounded-xl border border-line bg-[var(--c-surface)] p-1" role="group" aria-label="View the demo as">
        {[
          [false, 'The person asking'],
          [true, 'A clearance company'],
        ].map(([v, label]) => (
          <button key={String(v)} type="button" aria-pressed={company === v} onClick={() => onChange(v as boolean)} className="rounded-lg px-3 py-1.5 text-sm font-semibold text-soft hover:text-ink aria-pressed:bg-accent-vivid aria-pressed:text-accent-ink">
            {label as string}
          </button>
        ))}
      </span>
    </div>
  )
}

// ---------------------------------------------------------------- the list
export function AppClearance() {
  const s = useAppSession()
  const [companyView, setCompanyView] = useDemoView()
  const companies = useMyCompanies(companyView)
  const [all, setAll] = useState<ClearanceRequest[] | null>(() => (s.demo ? SAMPLE_REQUESTS : null))
  const [failed, setFailed] = useState(false)
  const me = s.demo ? 'demo' : s.userId
  const [tab, setTab] = useState<'mine' | 'area'>('mine')

  useEffect(() => {
    if (s.demo) return
    let alive = true
    void fetchRequests().then((list) => {
      if (!alive) return
      if (list === null) setFailed(true)
      setAll(list ?? [])
    })
    return () => {
      alive = false
    }
  }, [s.demo])

  useEffect(() => {
    if (companies.length) setTab('area')
    else setTab('mine')
  }, [companies.length])

  const mine = (all ?? []).filter((r) => r.requester_id === me)
  const area = (all ?? []).filter((r) => r.requester_id !== me && (r.status === 'open' || r.status === 'accepted' || r.status === 'done'))
  const shown = tab === 'mine' ? mine : area

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-4xl sm:text-5xl">Private land</h1>
          <p className="mt-2 max-w-2xl text-soft">Rubbish dumped on a farm, a car park or a business's land is the landowner's to clear, not the council's. Get quotes from licensed clearance companies that cover the area, and choose one.</p>
        </div>
        <Link to="/app/clearance/new" className="btn btn-primary">
          <Icon name="plus" className="size-4" /> Ask for quotes
        </Link>
      </div>

      {s.demo && <DemoViewSwitch company={companyView} onChange={setCompanyView} />}

      <ol className="mt-6 grid gap-3 md:grid-cols-3">
        {[
          ['camera', 'Post what was dumped', 'A photo, where it is, and how to get to it. Your contact details stay private.'],
          ['truck', 'Licensed companies quote', 'Only companies registered as waste carriers, and checked by Resolve, covering that spot.'],
          ['check', 'Choose one, and it gets cleared', 'They get your details only once you choose them, and mark it done with a photo.'],
        ].map(([icon, title, text], i) => (
          <li key={title} className="card flex gap-3 rounded-2xl p-4">
            <span className="tile-icon size-10 shrink-0 rounded-xl">
              <Icon name={icon as 'camera'} className="size-5" />
            </span>
            <span className="min-w-0">
              <span className="block text-xs font-semibold text-soft">Step {i + 1}</span>
              <span className="block font-semibold">{title}</span>
              <span className="mt-0.5 block text-sm text-soft">{text}</span>
            </span>
          </li>
        ))}
      </ol>

      {companies.length > 0 && (
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <div className="flex max-w-full flex-wrap gap-1 rounded-xl border border-line bg-[var(--c-field)] p-1" role="group" aria-label="Show">
            {(
              [
                ['area', `Requests in your area (${area.length})`],
                ['mine', `Your own requests (${mine.length})`],
              ] as const
            ).map(([id, label]) => (
              <button key={id} type="button" aria-pressed={tab === id} onClick={() => setTab(id)} className="rounded-lg px-4 py-2 text-sm font-semibold text-soft hover:text-ink aria-pressed:bg-accent-vivid aria-pressed:text-accent-ink">
                {label}
              </button>
            ))}
          </div>
          <span className="text-sm text-soft">Quoting as {companies.map((c) => c.name).join(', ')}</span>
        </div>
      )}
      {companies.length === 0 && <h2 className="mt-8 font-serif text-2xl">Your requests</h2>}

      {failed && (
        <p className="msg msg-error mt-4" role="alert">
          Requests couldn't be loaded. Check that requests.sql has been run, then reload.
        </p>
      )}

      <ul className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {all === null && [0, 1, 2].map((i) => <li key={i} className="card h-36 animate-pulse rounded-2xl" />)}
        {shown.map((r) => (
          <li key={r.id}>
            <Link to={`/app/clearance/${r.id}`} className="card request-card flex h-full gap-4 rounded-2xl p-4">
              {r.photo_path ? <img src={photoUrl(r.photo_path)} alt="" loading="lazy" className="size-24 shrink-0 rounded-xl object-cover" /> : <span className="tile-icon size-24 shrink-0 rounded-xl"><Icon name="truck" className="size-7" /></span>}
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-2">
                  <span className={`pill ${PILL[r.status]}`}>{REQUEST_STATUS_LABEL[r.status]}</span>
                  <span className="text-xs text-soft">{timeAgo(r.created_at)}</span>
                </span>
                <span className="mt-1.5 block truncate font-semibold">{r.place_label}</span>
                <span className="mt-0.5 line-clamp-2 block text-sm text-soft">{r.description}</span>
                <span className="mt-1.5 block text-xs font-semibold text-soft">
                  {LAND_LABEL[r.land_type]}
                  {tab === 'mine' && r.status === 'open' && ` · ${r.clearance_quotes?.[0]?.count ?? 0} ${(r.clearance_quotes?.[0]?.count ?? 0) === 1 ? 'quote' : 'quotes'}`}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
      {all !== null && shown.length === 0 && (
        <div className="card mt-2 rounded-2xl p-8 text-center">
          <p className="font-semibold">{tab === 'mine' ? "You haven't asked for any quotes yet" : 'No requests in your area right now'}</p>
          <p className="mt-1 text-sm text-soft">{tab === 'mine' ? 'Rubbish dumped on your land? Post it and licensed companies nearby can quote.' : "You'll get a notification when someone nearby asks."}</p>
          {tab === 'mine' && (
            <Link to="/app/clearance/new" className="btn btn-primary btn-sm mt-4">
              Ask for quotes
            </Link>
          )}
        </div>
      )}
      <p className="mt-8 text-sm text-soft">
        Run a clearance company? <Link to="/app/community/new?kind=commercial" className="font-semibold underline underline-offset-2">Register it</Link> with your waste carrier number to receive requests in your area.
      </p>
    </div>
  )
}

// ---------------------------------------------------------------- asking
export function AppClearanceNew() {
  const s = useAppSession()
  const navigate = useNavigate()
  const [land, setLand] = useState<LandType>('farm')
  const [place, setPlace] = useState('')
  const [description, setDescription] = useState('')
  const [waste, setWaste] = useState('')
  const [access, setAccess] = useState('')
  const [point, setPoint] = useState<[number, number] | null>(null)
  const [photo, setPhoto] = useState<{ file: File; url: string } | null>(null)
  const [allowed, setAllowed] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  async function submit() {
    setError(null)
    if (place.trim().length < 2) return setError('Say where it is, for example the farm or business name and the nearest town.')
    if (description.trim().length < 10) return setError("Describe what's been dumped, in a few words.")
    if (!point) return setError('Put a pin on the map where it is.')
    if (!allowed) return setError("Tick the box to confirm it's your land, or you have the owner's permission.")
    if (s.demo) return setSent(true)
    setBusy(true)
    let path: string | null = null
    if (photo) {
      const prepared = await preparePhoto(photo.file)
      path = await uploadPhoto(prepared.blob)
    }
    const result = await createRequest({ landType: land, description, placeLabel: place, lat: point[1], lng: point[0], wasteNote: waste, accessNote: access, photo: path })
    setBusy(false)
    if (typeof result !== 'string') return setError(result.error)
    navigate(`/app/clearance/${result}`, { replace: true })
  }

  if (sent)
    return (
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <div className="card max-w-2xl rounded-3xl p-8">
          <span className="tile-icon size-12 rounded-2xl">
            <Icon name="check" className="size-6" />
          </span>
          <h1 className="mt-4 font-serif text-3xl">Request posted</h1>
          <p className="mt-2 text-soft">Demo: in the real app, licensed clearance companies covering that spot would now be told, and their quotes would appear on your request. Nothing was sent.</p>
          <Link to="/app/clearance/sample-req-1" className="btn btn-primary mt-6">
            See a request with quotes
          </Link>
        </div>
      </div>
    )

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
      <BackLink to="/app/clearance">Private land</BackLink>
      <h1 className="mt-4 font-serif text-4xl">Ask for clearance quotes</h1>
      <p className="mt-2 max-w-3xl text-soft">For rubbish dumped on private land. If it's on a road, path or other public place, report it to the council instead; it's free.</p>
      <div className="mt-6 grid items-start gap-5 lg:grid-cols-[1fr_1.1fr]">
        <section className="card grid gap-4 rounded-3xl p-6">
          <div>
            <p className="mb-1.5 text-sm font-semibold">What kind of land is it?</p>
            <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="What kind of land is it?">
              {(Object.keys(LAND_LABEL) as LandType[]).map((k) => (
                <button key={k} type="button" role="radio" aria-checked={land === k} onClick={() => setLand(k)} className="org-choice rounded-full px-3.5 py-1.5 text-sm font-semibold">
                  {LAND_LABEL[k]}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label htmlFor="cr-place" className="mb-1.5 block text-sm font-semibold">
              Where is it?
            </label>
            <input id="cr-place" className="input" maxLength={120} value={place} onChange={(e) => setPlace(e.target.value)} placeholder="High Fell Farm, near Cockermouth" />
          </div>
          <div>
            <label htmlFor="cr-desc" className="mb-1.5 block text-sm font-semibold">
              What's been dumped?
            </label>
            <textarea id="cr-desc" className="input min-h-24" maxLength={1000} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="About twenty old tyres and a pile of builders rubble inside the field gate." />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="cr-waste" className="mb-1.5 block text-sm font-semibold">
                Types of waste <span className="font-normal text-soft">(optional)</span>
              </label>
              <input id="cr-waste" className="input" maxLength={300} value={waste} onChange={(e) => setWaste(e.target.value)} placeholder="Tyres, rubble, plasterboard" />
            </div>
            <div>
              <p className="mb-1.5 text-sm font-semibold">
                A photo <span className="font-normal text-soft">(helps companies quote)</span>
              </p>
              <input ref={fileRef} type="file" accept="image/*" className="sr-only" onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) setPhoto({ file: f, url: URL.createObjectURL(f) })
              }} />
              {photo ? (
                <span className="flex items-center gap-3">
                  <img src={photo.url} alt="Your photo" className="size-12 rounded-lg object-cover" />
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => setPhoto(null)}>
                    Remove
                  </button>
                </span>
              ) : (
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => fileRef.current?.click()}>
                  <Icon name="camera" className="size-4" /> Add a photo
                </button>
              )}
            </div>
          </div>
          <div>
            <label htmlFor="cr-access" className="mb-1.5 block text-sm font-semibold">
              Access and contact notes <span className="font-normal text-soft">(only shared with the company you choose)</span>
            </label>
            <input id="cr-access" className="input" maxLength={300} value={access} onChange={(e) => setAccess(e.target.value)} placeholder="Gate is past the cattle grid. Ring before you come." />
          </div>
          <label className="flex items-start gap-2.5 text-sm">
            <input type="checkbox" className="mt-1 size-4 accent-[var(--c-accent-ink)]" checked={allowed} onChange={(e) => setAllowed(e.target.checked)} />
            It's my land, or I have the owner's permission to arrange for it to be cleared.
          </label>
          {error && (
            <p className="msg msg-error" role="alert">
              {error}
            </p>
          )}
          <button type="button" className="btn btn-primary justify-self-start" disabled={busy} onClick={() => void submit()}>
            {busy ? 'Posting…' : 'Post and get quotes'}
          </button>
        </section>
        <section className="card rounded-3xl p-6">
          <h2 className="font-semibold">Where exactly?</h2>
          <div className="mt-3">
            <PointPicker value={point} onChange={setPoint} className="h-[420px]" />
          </div>
          <p className="mt-2 text-sm text-soft">{point ? 'Pin placed. Click again to move it.' : 'No pin yet.'} Only companies covering this spot will see your request.</p>
        </section>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------- one request
export function AppClearanceRequest() {
  const { id = '' } = useParams()
  const s = useAppSession()
  const navigate = useNavigate()
  const [companyView, setCompanyView] = useDemoView()
  const companies = useMyCompanies(companyView)
  const demo = s.demo || id.startsWith('sample-')
  const [req, setReq] = useState<ClearanceRequest | null | undefined>(() => (demo ? (SAMPLE_REQUESTS.find((r) => r.id === id) ?? null) : undefined))
  const [quotes, setQuotes] = useState<Quote[]>(() => (demo ? SAMPLE_QUOTES.filter((q) => q.request_id === id) : []))
  const [tick, setTick] = useState(0)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (demo) return
    let alive = true
    void Promise.all([fetchRequest(id), fetchQuotes(id)]).then(([r, q]) => {
      if (!alive) return
      setReq(r)
      setQuotes(q)
    })
    return () => {
      alive = false
    }
  }, [id, demo, tick])

  if (req === undefined) return <div className="mx-auto max-w-7xl px-4 py-10" aria-busy="true" />
  if (req === null)
    return (
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <BackLink to="/app/clearance">Private land</BackLink>
        <p className="mt-6 font-semibold">That request isn't available to you.</p>
      </div>
    )

  // In the demo, "the person asking" owns sample requests 1 and 2; "a company" is Fellside.
  const asker = demo ? !companyView && req.requester_id === 'demo' : req.requester_id === s.userId
  const myCompanyIds = new Set(companies.map((c) => c.id))
  const ourQuote = quotes.find((q) => myCompanyIds.has(q.org_id) && q.status !== 'withdrawn')
  const accepted = quotes.find((q) => q.id === req.accepted_quote_id)
  const weWon = !!accepted && myCompanyIds.has(accepted.org_id)
  const refresh = () => setTick((t) => t + 1)

  async function run(fn: () => Promise<string | null>, local: () => void) {
    setError(null)
    if (!demo) {
      const problem = await fn()
      if (problem) return setError(problem)
      refresh()
    } else local()
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
      <BackLink to="/app/clearance">Private land</BackLink>
      {s.demo && <DemoViewSwitch company={companyView} onChange={setCompanyView} />}
      <div className="mt-5 grid items-start gap-5 lg:grid-cols-[1.15fr_1fr]">
        <section className="card overflow-hidden rounded-3xl p-0">
          {req.status === 'done' && req.done_photo_path && req.photo_path ? (
            <div className="grid grid-cols-2 gap-0.5">
              {[
                ['Before', req.photo_path],
                ['After', req.done_photo_path],
              ].map(([label, p]) => (
                <figure key={label} className="relative">
                  <img src={photoUrl(p)} alt={label} className="aspect-[4/3] w-full object-cover" />
                  <figcaption className="photo-tag absolute left-2.5 top-2.5">{label}</figcaption>
                </figure>
              ))}
            </div>
          ) : (
            req.photo_path && <img src={photoUrl(req.photo_path)} alt={req.description} className="aspect-[16/9] max-h-[360px] w-full object-cover" />
          )}
          <div className="p-6">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`pill ${PILL[req.status]}`}>{REQUEST_STATUS_LABEL[req.status]}</span>
              <span className="text-sm text-soft">
                {LAND_LABEL[req.land_type]} · posted {timeAgo(req.created_at)}
                {!asker && ` by ${req.requester_name}`}
              </span>
            </div>
            <h1 className="mt-2 font-serif text-3xl">{req.place_label}</h1>
            <p className="mt-3 leading-relaxed">{req.description}</p>
            {req.waste_note && (
              <p className="mt-2 text-sm">
                <span className="font-semibold">Waste:</span> {req.waste_note}
              </p>
            )}
            {req.status === 'done' && req.done_note && (
              <div className="check-panel mt-4 rounded-2xl p-4 text-sm">
                <p className="font-semibold">Cleared {req.done_at && timeAgo(req.done_at)}</p>
                <p className="mt-1">{req.done_note}</p>
              </div>
            )}
          </div>
          <div className="border-t border-line p-4">
            <PointPicker value={[req.lng, req.lat]} onChange={() => {}} className="h-[260px]" readOnly />
          </div>
        </section>

        <div className="grid gap-5">
          {error && (
            <p className="msg msg-error" role="alert">
              {error}
            </p>
          )}
          {asker ? (
            <AskerPanel
              req={req}
              quotes={quotes}
              onAccept={(q) =>
                run(
                  () => acceptQuote(q.id),
                  () => {
                    setQuotes((l) => l.map((x) => ({ ...x, status: x.id === q.id ? 'accepted' : x.status === 'sent' ? 'declined' : x.status })))
                    setReq({ ...req, status: 'accepted', accepted_quote_id: q.id })
                  },
                )
              }
              onCancel={() =>
                run(
                  () => cancelRequest(req.id),
                  () => setReq({ ...req, status: 'cancelled' }),
                ).then(() => !demo && navigate('/app/clearance'))
              }
            />
          ) : companies.length > 0 ? (
            <CompanyPanel
              req={req}
              companies={companies}
              ourQuote={ourQuote}
              weWon={weWon}
              demo={demo}
              onQuote={(orgId, pence, when, msg) =>
                run(
                  () => sendQuote(req.id, orgId, pence, when, msg),
                  () => setQuotes((l) => [...l, { id: `local-${Date.now()}`, request_id: req.id, org_id: orgId, price_pence: pence, when_text: when, message: msg || null, status: 'sent', created_at: new Date().toISOString(), organisations: { name: companies.find((c) => c.id === orgId)?.name ?? '', waste_carrier_number: null, area_label: '' } }]),
                )
              }
              onWithdraw={(q) =>
                run(
                  () => withdrawQuote(q.id),
                  () => setQuotes((l) => l.map((x) => (x.id === q.id ? { ...x, status: 'withdrawn' } : x))),
                )
              }
              onDone={(note, photo) =>
                run(
                  () => completeClearance(req.id, note, photo),
                  () => setReq({ ...req, status: 'done', done_note: note || null, done_at: new Date().toISOString(), done_photo_path: '/img/trash-picking-700.webp' }),
                )
              }
            />
          ) : (
            <section className="card rounded-3xl p-6 text-sm text-soft">Only the person who asked and the clearance companies covering this spot can act on this request.</section>
          )}
        </div>
      </div>
    </div>
  )
}

function AskerPanel({ req, quotes, onAccept, onCancel }: { req: ClearanceRequest; quotes: Quote[]; onAccept: (q: Quote) => void; onCancel: () => void }) {
  const [confirm, setConfirm] = useState<string | null>(null)
  const live = quotes.filter((q) => q.status !== 'withdrawn')
  return (
    <section className="card rounded-3xl p-6">
      <h2 className="font-serif text-2xl">Quotes</h2>
      <p className="mt-1 text-sm text-soft">
        {req.status === 'open' ? (live.length ? 'Cheapest first. Choosing one shares your email and access notes with that company only.' : "No quotes yet. Licensed companies covering this spot have been told; you'll get a notification when one quotes.") : req.status === 'accepted' ? 'You chose a company. They have your contact details and will be in touch.' : req.status === 'done' ? 'This job is done.' : 'You cancelled this request.'}
      </p>
      <ul className="mt-4 grid gap-3">
        {live.map((q) => (
          <li key={q.id} className={`quote-card rounded-2xl p-4 ${q.status === 'accepted' ? 'quote-chosen' : ''}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold">{q.organisations?.name}</p>
                <p className="text-xs text-soft">
                  {q.organisations?.waste_carrier_number && <>Waste carrier {q.organisations.waste_carrier_number} · </>}
                  quoted {timeAgo(q.created_at)}
                </p>
              </div>
              <p className="num shrink-0 font-serif text-3xl leading-none">{pounds(q.price_pence)}</p>
            </div>
            <p className="mt-2 text-sm">
              <span className="font-semibold">When:</span> {q.when_text}
            </p>
            {q.message && <p className="mt-1 text-sm text-soft">{q.message}</p>}
            <div className="mt-3">
              {q.status === 'accepted' && <span className="pill pill-cleared">You chose this quote</span>}
              {q.status === 'declined' && <span className="pill pill-closed">Not chosen</span>}
              {q.status === 'sent' && req.status === 'open' &&
                (confirm === q.id ? (
                  <span className="flex flex-wrap gap-2">
                    <button type="button" className="btn btn-primary btn-sm" onClick={() => onAccept(q)}>
                      Yes, choose {q.organisations?.name}
                    </button>
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => setConfirm(null)}>
                      Not yet
                    </button>
                  </span>
                ) : (
                  <button type="button" className="btn btn-primary btn-sm" onClick={() => setConfirm(q.id)}>
                    Choose this quote
                  </button>
                ))}
            </div>
          </li>
        ))}
      </ul>
      {(req.status === 'open' || req.status === 'accepted') && (
        <button type="button" className="btn btn-ghost btn-sm mt-5" onClick={onCancel}>
          Cancel this request
        </button>
      )}
    </section>
  )
}

function CompanyPanel({ req, companies, ourQuote, weWon, demo, onQuote, onWithdraw, onDone }: { req: ClearanceRequest; companies: Org[]; ourQuote?: Quote; weWon: boolean; demo: boolean; onQuote: (orgId: string, pence: number, when: string, msg: string) => void; onWithdraw: (q: Quote) => void; onDone: (note: string, photo: string | null) => void }) {
  const [org, setOrg] = useState(companies[0]?.id ?? '')
  const [price, setPrice] = useState('')
  const [when, setWhen] = useState('')
  const [msg, setMsg] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [contact, setContact] = useState<{ name: string; email: string; access_note: string | null } | null>(null)
  const [note, setNote] = useState('')
  const [photo, setPhoto] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!weWon) return
    if (demo) return setContact({ name: req.requester_name, email: 'sam.demo@example.com', access_note: req.access_note })
    void fetchContact(req.id).then(setContact)
  }, [weWon, demo, req])

  function quote() {
    setError(null)
    const pence = Math.round(parseFloat(price.replace(/[£,\s]/g, '')) * 100)
    if (!pence || pence < 100) return setError('Enter your price in pounds, including disposal.')
    if (when.trim().length < 2) return setError('Say when you could do it.')
    onQuote(org, pence, when.trim(), msg.trim())
  }

  async function done() {
    setBusy(true)
    let path: string | null = null
    if (photo && !demo) path = await uploadPhoto((await preparePhoto(photo)).blob)
    setBusy(false)
    onDone(note.trim(), path)
  }

  if (weWon)
    return (
      <section className="card rounded-3xl p-6">
        <span className="pill pill-cleared">Your quote was chosen</span>
        <h2 className="mt-3 font-serif text-2xl">Contact and access</h2>
        {contact ? (
          <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-5 gap-y-1.5 text-sm">
            <dt className="text-soft">Name</dt>
            <dd className="font-semibold">{contact.name}</dd>
            <dt className="text-soft">Email</dt>
            <dd className="select-all font-semibold">{contact.email}</dd>
            {contact.access_note && (
              <>
                <dt className="text-soft">Access</dt>
                <dd>{contact.access_note}</dd>
              </>
            )}
          </dl>
        ) : (
          <p className="mt-2 text-sm text-soft">Loading…</p>
        )}
        {req.status === 'accepted' && (
          <div className="mt-5 border-t border-line pt-4">
            <p className="font-semibold">Mark it done</p>
            <label htmlFor="done-note" className="sr-only">
              What you cleared
            </label>
            <textarea id="done-note" className="input mt-2 min-h-20" maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} placeholder="For example: twenty tyres and a skip of rubble taken to a licensed site. Waste transfer note emailed." />
            <input ref={fileRef} type="file" accept="image/*" className="sr-only" onChange={(e) => setPhoto(e.target.files?.[0] ?? null)} />
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => fileRef.current?.click()}>
                <Icon name="camera" className="size-4" /> {photo ? 'Change the after photo' : 'Add an after photo'}
              </button>
              <button type="button" className="btn btn-primary btn-sm" disabled={busy} onClick={() => void done()}>
                {busy ? 'Saving…' : 'Mark it cleared'}
              </button>
            </div>
          </div>
        )}
      </section>
    )

  return (
    <section className="card rounded-3xl p-6">
      <h2 className="font-serif text-2xl">{ourQuote ? 'Your quote' : 'Send a quote'}</h2>
      {ourQuote ? (
        <div className="quote-card mt-4 rounded-2xl p-4">
          <p className="num font-serif text-3xl">{pounds(ourQuote.price_pence)}</p>
          <p className="mt-1 text-sm">
            <span className="font-semibold">When:</span> {ourQuote.when_text}
          </p>
          {ourQuote.message && <p className="mt-1 text-sm text-soft">{ourQuote.message}</p>}
          <p className="mt-3">{ourQuote.status === 'sent' ? <span className="pill pill-progress">Waiting for them to choose</span> : ourQuote.status === 'declined' ? <span className="pill pill-closed">Another company was chosen</span> : null}</p>
          {ourQuote.status === 'sent' && (
            <button type="button" className="btn btn-ghost btn-sm mt-3" onClick={() => onWithdraw(ourQuote)}>
              Withdraw the quote
            </button>
          )}
        </div>
      ) : req.status !== 'open' ? (
        <p className="mt-2 text-sm text-soft">This request isn't taking quotes any more.</p>
      ) : (
        <div className="mt-4 grid gap-4">
          {companies.length > 1 && (
            <div>
              <p className="mb-1.5 text-sm font-semibold">Quoting as</p>
              <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Quoting as">
                {companies.map((c) => (
                  <button key={c.id} type="button" role="radio" aria-checked={org === c.id} onClick={() => setOrg(c.id)} className="org-choice rounded-full px-3.5 py-1.5 text-sm font-semibold">
                    {c.name}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="q-price" className="mb-1.5 block text-sm font-semibold">
                Price, including disposal
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-3.5 grid place-items-center text-soft">£</span>
                <input id="q-price" className="input num !pl-8" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="320" />
              </div>
            </div>
            <div>
              <label htmlFor="q-when" className="mb-1.5 block text-sm font-semibold">
                When could you do it?
              </label>
              <input id="q-when" className="input" maxLength={120} value={when} onChange={(e) => setWhen(e.target.value)} placeholder="Thursday morning" />
            </div>
          </div>
          <div>
            <label htmlFor="q-msg" className="mb-1.5 block text-sm font-semibold">
              Anything they should know? <span className="font-normal text-soft">(optional)</span>
            </label>
            <textarea id="q-msg" className="input min-h-20" maxLength={600} value={msg} onChange={(e) => setMsg(e.target.value)} placeholder="For example: tyres go to a licensed recycler; you'll get a waste transfer note." />
          </div>
          {error && (
            <p className="msg msg-error" role="alert">
              {error}
            </p>
          )}
          <button type="button" className="btn btn-primary justify-self-start" onClick={quote}>
            Send the quote
          </button>
          <p className="text-xs text-soft">They see your company name, waste carrier number, price and message. You get their contact details only if they choose you.</p>
        </div>
      )}
    </section>
  )
}
