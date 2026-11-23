import { Icon } from '../../components/ui/Icon'
import { useAppSession } from '../session'
import { useTour } from '../tour/Tour'
import { toursFor } from '../tour/steps'

// "How Resolve works": one guided tour per part of the app. Picking one opens that page and walks
// through it with the spotlight. With a real account this is the only way a tour starts; in the
// demo each page's tour also starts by itself the first time that page is opened.
export function AppTutorial() {
  const s = useAppSession()
  const { startTour, running } = useTour()
  const tours = toursFor(s.role)
  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
      <p className="eyebrow mb-2">Guided tours</p>
      <h1 className="font-serif text-4xl sm:text-5xl">
        How Resolve <span className="hl">works</span>
      </h1>
      <p className="mt-2 max-w-2xl text-soft">Pick a tour. It opens that page and points out each part and what it is for. Nothing you do during a tour is sent anywhere.</p>
      <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tours.map((t) => (
          <li key={t.id}>
            <button type="button" disabled={running} onClick={() => startTour(t.id)} className="card group flex h-full w-full flex-col items-start gap-3 rounded-2xl p-5 text-left disabled:opacity-60">
              <span className="tile-icon size-11 rounded-xl">
                <Icon name={t.icon} className="size-5" />
              </span>
              <span>
                <span className="block font-semibold">{t.title}</span>
                <span className="mt-0.5 block text-sm text-soft">{t.description}</span>
              </span>
              <span className="mt-auto inline-flex items-center gap-1.5 text-sm font-semibold text-honey-text">
                Start tour · {t.steps.length} steps <Icon name="arrow" className="size-4 transition-transform group-hover:translate-x-0.5" />
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
