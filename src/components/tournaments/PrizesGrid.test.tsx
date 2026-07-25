import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { PrizesGrid } from './PrizesGrid'
import type { Prize } from '@/types/api'

const withImage: Prize = {
  id: 'p1',
  position: 1,
  title: 'First place cup',
  description: 'Rackets worth 3,200₪',
  image_url: 'https://cdn.example.com/prize_1.jpeg',
}

const withoutImage: Prize = {
  id: 'p2',
  position: 2,
  title: 'Second place cup',
  description: 'A free tournament entry',
  image_url: null,
}

describe('PrizesGrid images', () => {
  it('renders the prize photo when the API supplies one', () => {
    render(<PrizesGrid prizes={[withImage]} />)
    const img = screen.getByAltText('First place cup') as HTMLImageElement
    expect(img.src).toBe(withImage.image_url)
  })

  it('falls back to the medal when there is no image', () => {
    render(<PrizesGrid prizes={[withoutImage]} />)
    expect(screen.queryByRole('img')).toBeNull()
    expect(screen.getAllByText('🥈').length).toBeGreaterThan(0)
  })

  it('falls back to the medal when the image fails to load', () => {
    render(<PrizesGrid prizes={[withImage]} />)
    fireEvent.error(screen.getByAltText('First place cup'))
    expect(screen.queryByRole('img')).toBeNull()
    expect(screen.getAllByText('🥇').length).toBeGreaterThan(0)
  })
})

describe('PrizesGrid places', () => {
  it('labels a prize by its position, not its place in the list', () => {
    // Real production shape: places 1, 2 and 5 — the third card is NOT bronze.
    const fifth: Prize = {
      id: 'p5',
      position: 5,
      title: 'Two ball boxes',
      description: 'Dunlop Pro Padel',
      image_url: null,
    }
    render(<PrizesGrid prizes={[withImage, withoutImage, fifth]} />)

    expect(screen.getByText(/Place 5/)).toBeTruthy()
    expect(screen.queryByText('🥉')).toBeNull()
    expect(screen.getAllByText('5').length).toBeGreaterThan(0)
  })

  it('uses the ordinal copy for podium places', () => {
    const third: Prize = { ...withoutImage, id: 'p3', position: 3, title: 'Third place cup' }
    render(<PrizesGrid prizes={[withImage, withoutImage, third]} />)

    expect(screen.getByText(/1st Place/)).toBeTruthy()
    expect(screen.getByText(/2nd Place/)).toBeTruthy()
    expect(screen.getByText(/3rd Place/)).toBeTruthy()
    expect(screen.getAllByText('🥉').length).toBeGreaterThan(0)
  })

  it('orders prizes by position regardless of server order', () => {
    const fifth: Prize = {
      id: 'p5',
      position: 5,
      title: 'Two ball boxes',
      description: 'Dunlop Pro Padel',
      image_url: null,
    }
    const { container } = render(<PrizesGrid prizes={[fifth, withoutImage, withImage]} />)
    const headlines = [...container.querySelectorAll('p.text-rally-accent')].map(
      (n) => n.textContent,
    )
    expect(headlines).toEqual([
      'Rackets worth 3,200₪',
      'A free tournament entry',
      'Dunlop Pro Padel',
    ])
  })

  it('renders every prize, including places past the podium', () => {
    const many = [1, 2, 3, 4, 5].map((position) => ({
      ...withoutImage,
      id: `p-${position}`,
      position,
      title: `Prize ${position}`,
      description: `Reward ${position}`,
    }))
    render(<PrizesGrid prizes={many} />)
    expect(screen.getByText('Reward 5')).toBeTruthy()
    expect(screen.getByText(/Place 4/)).toBeTruthy()
  })
})

describe('PrizesGrid without position (server predating the field)', () => {
  const legacy = (id: string, title: string, description: string): Prize => ({
    id,
    title,
    description,
    image_url: null,
  })

  it('falls back to list order for the medal', () => {
    render(<PrizesGrid prizes={[legacy('a', 'One', 'Gold reward'), legacy('b', 'Two', 'Silver reward')]} />)
    expect(screen.getAllByText('🥇').length).toBeGreaterThan(0)
    expect(screen.getAllByText('🥈').length).toBeGreaterThan(0)
  })

  it('claims no place it cannot verify', () => {
    render(<PrizesGrid prizes={[legacy('a', 'One', 'Gold reward')]} />)
    expect(screen.queryByText(/1st Place/)).toBeNull()
    expect(screen.getByText('One')).toBeTruthy()
  })
})

describe('PrizesGrid text', () => {
  it('shows the title alongside the place when it adds information', () => {
    render(<PrizesGrid prizes={[withImage]} />)
    expect(screen.getByText('1st Place · First place cup')).toBeTruthy()
    expect(screen.getByText('Rackets worth 3,200₪')).toBeTruthy()
  })

  it('prints the text once when title and description are identical', () => {
    const dup: Prize = {
      id: 'p3',
      position: 5,
      title: 'Two ball boxes',
      description: 'Two ball boxes',
      image_url: null,
    }
    render(<PrizesGrid prizes={[dup]} />)
    expect(screen.getAllByText('Two ball boxes')).toHaveLength(1)
    expect(screen.getByText('Place 5')).toBeTruthy()
  })

  it('falls back to the title when there is no description', () => {
    const noDesc = { id: 'p4', position: 1, title: 'Mystery prize', description: '', image_url: null } as Prize
    render(<PrizesGrid prizes={[noDesc]} />)
    expect(screen.getByText('Mystery prize')).toBeTruthy()
  })
})
