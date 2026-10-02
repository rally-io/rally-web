import { cn } from '@/lib/utils'

export interface PriceBreakdownRow {
  key: string
  label: string
  value: string
  tone?: 'default' | 'success'
  /** The running total — gets a top rule and bold weight. */
  bold?: boolean
}

/** A plain list of price rows (entry fee, coupon discount, credits, total) —
 *  used both live, while a coupon is being applied before payment, and as a
 *  static receipt for a settled registration. */
export function PriceBreakdown({ rows }: { rows: PriceBreakdownRow[] }) {
  return (
    <div className="rounded-2xl bg-rally-surface border border-rally-border p-4 space-y-1.5">
      {rows.map((row) => (
        <div
          key={row.key}
          className={cn(
            'flex items-center justify-between gap-3 text-sm',
            row.bold && 'pt-2 mt-1 border-t border-rally-border',
          )}
        >
          <span className={row.bold ? 'font-bold text-rally-text' : 'text-rally-text-2'}>
            {row.label}
          </span>
          <span
            className={cn(
              'font-semibold',
              row.tone === 'success' ? 'text-rally-success' : 'text-rally-text',
              row.bold && 'font-bold',
            )}
          >
            {row.value}
          </span>
        </div>
      ))}
    </div>
  )
}
