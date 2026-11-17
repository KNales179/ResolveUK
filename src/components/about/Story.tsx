import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Icon, type IconName } from '../ui/Icon'
import { LEAF_LEFT_PATH, LEAF_RIGHT_PATH, PIN_PATH, R_PATH } from '../site/logoPaths'

// Purpose, mission and vision on the About page, each with a picture made from the pieces the site
// itself uses (report cards, status labels, map pins), so the picture is the product, not stock art.
// The layout follows the Fico landing page's story sections.

export function StorySection({ id, label, title, art, flip = false, children }: { id?: string; label: string; title: string; art: ReactNode; flip?: boolean; children: ReactNode }) {
  return (
    <section id={id} className="grid scroll-mt-28 items-center gap-10 py-8 lg:grid-cols-2 lg:gap-16 lg:py-10">
      <div className={`story-glass ${flip ? 'lg:order-2' : ''}`}>
        <p className="eyebrow">{label}</p>
        <h2 className="mt-3 text-3xl sm:text-4xl">{title}</h2>
        <div className="mt-5 space-y-4 leading-relaxed text-soft">{children}</div>
      </div>
      <div className={flip ? 'lg:order-1' : undefined}>{art}</div>
    </section>
  )
}

// A chat bubble that, when pointed at, plays back as if someone were typing it: three dots, then
// the message letter by letter. The full text stays underneath, invisible, so the size never jumps.
function TypingBubble({ text, className = '' }: { text: string; className?: string }) {
  const [shown, setShown] = useState<number | null>(null)
  const [dots, setDots] = useState(false)
  const timers = useRef<number[]>([])
  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), [])

  const play = () => {
    if (timers.current.length || matchMedia('(prefers-reduced-motion: reduce)').matches) return
    setDots(true)
    setShown(0)
    timers.current.push(
      window.setTimeout(() => {
        setDots(false)
        for (let i = 1; i <= text.length; i++) {
          timers.current.push(
            window.setTimeout(() => {
              setShown(i)
              if (i === text.length)
                timers.current.push(
                  window.setTimeout(() => {
                    setShown(null)
                    timers.current = []
                  }, 700),
                )
            }, i * 34),
          )
        }
      }, 600),
    )
  }

  const typing = shown !== null
  return (
    <div onMouseEnter={play} className={`bubble relative max-w-[17rem] cursor-default rounded-2xl px-4 py-2.5 text-sm ${className}`}>
      <span className={typing ? 'invisible' : undefined}>{text}</span>
      {typing && (
        <span className="absolute inset-0 px-4 py-2.5" aria-hidden="true">
          {dots ? (
            <span className="typing-dots inline-flex h-full items-center gap-1">
              <span />
              <span />
              <span />
            </span>
          ) : (
            <>
              {text.slice(0, shown ?? 0)}
              <span className="typing-caret" />
            </>
          )}
        </span>
      )}
    </div>
  )
}

const STEPS: Array<[string, string, 'done' | 'now' | 'next']> = [
  ['Reported', '3 Mar', 'done'],
  ['Acknowledged', '4 Mar', 'done'],
  ['Cleared', '10 Mar', 'now'],
  ['Verified', 'Next', 'next'],
]

/** Purpose: the questions people are left asking, answered by one public record. */
export function PurposeArt() {
  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-3 py-2">
      <TypingBubble className="-rotate-2 self-start" text="Has anyone reported the rubbish in the lay-by?" />
      <TypingBubble className="rotate-1 self-end" text="I reported that pothole in March. Did anything happen?" />
      <TypingBubble className="-rotate-1 ml-6 self-start" text="Is it actually fixed, or just marked as done?" />
      <div className="card hover-lift mt-2 rounded-2xl p-5">
        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-accent">
          <Icon name="eye" className="size-3.5" /> One public record
        </p>
        <div className="mt-3 flex items-center gap-3">
          <img src="/img/roadside-litter-400.webp" alt="" className="size-12 shrink-0 rounded-lg object-cover" />
          <div className="min-w-0">
            <p className="truncate font-semibold">Fly-tipping in the lay-by on the A595</p>
            <p className="text-xs text-soft">Sample report · 4 people back this</p>
          </div>
        </div>
        <ol className="mt-4 grid grid-cols-4 gap-1.5 text-center">
          {STEPS.map(([label, when, state]) => (
            <li key={label} className="min-w-0">
              <span className={`mx-auto block h-1.5 rounded-full ${state === 'next' ? 'bg-line' : 'bg-accent-vivid'} ${state === 'now' ? 'animate-pulse' : ''}`} />
              <p className={`mt-1.5 truncate text-xs font-semibold ${state === 'next' ? 'text-soft' : ''}`}>{label}</p>
              <p className="text-xs text-soft">{when}</p>
            </li>
          ))}
        </ol>
      </div>
    </div>
  )
}

const PROMISES: Array<{ icon: IconName; title: string; text: string; demo: ReactNode }> = [
  {
    icon: 'camera',
    title: 'Simple',
    text: "Reporting a problem takes about a minute: a photo, a pin on the map, a line about what you saw, and it's sent. No account needed.",
    demo: (
      <div className="flex w-full items-center gap-2 rounded-lg border border-line bg-[var(--c-field)] px-2.5 py-2 text-xs">
        <img src="/img/litter-bottles-400.webp" alt="" className="size-7 rounded object-cover" />
        <span className="truncate text-soft">Litter · pinned on the map</span>
        <span className="ml-auto rounded-md bg-accent-vivid px-2 py-0.5 font-semibold text-accent-ink">Send</span>
      </div>
    ),
  },
  {
    icon: 'eye',
    title: 'Open',
    text: "Every step, from reported to acknowledged, scheduled, cleared and verified, is saved with the time it happened and can't be edited afterwards. Anyone can see it.",
    demo: (
      <div className="flex flex-wrap gap-1.5">
        <span className="pill pill-reported">Reported</span>
        <span className="pill pill-progress">Acknowledged</span>
        <span className="pill pill-cleared">Cleared</span>
      </div>
    ),
  },
  {
    icon: 'shield',
    title: 'Honest',
    text: "A council saying a job is done is one thing; someone independent confirming it is another. The site keeps them separate, and labels what isn't built yet.",
    demo: (
      <p className="flex flex-col gap-1 text-xs text-soft">
        <span className="inline-flex items-center gap-1.5">
          <Icon name="check" className="size-3.5" /> Cleared by the council
        </span>
        <span className="inline-flex items-center gap-1.5 font-semibold text-ink">
          <Icon name="check" className="size-3.5 text-accent" /> Checked by someone else
        </span>
      </p>
    ),
  },
]

/** Mission: one panel, three promises side by side, each with the piece of the site that keeps it. */
export function Mission() {
  return (
    <section id="mission" className="panel-tint scroll-mt-28 rounded-3xl p-8 sm:p-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Our mission</p>
          <h2 className="mt-3 text-3xl sm:text-4xl">Simple, open, honest</h2>
        </div>
        <p className="max-w-sm text-soft">Three promises every report on the site is held to.</p>
      </div>
      <ol className="mt-10 grid gap-10 md:grid-cols-3 md:gap-0 md:divide-x md:divide-line">
        {PROMISES.map((p) => (
          <li key={p.title} className="md:px-8 md:first:pl-0 md:last:pr-0">
            <span className="tile-icon size-11 rounded-xl">
              <Icon name={p.icon} className="size-5" />
            </span>
            <h3 className="mt-5 font-serif text-2xl">{p.title}</h3>
            <p className="mt-2 leading-relaxed text-soft">{p.text}</p>
            <div className="mt-5 flex min-h-12 items-center">{p.demo}</div>
          </li>
        ))}
      </ol>
    </section>
  )
}

// Sample pins along a stretch of streets: where they sit (percent), and how far each one got.
const PINS: Array<[number, number, 'verified' | 'cleared' | 'progress']> = [
  [6, 38, 'verified'], [15, 72, 'cleared'], [24, 30, 'verified'], [33, 64, 'verified'], [42, 24, 'progress'],
  [51, 70, 'verified'], [60, 40, 'verified'], [69, 78, 'cleared'], [78, 30, 'verified'], [88, 62, 'verified'], [95, 28, 'progress'],
]

/** Vision: a wide band of street map across the top of the panel, the statement underneath. */
export function Vision() {
  return (
    <section id="vision" className="panel-tint scroll-mt-28 overflow-hidden rounded-3xl">
      <div className="vision-map relative h-44 border-b border-line sm:h-56" aria-hidden="true">
        <svg viewBox="0 0 400 100" preserveAspectRatio="none" className="absolute inset-0 size-full">
          <path d="M0 48 C80 40 140 60 220 50 S340 40 400 52" className="vision-road" strokeWidth="6" fill="none" />
          <path d="M70 0 C64 40 84 70 76 100" className="vision-road" strokeWidth="4" fill="none" />
          <path d="M180 0 C190 30 170 70 186 100" className="vision-road" strokeWidth="3" fill="none" />
          <path d="M300 0 C292 40 312 64 304 100" className="vision-road" strokeWidth="4" fill="none" />
          <path d="M0 84 C120 78 260 92 400 82" className="vision-road" strokeWidth="3" fill="none" />
        </svg>
        {PINS.map(([x, y, state], i) => (
          <span key={i} className={`vision-pin vision-pin-${state} absolute -translate-x-1/2 -translate-y-full`} style={{ left: `${x}%`, top: `${y}%` }}>
            <Icon name="pin" className="size-7" />
          </span>
        ))}
        <span className="absolute right-4 top-3 rounded-full bg-[var(--c-field)] px-2.5 py-1 text-xs font-semibold text-soft">Sample</span>
      </div>
      <div className="grid gap-6 p-8 sm:p-12 lg:grid-cols-[.9fr_1.1fr] lg:gap-12">
        <div>
          <p className="eyebrow">Our vision</p>
          <h2 className="mt-3 text-3xl sm:text-5xl">Better places, together</h2>
          <div className="mt-6 flex flex-wrap gap-x-4 gap-y-1 text-xs text-soft">
            <span className="inline-flex items-center gap-1.5"><span className="vision-dot vision-pin-verified" /> Verified fixed</span>
            <span className="inline-flex items-center gap-1.5"><span className="vision-dot vision-pin-cleared" /> Cleared</span>
            <span className="inline-flex items-center gap-1.5"><span className="vision-dot vision-pin-progress" /> Being handled</span>
          </div>
        </div>
        <div className="space-y-4 leading-relaxed text-soft">
          <p>
            We picture neighbourhoods where a reported problem reliably ends up fixed, and anyone can see that it did: the fly-tipping cleared, the pothole filled, the graffiti gone, each with its own trail from the first photo to the last check.
          </p>
          <p>Not through more forms or more complaints, but through a shared record that residents, councils and local groups can all trust. Stronger communities, cleaner spaces.</p>
        </div>
      </div>
    </section>
  )
}

// ---- The meaning behind the logo, from the brand kit. Pointing at a row lights up that part. ----
type Part = 'r' | 'pin' | 'path' | 'leaf'
const PARTS: Array<[Part, string, string]> = [
  ['r', 'The R', 'Resolve, the whole mark: the point of it all is that problems get resolved, not just reported.'],
  ['pin', 'The pin', 'Real places. Every report is tied to a spot on the map, not a vague description.'],
  ['path', 'The path', 'Progress. The white sweep is a road: a report moves along it step by step, from reported to verified, in the open.'],
  ['leaf', 'The leaf', 'Cleaner, greener communities: what all those fixed problems add up to.'],
]

export function LogoMeaning() {
  const [active, setActive] = useState<Part | null>(null)
  // "The R" is the whole mark, so it lights up everything; the others light up their own shape.
  const part = (p: Part) => ({ opacity: active && active !== 'r' && active !== p ? 0.18 : 1, transition: 'opacity .3s' })
  return (
    <div className="grid items-center gap-10 lg:grid-cols-[.8fr_1.2fr]">
      <div className="mx-auto w-full max-w-[16rem]">
        <svg viewBox="-10 -10 218 243" className="w-full overflow-visible" role="img" aria-label="The Resolve logo: an R, a location pin, a path and a leaf">
          <path d={R_PATH} fill="var(--c-logo-mark)" style={part('path')} />
          <path d={PIN_PATH} fill="var(--c-logo-mark)" fillRule="evenodd" style={part('pin')} />
          <path d={LEAF_RIGHT_PATH} fill="var(--c-accent)" style={part('leaf')} />
          <path d={LEAF_LEFT_PATH} fill="var(--c-accent-display)" style={part('leaf')} />
        </svg>
      </div>
      <ul className="grid gap-3 sm:grid-cols-2" onMouseLeave={() => setActive(null)}>
        {PARTS.map(([part, title, text]) => (
          <li key={part}>
            <button
              type="button"
              onMouseEnter={() => setActive(part)}
              onFocus={() => setActive(part)}
              onBlur={() => setActive(null)}
              data-tag={title}
              className={`card h-full w-full rounded-2xl p-5 text-left transition-colors ${active === part ? 'meaning-on' : ''}`}
            >
              <p className="font-semibold">{title}</p>
              <p className="mt-1 text-sm leading-relaxed text-soft">{text}</p>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
