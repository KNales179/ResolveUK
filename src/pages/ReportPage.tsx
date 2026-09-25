import { ReportForm } from '../components/ReportForm'
import { PageBackdrop } from '../components/site/SiteShell'

export function ReportPage() {
  return (
    <>
      <PageBackdrop />
      <main className="mx-auto max-w-7xl px-5 pb-36 pt-28 sm:px-8 sm:pt-32 lg:pb-24">
        <div className="rise max-w-2xl">
          <p className="text-sm font-bold uppercase tracking-widest text-accent">Report a problem</p>
          <h1 className="mt-3 text-4xl font-extrabold tracking-tight sm:text-5xl">Tell us what you have seen.</h1>
          <p className="mt-4 text-lg text-soft">It takes about a minute. Reports are public, so please do not include names or personal details.</p>
        </div>
        <ReportForm />
      </main>
    </>
  )
}
