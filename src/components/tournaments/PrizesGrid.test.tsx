import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { PrizesGrid } from './PrizesGrid'
import type { Prize } from '@/types/api'

const withImage: Prize = {
  id: 'p1',
  title: 'First place cup',
  description: 'Rackets worth 3,200₪',
  image_url: 'https://cdn.example.com/prize_1.jpeg',
}

const withoutImage: Prize = {
  id: 'p2',
  title: 'Second place cup',
  description: 'A free tournament entry',
  image_url: null,
}

describe('PrizesGrid', () => {
  it('renders the prize photo when the API supplies one', () => {
    render(<PrizesGrid prizes={[withImage]} />)
    const img = screen.getByAltText('First place cup') as HTMLImageElement
    expect(img.src).toBe(withImage.image_url)
  })

  it('falls back to the medal when there is no image', () => {
    render(<PrizesGrid prizes={[withoutImage]} />)
    expect(screen.queryByRole('img')).toBeNull()
    expect(screen.getAllByText('🥇').length).toBeGreaterThan(0)
  })

  it('falls back to the medal when the image fails to load', () => {
    render(<PrizesGrid prizes={[withImage]} />)
    fireEvent.error(screen.getByAltText('First place cup'))
    expect(screen.queryByRole('img')).toBeNull()
    expect(screen.getAllByText('🥇').length).toBeGreaterThan(0)
  })

  it('shows the title as a label above the description', () => {
    render(<PrizesGrid prizes={[withImage]} />)
    expect(screen.getByText('First place cup')).toBeTruthy()
    expect(screen.getByText('Rackets worth 3,200₪')).toBeTruthy()
  })

  it('prints the text once when title and description are identical', () => {
    const dup: Prize = { id: 'p3', title: 'Two ball boxes', description: 'Two ball boxes', image_url: null }
    render(<PrizesGrid prizes={[dup]} />)
    expect(screen.getAllByText('Two ball boxes')).toHaveLength(1)
  })

  it('falls back to the title when there is no description', () => {
    const noDesc = { id: 'p4', title: 'Mystery prize', description: '', image_url: null } as Prize
    render(<PrizesGrid prizes={[noDesc]} />)
    expect(screen.getByText('Mystery prize')).toBeTruthy()
  })

  it('renders at most three prizes', () => {
    const many = Array.from({ length: 5 }, (_, i) => ({
      ...withoutImage,
      id: `p-${i}`,
      title: `Prize ${i}`,
      description: `Reward ${i}`,
    }))
    render(<PrizesGrid prizes={many} />)
    expect(screen.getByText('Reward 2')).toBeTruthy()
    expect(screen.queryByText('Reward 3')).toBeNull()
  })
})
