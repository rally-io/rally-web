import { describe, it, expect } from 'vitest'
import { groupByMonth, isCurrentMonth, monthKey } from './monthGroups'

interface Item { id: string; when: string }
const getDate = (i: Item) => i.when

describe('groupByMonth', () => {
  it('buckets by calendar month and sorts groups ascending', () => {
    const items: Item[] = [
      { id: 'b', when: '2026-08-14T10:00:00' },
      { id: 'a', when: '2026-07-24T09:00:00' },
      { id: 'c', when: '2026-08-02T10:00:00' },
    ]
    const groups = groupByMonth(items, getDate, 'asc')
    expect(groups.map((g) => g.key)).toEqual(['2026-07', '2026-08'])
    expect(groups[1].items.map((i) => i.id)).toEqual(['c', 'b'])
  })

  it('sorts groups and items descending for the past direction', () => {
    const items: Item[] = [
      { id: 'old', when: '2026-05-30T10:00:00' },
      { id: 'new', when: '2026-06-20T10:00:00' },
      { id: 'newer', when: '2026-06-25T10:00:00' },
    ]
    const groups = groupByMonth(items, getDate, 'desc')
    expect(groups.map((g) => g.key)).toEqual(['2026-06', '2026-05'])
    expect(groups[0].items.map((i) => i.id)).toEqual(['newer', 'new'])
  })

  it('crosses year boundaries correctly', () => {
    const items: Item[] = [
      { id: 'jan', when: '2027-01-05T10:00:00' },
      { id: 'dec', when: '2026-12-28T10:00:00' },
    ]
    expect(groupByMonth(items, getDate, 'asc').map((g) => g.key)).toEqual([
      '2026-12',
      '2027-01',
    ])
  })

  it('drops items with invalid dates and handles empty input', () => {
    expect(groupByMonth([], getDate, 'asc')).toEqual([])
    const groups = groupByMonth(
      [{ id: 'x', when: 'garbage' }, { id: 'ok', when: '2026-07-01T08:00:00' }],
      getDate,
      'asc',
    )
    expect(groups).toHaveLength(1)
    expect(groups[0].items.map((i) => i.id)).toEqual(['ok'])
  })
})

describe('monthKey / isCurrentMonth', () => {
  it('formats YYYY-MM with zero padding', () => {
    expect(monthKey(new Date(2026, 0, 15))).toBe('2026-01')
  })
  it('is true only for the current month', () => {
    expect(isCurrentMonth(monthKey(new Date()))).toBe(true)
    expect(isCurrentMonth('1999-01')).toBe(false)
  })
})
