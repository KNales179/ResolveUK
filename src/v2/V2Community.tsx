import { Icon } from '../components/ui/Icon'

export function V2Community() {
  return (
    <div className="max-w-3xl">
      <p className="eyebrow">Community route · concept</p>
      <h1 className="mt-4 text-4xl sm:text-5xl">Some problems, a local group could just clear.</h1>
      <p className="mt-6 text-lg leading-relaxed text-soft">
        A report that is safe and legal for a volunteer to deal with, such as litter, would stay visible to the council as normal, but would also be offered to a registered local group. If a group takes it on, the report shows who cleared it and how, with a photo, instead of waiting in a council queue.
      </p>

      <p className="mt-10 text-sm font-semibold uppercase tracking-widest text-soft">What a group would see, as a mock-up</p>
      <div className="card mt-4 flex gap-4 rounded-2xl p-5">
        <span className="tile-icon size-16 shrink-0 rounded-2xl">
          <Icon name="trash" className="size-7" />
        </span>
        <div className="min-w-0 flex-1">
          <span className="pill pill-reported">Reported</span>
          <h3 className="mt-2 text-lg font-semibold leading-snug">Litter scattered along the river path</h3>
          <p className="mt-1 text-sm text-soft">Backed by 4 people · safe for a group to clear</p>
          <button type="button" disabled className="btn btn-primary btn-sm mt-4 cursor-not-allowed opacity-60">
            Claim for Sample Litter-Pickers Group
          </button>
        </div>
      </div>
      <p className="mt-3 text-sm text-soft">That button is a mock-up. Nothing is claimed if you press it.</p>

      <p className="mt-10 leading-relaxed text-soft">
        Still to work out: which categories are ever safe enough to offer this way, how a group registers and gets checked, and what happens if a group claims something and never finishes it.
      </p>
    </div>
  )
}
