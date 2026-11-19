import { useCallback, useEffect, useState } from 'react'
import { fetchMyMemberships, fetchOrgs, SAMPLE_ORGS, type Membership, type Org } from '../lib/orgs'
import { useAppSession } from './session'

// The organisations and the signed-in person's memberships. The demo uses the sample organisations
// and pretends the "community" view belongs to Keswick Pickers as a lead; nothing is fetched or saved.
export function useOrgs() {
  const s = useAppSession()
  const [orgs, setOrgs] = useState<Org[] | null>(() => (s.demo ? SAMPLE_ORGS.filter((o) => o.status === 'approved') : null))
  const [mine, setMine] = useState<Membership[]>([])
  const [tick, setTick] = useState(0)

  useEffect(() => {
    if (s.demo) return
    let alive = true
    void fetchOrgs().then((list) => {
      if (alive) setOrgs(list ?? [])
    })
    if (s.userId)
      void fetchMyMemberships(s.userId).then((list) => {
        if (alive) setMine(list)
      })
    return () => {
      alive = false
    }
  }, [s.demo, s.userId, tick])

  const demoMine: Membership[] =
    s.demo && s.role === 'community'
      ? [{ org_id: 'sample-org-1', user_id: 'demo', role: 'lead', status: 'active', display_name: 'Sam (demo)', answers: {}, created_at: new Date().toISOString() }]
      : []

  const refresh = useCallback(() => setTick((t) => t + 1), [])
  return { orgs, mine: s.demo ? demoMine : mine, refresh }
}
