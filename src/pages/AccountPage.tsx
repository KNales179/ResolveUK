import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { PageBackdrop } from '../components/site/SiteShell'
import { Reveal } from '../components/ui/Reveal'
import { Icon, type IconName } from '../components/ui/Icon'
import { GoogleIcon } from '../components/ui/GoogleIcon'
import { PasswordField } from '../components/ui/PasswordField'
import { useCategories } from '../lib/categories'
import { deviceToken } from '../lib/device'
import { timeAgo } from '../lib/format'
import { preparePhoto } from '../lib/photo'
import { photoUrl } from '../lib/photos'
import { ReporterAuthProvider, useReporterAuth } from '../lib/reporterAuth'
import { STATUS_LABELS, statusGroup } from '../lib/status'
import { supabase } from '../lib/supabase'
import type { Report } from '../types'

const TYPE_ICON: Record<string, IconName> = { 'fly-tipping': 'trash', pothole: 'road', graffiti: 'spray', 'abandoned-vehicle': 'car', 'damaged-infrastructure': 'lamp', other: 'more' }

function ForgotPasswordForm({ onBack }: { onBack: () => void }) {
  const { resetPassword } = useReporterAuth()
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    const problem = await resetPassword(email)
    setBusy(false)
    if (problem) setError(problem)
    else setSent(true)
  }

  if (sent) {
    return (
      <div className="card max-w-md rounded-2xl p-6 sm:p-7">
        <p className="msg msg-ok" role="status">
          If an account exists for {email}, a reset link is on its way.
        </p>
        <button type="button" className="btn btn-ghost mt-4 w-full" onClick={onBack}>
          Back to sign in
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={submit} className="card max-w-md space-y-4 rounded-2xl p-6 sm:p-7">
      <h3 className="font-semibold">Reset your password</h3>
      <div>
        <label htmlFor="forgot-email" className="mb-1.5 block text-sm font-semibold">
          Email
        </label>
        <input id="forgot-email" className="input" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      {error && (
        <p className="msg msg-error" role="alert">
          {error}
        </p>
      )}
      <button type="submit" className="btn btn-primary w-full" disabled={busy}>
        {busy ? 'Sending…' : 'Send reset link'}
      </button>
      <button type="button" className="block w-full text-center text-sm font-semibold text-soft hover:text-ink" onClick={onBack}>
        Back to sign in
      </button>
    </form>
  )
}

function AuthForm() {
  const { signIn, signUp, signInWithGoogle } = useReporterAuth()
  const [mode, setMode] = useState<'signIn' | 'signUp' | 'forgot'>('signUp')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [googleBusy, setGoogleBusy] = useState(false)

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

  async function withGoogle() {
    setError(null)
    setGoogleBusy(true)
    const problem = await signInWithGoogle()
    if (problem) {
      setError(problem)
      setGoogleBusy(false)
    }
    // No else: the page is about to navigate to Google, so there is nothing further to do here.
  }

  if (mode === 'forgot') return <ForgotPasswordForm onBack={() => setMode('signIn')} />

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

      <button type="button" className="btn btn-ghost mt-6 w-full gap-2.5" onClick={() => void withGoogle()} disabled={googleBusy}>
        <GoogleIcon /> {googleBusy ? 'Redirecting…' : `Continue with Google`}
      </button>
      <div className="my-5 flex items-center gap-3 text-xs font-semibold uppercase tracking-widest text-soft">
        <span className="h-px flex-1 bg-line" />
        or
        <span className="h-px flex-1 bg-line" />
      </div>

      <form onSubmit={submit} className="space-y-4">
        {mode === 'signUp' && (
          <div>
            <label htmlFor="account-name" className="mb-1.5 block text-sm font-semibold">
              Your name
            </label>
            <input id="account-name" className="input" type="text" required value={name} onChange={(e) => setName(e.target.value)} />
          </div>
        )}
        <div>
          <label htmlFor="account-email" className="mb-1.5 block text-sm font-semibold">
            Email
          </label>
          <input id="account-email" className="input" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <PasswordField id="account-password" label="Password" autoComplete={mode === 'signUp' ? 'new-password' : 'current-password'} value={password} onChange={setPassword} />
        {mode === 'signIn' && (
          <button type="button" className="-mt-2 block text-sm font-semibold text-accent hover:underline" onClick={() => setMode('forgot')}>
            Forgot your password?
          </button>
        )}
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
  const categories = useCategories()
  const [reports, setReports] = useState<Report[] | null>(null)
  const labelOf = (code: string) => categories.find((c) => c.code === code)?.label ?? code

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
  if (reports.length === 0)
    return (
      <div className="card mt-6 rounded-3xl p-10 text-center">
        <span className="tile-icon mx-auto size-14 rounded-2xl">
          <Icon name="search" className="size-6" />
        </span>
        <p className="mt-4 font-serif text-xl">Nothing linked to your account yet</p>
        <p className="mt-1 text-soft">Send one below and it shows up here.</p>
      </div>
    )

  return (
    <ul className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {reports.map((r) => (
        <li key={r.id}>
          <Link to={`/reports/${r.id}`} className="card group flex h-full flex-col overflow-hidden rounded-3xl text-left transition hover:border-ink/40" data-tag="View details">
            <span className="relative block aspect-[4/3] w-full overflow-hidden bg-surface2">
              <img src={photoUrl(r.photo_path)} alt="" loading="lazy" className="absolute inset-0 size-full object-cover transition duration-700 group-hover:scale-105" />
              <span className="absolute left-3 top-3">
                <span className={`pill pill-${statusGroup(r.current_status)}`}>{STATUS_LABELS[r.current_status]}</span>
              </span>
            </span>
            <span className="flex flex-1 flex-col gap-2 p-5">
              <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-soft">
                <Icon name={TYPE_ICON[r.category_code] ?? 'more'} className="size-4" />
                {labelOf(r.category_code)}
              </span>
              <span className="line-clamp-2 font-semibold leading-snug">{r.description}</span>
              <span className="mt-auto pt-2 text-sm text-soft">{timeAgo(r.created_at)}</span>
            </span>
          </Link>
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

function ProfileCard() {
  const { profile, email, signOut, updateProfile } = useReporterAuth()
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(profile?.display_name ?? '')
  const [bio, setBio] = useState(profile?.bio ?? '')
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!profile) return null

  async function save(e: FormEvent) {
    e.preventDefault()
    if (!name.trim()) return setError('Please add a name.')
    setError(null)
    setSaving(true)
    const problem = await updateProfile({ display_name: name.trim(), bio: bio.trim() || null })
    setSaving(false)
    if (problem) setError(problem)
    else setEditing(false)
  }

  async function changeAvatar(file: File) {
    setError(null)
    setUploading(true)
    try {
      const { blob, ext } = await preparePhoto(file)
      // A fixed, user-scoped filename (not a random one), so a new avatar always overwrites the
      // old one at the same storage path instead of leaving the previous upload behind unused.
      const path = `avatars/${profile!.id}.${ext}`
      const { error: uploadError } = await supabase.storage.from('report-photos').upload(path, blob, { contentType: blob.type || undefined, upsert: true })
      if (uploadError) throw uploadError
      const problem = await updateProfile({ avatar_path: path })
      if (problem) throw new Error(problem)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update your photo.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="card rounded-2xl p-6">
      <div className="flex items-start gap-4">
        <label className="group relative size-16 shrink-0 cursor-pointer overflow-hidden rounded-full">
          {profile.avatar_path ? (
            <img src={photoUrl(profile.avatar_path)} alt="" className="size-full object-cover" />
          ) : (
            <span className="tile-icon size-16 rounded-full">
              <Icon name="user" className="size-7" />
            </span>
          )}
          <span className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition group-hover:opacity-100">
            <Icon name="camera" className="size-5 text-white" />
          </span>
          <input
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) void changeAvatar(file)
              e.target.value = ''
            }}
          />
        </label>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{profile.display_name}</p>
          <p className="truncate text-sm text-soft">{email}</p>
          {profile.bio && <p className="mt-1.5 text-sm leading-relaxed text-soft">{profile.bio}</p>}
        </div>
      </div>
      {uploading && <p className="mt-3 text-xs text-soft">Updating your photo…</p>}

      {editing ? (
        <form onSubmit={save} className="mt-4 space-y-3 border-t border-line pt-4">
          <div>
            <label htmlFor="profile-name" className="mb-1.5 block text-sm font-semibold">
              Name
            </label>
            <input id="profile-name" className="input" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div>
            <label htmlFor="profile-bio" className="mb-1.5 block text-sm font-semibold">
              About
            </label>
            <textarea id="profile-bio" className="input" maxLength={280} value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Say a little about yourself (optional)" />
          </div>
          {error && (
            <p className="msg msg-error" role="alert">
              {error}
            </p>
          )}
          <div className="flex gap-2">
            <button type="submit" className="btn btn-primary flex-1" disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </button>
            <button
              type="button"
              className="btn btn-ghost flex-1"
              onClick={() => {
                setEditing(false)
                setName(profile.display_name)
                setBio(profile.bio ?? '')
                setError(null)
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <div className="mt-4 flex gap-2 border-t border-line pt-4">
          {error && (
            <p className="msg msg-error w-full" role="alert">
              {error}
            </p>
          )}
          <button type="button" className="btn btn-ghost btn-sm flex-1" onClick={() => setEditing(true)}>
            Edit profile
          </button>
          <button type="button" className="btn btn-ghost btn-sm flex-1" onClick={() => void signOut()}>
            Sign out
          </button>
        </div>
      )}
    </div>
  )
}

function AccountBody() {
  const { status, profile } = useReporterAuth()
  const [refreshKey, setRefreshKey] = useState(0)

  return (
    <div>
      <div className="grid gap-8 lg:grid-cols-[1.1fr_.9fr] lg:items-center">
        <div className="accent-panel rounded-3xl p-8 sm:p-10">
          <p className="eyebrow">Optional, for whoever wants it</p>
          <h1 className="mt-4 text-4xl sm:text-5xl">Keep track of the reports you've sent.</h1>
          <p className="mt-6 text-lg leading-relaxed opacity-90">
            Reporting still needs no account at all. Creating one just means a report can stay yours to follow, and, once the commercial route exists, yours to pick a quote on.
          </p>
        </div>

        <div>
          {status === 'loading' && <p className="text-soft">Loading…</p>}
          {status === 'signedOut' && <AuthForm />}
          {status === 'ready' && profile && <ProfileCard />}
        </div>
      </div>

      {status === 'ready' && profile && (
        <div className="mt-14 max-w-5xl">
          <h2 className="text-halo font-serif text-2xl">Your reports</h2>
          <MyReports key={refreshKey} reporterId={profile.id} />
          <div className="max-w-2xl">
            <LinkedReportForm reporterId={profile.id} onSent={() => setRefreshKey((k) => k + 1)} />
          </div>
        </div>
      )}
    </div>
  )
}

export function AccountPage() {
  return (
    <ReporterAuthProvider>
      <div className="relative">
        <PageBackdrop />
        <main className="cv grid-texture grid-shimmer mx-auto max-w-7xl px-5 pb-24 pt-32 sm:px-8 sm:pt-40">
          <Reveal>
            <AccountBody />
          </Reveal>
        </main>
      </div>
    </ReporterAuthProvider>
  )
}
