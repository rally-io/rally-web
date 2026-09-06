import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { NetworkSearch } from '../components/NetworkSearch'
import type { SearchResult } from '../lib/searchNodes'
import type { GlobeNode } from '../types'

const node = (id: string, name: string): GlobeNode => ({
  id, name, avatarUrl: null, skillLevel: 3.5, skillTier: 'silver',
  club: { id: 'c', name: 'Rally TLV', city: 'Tel Aviv' }, matches: 4, winRate: 50, since: 2024,
})
const results: SearchResult[] = [
  { node: node('1', 'Dana Levi'), partners: 3 },
  { node: node('2', 'Dan Cohen'), partners: 1 },
]

function renderSearch(over: Partial<React.ComponentProps<typeof NetworkSearch>> = {}) {
  const props = {
    query: 'dan', onQueryChange: vi.fn(), results, onPick: vi.fn(), onFindMe: vi.fn(),
    statusMessage: null, disabled: false, ...over,
  }
  render(<NetworkSearch {...props} />)
  return props
}

describe('NetworkSearch', () => {
  it('lists results with club and partner count and picks on click', () => {
    const p = renderSearch()
    expect(screen.getByRole('listbox')).toBeInTheDocument()
    expect(screen.getByText('Dana Levi')).toBeInTheDocument()
    expect(screen.getAllByRole('option')).toHaveLength(2)
    fireEvent.click(screen.getByText('Dan Cohen'))
    expect(p.onPick).toHaveBeenCalledWith('2')
  })

  it('walks the list with the keyboard and picks with Enter', () => {
    const p = renderSearch()
    const input = screen.getByRole('combobox')
    fireEvent.keyDown(input, { key: 'ArrowDown' })
    fireEvent.keyDown(input, { key: 'ArrowDown' })
    const activeId = input.getAttribute('aria-activedescendant')
    expect(activeId).toBeTruthy()
    expect(document.getElementById(activeId as string)).toHaveTextContent('Dan Cohen')
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(p.onPick).toHaveBeenCalledWith('2')
  })

  it('shows the empty line for a query without matches and clears on Escape', () => {
    const p = renderSearch({ results: [] })
    expect(screen.getByText(/no players/i)).toBeInTheDocument()
    fireEvent.keyDown(screen.getByRole('combobox'), { key: 'Escape' })
    expect(p.onQueryChange).toHaveBeenCalledWith('')
  })

  it('renders the status message and the Find me button', () => {
    const p = renderSearch({ statusMessage: 'Not on the ball yet' })
    expect(screen.getByRole('status')).toHaveTextContent('Not on the ball yet')
    fireEvent.click(screen.getByRole('button', { name: /find me/i }))
    expect(p.onFindMe).toHaveBeenCalled()
  })
})
