import { ReportForm } from '../../components/ReportForm'
import { useAppSession } from '../session'

// Reporting a problem from inside the app: the same form as the public site, kept inside the app
// (its header, its tabs), linked to the signed-in person's account, and returning to the app's
// Reports afterwards. In the demo nothing is sent.
export function AppReport() {
  const s = useAppSession()
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
      <h1 className="font-serif text-4xl sm:text-5xl">Report a <span className="hl">problem</span></h1>
      <p className="mt-2 max-w-2xl text-soft">
        Add a photo, mark the place and describe what you've seen. It takes about a minute. Reports are public, so leave out names and personal details.
        {!s.demo && " It's linked to your account, so you'll hear each time it moves on."}
      </p>
      <ReportForm done="/app/reports" reporterId={s.demo ? null : s.userId} demo={s.demo} />
    </div>
  )
}
