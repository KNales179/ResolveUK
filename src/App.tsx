import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import Home from './Home'
import { SiteShell } from './components/site/SiteShell'

// Each page loads only when it is visited, so the landing page does not download the map or the database code.
const ReportPage = lazy(() => import('./pages/ReportPage').then((m) => ({ default: m.ReportPage })))
const ReportsPage = lazy(() => import('./pages/ReportsPage').then((m) => ({ default: m.ReportsPage })))
const AboutPage = lazy(() => import('./pages/AboutPage').then((m) => ({ default: m.AboutPage })))
const StaffApp = lazy(() => import('./staff/StaffApp').then((m) => ({ default: m.StaffApp })))
const V2Shell = lazy(() => import('./v2/V2Shell').then((m) => ({ default: m.V2Shell })))
const V2Landing = lazy(() => import('./v2/V2Landing').then((m) => ({ default: m.V2Landing })))
const V2Community = lazy(() => import('./v2/V2Community').then((m) => ({ default: m.V2Community })))
const V2Commercial = lazy(() => import('./v2/V2Commercial').then((m) => ({ default: m.V2Commercial })))
const V2Account = lazy(() => import('./v2/V2Account').then((m) => ({ default: m.V2Account })))

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
          </Route>
          <Route path="/staff/*" element={<StaffApp />} />
          <Route element={<V2Shell />}>
            <Route path="/v2" element={<V2Landing />} />
            <Route path="/v2/community" element={<V2Community />} />
            <Route path="/v2/commercial" element={<V2Commercial />} />
            <Route path="/v2/account" element={<V2Account />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
