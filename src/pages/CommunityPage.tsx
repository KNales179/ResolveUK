import { PageBackdrop } from '../components/site/SiteShell'
import { CornerHover } from '../components/ui/CornerHover'
import { Icon } from '../components/ui/Icon'
import { Pic } from '../components/ui/Pic'
import { Reveal } from '../components/ui/Reveal'

// Temporary: a worklist a group would triage and claim from, not a photo gallery — a different
// purpose to the public "Reported problems" grid, so it gets a different shape: compact rows, not
// cards. None of this is live yet; the claim button does nothing.
const COMMUNITY_SAMPLES: Array<[string, string, string]> = [
  ['litter-bottles', 'Litter scattered along the river path', 'Backed by 4 people'],
  ['roadside-litter', 'Rubbish along the verge near the layby', 'Backed by 2 people'],
  ['rubbish-street', 'Overflowing bin left uncleared for weeks', 'Backed by 6 people'],
]

export function CommunityPage() {
  return (
    <div className="relative">
      <PageBackdrop />
      <main className="cv grid-texture grid-shimmer mx-auto max-w-7xl px-5 pb-24 pt-32 sm:px-8 sm:pt-40">
        <Reveal className="accent-panel rounded-3xl p-8 sm:p-12">
          <p className="eyebrow">The community route</p>
          <h1 className="mt-4 max-w-2xl text-4xl sm:text-5xl">Some problems, a local group can just clear.</h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed opacity-90">
            A report that is safe and legal for a volunteer to deal with, such as litter, stays visible to the council as normal, but can also be offered to a registered local group. If a group takes it on, the report shows who cleared it and how, with a photo, instead of waiting in a council queue.
          </p>
        </Reveal>

        <Reveal className="mt-10">
          <p className="text-halo text-sm font-semibold uppercase tracking-widest text-soft">A group's queue, shown here as a preview</p>
          <ul className="panel-tint mt-4 divide-y divide-line overflow-hidden rounded-3xl">
            {COMMUNITY_SAMPLES.map(([photo, title, backedBy]) => (
              <CornerHover as="li" key={title} className="flex flex-wrap items-center gap-4 px-5 py-4 sm:px-7">
                <Pic name={photo} widths={[400]} width={400} height={267} alt="" className="size-14 shrink-0 rounded-lg object-cover" sizes="56px" />
                <div className="min-w-0 flex-1">
                  <span className="pill pill-reported">Reported</span>
                  <h3 className="mt-1.5 font-semibold leading-snug">{title}</h3>
                  <p className="mt-0.5 text-sm text-soft">{backedBy} · safe for a group to clear</p>
                </div>
                <button type="button" disabled className="btn btn-primary btn-sm shrink-0 cursor-not-allowed opacity-60">
                  Claim
                </button>
              </CornerHover>
            ))}
          </ul>
          <p className="mt-4 text-sm text-soft">This is not working yet. The photos are real samples from the site's own image set; the claim button does nothing when pressed.</p>
        </Reveal>

        <Reveal className="mt-10 flex max-w-3xl gap-4 rounded-3xl border border-accent/30 bg-accent/10 p-6">
          <Icon name="shield" className="mt-0.5 size-6 shrink-0 text-accent" />
          <p className="leading-relaxed">
            Still to work out: which categories are ever safe enough to offer this way, how a group registers and gets checked, and what happens if a group claims something and never finishes it.
          </p>
        </Reveal>
      </main>
    </div>
  )
}
