import { useState } from 'react'
import { ChangePasswordForm } from './ChangePassword'
import { useStaffAuth } from './auth'

const ROLE_LABEL = { staff: 'Council or contractor staff', reviewer: 'Resolve reviewer', resolve_admin: 'Resolve admin' } as const

export function StaffAccount() {
  const { email, profile } = useStaffAuth()
  const [saved, setSaved] = useState(false)

  return (
    <div className="max-w-md space-y-8">
      <section className="card rounded-3xl p-6 sm:p-7">
        <h2 className="text-lg font-semibold">Your account</h2>
        <dl className="mt-4 space-y-3 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-soft">Name</dt>
            <dd className="font-semibold">{profile?.display_name}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-soft">Email</dt>
            <dd className="font-semibold">{email}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-soft">Role</dt>
            <dd className="font-semibold">{profile ? ROLE_LABEL[profile.role] : ''}</dd>
          </div>
        </dl>
      </section>

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
