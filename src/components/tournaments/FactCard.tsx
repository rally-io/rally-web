import type { ReactNode } from 'react'

interface FactCardProps {
  icon?: ReactNode
  label: string
  value: ReactNode
}

export function FactCard({ icon, label, value }: FactCardProps) {
  return (
    <div className="rounded-2xl bg-rally-surface border border-rally-border p-5 hover:border-rally-accent/40 transition-colors">
      {icon && (
        <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-rally-accent/15 text-rally-accent mb-3">
          {icon}
        </span>
      )}
      <p className="text-[11px] uppercase tracking-wider text-rally-text-muted">
        {label}
      </p>
      <p className="text-rally-text font-bold text-lg mt-1">{value}</p>
    </div>
  )
}
