import { useEffect, useRef, useState, type ReactNode } from 'react'
import { DEFRA_URL, FLY_TIPPING } from '../home/FlyTippingChart'

// Four charts for the Why it matters page, each a different kind (trend, ranking, part of a whole,
// distribution), all from one official source: DEFRA's "Fly-tipping statistics for England, 2024 to
// 2025" release and its downloadable dataset (Figures 1, 2, 3 and 6, and Table 2). Every number
// below is copied from that dataset, not estimated. Colours are the --series-* tokens in index.css,
// checked with the dataviz palette validator for both themes.

const nf = new Intl.NumberFormat('en-GB')
const SOURCE = 'DEFRA, Fly-tipping statistics for England, 2024 to 2025'

function Frame({ title, note, children, table }: { title: string; note?: string; children: ReactNode; table: ReactNode }) {
  return (
    <figure className="card m-0 flex h-full flex-col rounded-3xl p-6 sm:p-7">
      <figcaption>
        <p className="font-serif text-2xl leading-snug">{title}</p>
        {note && <p className="mt-1.5 text-sm leading-relaxed text-soft">{note}</p>}
      </figcaption>
      <div className="mt-6 flex-1">{children}</div>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 text-xs text-soft">
        <a href={DEFRA_URL} target="_blank" rel="noreferrer" className="underline underline-offset-2 hover:text-ink">
          Source: {SOURCE}
        </a>
        <details className="chart-table">
          <summary className="cursor-pointer font-semibold hover:text-ink">Show as a table</summary>
          <div className="mt-2">{table}</div>
        </details>
      </div>
    </figure>
  )
}

function Table({ head, rows }: { head: string[]; rows: Array<Array<string | number>> }) {
  return (
    <table className="w-full text-left tabular-nums">
      <thead>
        <tr>
          {head.map((h, i) => (
            <th key={h} className={`pb-1 font-semibold ${i ? 'pl-4 text-right' : ''}`}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={String(r[0])}>
            {r.map((c, i) => (
              <td key={i} className={i ? 'pl-4 text-right' : ''}>{typeof c === 'number' ? nf.format(c) : c}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

// ---------- 1. Trend: incidents vs prosecutions, both indexed to 2018/19 = 100 ----------
// Two measures on very different scales (about a million incidents, about two thousand
// prosecutions) share one axis by indexing each to its own 2018/19 value, never a second y-axis.
const PROSECUTIONS: Array<[string, number]> = [
  ['2018/19', 2005], ['2019/20', 1930], ['2020/21', 721], ['2021/22', 1960], ['2022/23', 1681], ['2023/24', 1598], ['2024/25', 1377],
]
const SERIES = [
  { name: 'Fly-tipping incidents', data: FLY_TIPPING, cls: 'series-1' },
  { name: 'Prosecutions', data: PROSECUTIONS, cls: 'series-2' },
]
const Y0 = 25
const Y1 = 150
const PADL = 34
const PADR = 40
const PADT = 12
const PADB = 26
const idx = (data: Array<[string, number]>, i: number) => (data[i][1] / data[0][1]) * 100

export function TrendChart() {
  const [at, setAt] = useState<number | null>(null)
  // Drawn at the box's real width (1 unit = 1 pixel), so labels stay the same size on a phone as on
  // a desktop instead of shrinking with the whole drawing.
  const box = useRef<HTMLDivElement>(null)
  const [W, setW] = useState(560)
  useEffect(() => {
    const el = box.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setW(Math.max(280, Math.round(e.contentRect.width))))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  const H = W < 420 ? 220 : 260
  const x = (i: number) => PADL + (i * (W - PADL - PADR)) / 6
  const y = (v: number) => PADT + ((Y1 - v) * (H - PADT - PADB)) / (Y1 - Y0)
  return (
    <Frame
      title="More fly-tipping, fewer prosecutions"
      note="Both measures set to 100 in 2018/19, so they can share one scale. Incidents ended 31% higher; prosecutions 31% lower. The 2020/21 dip in prosecutions came in the first year of the pandemic."
      table={<Table head={['Year', 'Incidents', 'Prosecutions']} rows={FLY_TIPPING.map(([yr, n], i) => [yr, n, PROSECUTIONS[i][1]])} />}
    >
      <div className="mb-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-soft">
        {SERIES.map((s) => (
          <span key={s.name} className="inline-flex items-center gap-1.5">
            <span className={`h-0.5 w-4 rounded-full ${s.cls}-bg`} /> {s.name}
          </span>
        ))}
      </div>
      <div ref={box} className="relative" onMouseLeave={() => setAt(null)}>
        <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} className="w-full overflow-visible" role="img" aria-label="Line chart: indexed to 2018/19 = 100, fly-tipping incidents rose to 131 by 2024/25 while prosecutions fell to 69.">
          {[25, 50, 75, 100, 125, 150].map((t) => (
            <g key={t}>
              <line x1={PADL} x2={W - PADR} y1={y(t)} y2={y(t)} className={t === 100 ? 'chart-axis-strong' : 'chart-gridline'} />
              <text x={PADL - 8} y={y(t) + 4} textAnchor="end" className="chart-tick">{t}</text>
            </g>
          ))}
          {FLY_TIPPING.map(([yr], i) => (
            <text key={yr} x={x(i)} y={H - 6} textAnchor="middle" className="chart-tick">{W < 420 && i % 2 ? '' : yr.replace('20', "'")}</text>
          ))}
          {at !== null && <line x1={x(at)} x2={x(at)} y1={PADT} y2={H - PADB} className="chart-crosshair" />}
          {SERIES.map((s) => (
            <g key={s.name} className={s.cls}>
              <polyline fill="none" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" className="series-stroke" points={s.data.map((_, i) => `${x(i)},${y(idx(s.data, i))}`).join(' ')} />
              {s.data.map((_, i) => (
                <circle key={i} cx={x(i)} cy={y(idx(s.data, i))} r={at === i ? 5.5 : 4} className="series-dot" />
              ))}
              <text x={x(6) + 10} y={y(idx(s.data, 6)) + 4} className="chart-endlabel">{Math.round(idx(s.data, 6))}</text>
            </g>
          ))}
        </svg>
        {/* Hover columns, wider than the dots, for the crosshair tooltip */}
        <div className="absolute inset-y-0 flex" style={{ left: `${((PADL - (W - PADL - PADR) / 12) / W) * 100}%`, right: `${((PADR - (W - PADL - PADR) / 12) / W) * 100}%` }}>
          {FLY_TIPPING.map(([yr], i) => (
            <button key={yr} type="button" data-no-tag className="chart-col relative flex-1" onMouseEnter={() => setAt(i)} onFocus={() => setAt(i)} onBlur={() => setAt(null)} aria-label={`${yr}: ${nf.format(FLY_TIPPING[i][1])} incidents, ${nf.format(PROSECUTIONS[i][1])} prosecutions`}>
              {at === i && (
                <span className={`chart-tip absolute top-0 z-10 w-max rounded-lg px-3 py-2 text-left text-xs shadow-lg ${i > 3 ? 'right-1/2' : 'left-1/2'}`}>
                  <span className="block font-semibold">{yr}</span>
                  <span className="block tabular-nums">{nf.format(FLY_TIPPING[i][1])} incidents</span>
                  <span className="block tabular-nums">{nf.format(PROSECUTIONS[i][1])} prosecutions</span>
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
    </Frame>
  )
}

// ---------- 2. Ranking: incidents per 1,000 people by region, 2024/25 ----------
const REGIONS: Array<[string, number]> = (
  [
    ['London', 52.9], ['North East', 23.6], ['East Midlands', 19.8], ['North West', 18.8], ['Yorkshire and The Humber', 17.7],
    ['West Midlands', 16.2], ['East', 15.3], ['South East', 11.3], ['South West', 9.4],
  ] as Array<[string, number]>
).sort((a, b) => b[1] - a[1])
const ENGLAND = 21.4
const RMAX = 60

export function RegionChart() {
  return (
    <Frame
      title="London sees more than five times the rate of the South West"
      note="Fly-tipping incidents per 1,000 people, 2024/25. The dashed line is the England average, 21.4."
      table={<Table head={['Region', 'Per 1,000 people']} rows={[...REGIONS.map(([r, v]) => [r, v.toFixed(1)]), ['England', ENGLAND.toFixed(1)]]} />}
    >
      {/* On a phone each region gets the full width for its bar, with its name and rate above it;
          from tablet size the name, bar and rate sit side by side. The dashed mark on every bar is
          the England average. */}
      <ul className="space-y-3 sm:space-y-1.5">
        {REGIONS.map(([region, v]) => (
          <li key={region} className="grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1.5 text-sm sm:grid-cols-[9.5rem_1fr_2.75rem] sm:gap-0">
            <span className="truncate text-soft sm:pr-3" title={region}>{region === 'Yorkshire and The Humber' ? 'Yorkshire & Humber' : region}</span>
            <span className="text-right font-semibold tabular-nums sm:order-3 sm:pl-2 sm:text-xs">{v.toFixed(1)}</span>
            <span className="relative col-span-2 h-4 rounded-full bg-[color-mix(in_oklab,var(--c-ink)_7%,transparent)] sm:order-2 sm:col-span-1 sm:h-5 sm:rounded-none sm:bg-transparent">
              <span className="series-1-bg block h-full rounded-full sm:rounded-l-none sm:rounded-r" style={{ width: `${(v / RMAX) * 100}%` }} />
              <span className="pointer-events-none absolute -inset-y-1 border-l-2 border-dashed border-[var(--c-ink)] opacity-40" style={{ left: `${(ENGLAND / RMAX) * 100}%` }} aria-hidden="true" />
            </span>
          </li>
        ))}
      </ul>
    </Frame>
  )
}

// ---------- 3. Part of a whole: where fly-tipping happens, 2024/25 ----------
// The four biggest land types as they are, and everything else (other unidentified, private
// residential, commercial/industrial and the "other" group) summed into one, so five parts add up
// to the year's 1,257,863 total exactly.
const PLACES: Array<[string, number, string]> = [
  ['Pavements and roads', 463384, 'series-1'],
  ['Footpaths and bridleways', 253773, 'series-2'],
  ['Council land', 222681, 'series-3'],
  ['Back alleyways', 108893, 'series-4'],
  ['Everywhere else', 180620 + 14771 + 3956 + 9785, 'series-5'],
]
const PTOTAL = PLACES.reduce((s, [, n]) => s + n, 0)
const pct = (n: number) => `${Math.round((n / PTOTAL) * 100)}%`

export function PlacesChart() {
  const [on, setOn] = useState<number | null>(null)
  return (
    <Frame
      title="Most of it is out in the open"
      note={`Where the ${nf.format(PTOTAL)} incidents in 2024/25 happened. Over half were on pavements, roads, footpaths and bridleways: places anyone walking past can see.`}
      table={<Table head={['Place', 'Incidents', 'Share']} rows={PLACES.map(([p, n]) => [p, n, pct(n)])} />}
    >
      <div className="flex h-10 gap-[2px] overflow-hidden rounded-md" onMouseLeave={() => setOn(null)}>
        {PLACES.map(([place, n, cls], i) => (
          <button
            key={place}
            type="button"
            data-no-tag
            className={`chart-col ${cls}-bg h-full transition-opacity ${on !== null && on !== i ? 'opacity-40' : ''}`}
            style={{ width: `${(n / PTOTAL) * 100}%` }}
            onMouseEnter={() => setOn(i)}
            onFocus={() => setOn(i)}
            onBlur={() => setOn(null)}
            aria-label={`${place}: ${nf.format(n)} incidents, ${pct(n)}`}
          />
        ))}
      </div>
      <ul className="mt-5 grid gap-x-6 gap-y-2.5 text-sm sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
        {PLACES.map(([place, n, cls], i) => (
          <li key={place} className={`flex items-center gap-2.5 transition-opacity ${on !== null && on !== i ? 'opacity-50' : ''}`} onMouseEnter={() => setOn(i)} onMouseLeave={() => setOn(null)}>
            <span className={`size-3 shrink-0 rounded-sm ${cls}-bg`} />
            <span className="min-w-0 flex-1">{place}</span>
            <span className="font-semibold tabular-nums">{pct(n)}</span>
            <span className="w-16 text-right text-xs tabular-nums text-soft">{nf.format(n)}</span>
          </li>
        ))}
      </ul>
    </Frame>
  )
}

// ---------- 4. Distribution: how big each fly-tip was, 2024/25 ----------
// Ordered from smallest to largest, the way the sizes actually run, not by count.
const SIZES: Array<[string, string, number]> = [
  ['Single bag', 'Single black bag', 102418],
  ['Single item', 'Single item', 201182],
  ['Car boot', 'Car boot load or less', 326577],
  ['Small van', 'Small van load', 380830],
  ['Transit van', 'Transit van load', 159174],
  ['Tipper lorry', 'Tipper lorry load', 32822],
  ['Bigger', 'Significant or multiple loads', 18970],
]
const SMAX = 400000

export function SizeChart() {
  const [at, setAt] = useState<number | null>(null)
  return (
    <Frame
      title="Mostly a car boot to a van load"
      note="How big each fly-tip was, 2024/25, smallest to largest, for incidents where a size was recorded. Small van loads were the most common; 51,792 were a tipper lorry load or more."
      table={<Table head={['Size', 'Incidents']} rows={SIZES.map(([, full, n]) => [full, n])} />}
    >
      <div className="relative h-56 pl-10" onMouseLeave={() => setAt(null)}>
        {[0, 100000, 200000, 300000, 400000].map((t) => (
          <div key={t} className="pointer-events-none absolute inset-x-0 left-10 border-t border-[var(--c-chart-grid)]" style={{ bottom: `${(t / SMAX) * 100}%` }} aria-hidden="true">
            <span className="absolute -left-10 -translate-y-1/2 text-xs tabular-nums text-soft">{t ? `${t / 1000}k` : '0'}</span>
          </div>
        ))}
        <div className="absolute inset-0 left-10 flex items-end gap-2">
          {SIZES.map(([label, full, n], i) => (
            <button key={label} type="button" data-no-tag className="chart-col relative flex h-full flex-1 items-end" onMouseEnter={() => setAt(i)} onFocus={() => setAt(i)} onBlur={() => setAt(null)} aria-label={`${full}: ${nf.format(n)} incidents`}>
              <span className={`series-2-bg block w-full rounded-t transition-opacity ${at !== null && at !== i ? 'opacity-45' : ''}`} style={{ height: `${(n / SMAX) * 100}%` }} />
              {at === i && (
                <span className={`chart-tip absolute z-10 w-max rounded-lg px-3 py-2 text-left text-xs shadow-lg ${i > 3 ? 'right-0' : 'left-0'}`} style={{ bottom: `calc(${(n / SMAX) * 100}% + 0.5rem)` }}>
                  <span className="block font-semibold">{full}</span>
                  <span className="block tabular-nums">{nf.format(n)} incidents</span>
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
      <div className="ml-10 mt-2 flex gap-2" aria-hidden="true">
        {SIZES.map(([label]) => (
          <span key={label} className="min-w-0 flex-1 text-center text-[0.68rem] leading-tight text-soft [overflow-wrap:anywhere]">{label}</span>
        ))}
      </div>
    </Frame>
  )
}
