import { useState } from 'react'

// Fly-tipping incidents dealt with by local authorities in England, per year. Exact figures from
// DEFRA's official release (Figure 1 dataset, "Fly-tipping statistics for England, 2024 to 2025",
// updated 25 February 2026). DEFRA applied its newer counting method to 2018/19, so all seven years
// compare like for like; earlier years used an older method and are left out on purpose.
export const FLY_TIPPING: Array<[string, number]> = [
  ['2018/19', 957157],
  ['2019/20', 979728],
  ['2020/21', 1138347],
  ['2021/22', 1091019],
  ['2022/23', 1084044],
  ['2023/24', 1152632],
  ['2024/25', 1257863],
]
export const DEFRA_URL = 'https://www.gov.uk/government/statistics/fly-tipping-statistics-for-england/fly-tipping-statistics-for-england-2024-to-2025'

const MAX = 1_400_000
const TICKS = [0, 400_000, 800_000, 1_200_000]
const nf = new Intl.NumberFormat('en-GB')
const short = (n: number) => (n === 0 ? '0' : n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}m` : `${n / 1000}k`)

// One series over time, so annual bars from a zero baseline in a single colour: no legend (the title
// names it), one direct label on the latest year, a tooltip on every bar, and a table view.
export function FlyTippingChart() {
  const [active, setActive] = useState<number | null>(null)
  const last = FLY_TIPPING.length - 1

  return (
    <figure className="m-0">
      <figcaption className="text-sm font-semibold">Fly-tipping incidents dealt with by councils in England, per year</figcaption>
      <div className="relative mt-5 h-64 pl-10 sm:h-72" role="img" aria-label={`Bar chart: fly-tipping incidents in England rose from ${nf.format(FLY_TIPPING[0][1])} in 2018/19 to ${nf.format(FLY_TIPPING[last][1])} in 2024/25.`}>
        {/* Recessive grid and y-axis labels */}
        {TICKS.map((t) => (
          <div key={t} className="pointer-events-none absolute inset-x-0 left-10 border-t border-[var(--c-chart-grid)]" style={{ bottom: `${(t / MAX) * 100}%` }} aria-hidden="true">
            <span className="absolute -left-10 -translate-y-1/2 text-xs tabular-nums text-soft">{short(t)}</span>
          </div>
        ))}
        <div className="absolute inset-0 left-10 flex items-end gap-2 sm:gap-3" onMouseLeave={() => setActive(null)}>
          {FLY_TIPPING.map(([year, n], i) => {
            const prev = i > 0 ? FLY_TIPPING[i - 1][1] : null
            const change = prev ? Math.round(((n - prev) / prev) * 100) : null
            return (
              <button
                key={year}
                type="button"
                data-no-tag
                className="chart-col group relative flex h-full flex-1 items-end"
                onMouseEnter={() => setActive(i)}
                onFocus={() => setActive(i)}
                onBlur={() => setActive(null)}
                aria-label={`${year}: ${nf.format(n)} incidents${change !== null ? `, ${change >= 0 ? 'up' : 'down'} ${Math.abs(change)}% on the year before` : ''}`}
              >
                <span
                  className={`chart-bar block w-full rounded-t ${active !== null && active !== i ? 'opacity-45' : ''}`}
                  style={{ height: `${(n / MAX) * 100}%` }}
                />
                {i === last && active === null && (
                  <span className="absolute inset-x-0 text-center text-xs font-semibold tabular-nums" style={{ bottom: `calc(${(n / MAX) * 100}% + 0.35rem)` }}>
                    {(n / 1_000_000).toFixed(2)}m
                  </span>
                )}
                {active === i && (
                  <span className="chart-tip absolute left-1/2 z-10 w-max -translate-x-1/2 rounded-lg px-3 py-2 text-left text-xs shadow-lg" style={{ bottom: `calc(${(n / MAX) * 100}% + 0.5rem)` }}>
                    <span className="block font-semibold">{year}</span>
                    <span className="block tabular-nums">{nf.format(n)} incidents</span>
                    {change !== null && <span className="block text-soft">{change >= 0 ? '+' : ''}{change}% on {FLY_TIPPING[i - 1][0]}</span>}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>
      <div className="ml-10 mt-2 flex gap-2 sm:gap-3" aria-hidden="true">
        {FLY_TIPPING.map(([year]) => (
          <span key={year} className="flex-1 text-center text-[0.7rem] tabular-nums text-soft sm:text-xs">
            {year.replace('20', "'").replace('/', '/')}
          </span>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 text-xs text-soft">
        <a href={DEFRA_URL} target="_blank" rel="noreferrer" className="underline underline-offset-2 hover:text-ink">
          Source: DEFRA, Fly-tipping statistics for England, 2024 to 2025
        </a>
        <details className="chart-table">
          <summary className="cursor-pointer font-semibold hover:text-ink">Show as a table</summary>
          <table className="mt-2 w-full text-left tabular-nums">
            <thead>
              <tr>
                <th className="pr-6 font-semibold">Year</th>
                <th className="text-right font-semibold">Incidents</th>
              </tr>
            </thead>
            <tbody>
              {FLY_TIPPING.map(([year, n]) => (
                <tr key={year}>
                  <td className="pr-6">{year}</td>
                  <td className="text-right">{nf.format(n)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      </div>
    </figure>
  )
}
