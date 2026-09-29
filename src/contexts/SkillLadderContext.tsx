import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { AppSessionContext } from '@/contexts/AppSessionContext'
import { fetchSkillBands } from '@/services/api/skillBands'
import { FALLBACK_LADDERS, selectLadder, type SkillLadder } from '@/lib/skillLadder'

export interface SkillLadderContextValue {
  ladder: SkillLadder
  /** Refetch the served ladder past the browser cache — for when the API has just said ours is stale. */
  refresh: () => void
}

/**
 * The default is the bundled 1–7 ladder (contract §3 rule 4). Anything rendered outside the
 * provider — every component test that does not wrap one — reads the step-0 ladder, which is
 * exactly what the app showed before the ladder was served.
 */
export const SkillLadderContext = createContext<SkillLadderContextValue>({
  ladder: FALLBACK_LADDERS[7],
  refresh: () => {},
})

export const SKILL_BANDS_QUERY_KEY = 'skill-bands'

/**
 * Fetches the served ladder once per session and picks the ladder every level-bearing surface
 * reads (contract §3). Mounted in main.tsx inside AppSessionProvider, because rule 3 needs the
 * viewer's own `level_scale`.
 */
export function SkillLadderProvider({ children }: { children: ReactNode }) {
  // `useContext`, never `useAppSession()`: that throws outside its provider.
  const profileScale = useContext(AppSessionContext)?.playerProfile?.level_scale ?? null
  // Rule 3 reads the viewer's MOST RECENT profile: signing out nulls the profile, not what we saw.
  const [seenScale, setSeenScale] = useState<number | null>(null)
  useEffect(() => {
    if (profileScale != null) setSeenScale(profileScale)
  }, [profileScale])
  const viewerScale = profileScale ?? seenScale

  const [bust, setBust] = useState<number | null>(null)
  const { data: served } = useQuery({
    queryKey: [SKILL_BANDS_QUERY_KEY, bust],
    queryFn: () => fetchSkillBands(bust),
    staleTime: Infinity,
    gcTime: Infinity,
    retry: 1,
    placeholderData: keepPreviousData,
  })

  // Contract §3: whenever a profile's level_scale differs from the ladder in use, refetch it —
  // e.g. a tab left open across the scale flip still holds the old served ladder. Keyed on the
  // two scales, so an API that keeps disagreeing cannot loop this.
  const servedScale = served?.level_scale ?? null
  useEffect(() => {
    if (servedScale != null && viewerScale != null && servedScale !== viewerScale) setBust(Date.now())
  }, [servedScale, viewerScale])

  const value = useMemo<SkillLadderContextValue>(
    () => ({ ladder: selectLadder(served, viewerScale), refresh: () => setBust(Date.now()) }),
    [served, viewerScale],
  )
  return <SkillLadderContext.Provider value={value}>{children}</SkillLadderContext.Provider>
}
