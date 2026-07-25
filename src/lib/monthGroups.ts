export interface MonthGroup<T> {
  key: string // 'YYYY-MM'
  date: Date // first day of the month, local time
  items: T[]
}

export function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function isCurrentMonth(key: string): boolean {
  return key === monthKey(new Date())
}

export function groupByMonth<T>(
  items: T[],
  getDate: (item: T) => string,
  direction: 'asc' | 'desc',
): MonthGroup<T>[] {
  const buckets = new Map<string, MonthGroup<T>>()
  for (const item of items) {
    const d = new Date(getDate(item))
    if (!Number.isFinite(d.getTime())) continue
    const key = monthKey(d)
    let bucket = buckets.get(key)
    if (!bucket) {
      bucket = { key, date: new Date(d.getFullYear(), d.getMonth(), 1), items: [] }
      buckets.set(key, bucket)
    }
    bucket.items.push(item)
  }
  const sign = direction === 'asc' ? 1 : -1
  const groups = [...buckets.values()].sort(
    (a, b) => sign * (a.date.getTime() - b.date.getTime()),
  )
  for (const g of groups) {
    g.items.sort(
      (a, b) => sign * (new Date(getDate(a)).getTime() - new Date(getDate(b)).getTime()),
    )
  }
  return groups
}
