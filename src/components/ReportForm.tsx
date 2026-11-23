import { lazy, Suspense, useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useMediaQuery } from '../lib/useMediaQuery'
import { useNavigate } from 'react-router-dom'
import { useCategories } from '../lib/categories'
import { deviceToken } from '../lib/device'
import { clearDraft, loadDraft, loadDraftPhoto, saveDraft, saveDraftPhoto } from '../lib/draft'
import { backReport, findNearby } from '../lib/nearby'
import { preparePhoto } from '../lib/photo'
import { photoUrl } from '../lib/photos'
import { STATUS_LABELS } from '../lib/status'
import { supabase } from '../lib/supabase'
import type { NearbyReport, Position } from '../types'
import { Icon, type IconName } from './ui/Icon'

// A loose box around the UK and Ireland. Just a nudge for someone testing from abroad, not a
// hard rule: the pilot is UK-only, but the project itself is still being tested from outside it.
const UK_BOUNDS = { minLat: 49.5, maxLat: 61, minLng: -8.75, maxLng: 2 }
const inUK = (p: Position) => p.lat >= UK_BOUNDS.minLat && p.lat <= UK_BOUNDS.maxLat && p.lng >= UK_BOUNDS.minLng && p.lng <= UK_BOUNDS.maxLng

// The map library is large, so it loads in the background and the form is usable straight away.
const MapPicker = lazy(() => import('./MapPicker').then((m) => ({ default: m.MapPicker })))
const MapFocus = lazy(() => import('./MapFocus').then((m) => ({ default: m.MapFocus })))

const TYPE_ICON: Record<string, IconName> = {
  'fly-tipping': 'trash',
  pothole: 'road',
  graffiti: 'spray',
  'abandoned-vehicle': 'car',
  'damaged-infrastructure': 'lamp',
  other: 'more',
}
const TYPE_HINT: Record<string, string> = {
  'fly-tipping': 'Dumped rubbish',
  pothole: 'Holes in the road',
  graffiti: 'On walls and signs',
  'abandoned-vehicle': 'No sign of an owner',
  'damaged-infrastructure': 'Lamps, barriers, bins',
  other: 'Anything else', 
}
const MAX = 1000

type Field = 'category' | 'description' | 'photo' | 'location'
type Errors = Partial<Record<Field, string>>
const ORDER: Field[] = ['category', 'description', 'photo', 'location']

function StepTitle({ n, children }: { n: number; children: string }) {
  return (
    <h2 className="flex items-center gap-3 font-sans text-lg font-semibold tracking-normal">
      <span className="grid size-8 place-items-center rounded-full bg-accent text-sm font-semibold text-accent-ink">{n}</span>
      {children}
    </h2>
  )
}

// One numbered step. A step that is missing something when Send is pressed gets a red edge and says
// what it needs, right under its own question rather than somewhere else on the page.
function Step({ id, n, title, error, children }: { id: Field; n: number; title: string; error?: string; children: ReactNode }) {
  return (
    <section id={`step-${id}`} className={`card scroll-mt-28 rounded-3xl p-6 sm:p-7 ${error ? 'step-invalid' : ''}`}>
      <StepTitle n={n}>{title}</StepTitle>
      {error && (
        <p id={`${id}-error`} className="field-error mt-3">
          <Icon name="x" className="size-4 shrink-0" /> {error}
        </p>
      )}
      {children}
    </section>
  )
}

// Plain words for what went wrong while sending, instead of the raw technical message.
function friendlyError(err: unknown): string {
  console.error(err)
  const msg = err instanceof Error ? err.message : String(err)
  if (!navigator.onLine || /fetch|network|load failed/i.test(msg))
    return "Couldn't reach Resolve UK. Check your connection and press Send again. Your report is still here."
  if (/payload|too large|size/i.test(msg)) return "That photo couldn't be uploaded. Try a different or smaller photo."
  if (/rate|too many/i.test(msg)) return 'Too many reports have been sent from here in a short time. Please wait a minute and try again.'
  return 'Something went wrong while sending your report. Your report is still here; please press Send again.'
}

// `done` is where to go after sending (the public reports page, or the app's). In the app,
// `reporterId` links the report to the signed-in person, so they hear when it moves on and are
// asked to check it once cleared; `demo` goes through the motions without sending anything.
export function ReportForm({ done = '/reports', reporterId = null, demo = false }: { done?: string; reporterId?: string | null; demo?: boolean } = {}) {
  const navigate = useNavigate()
  const desktop = useMediaQuery('(min-width: 1024px)')
  const categories = useCategories()
  // Nothing chosen to start with, so a report is never filed under a type nobody picked.
  const [category, setCategory] = useState('')
  const [description, setDescription] = useState('')
  const [photo, setPhoto] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const [position, setPosition] = useState<Position | null>(null)
  const [locating, setLocating] = useState(false)
  const [focusMap, setFocusMap] = useState(false) // the big, full-screen map picker
  const [geoError, setGeoError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // What each step still needs is only shown once Send has been pressed, then kept up to date as the
  // person fills things in.
  const [attempted, setAttempted] = useState(false)
  const [restored, setRestored] = useState(false)
  const loaded = useRef(false)
  // reports close by that might be the same problem, shown before anything is sent
  const [matches, setMatches] = useState<NearbyReport[] | null>(null)
  // the place and type the person has already said are a different problem, so they are not asked again
  const differentAt = useRef<string | null>(null)

  useEffect(() => () => {
    if (photoPreview) URL.revokeObjectURL(photoPreview)
  }, [photoPreview])

  // Bring back an unsent report from earlier on this device, then keep saving as it changes.
  useEffect(() => {
    const d = loadDraft()
    if (d) {
      setCategory(d.category)
      setDescription(d.description)
      if (d.position) setPosition(d.position)
      if (d.category || d.description.trim() || d.position) setRestored(true)
    }
    void loadDraftPhoto().then((f) => {
      if (f) {
        setPhoto(f)
        setPhotoPreview(URL.createObjectURL(f))
        setRestored(true)
      }
      loaded.current = true
    })
  }, [])

  useEffect(() => {
    if (loaded.current) saveDraft({ category, description, position })
  }, [category, description, position])

  const startOver = () => {
    clearDraft()
    setCategory('')
    setDescription('')
    setPhoto(null)
    setPhotoPreview(null)
    setAttempted(false)
    setRestored(false)
  }

  const choosePhoto = (file: File | null | undefined) => {
    if (!file) return
    void saveDraftPhoto(file)
    setPhoto(file)
    setPhotoPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return URL.createObjectURL(file)
    })
  }

  // Finds the person's location. Done once automatically when the page opens, so the pin starts where they are,
  // and again whenever they ask. If they already placed a pin themselves before the automatic answer arrives, it stays.
  const findMe = (auto = false) => {
    if (!navigator.geolocation) {
      setGeoError('This device cannot share its location. Tap the map to drop a pin instead.')
      return
    }
    setLocating(true)
    setGeoError(null)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const found: Position = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: Number.isFinite(pos.coords.accuracy) ? Math.round(pos.coords.accuracy) : null,
          source: 'gps',
        }
        setPosition((current) => (auto && current ? current : found))
        setLocating(false)
      },
      () => {
        // The automatic try failing on its own is normal (location off, or just slow), so it is not
        // shown as an error; the hint under the button already says what to do. Only a failed tap is.
        if (!auto) setGeoError('Could not get your location. Tap the map to drop a pin instead.')
        setLocating(false)
      },
      { enableHighAccuracy: true, timeout: 10000 },
    )
  }

  useEffect(() => {
    findMe(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const spotKey = (p: Position) => `${category}|${p.lat.toFixed(5)},${p.lng.toFixed(5)}`

  // Uploads the photo and saves the report.
  const send = async (p: Position, file: File) => {
    if (demo) {
      clearDraft()
      navigate(done, { state: { notice: 'Demo: your report would now be sent to the council or contractor for that spot. Nothing was sent.' } })
      return
    }
    const { blob, ext } = await preparePhoto(file)
    const photoPath = `${crypto.randomUUID()}.${ext}`

    const { error: uploadError } = await supabase.storage.from('report-photos').upload(photoPath, blob, { contentType: blob.type || undefined })
    if (uploadError) throw uploadError

    const { error: insertError } = await supabase.from('reports').insert({
      category_code: category,
      description: description.trim(),
      photo_path: photoPath,
      lat: p.lat,
      lng: p.lng,
      location_accuracy_m: p.accuracy,
      location_source: p.source,
      device_token: deviceToken(),
      ...(reporterId ? { reporter_id: reporterId } : {}),
    })
    if (insertError) throw insertError

    clearDraft()
    navigate(done, { state: { notice: reporterId ? "Report sent. Thank you. You'll get a notification each time it moves on." : 'Report submitted. Thank you.' } })
  }

  const errors: Errors = {}
  if (!category) errors.category = 'Choose the type of problem.'
  if (!description.trim()) errors.description = 'Add a short description of what you saw.'
  if (!photo) errors.photo = 'Add a photo of the problem.'
  if (!position) errors.location = 'Set the spot: use your location, or tap the map.'
  const shown: Errors = attempted ? errors : {}
  const missing = ORDER.filter((f) => errors[f])

  // Takes the person to the first step that still needs something, and puts the cursor there.
  const goTo = (f: Field) => {
    document.getElementById(`step-${f}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    const target =
      f === 'category'
        ? document.querySelector<HTMLInputElement>('#step-category input')
        : f === 'description'
          ? document.getElementById('description-field')
          : f === 'photo'
            ? document.getElementById('photo-field')
            : document.getElementById('locate-button')
    window.setTimeout(() => target?.focus({ preventScroll: true }), 350)
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setAttempted(true)
    if (missing.length || !position || !photo) {
      if (missing[0]) goTo(missing[0])
      return
    }

    setSubmitting(true)
    try {
      // Ask first if someone has already reported this, unless they have already said it is different.
      if (differentAt.current !== spotKey(position)) {
        const found = await findNearby(position, category)
        if (found.length > 0) {
          setMatches(found)
          return
        }
      }
      await send(position, photo)
    } catch (err) {
      setError(friendlyError(err))
    } finally {
      setSubmitting(false)
    }
  }

  const sameProblem = async (match: NearbyReport) => {
    setError(null)
    setSubmitting(true)
    try {
      const result = await backReport(match.id)
      navigate(done, {
        state: {
          notice:
            result === 'added'
              ? 'Thank you. Your support has been added to the existing report, so it is not sent twice.'
              : 'You have already backed that report. Thank you.',
        },
      })
    } catch (err) {
      setError(friendlyError(err))
      setSubmitting(false)
    }
  }

  const differentProblem = async () => {
    if (!position || !photo) return
    setError(null)
    setSubmitting(true)
    try {
      differentAt.current = spotKey(position)
      setMatches(null)
      await send(position, photo)
    } catch (err) {
      setError(friendlyError(err))
    } finally {
      setSubmitting(false)
    }
  }

  const map = (
    <Suspense fallback={<div className="skeleton size-full rounded-none" aria-label="Loading the map" />}>
      <MapPicker position={position} onChange={setPosition} onLocate={() => findMe()} locating={locating} onExpand={() => setFocusMap(true)} />
      {focusMap && (
        <MapFocus
          title="Where is the problem?"
          start={position}
          onClose={() => setFocusMap(false)}
          onPick={(p) => {
            setPosition({ ...p, accuracy: null, source: 'manual' })
            setFocusMap(false)
          }}
        />
      )}
    </Suspense>
  )

  const typeLabel = categories.find((c) => c.code === category)?.label ?? category
  const locationText = position ? (position.source === 'gps' && position.accuracy != null ? `Set, accurate to about ${position.accuracy} m` : 'Pin set') : 'Not set'

  return (
    <div className="mt-10 grid items-start gap-6 lg:grid-cols-[1.2fr_.8fr]">
      {/* On a phone or tablet the send button stays pinned to the bottom, so it is always in reach. */}
      {/* Rendered straight into <body>: the page's <main> is its own stacking layer (isolation:
          isolate, from the grid texture), so a fixed bar inside it ended up underneath the footer
          when scrolled to the bottom, and Send could not be tapped there. */}
      {!desktop && !matches && createPortal(
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-bg/85 px-4 pt-3 backdrop-blur-xl" style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}>
          {(error || (attempted && missing.length > 0)) && (
            <p className="mx-auto mb-2 max-w-2xl text-center text-sm font-semibold text-[var(--c-danger)]" role="status">
              {error ?? `${missing.length} ${missing.length === 1 ? 'thing' : 'things'} still needed above`}
            </p>
          )}
          <button type="button" className="btn btn-primary mx-auto w-full max-w-2xl text-base" disabled={submitting} onClick={(e) => handleSubmit(e as unknown as FormEvent)}>
            {submitting ? 'Checking…' : 'Send report'}
            <Icon name="arrow" />
          </button>
        </div>,
        document.body,
      )}
      {matches ? (
        <section className="card rounded-3xl p-6 sm:p-7" aria-labelledby="match-title">
          <p className="eyebrow">Before you send it</p>
          <h2 id="match-title" className="mt-3 text-3xl">
            Is this the same problem?
          </h2>
          <p className="mt-2 text-soft">Someone has already reported something like this close by. If it is the same problem, add your support to that report instead of sending a new one.</p>
          <ul className="mt-5 space-y-3">
            {matches.map((m) => (
              <li key={m.id} className="flex gap-4 rounded-2xl border border-line bg-surface2/60 p-3">
                <img className="size-24 shrink-0 rounded-xl object-cover" src={photoUrl(m.photo_path)} alt="" loading="lazy" />
                <div className="min-w-0">
                  <p className="font-semibold">{m.description}</p>
                  <p className="mt-0.5 text-xs text-soft">
                    About {Math.max(1, Math.round(m.distance_m))} m away · {STATUS_LABELS[m.current_status]} · Backed by {m.backers} {Number(m.backers) === 1 ? 'person' : 'people'}
                  </p>
                  <button type="button" className="btn btn-ghost btn-sm mt-3" disabled={submitting} onClick={() => sameProblem(m)}>
                    <Icon name="eye" className="size-4" />
                    Yes, it is the same problem
                  </button>
                </div>
              </li>
            ))}
          </ul>
          {error && (
            <p className="msg msg-error mt-4" role="alert">
              {error}
            </p>
          )}
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button type="button" className="btn btn-primary" disabled={submitting} onClick={differentProblem}>
              {submitting ? 'Sending…' : 'No, it is a different problem'}
            </button>
            <button type="button" className="btn btn-ghost" disabled={submitting} onClick={() => setMatches(null)}>
              Go back and change my report
            </button>
          </div>
        </section>
      ) : (
        <form className="space-y-5" onSubmit={handleSubmit} noValidate>
          {restored && (
            <p className="msg msg-info flex flex-wrap items-center justify-between gap-3" role="status">
              We kept the report you started earlier on this device.
              <button type="button" className="font-semibold underline underline-offset-2" onClick={startOver}>
                Start over
              </button>
            </p>
          )}
          <Step id="category" n={1} title="What is the problem?" error={shown.category}>
            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3" role="radiogroup" aria-label="Type of problem" aria-invalid={!!shown.category} aria-describedby={shown.category ? 'category-error' : undefined}>
              {categories.map((c) => (
                <label key={c.code} className="tile" data-tag={`Select ${c.label}`}>
                  <input type="radio" name="type" value={c.code} checked={category === c.code} onChange={() => setCategory(c.code)} />
                  <span className="tile-icon">
                    <Icon name={TYPE_ICON[c.code] ?? 'more'} />
                  </span>
                  <span className="font-bold leading-tight">{c.label}</span>
                  <span className="text-xs text-soft">{TYPE_HINT[c.code] ?? ''}</span>
                </label>
              ))}
            </div>
          </Step>

          <Step id="description" n={2} title="Describe it" error={shown.description}>
            <div className="mt-5">
              <label className="sr-only" htmlFor="description-field">
                Description
              </label>
              <textarea
                id="description-field"
                className="input"
                maxLength={MAX}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                aria-invalid={!!shown.description}
                aria-describedby={shown.description ? 'description-error' : undefined}
                placeholder="For example: black bags piled against the wall, blocking the pavement."
              />
              <p className="mt-2 text-right text-xs text-soft">
                {description.length} / {MAX}
              </p>
            </div>
          </Step>

          <Step id="photo" n={3} title="Add a photo" error={shown.photo}>
            <label
              className="dropzone mt-5"
              data-over={dragging}
              data-tag={photo ? 'Change photo' : 'Choose a photo'}
              onDragOver={(e) => {
                e.preventDefault()
                setDragging(true)
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault()
                setDragging(false)
                choosePhoto(e.dataTransfer.files[0])
              }}
            >
              <input id="photo-field" className="sr-only" type="file" accept="image/*" capture="environment" aria-invalid={!!shown.photo} aria-describedby={shown.photo ? 'photo-error' : undefined} onChange={(e) => choosePhoto(e.target.files?.[0])} />
              {photoPreview ? (
                <img src={photoPreview} alt="The photo you chose" className="max-h-52 rounded-xl object-cover" />
              ) : (
                <span className="tile-icon size-12 rounded-2xl">
                  <Icon name="upload" className="size-6" />
                </span>
              )}
              <span className="font-bold">{photo ? photo.name : 'Drop a photo here, or browse'}</span>
              <span className="text-sm text-soft">{photo ? 'Ready. Click to choose a different photo.' : 'Large photos are reduced in size before they are sent.'}</span>
            </label>
          </Step>

          <Step id="location" n={4} title="Where is it?" error={shown.location}>
            <div className="mt-5 flex flex-wrap gap-3">
              <button id="locate-button" type="button" className="btn btn-ghost" onClick={() => findMe()} disabled={locating} aria-describedby={shown.location ? 'location-error' : undefined}>
                <Icon name="crosshair" className="size-5 text-accent" />
                {locating ? 'Locating…' : 'Use my location'}
              </button>
            </div>
            <p className="mt-3 text-sm text-soft">
              {position ? (
                <>
                  Pin set at {position.lat.toFixed(5)}, {position.lng.toFixed(5)}
                  {position.source === 'gps' && position.accuracy != null ? ` (accurate to about ${position.accuracy} m)` : ''}. Drag the pin or tap the map to change the spot.
                </>
              ) : (
                locating ? 'Finding your location…' : 'Use your phone’s location, or tap the map to drop a pin on the exact spot.'
              )}
            </p>
            {geoError && (
              <p className="msg msg-warn mt-3" role="alert">
                {geoError}
              </p>
            )}
            {position && !inUK(position) && (
              <p className="msg msg-warn mt-3" role="alert">
                This looks like it is outside the UK. Resolve UK only routes reports to UK councils and contractors, so this may not reach anyone who can act on it.
              </p>
            )}
            {!desktop && (
              <div className="mt-5 aspect-[4/3] overflow-hidden rounded-2xl border border-line sm:aspect-[16/10]" aria-label="Map">
                {map}
              </div>
            )}
          </Step>
        </form>
      )}

      <aside className="space-y-5 lg:sticky lg:top-24">
        {desktop && (
          <section className="card overflow-hidden rounded-3xl" aria-label="Map">
            <div className="aspect-square">{map}</div>
          </section>
        )}

        <section className="card hidden rounded-3xl p-6 lg:block">
          <h2 className="font-sans text-lg font-semibold tracking-normal">Your report</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <SummaryRow label="Type" value={category ? typeLabel : 'Not chosen'} needed={!!shown.category} onFix={() => goTo('category')} />
            <SummaryRow label="Description" value={description.trim() || 'Not written yet'} needed={!!shown.description} onFix={() => goTo('description')} truncate />
            <SummaryRow label="Photo" value={photo ? 'Added' : 'None yet'} needed={!!shown.photo} onFix={() => goTo('photo')} />
            <SummaryRow label="Location" value={locationText} needed={!!shown.location} onFix={() => goTo('location')} />
          </dl>
          <button type="button" className="btn btn-primary mt-6 w-full text-base" disabled={submitting || !!matches} onClick={(e) => handleSubmit(e as unknown as FormEvent)}>
            {submitting ? 'Checking…' : 'Send report'}
            <Icon name="arrow" />
          </button>
          {error ? (
            <p className="msg msg-error mt-3" role="alert">
              {error}
            </p>
          ) : attempted && missing.length > 0 ? (
            <p className="mt-3 text-center text-sm font-semibold text-[var(--c-danger)]" role="status">
              {missing.length} {missing.length === 1 ? 'thing' : 'things'} still needed. Click one above to go to it.
            </p>
          ) : (
            <p className="mt-3 text-center text-xs text-soft">You will see it appear in the list straight away.</p>
          )}
        </section>
      </aside>
    </div>
  )
}

// A line in the "Your report" summary. When that part is missing after Send was pressed, it turns red
// and becomes a link to the step that needs it.
function SummaryRow({ label, value, needed, onFix, truncate }: { label: string; value: string; needed: boolean; onFix: () => void; truncate?: boolean }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-soft">{label}</dt>
      <dd className={`font-semibold ${truncate ? 'max-w-[14rem] truncate' : ''}`}>
        {needed ? (
          <button type="button" className="font-semibold text-[var(--c-danger)] underline underline-offset-2" onClick={onFix}>
            Needed
          </button>
        ) : (
          value
        )}
      </dd>
    </div>
  )
}
