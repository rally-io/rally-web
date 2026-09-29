import { useContext } from 'react'
import { SkillLadderContext } from '@/contexts/SkillLadderContext'
import type { SkillLadder } from '@/lib/skillLadder'

/** The ladder in force: served, else the bundled fallback the contract's §3 picks. */
export function useSkillLadder(): SkillLadder {
  return useContext(SkillLadderContext).ladder
}

/** Refetch the served ladder, bypassing the browser cache. */
export function useRefreshSkillLadder(): () => void {
  return useContext(SkillLadderContext).refresh
}
