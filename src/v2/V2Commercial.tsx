import { Icon } from '../components/ui/Icon'

const QUOTES: Array<[string, string, string]> = [
  ['Sample Waste Co.', '£65', 'Collection tomorrow'],
  ['Sample Clearance Ltd.', '£79', 'Collection today'],
  ['Sample Skip Hire', '£55', 'Collection Thursday'],
]

export function V2Commercial() {
  return (
    <div className="max-w-3xl">
      <p className="eyebrow">Commercial route · concept</p>
      <h1 className="mt-4 text-4xl sm:text-5xl">On private land, the landowner picks who clears it.</h1>
      <p className="mt-6 text-lg leading-relaxed text-soft">
        A council has no duty to clear fly-tipping on private land, which is most of what official figures miss. For a report like that, registered waste carriers could quote a price, and whoever owns the land picks one. Resolve would take a small fee for arranging it.
      </p>

      <p className="mt-10 text-sm font-semibold uppercase tracking-widest text-soft">What a landowner would see, as a mock-up</p>
      <div className="card mt-4 rounded-2xl p-5 sm:p-7">
        <div className="flex gap-4">
          <span className="tile-icon size-16 shrink-0 rounded-2xl">
            <Icon name="trash" className="size-7" />
          </span>
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
      <p className="mt-3 text-sm text-soft">Those quotes and the "Choose" button are a mock-up. No real carrier, price or payment exists yet.</p>

      <p className="mt-10 leading-relaxed text-soft">
        Still to work out: who verifies a waste carrier is actually registered, how payment and the fee are taken, and the registered company needed to legally hold that money.
      </p>
    </div>
  )
}
