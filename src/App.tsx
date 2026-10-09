import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import Home from './Home'
import { SiteShell } from './components/site/SiteShell'

// Each page loads only when it is visited, so the landing page does not download the map or the database code.
const ReportPage = lazy(() => import('./pages/ReportPage').then((m) => ({ default: m.ReportPage })))
const ReportsPage = lazy(() => import('./pages/ReportsPage').then((m) => ({ default: m.ReportsPage })))
const AboutPage = lazy(() => import('./pages/AboutPage').then((m) => ({ default: m.AboutPage })))
const WhyPage = lazy(() => import('./pages/WhyPage').then((m) => ({ default: m.WhyPage })))
const GetInvolvedPage = lazy(() => import('./pages/GetInvolvedPage').then((m) => ({ default: m.GetInvolvedPage })))
const CommunityPage = lazy(() => import('./pages/CommunityPage').then((m) => ({ default: m.CommunityPage })))
const CommercialPage = lazy(() => import('./pages/CommercialPage').then((m) => ({ default: m.CommercialPage })))
const AccountPage = lazy(() => import('./pages/AccountPage').then((m) => ({ default: m.AccountPage })))
const StaffApp = lazy(() => import('./staff/StaffApp').then((m) => ({ default: m.StaffApp })))

const Blank = <div className="min-h-svh" aria-busy="true" />

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={Blank}>
        <Routes>
          <Route element={<SiteShell />}>
            <Route index element={<Home />} />
            <Route path="report" element={<ReportPage />} />
            <Route path="reports" element={<ReportsPage />}>
              <Route path=":id" element={null} />
            </Route>
            <Route path="about" element={<AboutPage />} />
            <Route path="why" element={<WhyPage />} />
            <Route path="get-involved" element={<GetInvolvedPage />} />
            <Route path="community" element={<CommunityPage />} />
            <Route path="commercial" element={<CommercialPage />} />
            <Route path="account" element={<AccountPage />} />
          </Route>
          <Route path="/staff/*" element={<StaffApp />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
