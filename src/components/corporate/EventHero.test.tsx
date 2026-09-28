import { describe, it, expect } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import '@/i18n'
import i18n from '@/i18n'
import { EventHero } from './EventHero'
import type { CorporateEventBase } from '@/constants/corporateEvents'

const EVENT: CorporateEventBase = {
  slug: 'acme',
  company: 'Acme',
  tournamentName: 'Acme Cup',
  clubName: 'Padel Club',
  clubAddress: 'Somewhere 1',
  heroImage: '/hero.jpg',
  dateLabel: '1.1.2027',
  timeLabel: '17:00–21:00',
}

describe('EventHero', () => {
  it('shows the entry\'s own artwork when it has some', () => {
    render(<EventHero event={EVENT} fallbackImage="https://cdn.example/banner.jpg" />)
    // The blurred backdrop copy is aria-hidden with an empty alt; the club name
    // is on the one a reader actually sees.
    expect(screen.getByAltText('Padel Club')).toHaveAttribute('src', '/hero.jpg')
  })

  it('falls back to the tournament banner when the entry brings no artwork', () => {
    render(<EventHero event={{ ...EVENT, heroImage: undefined }} fallbackImage="https://cdn.example/banner.jpg" />)
    expect(screen.getByAltText('Padel Club')).toHaveAttribute('src', 'https://cdn.example/banner.jpg')
  })

  it('renders the header without an image when there is neither', () => {
    render(<EventHero event={{ ...EVENT, heroImage: undefined }} />)
    expect(screen.queryByAltText('Padel Club')).not.toBeInTheDocument()
    expect(screen.getByText('Acme Cup')).toBeInTheDocument()
    expect(screen.getByText('Somewhere 1')).toBeInTheDocument()
  })

  it('shows the "closed event" badge by default — corporate events are employee-only', () => {
    render(<EventHero event={EVENT} />)
    expect(screen.getByText(i18n.t('corporate.eyebrow'))).toBeInTheDocument()
  })

  it('hides the badge when the event opts out (a tournament anyone with the link may join)', () => {
    render(<EventHero event={{ ...EVENT, closedBadge: false }} />)
    expect(screen.queryByText(i18n.t('corporate.eyebrow'))).not.toBeInTheDocument()
    expect(screen.getByText('Acme Cup')).toBeInTheDocument()
  })

  it('shows the "hosted at" line by default', () => {
    render(<EventHero event={EVENT} />)
    expect(screen.getByText(`${i18n.t('corporate.hostedAt')} Padel Club`)).toBeInTheDocument()
  })

  it('drops the "hosted at" line when the event opts out, keeping the club name for the image', () => {
    render(<EventHero event={{ ...EVENT, hostedAtLine: false }} />)
    expect(screen.queryByText(`${i18n.t('corporate.hostedAt')} Padel Club`)).not.toBeInTheDocument()
    expect(screen.getByAltText('Padel Club')).toBeInTheDocument()
  })

  it('renders the intro as paragraphs: a blank line splits, a lone newline reflows', () => {
    render(<EventHero event={{ ...EVENT, intro: 'Big news\nthis year!\n\nPrizes galore.\n\nSign up now.' }} />)
    const paragraphs = within(screen.getByTestId('event-intro')).getAllByText(/./, { selector: 'p' })
    expect(paragraphs.map((p) => p.textContent)).toEqual(['Big news this year!', 'Prizes galore.', 'Sign up now.'])
  })

  it('renders no intro block when the event has none', () => {
    render(<EventHero event={EVENT} />)
    expect(screen.queryByTestId('event-intro')).not.toBeInTheDocument()
  })

  // The mark sits in the image band's top corner unless the artwork has no free
  // corner — then it must leave the band entirely, or it covers the client's logos.
  it('pins the Rally mark over the artwork by default', () => {
    render(<EventHero event={{ ...EVENT, heroFit: 'contain' }} />)
    const band = screen.getByAltText('Padel Club').parentElement!
    expect(within(band).getByAltText('Rally')).toBeInTheDocument()
  })

  it('moves the Rally mark off the artwork when the event opts out', () => {
    render(<EventHero event={{ ...EVENT, heroFit: 'contain', wordmarkOverHero: false }} />)
    const band = screen.getByAltText('Padel Club').parentElement!
    expect(within(band).queryByAltText('Rally')).not.toBeInTheDocument()
    expect(screen.getAllByAltText('Rally')).toHaveLength(1)
  })
})
