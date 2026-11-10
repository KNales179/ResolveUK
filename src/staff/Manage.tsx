import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { addBody, listBodies, listStaff, linkStaff, setStaffActive } from './api'
import { useStaffMe } from './auth'
import { Icon, type IconName } from '../components/ui/Icon'
import { Select } from '../components/ui/Select'
import { photoUrl } from '../lib/photos'
import type { ResponsibleBody, StaffProfile, StaffRole } from '../types'

const ROLE_ICON: Record<StaffRole, IconName> = { staff: 'user', reviewer: 'shield', resolve_admin: 'shield' }

const ROLE_LABEL: Record<StaffRole, string> = { staff: 'Council or contractor staff', reviewer: 'Resolve reviewer', resolve_admin: 'Resolve admin' }
const ROLE_CHOICES = (Object.keys(ROLE_LABEL) as StaffRole[]).map((value) => ({ value, label: ROLE_LABEL[value] }))

function Field({ id, label, children }: { id: string; label: string; children: ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold">
        {label}
      </label>
      {children}
    </div>
  )
}

function AddBody({ bodies, onAdded }: { bodies: ResponsibleBody[]; onAdded: () => void }) {
  const [name, setName] = useState('')
  const [kind, setKind] = useState<'council' | 'contractor' | 'other'>('council')
  const [tier, setTier] = useState('unitary')
  const [worksFor, setWorksFor] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const councils = bodies.filter((b) => b.kind === 'council')

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      if (kind === 'council') await addBody({ name: name.trim(), kind, tier, works_for_id: null })
      else if (kind === 'contractor') await addBody({ name: name.trim(), kind, tier: null, works_for_id: worksFor || null })
      else await addBody({ name: name.trim(), kind, tier: null, works_for_id: null })
      setName('')
      onAdded()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'That did not save.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="staff-form mt-6 max-w-md space-y-4 border-t border-dashed border-line pt-6">
      <Field id="body-name" label="Name">
        <input id="body-name" className="input" type="text" required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Colchester City Council" />
      </Field>
      <Field id="body-kind" label="Type">
        <Select
          id="body-kind"
          label="Type"
          value={kind}
          onChange={(v) => setKind(v as 'council' | 'contractor' | 'other')}
          choices={[
            { value: 'council', label: 'Council' },
            { value: 'contractor', label: 'Contractor' },
            { value: 'other', label: 'Other (a business, waste company or community group)' },
          ]}
        />
      </Field>
      {kind === 'council' && (
        <Field id="body-tier" label="Tier">
          <Select id="body-tier" label="Tier" value={tier} onChange={setTier} choices={[{ value: 'unitary', label: 'Unitary' }, { value: 'county', label: 'County' }, { value: 'district', label: 'District' }]} />
        </Field>
      )}
      {kind === 'contractor' && (
        <Field id="body-works-for" label="Works for which council?">
          <Select id="body-works-for" label="Works for which council?" value={worksFor} onChange={setWorksFor} required placeholder="Choose a council" choices={councils.map((c) => ({ value: c.id, label: c.name }))} />
        </Field>
      )}
      {kind === 'other' && <p className="text-sm text-soft">No sign-in for them yet: an admin assigns and tracks reports on their behalf, by contacting them directly.</p>}
      {error && (
        <p className="msg msg-error" role="alert">
          {error}
        </p>
      )}
      <button type="submit" className="btn btn-primary btn-sm" disabled={busy || !name.trim() || (kind === 'contractor' && !worksFor)}>
        {busy ? 'Adding…' : 'Add'}
      </button>
    </form>
  )
}

function AddStaff({ bodies, onAdded }: { bodies: ResponsibleBody[]; onAdded: () => void }) {
  const [email, setEmail] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [role, setRole] = useState<StaffRole>('staff')
  const [bodyId, setBodyId] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [ok, setOk] = useState('')

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError('')
    setOk('')
    try {
      await linkStaff(email.trim(), role, role === 'staff' ? bodyId : null, displayName.trim())
      setOk(`${displayName.trim()} is now linked as ${ROLE_LABEL[role].toLowerCase()}.`)
      setEmail('')
      setDisplayName('')
      onAdded()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'That did not save.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="staff-form mt-6 max-w-md space-y-4 border-t border-dashed border-line pt-6">
      <p className="text-sm text-soft">The person must already have signed up in Authentication &gt; Users (with Auto Confirm User ticked) before you can link them here.</p>
      <Field id="staff-add-email" label="Their email">
        <input id="staff-add-email" className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      </Field>
      <Field id="staff-add-name" label="Their name">
        <input id="staff-add-name" className="input" type="text" required value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
      </Field>
      <Field id="staff-add-role" label="Role">
        <Select id="staff-add-role" label="Role" value={role} onChange={(v) => setRole(v as StaffRole)} choices={ROLE_CHOICES} />
      </Field>
      {role === 'staff' && (
        <Field id="staff-add-body" label="Council or contractor">
          <Select id="staff-add-body" label="Council or contractor" value={bodyId} onChange={setBodyId} required placeholder="Choose one" choices={bodies.map((b) => ({ value: b.id, label: b.name }))} />
        </Field>
      )}
      {error && (
        <p className="msg msg-error" role="alert">
          {error}
        </p>
      )}
      {ok && (
        <p className="msg msg-ok" role="status">
          {ok}
        </p>
      )}
      <button type="submit" className="btn btn-primary btn-sm" disabled={busy || (role === 'staff' && !bodyId)}>
        {busy ? 'Saving…' : 'Add or update'}
      </button>
    </form>
  )
}

export function StaffManage() {
  const me = useStaffMe()
  const [bodies, setBodies] = useState<ResponsibleBody[]>([])
  const [staff, setStaff] = useState<StaffProfile[]>([])
  const [error, setError] = useState('')

  const reload = async () => {
    try {
      const [b, s] = await Promise.all([listBodies(), listStaff()])
      setBodies(b)
      setStaff(s)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.')
    }
  }

  useEffect(() => {
    void reload()
  }, [])

  async function toggle(id: string, active: boolean) {
    setError('')
    try {
      await setStaffActive(id, active)
      await reload()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'That did not save.')
    }
  }

  return (
    <div className="space-y-8">
      {error && (
        <p className="msg msg-error" role="alert">
          {error}
        </p>
      )}

      <section className="staff-section card rounded-3xl p-6 sm:p-8">
        <h2 className="text-xl font-bold">Councils and contractors</h2>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {bodies.map((b) => (
            <li key={b.id} className="card flex items-start gap-3 rounded-2xl p-4">
              <span className="tile-icon size-10 shrink-0 rounded-xl">
                <Icon name="building" className="size-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{b.name}</p>
                <p className="mt-0.5 text-sm text-soft">
                  {b.kind === 'council' ? b.tier : b.kind === 'contractor' ? `Contractor for ${bodies.find((c) => c.id === b.works_for_id)?.name ?? '—'}` : 'Other, handled manually'}
                </p>
                {!b.active && <span className="pill pill-closed mt-2">Retired</span>}
              </div>
            </li>
          ))}
          {bodies.length === 0 && <li className="text-soft">None yet.</li>}
        </ul>
        <AddBody bodies={bodies} onAdded={reload} />
      </section>

      <section className="staff-section card rounded-3xl p-6 sm:p-8">
        <h2 className="text-xl font-bold">Staff</h2>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {staff.map((s) => (
            <li key={s.id} className="card flex items-start gap-3 rounded-2xl p-4">
              {s.avatar_path ? (
                <img src={photoUrl(s.avatar_path)} alt="" className="size-10 shrink-0 rounded-full object-cover" />
              ) : (
                <span className="tile-icon size-10 shrink-0 rounded-full">
                  <Icon name={ROLE_ICON[s.role]} className="size-5" />
                </span>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{s.display_name}</p>
                <p className="mt-0.5 text-sm text-soft">
                  {ROLE_LABEL[s.role]}
                  {s.body_id && ` · ${bodies.find((b) => b.id === s.body_id)?.name ?? ''}`}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {!s.active && <span className="pill pill-closed">Switched off</span>}
                  {s.id !== me.id && (
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => toggle(s.id, !s.active)}>
                      {s.active ? 'Switch off' : 'Switch back on'}
                    </button>
                  )}
                </div>
              </div>
            </li>
          ))}
          {staff.length === 0 && <li className="text-soft">None yet.</li>}
        </ul>
        <AddStaff bodies={bodies.filter((b) => b.active)} onAdded={reload} />
      </section>
    </div>
  )
}
