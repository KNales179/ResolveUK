import { PageBackdrop } from '../components/site/SiteShell'
import { Pic } from '../components/ui/Pic'
import { Reveal } from '../components/ui/Reveal'

export function CommunityPage() {
  return (
    <>
      <PageBackdrop />
      <main className="mx-auto max-w-3xl px-5 pb-24 pt-32 sm:px-8 sm:pt-40">
        <Reveal>
          <p className="eyebrow">The community route</p>
          <h1 className="mt-4 text-4xl sm:text-5xl">Some problems, a local group can just clear.</h1>
          <p className="mt-6 text-lg leading-relaxed text-soft">
            A report that is safe and legal for a volunteer to deal with, such as litter, stays visible to the council as normal, but can also be offered to a registered local group. If a group takes it on, the report shows who cleared it and how, with a photo, instead of waiting in a council queue.
          </p>
        </Reveal>

        <Reveal className="mt-14">
          <p className="text-sm font-semibold uppercase tracking-widest text-soft">What a group would see, shown here as a preview</p>
          <div className="card mt-4 flex gap-4 rounded-2xl p-4 sm:p-5">
            <Pic name="litter-bottles" widths={[400]} width={400} height={267} alt="" className="size-24 shrink-0 rounded-xl object-cover sm:size-28" sizes="112px" />
            <div className="min-w-0 flex-1">
              <span className="pill pill-reported">Reported</span>
              <h3 className="mt-2 text-lg font-semibold leading-snug">Litter scattered along the river path</h3>
              <p className="mt-1 text-sm text-soft">Backed by 4 people · safe for a group to clear</p>
              <button type="button" disabled className="btn btn-primary btn-sm mt-4 cursor-not-allowed opacity-60">
                Claim for Sample Group
              </button>
            </div>
          </div>
          <p className="mt-3 text-sm text-soft">This is not working yet. The photo is a real sample from the site's own image set; the claim button does nothing when pressed.</p>
        </Reveal>

        <Reveal className="mt-14 leading-relaxed text-soft">
          Still to work out: which categories are ever safe enough to offer this way, how a group registers and gets checked, and what happens if a group claims something and never finishes it.
        </Reveal>
      </main>
    </>
  )
}
