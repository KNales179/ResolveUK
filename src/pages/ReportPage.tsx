import { ReportForm } from '../components/ReportForm'
import { PageBackdrop } from '../components/site/SiteShell'

export function ReportPage() {
  return (
    <div className="relative">
      <PageBackdrop />
      <main className="grid-texture grid-shimmer mx-auto max-w-7xl px-5 pb-36 pt-28 sm:px-8 sm:pt-32 lg:pb-24">
        <div className="accent-panel rise max-w-2xl rounded-3xl p-6 sm:p-8">
          <h1 className="text-4xl sm:text-5xl">Report a problem</h1>
          <p className="mt-4 text-lg opacity-90">Add a photo, mark the place and describe what you have seen. It takes about a minute. Reports are public, so please leave out names and personal details.</p>
        </div>
        <ReportForm />
      </main>
    </div>
  )
}
