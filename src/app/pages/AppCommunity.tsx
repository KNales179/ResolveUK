import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Icon } from '../../components/ui/Icon'
import { KIND_LABEL, type Org, type OrgKind } from '../../lib/orgs'
import { AreaMap } from '../components/AreaMap'
import { JoinDialog } from '../components/JoinDialog'
import { useOrgs } from '../orgsData'
import { useAppSession } from '../session'

const TABS: Array<[OrgKind | 'all', string]> = [
  ['all', 'All'],
  ['community', 'Community groups'],
  ['commercial', 'Clearance companies'],
]

// Community in the app: every approved community group and clearance company, with the areas they
// cover on a map beside the list. Apply to join a group, open a group's page, or register a new
// group or company (an admin checks it before it appears).
export function AppCommunity() {
  const s = useAppSession()
  const navigate = useNavigate()
  const { orgs, mine, refresh } = useOrgs()
  const [tab, setTab] = useState<OrgKind | 'all'>('all')
  const [joining, setJoining] = useState<Org | null>(null)
  const [applied, setApplied] = useState<Set<string>>(new Set())

  const shown = useMemo(() => (orgs ?? []).filter((o) => tab === 'all' || o.kind === tab), [orgs, tab])
  const statusIn = (id: string) => mine.find((m) => m.org_id === id && m.status !== 'declined' && m.status !== 'left')
  const yours = (orgs ?? []).filter((o) => statusIn(o.id)?.status === 'active')

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-4xl sm:text-5xl">Community</h1>
          <p className="mt-2 max-w-2xl text-soft">Local groups that take on safe jobs in their own area, and licensed companies that clear private land. Every one is checked before it appears.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/app/community/new?kind=community" className="btn btn-primary btn-sm">
            <Icon name="plus" className="size-4" /> Start a community group
          </Link>
          <Link to="/app/community/new?kind=commercial" className="btn btn-ghost btn-sm">
            Register a clearance company
          </Link>
        </div>
      </div>

      {s.demo && (
        <p className="msg msg-info mt-5" role="status">
          Demo: these are sample groups and companies. {s.role === 'community' ? 'You are viewing as a lead of Keswick Pickers.' : 'Switch the view to Community to see a group from the inside.'}
        </p>
      )}

      {yours.length > 0 && (
        <div className="mt-6 flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold text-soft">Your groups:</span>
          {yours.map((o) => (
            <Link key={o.id} to={`/app/community/${o.id}`} className="btn btn-ghost btn-sm">
              {o.name} {statusIn(o.id)?.role === 'lead' && <span className="pill pill-cleared">Lead</span>}
            </Link>
          ))}
        </div>
      )}

      <div className="mt-6 flex flex-wrap gap-1 rounded-xl border border-line bg-[var(--c-field)] p-1" role="group" aria-label="Show">
        {TABS.map(([id, label]) => (
          <button key={id} type="button" aria-pressed={tab === id} onClick={() => setTab(id)} className="rounded-lg px-4 py-2 text-sm font-semibold text-soft transition hover:text-ink aria-pressed:bg-accent-vivid aria-pressed:text-accent-ink">
            {label}
          </button>
        ))}
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[1.25fr_1fr]">
        <div className="card overflow-hidden rounded-3xl p-0">
          <AreaMap orgs={shown} onPick={(id) => navigate(`/app/community/${id}`)} className="h-[58svh] min-h-[420px]" />
          <div className="flex flex-wrap gap-4 border-t border-line px-4 py-2.5 text-xs font-semibold">
            <span className="inline-flex items-center gap-1.5"><span className="area-swatch area-swatch-community" /> Community group area</span>
            <span className="inline-flex items-center gap-1.5"><span className="area-swatch area-swatch-commercial" /> Clearance company area</span>
          </div>
        </div>

        <ul className="space-y-3 lg:max-h-[calc(58svh+2.6rem)] lg:overflow-y-auto lg:pr-1" data-lenis-prevent>
          {orgs === null && <li className="card h-32 animate-pulse rounded-2xl" />}
          {orgs?.length === 0 && (
            <li className="card rounded-2xl p-6 text-center">
              <p className="font-semibold">No groups here yet</p>
              <p className="mt-1 text-sm text-soft">Be the first: start a community group for your area.</p>
            </li>
          )}
          {shown.map((o) => {
            const m = statusIn(o.id)
            return (
              <li key={o.id} className="card rounded-2xl p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link to={`/app/community/${o.id}`} className="font-semibold hover:underline">
                      {o.name}
                    </Link>
                    <p className="text-sm text-soft">{o.area_label}</p>
                  </div>
                  <span className={`pill ${o.kind === 'community' ? 'pill-cleared' : 'pill-progress'} shrink-0`}>{KIND_LABEL[o.kind]}</span>
                </div>
                <p className="mt-2 line-clamp-2 text-sm">{o.description}</p>
                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-soft">
                  {o.kind === 'community' && <span className="num">{o.member_count} members</span>}
                  {o.meets && <span>{o.meets}</span>}
                  <span className="ml-auto flex gap-2">
                    {o.kind === 'community' &&
                      (m?.status === 'active' ? (
                        <span className="pill pill-cleared">{m.role === 'lead' ? 'You lead this group' : "You're a member"}</span>
                      ) : m?.status === 'pending' || applied.has(o.id) ? (
                        <span className="pill pill-progress">Application sent</span>
                      ) : (
                        <button type="button" className="btn btn-primary btn-sm" onClick={() => setJoining(o)}>
                          Apply to join
                        </button>
                      ))}
                    <Link to={`/app/community/${o.id}`} className="btn btn-ghost btn-sm">
                      View
                    </Link>
                  </span>
                </div>
              </li>
            )
          })}
        </ul>
      </div>

      {joining && (
        <JoinDialog
          org={joining}
          onClose={() => setJoining(null)}
          onSent={() => {
            setApplied((a) => new Set(a).add(joining.id))
            refresh()
          }}
        />
      )}
    </div>
  )
}
