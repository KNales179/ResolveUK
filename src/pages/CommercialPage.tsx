import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { PageBackdrop } from '../components/site/SiteShell'
import { Icon } from '../components/ui/Icon'
import { Pic } from '../components/ui/Pic'
import { Reveal } from '../components/ui/Reveal'
import { fetchOrgs, type Org } from '../lib/orgs'

const STEPS: Array<[string, string]> = [
  ['Post what was dumped', 'A photo, a pin on the map and a few words. How to get to it, and your contact details, stay private.'],
  ['Licensed companies quote', 'Clearance companies covering that spot send a price and when they could do it. Every one is a registered waste carrier, checked by Resolve.'],
  ['Choose one, and it gets cleared', 'Only the company you choose gets your details. They clear it and mark it done with an after photo.'],
]

// The public page about private land, built around the business side of it: a wide photo of
// farmland with the point across it, the steps beside an example waste transfer note (the
// document every landowner should get), the companies list (or an empty outline) next to a warm
// "duty of care" panel, and a plain band about paying. Quoting happens in the app.
export function CommercialPage() {
  const [companies, setCompanies] = useState<Org[] | null>(null)
  useEffect(() => {
    let alive = true
    void fetchOrgs().then((list) => {
      if (alive) setCompanies((list ?? []).filter((o) => o.kind === 'commercial'))
    })
    return () => {
      alive = false
    }
  }, [])

  return (
    <div className="relative">
      <PageBackdrop />
      <main className="mx-auto max-w-7xl px-5 pb-24 pt-32 sm:px-8 sm:pt-40">
        {/* Hero: one wide photo of farmland, the kind of land this is about, with the point across it */}
        <Reveal className="photo-hero rounded-3xl p-8 sm:p-12 lg:min-h-[460px]">
          <Pic name="somerset-levels" widths={[400, 1093]} width={1093} height={729} alt="" className="photo-hero-img size-full object-cover" sizes="100vw" eager />
          <p className="eyebrow">Private land</p>
          <h1 className="mt-4 max-w-2xl text-4xl sm:text-6xl">On private land, the landowner picks who clears it.</h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-white/85">
            Councils clear fly-tipping from roads and public land. Rubbish dumped on a farm, a car park or a business's yard is the landowner's to clear, which is why so much of it stays. Resolve puts landowners in touch with licensed clearance companies nearby, who quote for the job.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/app/clearance/new" className="btn btn-primary">
              Ask for quotes <Icon name="arrow" className="size-4" />
            </Link>
            <Link to="/app/community/new?kind=commercial" className="btn btn-on-photo">
              Register a clearance company
            </Link>
          </div>
        </Reveal>

        {/* How it works, beside the one document worth asking for */}
        <Reveal className="mt-14 grid items-center gap-8 lg:grid-cols-[1.3fr_1fr] lg:gap-12">
          <div className="panel-neutral rounded-3xl p-7 sm:p-9">
            <h2 className="text-3xl">How it works</h2>
            <ol className="mt-6 grid gap-6">
              {STEPS.map(([title, text], i) => (
                <li key={title} className="grid grid-cols-[3.25rem_1fr] gap-4">
                  <span className="step-num num">{i + 1}</span>
                  <span className="min-w-0 border-b border-line pb-6 last:border-0">
                    <span className="block text-lg font-semibold">{title}</span>
                    <span className="mt-1 block leading-relaxed text-soft">{text}</span>
                  </span>
                </li>
              ))}
            </ol>
          </div>
          <figure className="mx-auto w-full max-w-md">
            <div className="wtn relative p-6 sm:p-7" aria-label="An example waste transfer note">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-serif text-2xl leading-tight">Waste transfer note</p>
                  <p className="text-xs text-[#6b7570]">Duty of care: Environmental Protection Act 1990, s.34</p>
                </div>
                <span className="wtn-stamp shrink-0 rounded-md px-2 py-0.5 text-xs">EXAMPLE</span>
              </div>
              <dl className="mt-4">
                <div className="wtn-row"><dt>Description of waste</dt><dd>20 tyres; builders rubble</dd></div>
                <div className="wtn-row grid grid-cols-2 gap-3"><div><dt>EWC codes</dt><dd>16 01 03 · 17 09 04</dd></div><div><dt>Quantity</dt><dd>approx. 2.5 tonnes</dd></div></div>
                <div className="wtn-row"><dt>Transferred from</dt><dd>High Fell Farm, Cumbria</dd></div>
                <div className="wtn-row"><dt>Waste carrier</dt><dd>Fellside Clearances Ltd · CBDU123456</dd></div>
                <div className="grid grid-cols-2 gap-3 pt-3"><div><dt>Signed (you)</dt><dd className="font-serif text-lg italic">O. Farm</dd></div><div><dt>Signed (carrier)</dt><dd className="font-serif text-lg italic">W. Ellis</dd></div></div>
              </dl>
            </div>
            <figcaption className="mt-5 text-center text-sm text-soft">Ask for one when it's collected, and keep it for two years. It's your proof the waste went to a licensed carrier.</figcaption>
          </figure>
        </Reveal>

        {/* Who quotes, beside what you need to know */}
        <Reveal className="mt-14 grid items-start gap-5 lg:grid-cols-[1.4fr_1fr]">
          <section>
            <h2 className="text-3xl">Clearance companies on Resolve</h2>
            {companies === null ? (
              <div className="mt-5 h-32 animate-pulse rounded-3xl bg-[var(--c-field)]" />
            ) : companies.length === 0 ? (
              <div className="panel-dashed mt-5 flex flex-wrap items-center justify-between gap-5 rounded-3xl p-7">
                <div className="max-w-md">
                  <p className="text-lg font-semibold">No companies have registered yet</p>
                  <p className="mt-1 text-soft">Licensed waste carrier? Register your company and the area you cover to start receiving requests.</p>
                </div>
                <Link to="/app/community/new?kind=commercial" className="btn btn-primary">
                  Register your company
                </Link>
              </div>
            ) : (
              <ul className="mt-5 grid gap-3 sm:grid-cols-2">
                {companies.map((c) => (
                  <li key={c.id} className="card rounded-2xl p-5">
                    <p className="font-semibold">{c.name}</p>
                    <p className="text-sm text-soft">{c.area_label}</p>
                    {c.waste_carrier_number && <p className="num mt-2 text-sm text-soft">Waste carrier {c.waste_carrier_number}</p>}
                  </li>
                ))}
              </ul>
            )}
          </section>
          <aside className="panel-caution rounded-3xl p-7">
            <span className="caution-icon inline-grid size-11 place-items-center rounded-xl">
              <Icon name="shield" className="size-5" />
            </span>
            <h2 className="mt-4 text-2xl">Your duty of care</h2>
            <p className="mt-3 leading-relaxed">
              If you hand waste to someone who dumps it, you can be fined as well. Only use a registered waste carrier, and ask for a waste transfer note when it's collected. Every company on Resolve gives its registration number, and you can check it yourself on the Environment Agency's public register.
            </p>
          </aside>
        </Reveal>

        {/* Paying: a plain band, no box */}
        <Reveal className="page-band mt-14 -mx-5 px-5 py-8 sm:-mx-8 sm:px-8">
          <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center sm:gap-6">
            <Pic name="roadside-litter" widths={[400]} width={400} height={267} alt="" className="hidden size-24 shrink-0 rounded-2xl object-cover sm:block" sizes="96px" />
            <div className="min-w-0 flex-1">
              <h2 className="text-2xl">Paying for it</h2>
              <p className="mt-1 max-w-2xl leading-relaxed text-soft">You agree the price with the company you choose and pay them directly. Asking for quotes is free, and you don't have to accept any of them.</p>
            </div>
            <Link to="/app/clearance/new" className="btn btn-primary">
              Ask for quotes <Icon name="arrow" className="size-4" />
            </Link>
          </div>
        </Reveal>
      </main>
    </div>
  )
}
