import { PageBackdrop } from '../components/site/SiteShell'
import { Pic } from '../components/ui/Pic'
import { Reveal } from '../components/ui/Reveal'

const QUOTES: Array<[string, string, string]> = [
  ['Sample Waste Co.', '£65', 'Collection tomorrow'],
  ['Sample Clearance Ltd.', '£79', 'Collection today'],
  ['Sample Skip Hire', '£55', 'Collection Thursday'],
]

export function CommercialPage() {
  return (
    <>
      <PageBackdrop />
      <main className="mx-auto max-w-3xl px-5 pb-24 pt-32 sm:px-8 sm:pt-40">
        <Reveal>
          <p className="eyebrow">The commercial route</p>
          <h1 className="mt-4 text-4xl sm:text-5xl">On private land, the landowner picks who clears it.</h1>
          <p className="mt-6 text-lg leading-relaxed text-soft">
            A council has no duty to clear fly-tipping on private land, which is most of what official figures miss. For a report like that, registered waste carriers can quote a price, and whoever owns the land picks one. Resolve would take a small fee for arranging it.
          </p>
        </Reveal>

        <Reveal className="mt-14">
          <p className="text-sm font-semibold uppercase tracking-widest text-soft">What a landowner would see, shown here as a preview</p>
          <div className="card mt-4 rounded-2xl p-5 sm:p-7">
            <div className="flex gap-4">
              <Pic name="rubbish-street" widths={[400]} width={400} height={267} alt="" className="size-24 shrink-0 rounded-xl object-cover sm:size-28" sizes="112px" />
              <div className="min-w-0">
                <span className="pill pill-reported">Private land · not a council job</span>
                <h3 className="mt-2 text-lg font-semibold leading-snug">Dumped sofa and bin bags behind the unit</h3>
              </div>
            </div>
            <ul className="mt-5 divide-y divide-line border-y border-line">
              {QUOTES.map(([name, price, when]) => (
                <li key={name} className="flex items-center justify-between gap-4 py-4">
                  <div>
                    <p className="font-semibold">{name}</p>
                    <p className="text-sm text-soft">{when}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <p className="text-lg font-semibold">{price}</p>
                    <button type="button" disabled className="btn btn-ghost btn-sm cursor-not-allowed opacity-60">
                      Choose
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
          <p className="mt-3 text-sm text-soft">This is not working yet. The photo is a real sample from the site's own image set; the quotes and "Choose" button are illustrative, not real carriers or prices.</p>
        </Reveal>

        <Reveal className="mt-14 leading-relaxed text-soft">
          Still to work out: who verifies a waste carrier is actually registered, how payment and the fee are taken, and the registered company needed to legally hold that money.
        </Reveal>
      </main>
    </>
  )
}
