import type { ReactNode } from 'react'

interface FactCardProps {
  icon?: ReactNode
  label: string
  value: string
  highlightLabel?: string
  highlightValue?: string
}

export function FactCard({
  icon, label, value, highlightLabel, highlightValue,
}: FactCardProps) {
  return (
    <div className="flex items-center justify-between rounded-2xl bg-rally-surface border border-rally-border p-4">
      <div className="flex items-center gap-3 min-w-0">
        {icon && <span className="text-rally-accent shrink-0">{icon}</span>}
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-wider text-rally-text-muted">
            {label}
          </p>
          <p className="text-rally-text font-semibold truncate">{value}</p>
        </div>
      </div>
      {highlightLabel && (
        <div className="text-end shrink-0 ms-3">
          <p className="text-[11px] uppercase tracking-wider text-rally-text-muted">
            {highlightLabel}
          </p>
          <p className="text-rally-accent font-bold">{highlightValue}</p>
        </div>
      )}
    </div>
  )
}
