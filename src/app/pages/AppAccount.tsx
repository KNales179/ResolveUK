import { lazy, Suspense } from 'react'
import { useNavigate } from 'react-router-dom'
import { Icon } from '../../components/ui/Icon'
import { ROLES, useAppSession } from '../session'
import { SkeletonLines } from '../../components/ui/Skeleton'

const AccountPage = lazy(() => import('../../pages/AccountPage').then((m) => ({ default: m.AccountPage })))

// "Your account" inside the app. A real account uses the existing account page (profile, photo,
// the reports you've sent). The demo has no real account, so it shows a pretend one instead and
// never touches the database.
export function AppAccount() {
  const s = useAppSession()
  const navigate = useNavigate()
  if (!s.demo)
    return (
      <Suspense fallback={<div className="min-h-[60svh]" aria-busy="true"><SkeletonLines lines={4} className="max-w-lg" /></div>}>
        <div className="app-embedded-account">
          <AccountPage />
        </div>
      </Suspense>
    )
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
      <div className="card rounded-3xl p-6 sm:p-10">
        <div className="flex items-center gap-4">
          <span className="app-avatar size-16 text-2xl">S</span>
          <div>
            <h1 className="font-serif text-3xl">{s.name}</h1>
            <p className="text-honey-text">{s.email}</p>
          </div>
        </div>
        <p className="mt-6 leading-relaxed text-soft">
          This is a pretend account for the demo, viewing the app as a <strong className="text-ink">{ROLES.find((r) => r.id === s.role)?.label.toLowerCase()}</strong>. Nothing here is saved or sent anywhere. Create a real account to keep your reports together and post stories.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              s.exitDemo()
              navigate('/app/create-account', { replace: true })
            }}
          >
            Create a real account <Icon name="arrow" className="size-4" />
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => {
              s.exitDemo()
              navigate('/app/sign-in', { replace: true })
            }}
          >
            Leave the demo
          </button>
        </div>
      </div>
    </div>
  )
}
