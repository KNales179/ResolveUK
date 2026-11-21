import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Icon } from '../../components/ui/Icon'
import { timeAgo } from '../../lib/format'
import { decideMember, fetchMembers, fetchOrg, KIND_LABEL, leaveOrg, SAMPLE_ORGS, type Membership, type Org } from '../../lib/orgs'
import { AreaMap } from '../components/AreaMap'
import { JoinDialog } from '../components/JoinDialog'
import { OrgJobs } from '../components/OrgJobs'
import { useOrgs } from '../orgsData'
import { useAppSession } from '../session'
import { BackLink } from '../../components/ui/BackLink'

const DEMO_PEOPLE: Membership[] = [
  { org_id: 'sample-org-1', user_id: 'demo', role: 'lead', status: 'active', display_name: 'Sam (demo)', answers: {}, created_at: new Date(Date.now() - 90 * 864e5).toISOString() },
  { org_id: 'sample-org-1', user_id: 'd2', role: 'member', status: 'active', display_name: 'Ruth', answers: {}, created_at: new Date(Date.now() - 40 * 864e5).toISOString() },
  { org_id: 'sample-org-1', user_id: 'd3', role: 'member', status: 'pending', display_name: 'Tom', answers: { why: 'I live by the lake and pick up litter on my walks anyway.', when: 'Saturdays', help: 'I have a car' }, created_at: new Date(Date.now() - 864e5).toISOString() },
  { org_id: 'sample-org-1', user_id: 'd4', role: 'member', status: 'pending', display_name: 'Aisha', answers: { why: 'New to the area and want to meet people while doing something useful.', when: 'Weekday evenings' }, created_at: new Date(Date.now() - 3 * 36e5).toISOString() },
]

// One group or company: what it does, the area it covers (on a map beside the details), and, for
// its leads, the people in it and the applications waiting for a decision.
export function AppOrg() {
  const { id = '' } = useParams()
  const s = useAppSession()
  const navigate = useNavigate()
  const { mine, refresh } = useOrgs()
  const [org, setOrg] = useState<Org | null | undefined>(() => (s.demo ? (SAMPLE_ORGS.find((o) => o.id === id) ?? null) : undefined))
  const [people, setPeople] = useState<Membership[]>(() => (s.demo && id === 'sample-org-1' && s.role === 'community' ? DEMO_PEOPLE : []))
  const [joining, setJoining] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const me = mine.find((m) => m.org_id === id && (m.status === 'active' || m.status === 'pending'))
  const lead = me?.status === 'active' && me.role === 'lead'

  useEffect(() => {
    if (s.demo) return
    let alive = true
    void fetchOrg(id).then((o) => {
      if (alive) setOrg(o)
    })
    return () => {
      alive = false
    }
  }, [id, s.demo])

  useEffect(() => {
    if (s.demo || !lead) return
    let alive = true
    void fetchMembers(id).then((list) => {
      if (alive) setPeople(list)
    })
    return () => {
      alive = false
    }
  }, [id, s.demo, lead])

  async function decide(m: Membership, d: 'approve' | 'decline' | 'make_lead') {
    setError(null)
    if (!s.demo) {
      const problem = await decideMember(id, m.user_id, d)
      if (problem) return setError(problem)
    }
    setPeople((list) => list.map((p) => (p.user_id !== m.user_id ? p : d === 'make_lead' ? { ...p, role: 'lead' } : { ...p, status: d === 'approve' ? 'active' : 'declined' })))
  }

  async function leave() {
    if (!s.demo) {
      const problem = await leaveOrg(id)
      if (problem) return setError(problem)
    }
    refresh()
    navigate('/app/community')
  }

  if (org === undefined) return <div className="mx-auto max-w-7xl px-4 py-10" aria-busy="true" />
  if (org === null)
    return (
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <p className="font-semibold">That group isn't available.</p>
        <Link to="/app/community" className="btn btn-ghost btn-sm mt-4">
          Back to Community
        </Link>
      </div>
    )

  const active = people.filter((p) => p.status === 'active')
  const waiting = people.filter((p) => p.status === 'pending')

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
      <BackLink to="/app/community">Community</BackLink>
      <div className="mt-3 grid gap-5 lg:grid-cols-[1fr_1.15fr]">
        <section className="card rounded-3xl p-6 sm:p-8">
          <span className={`pill ${org.kind === 'community' ? 'pill-cleared' : 'pill-progress'}`}>{KIND_LABEL[org.kind]}</span>
          {org.status !== 'approved' && <span className="pill pill-reported ml-2">{org.status === 'pending' ? 'Waiting for a Resolve admin' : 'Not approved'}</span>}
          <h1 className="mt-3 font-serif text-4xl">{org.name}</h1>
          <p className="mt-1 font-semibold text-honey-text">{org.area_label}</p>
          <p className="mt-5 leading-relaxed">{org.description}</p>
          <dl className="mt-6 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
            {org.kind === 'community' && (
              <>
                <dt className="text-soft">Members</dt>
                <dd className="num font-semibold">{org.member_count}</dd>
              </>
            )}
            {org.meets && (
              <>
                <dt className="text-soft">Meets</dt>
                <dd className="font-semibold">{org.meets}</dd>
              </>
            )}
            {org.contact_email && (
              <>
                <dt className="text-soft">Contact</dt>
                <dd className="font-semibold select-all">{org.contact_email}</dd>
              </>
            )}
            {org.waste_carrier_number && (
              <>
                <dt className="text-soft">Waste carrier no.</dt>
                <dd className="num font-semibold">{org.waste_carrier_number}</dd>
              </>
            )}
          </dl>
          <div className="mt-7 flex flex-wrap gap-2">
            {org.kind === 'community' && org.status === 'approved' && !me && (
              <button type="button" className="btn btn-primary" onClick={() => setJoining(true)}>
                Apply to join
              </button>
            )}
            {me?.status === 'pending' && <span className="pill pill-progress">Your application is with the group's leads</span>}
            {me?.status === 'active' && (
              <>
                <span className="pill pill-cleared">{lead ? 'You lead this group' : "You're a member"}</span>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => void leave()}>
                  Leave
                </button>
              </>
            )}
          </div>
          {error && (
            <p className="msg msg-error mt-4" role="alert">
              {error}
            </p>
          )}
        </section>
        <div className="card overflow-hidden rounded-3xl p-0">
          <AreaMap orgs={[org]} focus={org.area} className="h-full min-h-[360px]" />
        </div>
      </div>

      {me?.status === 'active' && org.status === 'approved' && <OrgJobs orgId={org.id} lead={lead} demo={s.demo} />}

      {lead && (
        <div className="mt-5 grid gap-5 lg:grid-cols-2">
          <section className="card rounded-3xl p-6">
            <h2 className="font-serif text-2xl">Applications</h2>
            <p className="mt-1 text-sm text-soft">{waiting.length ? `${waiting.length} waiting for a decision` : 'No applications waiting.'}</p>
            <ul className="mt-4 space-y-3">
              {waiting.map((m) => (
                <li key={m.user_id} className="rounded-2xl border border-line bg-[var(--c-field)] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold">{m.display_name}</p>
                    <span className="text-xs text-soft">{timeAgo(m.created_at)}</span>
                  </div>
                  {m.answers.why && <p className="mt-1.5 text-sm">{m.answers.why}</p>}
                  <p className="mt-1 text-xs text-soft">
                    {[m.answers.when && `Free: ${m.answers.when}`, m.answers.help && `Can help with: ${m.answers.help}`].filter(Boolean).join(' · ')}
                  </p>
                  <div className="mt-3 flex gap-2">
                    <button type="button" className="btn btn-primary btn-sm" onClick={() => void decide(m, 'approve')}>
                      <Icon name="check" className="size-4" /> Approve
                    </button>
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => void decide(m, 'decline')}>
                      Decline
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </section>
          <section className="card rounded-3xl p-6">
            <h2 className="font-serif text-2xl">Members</h2>
            <p className="mt-1 text-sm text-soft">Leads can approve applications and make other members leads too.</p>
            <ul className="mt-4 divide-y divide-line">
              {active.map((m) => (
                <li key={m.user_id} className="flex items-center gap-3 py-2.5">
                  <span className="app-avatar size-8 text-xs">{m.display_name.charAt(0).toUpperCase()}</span>
                  <span className="min-w-0 flex-1 truncate font-medium">{m.display_name}</span>
                  {m.role === 'lead' ? (
                    <span className="pill pill-cleared">Lead</span>
                  ) : (
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => void decide(m, 'make_lead')}>
                      Make lead
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </section>
        </div>
      )}
      {s.demo && <p className="mt-5 text-sm text-soft">Demo: nothing here is saved or sent.</p>}
      {joining && <JoinDialog org={org} onClose={() => setJoining(false)} onSent={refresh} />}
    </div>
  )
}
