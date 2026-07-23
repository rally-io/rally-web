import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useSearchParams } from 'react-router-dom'
import { ArchiveFilterChips } from './ArchiveFilterChips'

function Probe() {
  const [params] = useSearchParams()
  return <div data-testid="qs">{params.toString()}</div>
}

function renderChips(initialPath = '/clubs/c1/tournaments') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <ArchiveFilterChips />
      <Probe />
    </MemoryRouter>,
  )
}

describe('ArchiveFilterChips', () => {
  it('defaults to Open when no status param is present', () => {
    renderChips()
    expect(screen.getByRole('button', { name: 'Open' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'All' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('writes status=completed to the URL and marks the chip active', async () => {
    renderChips()
    await userEvent.click(screen.getByRole('button', { name: 'Completed' }))
    expect(screen.getByTestId('qs')).toHaveTextContent('status=completed')
    expect(screen.getByRole('button', { name: 'Completed' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('removes the param when returning to Open', async () => {
    renderChips('/clubs/c1/tournaments?status=all')
    expect(screen.getByRole('button', { name: 'All' })).toHaveAttribute('aria-pressed', 'true')
    await userEvent.click(screen.getByRole('button', { name: 'Open' }))
    expect(screen.getByTestId('qs')).toHaveTextContent(/^$/)
  })

  it('treats an unknown status value as Open', () => {
    renderChips('/clubs/c1/tournaments?status=bogus')
    expect(screen.getByRole('button', { name: 'Open' })).toHaveAttribute('aria-pressed', 'true')
  })
})
