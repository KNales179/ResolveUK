import { useState, type FormEvent } from 'react'
import { Icon } from '../components/ui/Icon'
import { preparePhoto } from '../lib/photo'
import { photoUrl } from '../lib/photos'
import { supabase } from '../lib/supabase'
import { ChangePasswordForm } from './ChangePassword'
import { useStaffAuth } from './auth'

const ROLE_LABEL = { staff: 'Council or contractor staff', reviewer: 'Resolve reviewer', resolve_admin: 'Resolve admin' } as const

function ProfileCard() {
  const { email, profile, updateProfile } = useStaffAuth()
  const [editing, setEditing] = useState(false)
  const [bio, setBio] = useState(profile?.bio ?? '')
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!profile) return null

  async function save(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSaving(true)
    const problem = await updateProfile({ bio: bio.trim() || null })
    setSaving(false)
    if (problem) setError(problem)
    else setEditing(false)
  }

  async function changeAvatar(file: File) {
    setError(null)
    setUploading(true)
    try {
      const { blob, ext } = await preparePhoto(file)
      // A fixed, user-scoped filename under its own prefix (distinct from reporters' avatars/),
      // so a new upload always overwrites the old one instead of leaving it behind unused.
      const path = `staff-avatars/${profile!.id}.${ext}`
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
    <section className="card rounded-3xl p-6 sm:p-7">
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
          <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-soft">{ROLE_LABEL[profile.role]}</p>
          {profile.bio && <p className="mt-1.5 text-sm leading-relaxed text-soft">{profile.bio}</p>}
        </div>
      </div>
      {uploading && <p className="mt-3 text-xs text-soft">Updating your photo…</p>}

      {editing ? (
        <form onSubmit={save} className="mt-4 space-y-3 border-t border-line pt-4">
          <div>
            <label htmlFor="staff-profile-bio" className="mb-1.5 block text-sm font-semibold">
              About
            </label>
            <textarea id="staff-profile-bio" className="input" maxLength={280} value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Say a little about your role (optional)" />
            <p className="mt-1.5 text-xs text-soft">Your name and role are set by a Resolve admin — ask them if either needs to change.</p>
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
                setBio(profile.bio ?? '')
                setError(null)
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <div className="mt-4 border-t border-line pt-4">
          {error && (
            <p className="msg msg-error mb-2" role="alert">
              {error}
            </p>
          )}
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditing(true)}>
            Edit profile
          </button>
        </div>
      )}
    </section>
  )
}

export function StaffAccount() {
  const [saved, setSaved] = useState(false)

  return (
    <div className="max-w-md space-y-8">
      <ProfileCard />

      <section className="card rounded-3xl p-6 sm:p-7">
        <h2 className="text-lg font-semibold">Change password</h2>
        {saved && (
          <p className="msg msg-ok mt-4" role="status">
            Your password has been changed.
          </p>
        )}
        <div className="mt-5">
          <ChangePasswordForm onDone={() => setSaved(true)} />
        </div>
      </section>
    </div>
  )
}
