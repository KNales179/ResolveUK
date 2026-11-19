import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Icon } from './components/ui/Icon'
import { Pic } from './components/ui/Pic'
import { GsapReveal as Reveal } from './components/ui/GsapReveal'
import { CornerHover } from './components/ui/CornerHover'
import { PurposeArt, StorySection } from './components/about/Story'
import { openInstallDialog } from './lib/install'
import { FlyTippingChart } from './components/home/FlyTippingChart'
import { Backdrop } from './components/site/Backdrop'
import { BgSwatchPicker } from './components/ui/BgSwatchPicker'
import { gsap, reducedMotion } from './lib/gsap'
import { backedReportIds, rememberBacked } from './lib/device'
import { timeAgo } from './lib/format'
import { backReport } from './lib/nearby'
import { photoUrl } from './lib/photos'
import { SAMPLE_REPORTS } from './lib/sampleReports'
import { backersOf, OPEN_STATUSES, STATUS_LABELS, statusGroup, type StatusGroup } from './lib/status'
import { supabase } from './lib/supabase'
import { useLenis } from './lib/useLenis'
import type { Report } from './types'

const STAGES: Array<[string, string]> = [
  ['Reported', 'A resident sends it in with a photo and a place.'],
  ['Responsible body named', 'The council, contractor or other organisation that looks after it is identified.'],
  ['Acknowledged', 'They confirm they have seen it.'],
  ['Clearance scheduled', 'A date for the work is set.'],
  ['Cleared', 'They say the job is done.'],
  ['Verified', 'Someone independent confirms it is fixed.'],
]

const STEPS: Array<[string, string, string]> = [
  ['1', 'Describe it', 'Choose the type of problem, add a photo and write a line or two about it.'],
  ['2', 'Mark the place', 'The map starts where you are. Drag the pin if it is a little off. If someone has already reported the same thing nearby, you can add your support to theirs.'],
  ['3', 'Follow it', 'Every step is added to the report’s history, from picked up to cleared to verified, with the date and time, whoever ends up resolving it.'],
]

const MORE: Array<[string, string, string]> = [
  ['/about', 'About Resolve UK', 'Who it is for, what it promises, and what the logo stands for.'],
  ['/why', 'Why it matters', 'The numbers behind fly-tipping, potholes and the reports that go nowhere.'],
  ['/get-involved', 'Get involved', 'Things you can do on your own or with others, and the three ways a problem gets resolved.'],
]

const OTHER_TYPES: Array<[string, string]> = [
  ['Potholes', 'Holes and cracks in the road'],
  ['Graffiti', 'On walls, signs and street furniture'],
  ['Abandoned vehicles', 'Left on the street with no sign of an owner'],
  ['Damaged infrastructure', 'Street lights, barriers, bins and benches'],
]

// Only the front card's text is ever legible. Cards behind it keep their photo visible (dimmed, so
// the stack still looks like a stack of real cards, not blank shapes) while their text fades to 0,
// so a rotated/shifted card peeking out behind the front one never reads as overlapping text.
// `tilt` scales how far each depth leans toward the cursor (see the mousemove handler below) — the
// front card leans the most, the one behind leans less and slightly the other way, so the stack
// reads as sitting at different depths instead of moving as one flat unit.
const STACK_POSITIONS = [
  { card: { scale: 1, y: 0, rotate: 0, zIndex: 3, opacity: 1 }, textOpacity: 1, imgOpacity: 1, tilt: 1 },
  { card: { scale: 0.95, y: 14, rotate: -3, zIndex: 2, opacity: 1 }, textOpacity: 0, imgOpacity: 0.55, tilt: 0.7 },
  { card: { scale: 0.9, y: 26, rotate: 4, zIndex: 1, opacity: 1 }, textOpacity: 0, imgOpacity: 0.3, tilt: -0.55 },
]
// Where a card sits while it isn't one of the 3 visible depth slots above — fully invisible and
// beneath all of them, waiting its turn. Lets the pool of reports behind the stack be bigger than
// 3 (cycling every one of them through, a few at a time) without the stack itself showing more
// than 3 at once.
const PARKED = { card: { scale: 0.85, y: 26, rotate: 0, zIndex: 0, opacity: 0 }, textOpacity: 0, imgOpacity: 0, tilt: 0 }
const STACK_INTERVAL = 5500
const STACK_TILT_DEG = 8


// Collapses the full status enum down to the stack card's simple 4-stop progress bar.
const GROUP_STEP: Record<StatusGroup, number> = { reported: 1, progress: 2, cleared: 3, verified: 4, closed: 2 }

function toStackCard(r: Report) {
  const group = statusGroup(r.current_status)
  return {
    id: r.id,
    status: r.current_status,
    img: photoUrl(r.photo_path),
    alt: r.description,
    group,
    label: STATUS_LABELS[r.current_status],
    title: r.description,
    time: `Reported ${timeAgo(r.created_at)}`,
    backers: backersOf(r),
    step: GROUP_STEP[group],
  }
}

// The hero's one real photo lives in a small stack of sample report cards that auto-advance,
// front card to back, like a deck being cycled. Every card leans a little toward the cursor in 3D
// — the front one most, the one behind less and slightly the other way — all the time, tracking
// the pointer across the whole page rather than only while the cursor is directly over the stack,
// so it reads as a figure quietly facing you rather than a hover effect. Hovering a card shows a
// small tag near the pointer that says what a click does: "Next" anywhere on the card itself, or
// something more specific ("Open <report>", "Back this report") while over one of its two
// buttons — each of which also gets its own corner-bracket hover, scoped to just that button, not
// the whole card. Static for reduced motion; the stack is still clickable then, just without the
// tilt, the tag, or the animated transition between positions.
// `reports` is always exactly 3: real reports when there are at least 3 of them, the shared
// sample set otherwise (see Home()'s own fetch below) — `usingSamples` is only for the "Sample"
// badge, every other mechanic here is identical either way.
function HeroCardStack({ reports, usingSamples }: { reports: Report[]; usingSamples: boolean }) {
  const rootRef = useRef<HTMLDivElement>(null)
  const tagRef = useRef<HTMLDivElement>(null)
  const orderRef = useRef<number[]>(reports.map((_, i) => i))
  const display = reports.map(toStackCard)

  // Backing reuses the exact same device-local "already backed" bookkeeping the real report
  // drawer uses (lib/device.ts), so it stays consistent across a reload and across both this
  // stack and the real reports page. A sample id has no real row to back in the database, so it
  // just remembers the backing locally instead of calling the real API for it.
  const [backedIds, setBackedIds] = useState(backedReportIds)
  const [busyId, setBusyId] = useState<string | null>(null)
  // Samples' backer counts are a fixed number written into the sample data, which never counted
  // a locally-remembered backing from an earlier visit — bumped by 1 here to compensate. A real
  // report's count comes fresh from the database and already includes any earlier backing, so
  // only a backing added just now (this render) gets bumped for it.
  const [bumpIds, setBumpIds] = useState<Set<string>>(
    () => new Set(usingSamples ? reports.filter((r) => backedReportIds().has(r.id)).map((r) => r.id) : []),
  )
  // Read inside the hover-tag handlers below (set up once, on mount) so they reflect whichever
  // card is currently in that slot and its current backed state, not whatever was true when the
  // handler was first attached.
  const canBackRef = useRef<boolean[]>([])
  canBackRef.current = display.map((s) => OPEN_STATUSES.includes(s.status) && !backedIds.has(s.id))

  async function handleBack(id: string) {
    if (backedIds.has(id) || busyId) return
    setBusyId(id)
    try {
      if (usingSamples) {
        rememberBacked(id)
      } else {
        await backReport(id)
      }
      setBackedIds(backedReportIds())
      setBumpIds((prev) => new Set(prev).add(id))
    } catch {
      // A decorative hero affordance, not a form — quietly leave it clickable to try again.
    } finally {
      setBusyId(null)
    }
  }

  useEffect(() => {
    const root = rootRef.current
    const tagEl = tagRef.current
    if (!root || !tagEl) return
    const cards = gsap.utils.toArray<HTMLElement>('.stack-card', root)
    const tagTextEl = tagEl.querySelector<HTMLElement>('.stack-tag-text')
    const setTagText = (text: string) => {
      if (tagTextEl) tagTextEl.textContent = text
    }

    const apply = (immediate: boolean) => {
      orderRef.current.forEach((cardIdx, rank) => {
        const { card, textOpacity, imgOpacity } = STACK_POSITIONS[rank] ?? PARKED
        const cardEl = cards[cardIdx]
        const media = cardEl.querySelector<HTMLElement>('.stack-card-media')
        const text = cardEl.querySelectorAll<HTMLElement>('.stack-card-text')
        if (immediate) {
          gsap.set(cardEl, card)
          gsap.set(media, { opacity: imgOpacity })
          gsap.set(text, { opacity: textOpacity })
          return
        }
        gsap.to(cardEl, { ...card, duration: 0.6, ease: 'power3.inOut' })
        gsap.to(media, { opacity: imgOpacity, duration: 0.4 })
        gsap.to(text, { opacity: textOpacity, duration: textOpacity ? 0.4 : 0.2, delay: textOpacity ? 0.2 : 0 })
      })
    }
    apply(true)

    // Clicking anywhere on the stack always means the same thing: bring the next one forward.
    const advance = () => {
      orderRef.current = [...orderRef.current.slice(1), orderRef.current[0]]
      apply(reducedMotion())
    }
    // A plain `addEventListener` here fires during the real native bubble phase, which reaches
    // this element before React's own delegated listener (wherever it is attached) ever gets a
    // chance to run a React onClick's stopPropagation — so the "View report" / "I have seen this
    // too" buttons opt out by target, not by stopping propagation from inside React.
    const onClick = (e: MouseEvent) => {
      if ((e.target as HTMLElement).closest('.stack-card-action')) return
      advance()
    }
    root.addEventListener('click', onClick)

    if (reducedMotion()) {
      return () => root.removeEventListener('click', onClick)
    }

    gsap.set(cards, { transformPerspective: 900 })
    gsap.set(tagEl, { x: 0, y: 0, rotation: -3, scale: 0.85, opacity: 0 })
    const tiltFns = cards.map((cardEl) => ({
      ry: gsap.quickTo(cardEl, 'rotationY', { duration: 0.6, ease: 'power3.out' }),
      rx: gsap.quickTo(cardEl, 'rotationX', { duration: 0.6, ease: 'power3.out' }),
    }))
    const tagX = gsap.quickTo(tagEl, 'x', { duration: 0.25, ease: 'power3.out' })
    const tagY = gsap.quickTo(tagEl, 'y', { duration: 0.25, ease: 'power3.out' })

    // Tracks the pointer across the whole page (not just while it is over the stack), so the
    // cards keep leaning toward it like a figure quietly facing the cursor around the room,
    // rather than only reacting once the mouse happens to land on the stack itself.
    const onMove = (e: MouseEvent) => {
      const r = root.getBoundingClientRect()
      const nx = Math.max(-1, Math.min(1, ((e.clientX - r.left) / r.width - 0.5) * 2))
      const ny = Math.max(-1, Math.min(1, ((e.clientY - r.top) / r.height - 0.5) * 2))
      orderRef.current.forEach((cardIdx, rank) => {
        const tilt = (STACK_POSITIONS[rank] ?? PARKED).tilt
        tiltFns[cardIdx].ry(nx * STACK_TILT_DEG * tilt)
        tiltFns[cardIdx].rx(-ny * STACK_TILT_DEG * tilt)
      })
      const localX = e.clientX - r.left
      const localY = e.clientY - r.top
      if (localX >= 0 && localX <= r.width && localY >= 0 && localY <= r.height) {
        tagX(localX + 18)
        tagY(localY + 18)
      }
    }
    window.addEventListener('mousemove', onMove)

    // The tag itself only makes sense while the pointer is actually over the stack (unlike the
    // tilt, which keeps tracking the cursor everywhere) — hide it once the mouse leaves.
    const onStackLeave = () => gsap.to(tagEl, { opacity: 0, scale: 0.85, duration: 0.18 })
    root.addEventListener('mouseleave', onStackLeave)

    // Each card gets one pair of listeners for the generic "Next" tag, plus its own two buttons
    // each getting a pair that override the tag's text while the pointer is specifically over
    // them. The two buttons' corner brackets need no JS at all — CornerHover already shows them
    // on nothing but that button's own native :hover.
    const cardHandlers = cards.map((cardEl, cardIdx) => {
      const onEnter = () => {
        setTagText('Next')
        gsap.to(tagEl, { opacity: 1, scale: 1, duration: 0.22, ease: 'back.out(1.7)' })
      }
      cardEl.addEventListener('mouseenter', onEnter)

      // Looked up by their own class, not by position in the row — the two can be reordered in
      // the JSX below without this silently swapping which hover text/listener goes with which.
      const viewBtn = cardEl.querySelector<HTMLElement>('.stack-card-action--view')
      const seenBtn = cardEl.querySelector<HTMLElement>('.stack-card-action--seen')
      const onViewEnter = () => setTagText('View report')
      const onViewLeave = () => setTagText('Next')
      const onSeenEnter = () => setTagText(canBackRef.current[cardIdx] ? 'Back this report' : 'Next')
      const onSeenLeave = () => setTagText('Next')
      viewBtn?.addEventListener('mouseenter', onViewEnter)
      viewBtn?.addEventListener('mouseleave', onViewLeave)
      seenBtn?.addEventListener('mouseenter', onSeenEnter)
      seenBtn?.addEventListener('mouseleave', onSeenLeave)

      return () => {
        cardEl.removeEventListener('mouseenter', onEnter)
        viewBtn?.removeEventListener('mouseenter', onViewEnter)
        viewBtn?.removeEventListener('mouseleave', onViewLeave)
        seenBtn?.removeEventListener('mouseenter', onSeenEnter)
        seenBtn?.removeEventListener('mouseleave', onSeenLeave)
      }
    })

    // A self-rescheduling timeout rather than setInterval, so a slow tab or a background pause
    // can never pile up or silently die — each cycle only ever books the next one once it is done.
    let timeoutId = 0
    const tick = () => {
      if (document.visibilityState === 'visible') advance()
      timeoutId = window.setTimeout(tick, STACK_INTERVAL)
    }
    timeoutId = window.setTimeout(tick, STACK_INTERVAL)

    return () => {
      window.clearTimeout(timeoutId)
      root.removeEventListener('click', onClick)
      window.removeEventListener('mousemove', onMove)
      root.removeEventListener('mouseleave', onStackLeave)
      cardHandlers.forEach((cleanup) => cleanup())
    }
  }, [])

  return (
    // .stack-idle opts the stack out of the site-wide CursorTag — it shows its own tag instead.
    <div ref={rootRef} className="stack-idle relative h-[19.5rem] sm:h-[18rem]">
      {display.map((s, i) => (
        <div key={s.id} className={`stack-card card stack-tint-${(i % 3) + 1} absolute inset-0 cursor-pointer rounded-2xl px-4 pb-6 pt-4 shadow-xl`}>
          {usingSamples && <span className="absolute -top-3 right-5 z-10 rounded-md bg-ink px-2.5 py-1 text-[0.65rem] font-semibold uppercase tracking-widest text-bg">Sample</span>}
          <div className="flex gap-3.5">
            <img src={s.img} alt={s.alt} loading="lazy" decoding="async" className="stack-card-media size-24 shrink-0 rounded-xl object-cover" />
            <div className="stack-card-text min-w-0">
              <span className={`pill pill-${s.group}`}>{s.label}</span>
              <h3 className="mt-2 text-base font-semibold leading-snug">{s.title}</h3>
              <p className="mt-1 text-xs text-soft">{s.time}</p>
            </div>
          </div>
          <ol className="stack-card-text mt-5 grid grid-cols-4 gap-1.5 text-[0.65rem] font-medium text-soft" aria-label="Progress">
            {['Reported', 'Acknowledged', 'Cleared', 'Verified'].map((label, i2) => (
              <li key={label} className="text-center">
                <span className={`mb-1.5 block h-1 rounded-full ${i2 < s.step ? 'bg-accent' : 'bg-line'}`} />
                {label}
              </li>
            ))}
          </ol>
          {(() => {
            const alreadyBacked = backedIds.has(s.id)
            const canBack = OPEN_STATUSES.includes(s.status) && !alreadyBacked
            const displayBackers = s.backers + (bumpIds.has(s.id) ? 1 : 0)
            return (
              // The backer count sits on its own line, above the two buttons, rather than
              // sharing one row with them — "You have backed this" (with its icon) is wider than
              // "I have seen this too", and squeezed onto the same row as the count, that extra
              // width was enough to push the row over and visibly reflow the layout right as you
              // clicked. On their own row, the two buttons have the card's full width to work
              // with, so swapping label never shifts anything.
              <div className="stack-card-text mt-4 border-t border-line pt-4">
                <p className="text-sm font-medium">{displayBackers} people back this</p>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-4">
                  {/* Both wrappers stay the same element across re-renders (only their inner
                      content swaps between a real control and a plain label) — the GSAP effect
                      below attaches its hover listeners to these wrappers once, on mount, and
                      they'd go stale if the wrapper itself were ever replaced instead of just its
                      children. "stack-card-action" is how the card's own click-to-advance handler
                      recognises and skips a click that started on either one; the --view/--seen
                      modifier is how that same effect tells the two apart regardless of order. */}
                  <div className={`stack-card-action stack-card-action--seen relative rounded-[0.85rem] ${canBack ? 'corner-hover' : ''}`}>
                    {canBack && (
                      <>
                        <span className="ch-corner ch-tl" aria-hidden="true" />
                        <span className="ch-corner ch-tr" aria-hidden="true" />
                        <span className="ch-corner ch-bl" aria-hidden="true" />
                        <span className="ch-corner ch-br" aria-hidden="true" />
                      </>
                    )}
                    {alreadyBacked ? (
                      <span className="btn btn-ghost btn-sm cursor-default">
                        <Icon name="check" className="size-4 text-accent" />
                        You have backed this
                      </span>
                    ) : canBack ? (
                      <button type="button" className="btn btn-ghost btn-sm" onClick={() => void handleBack(s.id)} disabled={busyId === s.id}>
                        {busyId === s.id ? 'Saving…' : 'I have seen this too'}
                      </button>
                    ) : (
                      <span className="btn btn-ghost btn-sm">I have seen this too</span>
                    )}
                  </div>
                  <div className={`stack-card-action stack-card-action--view relative rounded-[0.85rem] ${usingSamples ? 'corner-hover' : ''}`}>
                    {usingSamples && (
                      <>
                        <span className="ch-corner ch-tl" aria-hidden="true" />
                        <span className="ch-corner ch-tr" aria-hidden="true" />
                        <span className="ch-corner ch-bl" aria-hidden="true" />
                        <span className="ch-corner ch-br" aria-hidden="true" />
                      </>
                    )}
                    {usingSamples ? (
                      <Link to={`/reports/${s.id}`} className="btn btn-ghost btn-sm">
                        View report
                      </Link>
                    ) : (
                      <span className="btn btn-ghost btn-sm">View report</span>
                    )}
                  </div>
                </div>
              </div>
            )
          })()}
        </div>
      ))}
      <div ref={tagRef} className="pointer-events-none absolute left-0 top-0 z-50 opacity-0">
        <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-accent-vivid px-3.5 py-1.5 text-xs font-bold text-accent-ink shadow-lg">
          <span className="size-1.5 shrink-0 rounded-full bg-accent-ink" />
          <span className="stack-tag-text">Next</span>
          <Icon name="arrow" className="size-3 shrink-0" />
        </span>
      </div>
    </div>
  )
}

// "Three ways a problem gets resolved": a bento grid instead of a single morphing panel — Public
// (the one route that already works) gets the large, emphasised tile; Community and Commercial
// sit stacked beside it as smaller tiles, both visible at once rather than hidden behind a timer.
export default function Home() {
  useLenis()
  const heroRef = useRef<HTMLElement>(null)

  // Shows every shared sample report immediately (so the hero is never empty or waiting on a
  // network round trip, and all 5 — not just the first 3 — get a turn in the stack, see PARKED
  // above), then swaps in the newest real reports if there are at least 3 of them — fewer than
  // that and it just stays on the samples, so the stack never looks thin.
  const [hero, setHero] = useState(() => ({ reports: SAMPLE_REPORTS, usingSamples: true }))

  useEffect(() => {
    let alive = true
    supabase
      .from('reports')
      .select('*, report_supports(count)')
      .order('created_at', { ascending: false })
      .limit(5)
      .then(({ data, error }) => {
        if (!alive || error || !data || data.length < 3) return
        // Sliced defensively to 5 — the stack's PARKED fallback handles any pool size from 3 up,
        // but shouldn't be trusted with an unbounded one if the query ever ignored its own .limit(5).
        setHero({ reports: (data as unknown as Report[]).slice(0, 5), usingSamples: false })
      })
    return () => {
      alive = false
    }
  }, [])

  useEffect(() => {
    if (reducedMotion()) return
    const ctx = gsap.context(() => {
      const lines = gsap.utils.toArray<HTMLElement>('.hero-line-inner')
      const tl = gsap.timeline({ defaults: { ease: 'power4.out' } })
      tl.set(lines, { yPercent: 100 })
        .set('.hero-fade', { opacity: 0, y: 18 })
        .set('.hero-eyebrow', { opacity: 0 })
        .to('.hero-eyebrow', { opacity: 1, duration: 0.5 })
        .to(lines, { yPercent: 0, duration: 0.9, stagger: 0.1 }, '-=0.2')
        .to('.hero-fade', { opacity: 1, y: 0, duration: 0.7, stagger: 0.15 }, '-=0.5')
    }, heroRef)
    return () => ctx.revert()
  }, [])

  return (
    <main>
      <Backdrop kind="home" />
      {/* ---- hero ---- */}
      <section ref={heroRef} className="relative isolate flex min-h-[100svh] items-center overflow-hidden bg-bg">
        <div className="hero-motion-bg shimmer-grid grid-shimmer absolute inset-0 -z-20" aria-hidden="true">
          <div className="hero-photo" />
        </div>
        <div className="mx-auto grid w-full max-w-7xl items-center gap-14 px-5 pb-20 pt-32 sm:px-8 lg:grid-cols-[1.15fr_.85fr]">
          <div>
            <p className="hero-eyebrow eyebrow mb-6">Early prototype</p>
            <h1 className="hero-headline text-[3.4rem] leading-[1.02] sm:text-7xl lg:text-[5.6rem]">
              <span className="block overflow-hidden">
                <span className="hero-line-inner inline-block">See it.</span>
              </span>
              <span className="block overflow-hidden">
                <span className="hero-line-inner inline-block">Report it.</span>
              </span>
              <span className="block overflow-hidden">
                <span className="hero-line-inner inline-block font-medium italic text-accent-display">Resolve it.</span>
              </span>
            </h1>
            <p className="hero-fade mt-7 max-w-xl text-lg leading-relaxed text-ink/80 sm:text-xl">
              Fly-tipping in a lay-by, a pothole that catches bike wheels, graffiti that stays for months. Report it in about a minute, then follow it through to whoever actually resolves it: a council, a local group, or a commercial service for private land.
            </p>
            <div className="hero-fade mt-9 flex flex-wrap gap-3">
              <Link to="/report" className="btn btn-primary text-base">
                Report a problem <Icon name="arrow" />
              </Link>
              <Link to="/reports" className="btn btn-ghost text-base">
                See reported problems
              </Link>
            </div>
          </div>

          <div className="hero-fade relative mx-auto w-full max-w-md lg:ml-auto">
            <HeroCardStack key={hero.usingSamples ? 'samples' : 'real'} reports={hero.reports} usingSamples={hero.usingSamples} />
          </div>
        </div>
      </section>

      {/* The hero and this strip sit on a solid colour; the contour lines start below, fading in,
          so they never run behind the hero photo. */}
      <div className="shade-strip">
        <BgSwatchPicker />
      </div>

      {/* ---- how it works, through the closing CTA. The page background (contour lines) is the
          fixed <Backdrop kind="home" /> at the top of <main>. ---- */}
      <div>
      {/* ---- why it exists (same as the About page's purpose) ---- */}
      <section className="grid-texture grid-shimmer">
        <div className="mx-auto max-w-7xl px-5 pt-10 pb-2 sm:px-8 sm:pt-12">
          <StorySection label="Why it exists" title="Reporting shouldn't be the end of the story" art={<PurposeArt />}>
            <p>
              Everyone has walked past the same mattress in the same lay-by for weeks. Someone probably reported it. Did they? Did anything happen? Was it actually cleared, or just marked as done?
            </p>
            <p>
              Resolve UK gives every street <strong className="text-ink">one public record</strong> of what has been reported and where it stands, so nobody has to wonder, chase or report the same thing twice.
            </p>
          </StorySection>
        </div>
      </section>

      <section id="how" className="grid-texture grid-shimmer scroll-mt-24">
        <div className="mx-auto max-w-7xl px-5 py-10 sm:px-8 sm:py-12">
          <div className="grid gap-8 lg:grid-cols-[.8fr_1.2fr] lg:gap-10">
            <Reveal className="accent-panel flex flex-col justify-center rounded-3xl p-8 sm:p-10">
              <p className="eyebrow">How it works</p>
              <h2 className="mt-4 text-4xl leading-[1.1] sm:text-5xl">Report it in a minute, then follow it.</h2>
              <p className="mt-5 text-lg leading-relaxed opacity-85">Each report has a public history. Whoever takes it on, whether that is a council, a contractor or another organisation, adds to that history as it moves towards fixed.</p>
            </Reveal>
            <ol className="panel-tint divide-y divide-line overflow-hidden rounded-3xl">
              {STEPS.map(([n, title, text], i) => (
                <CornerHover as="li" key={n}>
                  <Reveal delay={i * 70} className="grid grid-cols-[3rem_1fr] gap-4 p-4 sm:grid-cols-[4rem_1fr]">
                    <span className="font-serif text-4xl leading-none text-accent sm:text-5xl">{n}</span>
                    <div>
                      <h3 className="text-xl font-semibold">{title}</h3>
                      <p className="mt-2 leading-relaxed text-soft">{text}</p>
                    </div>
                  </Reveal>
                </CornerHover>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* ---- what people report ---- */}
      <section className="grid-texture grid-shimmer">
        <div className="mx-auto max-w-7xl px-5 py-10 sm:px-8 sm:py-12">
          <Reveal className="panel-tint max-w-2xl rounded-3xl p-6 sm:p-8">
            <p className="eyebrow">What you can report</p>
            <h2 className="mt-4 text-4xl leading-[1.1] sm:text-5xl">The everyday problems that wear a place down.</h2>
          </Reveal>
          <div className="mt-8 grid gap-8 md:grid-cols-3 md:grid-rows-2">
            {/* The rotation lives on the inner <figure>, not the Reveal wrapper — GSAP writes its
                own inline transform onto whatever element it animates, which would otherwise
                silently override a Tailwind rotate class (inline style beats any class). */}
            <Reveal className="md:col-span-2 md:row-span-2">
              <figure className="photo-print group relative min-h-[20rem] -rotate-3 overflow-hidden rounded-lg">
                <Pic name="rubbish-street" widths={[400, 678]} width={678} height={452} alt="Piles of black rubbish bags on a residential street" className="absolute inset-0 size-full object-cover transition duration-700 group-hover:scale-105" sizes="(min-width:768px) 66vw, 100vw" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
                <figcaption className="absolute bottom-0 p-6 text-white">
                  <p className="font-serif text-3xl">Fly-tipping and dumped waste</p>
                  <p className="mt-1 max-w-md text-sm text-white/80">Rubbish left on pavements and in lay-bys, and bags piled beside bins.</p>
                </figcaption>
              </figure>
            </Reveal>
            <Reveal delay={70}>
              <figure className="photo-print group relative min-h-[12rem] rotate-3 overflow-hidden rounded-lg">
                <Pic name="litter-picking-cumbria" widths={[400, 640]} width={640} height={427} alt="A volunteer litter-picking beside a path in Cumbria" className="absolute inset-0 size-full object-cover transition duration-700 group-hover:scale-105" sizes="(min-width:768px) 33vw, 100vw" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/5 to-transparent" />
                <figcaption className="absolute bottom-0 p-5 text-white">
                  <p className="font-serif text-2xl">Litter</p>
                </figcaption>
              </figure>
            </Reveal>
            <Reveal delay={140}>
              <figure className="photo-print group relative min-h-[12rem] -rotate-2 overflow-hidden rounded-lg">
                <Pic name="roadside-litter" widths={[400, 480]} width={480} height={639} alt="Litter scattered along a roadside verge" className="absolute inset-0 size-full object-cover transition duration-700 group-hover:scale-105" sizes="(min-width:768px) 33vw, 100vw" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/5 to-transparent" />
                <figcaption className="absolute bottom-0 p-5 text-white">
                  <p className="font-serif text-2xl">Roadside litter</p>
                </figcaption>
              </figure>
            </Reveal>
          </div>
          <ul className="panel-tint mt-10 grid grid-cols-1 gap-x-8 gap-y-2 rounded-3xl p-6 sm:grid-cols-2 sm:p-8 lg:grid-cols-4">
            {OTHER_TYPES.map(([title, text], i) => (
              <CornerHover as="li" key={title}>
                <Reveal delay={i * 50} className="border-t border-line p-4">
                  <p className="font-semibold">{title}</p>
                  <p className="mt-1 text-sm leading-relaxed text-soft">{text}</p>
                </Reveal>
              </CornerHover>
            ))}
          </ul>
        </div>
      </section>

      {/* ---- why it matters: one chart from DEFRA's official statistics ---- */}
      <section className="grid-texture grid-shimmer">
        <div className="mx-auto max-w-7xl px-5 py-10 sm:px-8 sm:py-12">
          <Reveal className="panel-tint grid gap-10 rounded-3xl p-6 sm:p-10 lg:grid-cols-[.85fr_1.15fr] lg:items-center">
            <div>
              <p className="eyebrow">Why it matters</p>
              <h2 className="mt-4 text-4xl leading-[1.1] sm:text-5xl">Fly-tipping keeps rising.</h2>
              <p className="mt-5 text-lg leading-relaxed text-soft">
                Councils in England dealt with <strong className="font-semibold text-ink">1.26 million</strong> fly-tipping incidents in 2024/25, up 9% in a year and nearly a third more than in 2018/19.
              </p>
              <p className="mt-3 leading-relaxed text-soft">
                Over a third (37%) were on pavements and roads, and 62% involved household waste: the kind of problem anyone walking past can report.
              </p>
              <Link to="/why" className="link-nudge mt-6 inline-flex font-semibold text-accent">
                More on why it matters <Icon name="arrow" className="size-4" />
              </Link>
            </div>
            <FlyTippingChart />
          </Reveal>
        </div>
      </section>

      {/* ---- the journey ---- */}
      <section className="grid-texture grid-shimmer border-y border-line">
        <div className="mx-auto max-w-7xl px-5 py-10 sm:px-8 sm:py-12">
          <Reveal className="panel-tint max-w-2xl rounded-3xl p-6 sm:p-8">
            <p className="eyebrow">What happens to a report</p>
            <h2 className="mt-4 text-4xl leading-[1.1] sm:text-5xl">From reported to fixed, one step at a time.</h2>
          </Reveal>
          {/* Padding lives on this wrapper, not the <ol> itself — .timeline-rail's connecting
              line is positioned relative to the ol's own box, so padding it directly would pull
              the line out of line with the dots. */}
          <div className="panel-tint mt-8 overflow-hidden rounded-3xl p-6 sm:p-8">
            <ol className="timeline-rail grid gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-6">
              {STAGES.map(([title, text], n) => (
                <CornerHover as="li" key={title}>
                  <Reveal delay={n * 50} className="block p-4 pt-0">
                    <span className="timeline-dot">{n + 1}</span>
                    <h3 className="mt-4 text-base font-semibold leading-snug">{title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-soft">{text}</p>
                  </Reveal>
                </CornerHover>
              ))}
            </ol>
          </div>
          <Reveal className="accent-panel mt-8 max-w-3xl rounded-3xl p-7 sm:p-8">
            <p className="text-lg leading-relaxed">
              <b className="font-semibold">Cleared and verified mean different things.</b> Cleared is the responsible body saying the work is done. Verified is someone else confirming it. The site shows both, so you can see the difference.
            </p>
          </Reveal>
        </div>
      </section>

      {/* ---- find out more ---- */}
      <section className="grid-texture grid-shimmer">
        <div className="mx-auto max-w-7xl px-5 py-10 sm:px-8 sm:py-12">
          <Reveal className="panel-tint rounded-3xl p-8 sm:p-10">
            <h2 className="text-3xl leading-[1.1] sm:text-4xl">Find out more</h2>
            <ul className="mt-8 grid gap-6 md:grid-cols-3 md:gap-0 md:divide-x md:divide-line">
              {MORE.map(([to, title, text]) => (
                <li key={to} className="md:px-8 md:first:pl-0 md:last:pr-0">
                  <Link to={to} className="group block">
                    <span className="flex items-center gap-2 font-serif text-2xl">
                      {title}
                      <Icon name="arrow" className="size-5 transition-transform group-hover:translate-x-1" />
                    </span>
                    <span className="mt-2 block leading-relaxed text-soft">{text}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </section>

      {/* ---- closing call to action ---- */}
      <section className="grid-texture grid-shimmer px-3 pt-6 pb-16 sm:px-6">
        <div className="relative isolate mx-auto max-w-7xl overflow-hidden rounded-2xl">
          <div className="cta-bg absolute inset-0 -z-20" role="img" aria-label="Countryside landscape, toned green" />
          <div className="cta-tone absolute inset-0 -z-20" aria-hidden="true" />
          <div className="absolute inset-0 -z-10 bg-gradient-to-r from-bg/90 via-bg/45 to-transparent" />
          <div className="px-7 py-16 sm:px-14 sm:py-20">
            <Reveal as="h2" className="max-w-xl text-4xl leading-[1.08] sm:text-6xl">Seen something that needs fixing?</Reveal>
            <Reveal as="p" delay={80} className="mt-4 max-w-md text-lg text-soft">Reporting takes about a minute.</Reveal>
            <Reveal delay={160} className="mt-8 flex flex-wrap gap-3">
              <Link to="/report" className="btn btn-primary text-base">
                Report a problem <Icon name="arrow" />
              </Link>
              <button type="button" className="btn btn-ghost text-base" onClick={openInstallDialog}>
                Install the app
              </button>
            </Reveal>
          </div>
        </div>
      </section>
      </div>
    </main>
  )
}
