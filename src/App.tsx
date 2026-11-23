import { lazy, Suspense } from 'react'
import { PageSkeleton } from './components/ui/Skeleton'
import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom'
import Home from './Home'
import { SiteShell } from './components/site/SiteShell'
import { CursorTag } from './components/ui/CursorTag'

// Each page loads only when it is visited, so the landing page does not download the map or the database code.
const ReportPage = lazy(() => import('./pages/ReportPage').then((m) => ({ default: m.ReportPage })))
const PublicReportsPage = lazy(() => import('./pages/PublicReportsPage').then((m) => ({ default: m.PublicReportsPage })))
const PublicReportRedirect = lazy(() => import('./pages/PublicReportsPage').then((m) => ({ default: m.PublicReportRedirect })))
const AboutPage = lazy(() => import('./pages/AboutPage').then((m) => ({ default: m.AboutPage })))
const WhyPage = lazy(() => import('./pages/WhyPage').then((m) => ({ default: m.WhyPage })))
const GetInvolvedPage = lazy(() => import('./pages/GetInvolvedPage').then((m) => ({ default: m.GetInvolvedPage })))
const CommunityPage = lazy(() => import('./pages/CommunityPage').then((m) => ({ default: m.CommunityPage })))
const CommercialPage = lazy(() => import('./pages/CommercialPage').then((m) => ({ default: m.CommercialPage })))
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage').then((m) => ({ default: m.ResetPasswordPage })))
const UpdatesPage = lazy(() => import('./pages/UpdatesPage').then((m) => ({ default: m.UpdatesPage })))
const StaffApp = lazy(() => import('./staff/StaffApp').then((m) => ({ default: m.StaffApp })))

// The app at /app (sign-in, the demo and everything for signed-in people) loads separately too.
const AppSessionProvider = lazy(() => import('./app/session').then((m) => ({ default: ({ children }: { children: React.ReactNode }) => <m.AppSessionProvider>{children}</m.AppSessionProvider> })))
const AuthLayout = lazy(() => import('./app/AuthLayout').then((m) => ({ default: m.AuthLayout })))
const AppLayout = lazy(() => import('./app/AppLayout').then((m) => ({ default: m.AppLayout })))
const ProtectedRoute = lazy(() => import('./app/guards').then((m) => ({ default: m.ProtectedRoute })))
const GuestRoute = lazy(() => import('./app/guards').then((m) => ({ default: m.GuestRoute })))
const SignIn = lazy(() => import('./app/auth/SignIn').then((m) => ({ default: m.SignIn })))
const CreateAccount = lazy(() => import('./app/auth/CreateAccount').then((m) => ({ default: m.CreateAccount })))
const ForgotPassword = lazy(() => import('./app/auth/ForgotPassword').then((m) => ({ default: m.ForgotPassword })))
const CheckEmail = lazy(() => import('./app/auth/CheckEmail').then((m) => ({ default: m.CheckEmail })))
const AppHome = lazy(() => import('./app/pages/AppHome').then((m) => ({ default: m.AppHome })))
const AppAccount = lazy(() => import('./app/pages/AppAccount').then((m) => ({ default: m.AppAccount })))
const AppTutorial = lazy(() => import('./app/pages/AppTutorial').then((m) => ({ default: m.AppTutorial })))
const AppReports = lazy(() => import('./app/pages/AppReports').then((m) => ({ default: m.AppReports })))
const AppMap = lazy(() => import('./app/pages/AppMap').then((m) => ({ default: m.AppMap })))
const AppAdmin = lazy(() => import('./app/pages/AppAdmin').then((m) => ({ default: m.AppAdmin })))
const AppStaff = lazy(() => import('./app/pages/AppStaff').then((m) => ({ default: m.AppStaff })))
const AppClearance = lazy(() => import('./app/pages/AppClearance').then((m) => ({ default: m.AppClearance })))
const AppClearanceNew = lazy(() => import('./app/pages/AppClearance').then((m) => ({ default: m.AppClearanceNew })))
const AppClearanceRequest = lazy(() => import('./app/pages/AppClearance').then((m) => ({ default: m.AppClearanceRequest })))
const AppReport = lazy(() => import('./app/pages/AppReport').then((m) => ({ default: m.AppReport })))
const AppCommunity = lazy(() => import('./app/pages/AppCommunity').then((m) => ({ default: m.AppCommunity })))
const AppOrg = lazy(() => import('./app/pages/AppOrg').then((m) => ({ default: m.AppOrg })))
const AppRegisterOrg = lazy(() => import('./app/pages/AppRegisterOrg').then((m) => ({ default: m.AppRegisterOrg })))

// While a page's code downloads: a skeleton of a page, never a blank screen or a spinner.
const Blank = (
  <div className="min-h-svh pt-24">
    <PageSkeleton />
  </div>
)

export default function App() {
  return (
    <BrowserRouter>
      <CursorTag />
      <Suspense fallback={Blank}>
        <Routes>
          <Route element={<SiteShell />}>
            <Route index element={<Home />} />
            <Route path="report" element={<ReportPage />} />
            <Route path="reports" element={<PublicReportsPage />} />
            <Route path="reports/:id" element={<PublicReportRedirect />} />
            <Route path="about" element={<AboutPage />} />
            <Route path="why" element={<WhyPage />} />
            <Route path="get-involved" element={<GetInvolvedPage />} />
            <Route path="community" element={<CommunityPage />} />
            <Route path="commercial" element={<CommercialPage />} />
            <Route path="account" element={<Navigate to="/app/account" replace />} />
            <Route path="reset-password" element={<ResetPasswordPage />} />
            <Route path="updates" element={<UpdatesPage />} />
          </Route>
          <Route path="/staff/*" element={<StaffApp />} />
          <Route
            path="/app"
            element={
              <AppSessionProvider>
                <Outlet />
              </AppSessionProvider>
            }
          >
            <Route element={<AuthLayout />}>
              <Route element={<GuestRoute />}>
                <Route path="sign-in" element={<SignIn />} />
                <Route path="create-account" element={<CreateAccount />} />
              </Route>
              <Route path="forgot-password" element={<ForgotPassword />} />
              <Route path="check-email" element={<CheckEmail />} />
            </Route>
            <Route element={<ProtectedRoute />}>
              <Route element={<AppLayout />}>
                <Route index element={<AppHome />} />
                <Route path="reports" element={<AppReports />}>
                  <Route path=":id" element={null} />
                </Route>
                <Route path="report" element={<AppReport />} />
                <Route path="map" element={<AppMap />} />
                <Route path="community" element={<AppCommunity />} />
                <Route path="community/new" element={<AppRegisterOrg />} />
                <Route path="community/:id" element={<AppOrg />} />
                <Route path="clearance" element={<AppClearance />} />
                <Route path="clearance/new" element={<AppClearanceNew />} />
                <Route path="clearance/:id" element={<AppClearanceRequest />} />
                <Route path="staff" element={<AppStaff />} />
                <Route path="admin" element={<AppAdmin />} />
                <Route path="account" element={<AppAccount />} />
                <Route path="tutorial" element={<AppTutorial />} />
              </Route>
            </Route>
            <Route path="*" element={<Navigate to="/app" replace />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
