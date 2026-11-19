import { Link } from 'react-router-dom'
import { Icon, type IconName } from '../../components/ui/Icon'

// A section of the app that is planned but not built yet: says plainly what it will do and, where
// the website already has something that does part of the job, links to it.
export function AppSoon({ icon, title, text, points, now }: { icon: IconName; title: string; text: string; points: string[]; now?: { to: string; label: string } }) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
      <div className="card rounded-3xl p-6 sm:p-10">
        <span className="tile-icon size-12 rounded-2xl">
          <Icon name={icon} className="size-6" />
        </span>
        <h1 className="mt-5 font-serif text-4xl">{title}</h1>
        <p className="mt-3 text-lg leading-relaxed text-soft">{text}</p>
        <p className="mt-6 text-sm font-semibold">Coming to this section</p>
        <ul className="mt-3 space-y-2.5">
          {points.map((p) => (
            <li key={p} className="flex gap-3 leading-relaxed">
              <Icon name="check" className="mt-1 size-4 shrink-0 text-accent" />
              {p}
            </li>
          ))}
        </ul>
        {now && (
          <Link to={now.to} className="btn btn-primary mt-8">
            {now.label} <Icon name="arrow" className="size-4" />
          </Link>
        )}
      </div>
    </div>
  )
}
