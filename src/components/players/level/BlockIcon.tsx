import type { LucideIcon } from 'lucide-react'
import { VerifiedSeal } from './VerifiedSeal'

/** The leading mark on an explainer block: the real seal, the ghost seal, or a Lucide glyph.
    Lives on its own so `explainerBlocks.ts` can stay a plain module — a file that exports both
    a component and a non-component trips `react-refresh/only-export-components`. */
export function BlockIcon({ icon }: { icon: LucideIcon | 'seal' | 'ghost' }) {
  if (icon === 'seal') return <VerifiedSeal size={22} />
  if (icon === 'ghost') return <VerifiedSeal size={22} ghost />
  const Icon = icon
  return <Icon className="h-[22px] w-[22px] text-rally-accent" aria-hidden />
}
