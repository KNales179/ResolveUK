import { ReportsPage } from '../../pages/ReportsPage'
import { ReportActions } from '../components/ReportActions'
import { useAppSession } from '../session'

// Reports in the app: the full list, search and filters, and each report's panel with backing,
// who's dealing with it, following, the reporter's check, staff tools, updates and stories. The
// demo shows sample reports only.
export function AppReports() {
  const s = useAppSession()
  return <ReportsPage demo={s.demo} storySlot={(r, tools) => <ReportActions key={r.id} report={r} tools={tools} />} />
}
