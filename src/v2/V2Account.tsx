import { useEffect, useState, type FormEvent } from 'react'
import { PageBackdrop } from '../components/site/SiteShell'
import { Reveal } from '../components/ui/Reveal'
import { useCategories } from '../lib/categories'
import { deviceToken } from '../lib/device'
import { preparePhoto } from '../lib/photo'
import { photoUrl } from '../lib/photos'
import { STATUS_LABELS } from '../lib/status'
import { supabase } from '../lib/supabase'
import type { Report } from '../types'
import { ConceptBanner } from './ConceptBanner'
import { ReporterAuthProvider, useReporterAuth } from './reporterAuth'

function AuthForm() {
  const { signIn, signUp } = useReporterAuth()
  const [mode, setMode] = useState<'signIn' | 'signUp'>('signUp')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setNotice(null)
    setBusy(true)
    const problem = mode === 'signUp' ? await signUp(email, password, name) : await signIn(email, password)
    if (problem) setError(problem)
    else if (mode === 'signUp') setNotice('Account created. If email confirmation is switched on for this project, check your inbox before signing in.')
    setBusy(false)
  }

  return (
    <div className="card max-w-md rounded-2xl p-6 sm:p-7">
      <div className="dd flex gap-1 rounded-lg border border-line p-1">
        <button type="button" className={`flex-1 rounded-md py-2 text-sm font-semibold ${mode === 'signUp' ? 'bg-surface2 text-ink' : 'text-soft'}`} onClick={() => setMode('signUp')}>
          Create an account
        </button>
        <button type="button" className={`flex-1 rounded-md py-2 text-sm font-semibold ${mode === 'signIn' ? 'bg-surface2 text-ink' : 'text-soft'}`} onClick={() => setMode('signIn')}>
          Sign in
        </button>
      </div>
      <form onSubmit={submit} className="mt-6 space-y-4">
        {mode === 'signUp' && (
          <div>
            <label htmlFor="v2-name" className="mb-1.5 block text-sm font-semibold">
              Your name
            </label>
            <input id="v2-name" className="input" type="text" required value={name} onChange={(e) => setName(e.target.value)} />
          </div>
        )}
        <div>
          <label htmlFor="v2-email" className="mb-1.5 block text-sm font-semibold">
            Email
          </label>
          <input id="v2-email" className="input" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div>
          <label htmlFor="v2-password" className="mb-1.5 block text-sm font-semibold">
            Password
          </label>
          <input id="v2-password" className="input" type="password" autoComplete={mode === 'signUp' ? 'new-password' : 'current-password'} required value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        {error && (
          <p className="msg msg-error" role="alert">
            {error}
          </p>
        )}
        {notice && (
          <p className="msg msg-ok" role="status">
            {notice}
          </p>
        )}
        <button type="submit" className="btn btn-primary w-full" disabled={busy}>
          {busy ? 'Please wait…' : mode === 'signUp' ? 'Create account' : 'Sign in'}
        </button>
      </form>
    </div>
  )
}

function MyReports({ reporterId }: { reporterId: string }) {
  const [reports, setReports] = useState<Report[] | null>(null)

  useEffect(() => {
    let alive = true
    supabase
      .from('reports')
      .select('*')
      .eq('reporter_id', reporterId)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (alive) setReports((data as Report[]) ?? [])
      })
    return () => {
      alive = false
    }
  }, [reporterId])

  if (!reports) return <p className="mt-6 text-soft">Loading your reports…</p>
  if (reports.length === 0) return <p className="mt-6 text-soft">Nothing linked to your account yet. Send one below.</p>

  return (
    <ul className="mt-6 space-y-3">
      {reports.map((r) => (
        <li key={r.id} className="card flex gap-4 rounded-2xl p-4">
          <img src={photoUrl(r.photo_path)} alt="" className="size-16 shrink-0 rounded-xl object-cover" />
          <div className="min-w-0">
            <span className="pill pill-reported">{STATUS_LABELS[r.current_status]}</span>
            <p className="mt-1.5 truncate font-semibold">{r.description}</p>
          </div>
        </li>
      ))}
    </ul>
  )
}

function LinkedReportForm({ reporterId, onSent }: { reporterId: string; onSent: () => void }) {
  const categories = useCategories()
  const [category, setCategory] = useState('fly-tipping')
  const [description, setDescription] = useState('')
  const [photo, setPhoto] = useState<File | null>(null)
  const [position, setPosition] = useState<{ lat: number; lng: number; accuracy: number | null } | null>(null)
  const [locating, setLocating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const findMe = () => {
    if (!navigator.geolocation) {
      setError('This device cannot share its location.')
      return
    }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: Number.isFinite(pos.coords.accuracy) ? Math.round(pos.coords.accuracy) : null })
        setLocating(false)
      },
      () => {
        setError('Could not get your location.')
        setLocating(false)
      },
      { enableHighAccuracy: true, timeout: 10000 },
    )
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (!description.trim()) return setError('Please add a short description.')
    if (!photo) return setError('Please add a photo.')
    if (!position) return setError('Please set a location first.')
    setBusy(true)
    try {
      const { blob, ext } = await preparePhoto(photo)
      const photoPath = `${crypto.randomUUID()}.${ext}`
      const { error: uploadError } = await supabase.storage.from('report-photos').upload(photoPath, blob, { contentType: blob.type || undefined })
      if (uploadError) throw uploadError
      const { error: insertError } = await supabase.from('reports').insert({
        category_code: category,
        description: description.trim(),
        photo_path: photoPath,
        lat: position.lat,
        lng: position.lng,
        location_accuracy_m: position.accuracy,
        location_source: 'gps',
        device_token: deviceToken(),
        reporter_id: reporterId,
      })
      if (insertError) throw insertError
      setDescription('')
      setPhoto(null)
      setPosition(null)
      onSent()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="card mt-6 space-y-4 rounded-2xl p-6 sm:p-7">
      <h3 className="font-semibold">Send a report linked to your account</h3>
      <div className="dd">
        <select className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
          {categories.map((c) => (
            <option key={c.code} value={c.code}>
              {c.label}
            </option>
          ))}
        </select>
      </div>
      <textarea className="input" placeholder="What did you see?" value={description} onChange={(e) => setDescription(e.target.value)} />
      <input type="file" accept="image/*" className="input" onChange={(e) => setPhoto(e.target.files?.[0] ?? null)} />
      <button type="button" className="btn btn-ghost" onClick={findMe} disabled={locating}>
        {locating ? 'Locating…' : position ? `Location set (±${position.accuracy ?? '?'} m)` : 'Use my location'}
      </button>
      {error && (
        <p className="msg msg-error" role="alert">
          {error}
        </p>
      )}
      <button type="submit" className="btn btn-primary w-full" disabled={busy}>
        {busy ? 'Sending…' : 'Send linked report'}
      </button>
    </form>
  )
}

function AccountBody() {
  const { status, profile, email, signOut } = useReporterAuth()
  const [refreshKey, setRefreshKey] = useState(0)

  return (
    <div className="max-w-xl">
      <p className="eyebrow">Account idea · real, but isolated to this preview</p>
      <h1 className="mt-4 text-4xl sm:text-5xl">An optional account for whoever sends a report.</h1>
      <p className="mt-6 text-lg leading-relaxed text-soft">
        Reporting on the real site stays fully anonymous, with no change there. This is what it would look like if someone chose to create an account, so a report can stay theirs to follow, and eventually to pick a quote on, for the commercial route. This sign-up is real and stored for real, kept apart from the live site.
      </p>

      <div className="mt-10">
        {status === 'loading' && <p className="text-soft">Loading…</p>}
        {status === 'signedOut' && <AuthForm />}
        {status === 'ready' && profile && (
          <div>
            <div className="card flex items-center justify-between gap-4 rounded-2xl p-5">
              <div>
                <p className="font-semibold">{profile.display_name}</p>
                <p className="text-sm text-soft">{email}</p>
              </div>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => void signOut()}>
                Sign out
              </button>
            </div>
            <h2 className="mt-10 font-serif text-2xl">Your reports</h2>
            <MyReports key={refreshKey} reporterId={profile.id} />
            <LinkedReportForm reporterId={profile.id} onSent={() => setRefreshKey((k) => k + 1)} />
          </div>
        )}
      </div>
    </div>
  )
}

export function V2Account() {
  return (
    <ReporterAuthProvider>
      <PageBackdrop />
      <main className="mx-auto max-w-3xl px-5 pb-24 pt-32 sm:px-8 sm:pt-40">
        <ConceptBanner back />
        <Reveal>
          <AccountBody />
        </Reveal>
      </main>
    </ReporterAuthProvider>
  )
}
