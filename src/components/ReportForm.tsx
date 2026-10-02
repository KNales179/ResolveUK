import { lazy, Suspense, useEffect, useRef, useState, type FormEvent } from 'react'
import { useMediaQuery } from '../lib/useMediaQuery'
import { useNavigate } from 'react-router-dom'
import { useCategories } from '../lib/categories'
import { backReport, findNearby } from '../lib/nearby'
import { preparePhoto } from '../lib/photo'
import { photoUrl } from '../lib/photos'
import { STATUS_LABELS } from '../lib/status'
import { supabase } from '../lib/supabase'
import type { NearbyReport, Position } from '../types'
import { Icon, type IconName } from './ui/Icon'

// The map library is large, so it loads in the background and the form is usable straight away.
const MapPicker = lazy(() => import('./MapPicker').then((m) => ({ default: m.MapPicker })))

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

function StepTitle({ n, children }: { n: number; children: string }) {
  return (
    <h2 className="flex items-center gap-3 font-sans text-lg font-semibold tracking-normal">
      <span className="grid size-8 place-items-center rounded-full bg-accent text-sm font-semibold text-accent-ink">{n}</span>
      {children}
    </h2>
  )
}

export function ReportForm() {
  const navigate = useNavigate()
  const desktop = useMediaQuery('(min-width: 1024px)')
  const categories = useCategories()
  const [category, setCategory] = useState('fly-tipping')
  const [description, setDescription] = useState('')
  const [photo, setPhoto] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const [position, setPosition] = useState<Position | null>(null)
  const [locating, setLocating] = useState(false)
  const [geoError, setGeoError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // reports close by that might be the same problem, shown before anything is sent
  const [matches, setMatches] = useState<NearbyReport[] | null>(null)
  // the place and type the person has already said are a different problem, so they are not asked again
  const differentAt = useRef<string | null>(null)

  useEffect(() => () => {
    if (photoPreview) URL.revokeObjectURL(photoPreview)
  }, [photoPreview])

  const choosePhoto = (file: File | null | undefined) => {
    if (!file) return
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
        setGeoError(auto ? 'Could not find your location automatically. Tap the map or drag the pin to set the spot.' : 'Could not get your location. Tap the map to drop a pin instead.')
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
    })
    if (insertError) throw insertError

    navigate('/reports', { state: { notice: 'Report submitted. Thank you.' } })
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!description.trim()) {
      setError('Please add a short description.')
      return
    }
    if (!photo) {
      setError('Please add a photo.')
      return
    }
    if (!position) {
      setError('Please set a location by tapping the map or using your location.')
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
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const sameProblem = async (match: NearbyReport) => {
    setError(null)
    setSubmitting(true)
    try {
      const result = await backReport(match.id)
      navigate('/reports', {
        state: {
          notice:
            result === 'added'
              ? 'Thank you. Your support has been added to the existing report, so it is not sent twice.'
              : 'You have already backed that report. Thank you.',
        },
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
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
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const map = (
    <Suspense fallback={<div className="skeleton size-full rounded-none" aria-label="Loading the map" />}>
      <MapPicker position={position} onChange={setPosition} onLocate={() => findMe()} locating={locating} />
    </Suspense>
  )

  const typeLabel = categories.find((c) => c.code === category)?.label ?? category
  const locationText = position ? (position.source === 'gps' && position.accuracy != null ? `Set, accurate to about ${position.accuracy} m` : 'Pin set') : 'Not set'

  return (
    <div className="mt-10 grid items-start gap-6 lg:grid-cols-[1.2fr_.8fr]">
      {/* On a phone or tablet the send button stays pinned to the bottom, so it is always in reach. */}
      {!desktop && !matches && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-bg/85 px-4 pt-3 backdrop-blur-xl" style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}>
          <button type="button" className="btn btn-primary mx-auto w-full max-w-2xl text-base" disabled={submitting} onClick={(e) => handleSubmit(e as unknown as FormEvent)}>
            {submitting ? 'Checking…' : 'Send report'}
            <Icon name="arrow" />
          </button>
        </div>
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
          <section className="card rounded-3xl p-6 sm:p-7">
            <StepTitle n={1}>What is the problem?</StepTitle>
            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3" role="radiogroup" aria-label="Type of problem">
              {categories.map((c) => (
                <label key={c.code} className="tile">
                  <input type="radio" name="type" value={c.code} checked={category === c.code} onChange={() => setCategory(c.code)} />
                  <span className="tile-icon">
                    <Icon name={TYPE_ICON[c.code] ?? 'more'} />
                  </span>
                  <span className="font-bold leading-tight">{c.label}</span>
                  <span className="text-xs text-soft">{TYPE_HINT[c.code] ?? ''}</span>
                </label>
              ))}
            </div>
          </section>

          <section className="card rounded-3xl p-6 sm:p-7">
            <StepTitle n={2}>Describe it</StepTitle>
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
                placeholder="For example: black bags piled against the wall, blocking the pavement."
              />
              <p className="mt-2 text-right text-xs text-soft">
                {description.length} / {MAX}
              </p>
            </div>
          </section>

          <section className="card rounded-3xl p-6 sm:p-7">
            <StepTitle n={3}>Add a photo</StepTitle>
            <label
              className="dropzone mt-5"
              data-over={dragging}
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
              <input id="photo-field" className="sr-only" type="file" accept="image/*" capture="environment" onChange={(e) => choosePhoto(e.target.files?.[0])} />
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
          </section>

          <section className="card rounded-3xl p-6 sm:p-7">
            <StepTitle n={4}>Where is it?</StepTitle>
            <div className="mt-5 flex flex-wrap gap-3">
              <button type="button" className="btn btn-ghost" onClick={() => findMe()} disabled={locating}>
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
              <p className="msg msg-error mt-3" role="alert">
                {geoError}
              </p>
            )}
            {!desktop && (
              <div className="mt-5 aspect-[4/3] overflow-hidden rounded-2xl border border-line sm:aspect-[16/10]" aria-label="Map">
                {map}
              </div>
            )}
          </section>

          {error && (
            <p className="msg msg-error" role="alert">
              {error}
            </p>
          )}
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
            <div className="flex justify-between gap-4">
              <dt className="text-soft">Type</dt>
              <dd className="font-semibold">{typeLabel}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-soft">Description</dt>
              <dd className="max-w-[14rem] truncate font-semibold">{description.trim() || 'Not written yet'}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-soft">Photo</dt>
              <dd className="font-semibold">{photo ? 'Added' : 'None yet'}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-soft">Location</dt>
              <dd className="font-semibold">{locationText}</dd>
            </div>
          </dl>
          <button type="button" className="btn btn-primary mt-6 w-full text-base" disabled={submitting || !!matches} onClick={(e) => handleSubmit(e as unknown as FormEvent)}>
            {submitting ? 'Checking…' : 'Send report'}
            <Icon name="arrow" />
          </button>
          <p className="mt-3 text-center text-xs text-soft">You will see it appear in the list straight away.</p>
        </section>
      </aside>
    </div>
  )
}
