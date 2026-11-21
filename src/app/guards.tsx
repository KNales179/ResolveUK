import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAppSession } from './session'
import { PageSkeleton } from '../components/ui/Skeleton'

function Loading() {
  return (
    <div className="min-h-svh pt-16">
      <PageSkeleton />
    </div>
  )
}

// The app's own pages: signed in (or in the demo) only. Anyone else goes to the sign-in screen,
// and comes back to the page they asked for afterwards.
export function ProtectedRoute() {
  const s = useAppSession()
  const location = useLocation()
  if (s.status === 'loading') return <Loading />
  if (s.status === 'signedOut') return <Navigate to="/app/sign-in" replace state={{ from: location.pathname }} />
  return <Outlet />
}

// Sign-in and create-account are for people who aren't signed in. Someone who already is (a
// bookmark, the back button, a shared link) goes straight to the app instead.
export function GuestRoute() {
  const s = useAppSession()
  const location = useLocation()
  if (s.status === 'loading') return <Loading />
  if (s.status === 'ready') return <Navigate to={(location.state as { from?: string } | null)?.from ?? '/app'} replace />
  return <Outlet />
}
