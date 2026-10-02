import { ReportForm } from '../components/ReportForm'
import { PageBackdrop } from '../components/site/SiteShell'

export function ReportPage() {
  return (
    <>
      <PageBackdrop />
      <main className="mx-auto max-w-7xl px-5 pb-36 pt-28 sm:px-8 sm:pt-32 lg:pb-24">
        <div className="rise max-w-2xl">
          <h1 className="text-4xl sm:text-5xl">Report a problem</h1>
          <p className="mt-4 text-lg text-soft">Add a photo, mark the place and describe what you have seen. It takes about a minute. Reports are public, so please leave out names and personal details.</p>
        </div>
        <ReportForm />
      </main>
    </>
  )
}
