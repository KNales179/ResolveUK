import { PageBackdrop } from '../components/site/SiteShell'
import { Icon } from '../components/ui/Icon'
import { Pic } from '../components/ui/Pic'
import { Reveal } from '../components/ui/Reveal'
import { CornerHover } from '../components/ui/CornerHover'

const QUOTES: Array<[string, string, string]> = [
  ['Sample Waste Co.', '£65', 'Collection tomorrow'],
  ['Sample Clearance Ltd.', '£79', 'Collection today'],
  ['Sample Skip Hire', '£55', 'Collection Thursday'],
]

// Temporary: a running list of other listings, shaped like a quote-tracking ledger rather than a
// photo gallery — the landowner's purpose here is comparing prices and status, not browsing
// photos, so this gets a different shape to the public report grid or the community worklist.
// None of this is live yet.
const OTHER_LISTINGS: Array<[string, string, string, string]> = [
  ['trash-picking', 'Fly-tipped waste blocking the loading bay', 'Booked with Sample Waste Co.', 'Clearance in progress'],
  ['litter-picking-cumbria', 'Builders’ rubble dumped at the field gate', 'Booked with Sample Clearance Ltd.', 'Clearance in progress'],
  ['roadside-litter', 'Dumped tyres left across the entrance track', 'Quotes still coming in', 'Awaiting quotes'],
]

export function CommercialPage() {
  return (
    <div className="relative">
      <PageBackdrop />
      <main className="cv grid-texture grid-shimmer mx-auto max-w-7xl px-5 pb-24 pt-32 sm:px-8 sm:pt-40">
        <Reveal className="accent-panel rounded-3xl p-8 sm:p-12">
          <p className="eyebrow">The commercial route</p>
          <h1 className="mt-4 max-w-2xl text-4xl sm:text-5xl">On private land, the landowner picks who clears it.</h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed opacity-90">
            A council has no duty to clear fly-tipping on private land, which is most of what official figures miss. For a report like that, registered waste carriers can quote a price, and whoever owns the land picks one. Resolve would take a small fee for arranging it.
          </p>
        </Reveal>

        <Reveal className="glass-panel mt-10 rounded-3xl p-6 sm:p-8">
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
                <CornerHover as="li" key={name} className="flex items-center justify-between gap-4 px-3 py-4 -mx-3">
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
                </CornerHover>
              ))}
            </ul>
          </div>
          <p className="mt-3 text-sm text-soft">This is not working yet. The photo is a real sample from the site's own image set; the quotes and "Choose" button are illustrative, not real carriers or prices.</p>

          <p className="mt-8 text-sm font-semibold uppercase tracking-widest text-soft">Other listings, tracked the same way</p>
          <ul className="card mt-4 divide-y divide-line overflow-hidden rounded-2xl">
            {OTHER_LISTINGS.map(([photo, title, booked, status]) => (
              <CornerHover as="li" key={title} className="flex flex-wrap items-center gap-4 px-4 py-3.5 sm:px-6">
                <Pic name={photo} widths={[400]} width={400} height={267} alt="" className="size-11 shrink-0 rounded-lg object-cover" sizes="44px" />
                <h3 className="min-w-0 flex-1 font-semibold leading-snug">{title}</h3>
                <div className="shrink-0 text-right">
                  <span className={`pill ${status === 'Awaiting quotes' ? 'pill-reported' : 'pill-progress'}`}>{status}</span>
                  <p className="mt-1 text-sm text-soft">{booked}</p>
                </div>
              </CornerHover>
            ))}
          </ul>
        </Reveal>

        <Reveal className="mt-10 flex max-w-3xl gap-4 rounded-3xl border border-accent/30 bg-accent/10 p-6">
          <Icon name="shield" className="mt-0.5 size-6 shrink-0 text-accent" />
          <p className="leading-relaxed">
            Still to work out: who verifies a waste carrier is actually registered, how payment and the fee are taken, and the registered company needed to legally hold that money.
          </p>
        </Reveal>
      </main>
    </div>
  )
}
