import type { LucideIcon } from 'lucide-react'
import { Gauge, Hash, ListChecks, Medal } from 'lucide-react'
import { ltrIsolate } from '@/lib/bidi'
import {
  INACTIVITY_GRACE_MONTHS,
  TYPICAL_MATCHES_TO_VERIFY,
  TYPICAL_TOURNAMENTS_TO_VERIFY,
  VERIFIED_RELIABILITY_THRESHOLD,
} from './constants'

export type ExplainerBlock = {
  key: 'level' | 'reliability' | 'verified' | 'counts' | 'keeping' | 'tier'
  icon: LucideIcon | 'seal' | 'ghost'
  values?: Record<string, number | string>
}

/* Spec §10: six blocks, icon + heading + one or two sentences, no formulas. The engine numbers
   interpolate from constants.ts — never from the translation files.

   One list, two consumers: the in-app `LevelExplainerSheet` and the `/level` page it links to as
   "Read more". They used to be hand-copied, with a unit test asserting the copies were equal —
   which turned an edit to one into a red test rather than a working page. */
export const EXPLAINER_BLOCKS: ExplainerBlock[] = [
  { key: 'level', icon: Hash },
  { key: 'reliability', icon: Gauge },
  {
    key: 'verified',
    icon: 'seal',
    values: {
      threshold: ltrIsolate(`${VERIFIED_RELIABILITY_THRESHOLD}%`),
      matches: TYPICAL_MATCHES_TO_VERIFY,
      tournaments: TYPICAL_TOURNAMENTS_TO_VERIFY,
    },
  },
  { key: 'counts', icon: ListChecks },
  { key: 'keeping', icon: 'ghost', values: { months: INACTIVITY_GRACE_MONTHS } },
  { key: 'tier', icon: Medal },
]
