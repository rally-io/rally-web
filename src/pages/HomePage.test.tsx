import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import i18n from '@/i18n'
import HomePage from './HomePage'

vi.mock('@/components/home/AvailabilityGrid', () => ({ default: () => <div data-testid="availability" /> }))
vi.mock('@/hooks/useDevicePlatform', () => ({ useDevicePlatform: () => 'desktop' }))
// If Home ever imports the ball scene this throws at module load — the landing page never mounts WebGL.
vi.mock('three', () => {
  throw new Error('HomePage must not import three')
})

describe('HomePage — the community section', () => {
  beforeAll(async () => {
    await i18n.changeLanguage('en')
  })
  afterAll(async () => {
    await i18n.changeLanguage('he')
  })

  it('shows the ball with two doors: the ball and the ranking', () => {
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>,
    )
    const section = screen.getByTestId('home-community')
    expect(section).toHaveTextContent('Every player on one ball.')
    const ball = screen.getByRole('link', { name: /open the ball/i })
    const ranking = screen.getByRole('link', { name: /see the ranking/i })
    expect(ball).toHaveAttribute('href', '/network')
    expect(ranking).toHaveAttribute('href', '/ranking')
    // a still, lazy, sized — never the WebGL scene
    const img = section.querySelector('img')!
    expect(img).toHaveAttribute('loading', 'lazy')
    expect(img).toHaveAttribute('width', '900')
    expect(img).toHaveAttribute('height', '801')
    expect(img.getAttribute('src')).toMatch(/rally-ball-home\.webp$/)
  })
})
