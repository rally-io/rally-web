import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { EventTerms } from './EventTerms'
import type { TermsSection } from '@/constants/eventTerms'
import { ISRAEL_OPEN_TERMS } from '@/constants/israelOpenTerms'

const SECTIONS: TermsSection[] = [
  {
    heading: '1. כללי',
    intro: 'פסקת פתיחה',
    blocks: [{ kind: 'facts', rows: [['מועד', '21–23 באוקטובר 2026']] }],
  },
  {
    heading: '3. דמי השתתפות',
    blocks: [
      { kind: 'list', subheading: 'תושבי חולון', items: ['סעיף ראשון'] },
      { kind: 'list', subheading: 'רישום כוזב', startAt: 4, items: ['סעיף רביעי'] },
    ],
  },
]

describe('EventTerms', () => {
  it('starts collapsed — a player came to register, not to read', async () => {
    render(<EventTerms sections={SECTIONS} />)
    const toggle = screen.getByRole('button')
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByText('פסקת פתיחה')).not.toBeInTheDocument()

    await userEvent.click(toggle)
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByText('פסקת פתיחה')).toBeInTheDocument()
  })

  it('points the control at the panel it opens', async () => {
    render(<EventTerms sections={SECTIONS} />)
    const toggle = screen.getByRole('button')
    await userEvent.click(toggle)
    const panelId = toggle.getAttribute('aria-controls')
    expect(panelId).toBeTruthy()
    expect(document.getElementById(panelId!)).not.toBeNull()
  })

  it('lays the clauses out right-to-left whatever the interface language is', async () => {
    render(<EventTerms sections={SECTIONS} />)
    await userEvent.click(screen.getByRole('button'))
    const panel = document.getElementById(screen.getByRole('button').getAttribute('aria-controls')!)
    // Hard-coded, not from i18n.dir(): the CONTENT is Hebrew even for an
    // English UI, and an LTR list would put the clause numbers on the wrong side.
    expect(panel).toHaveAttribute('dir', 'rtl')
  })

  it('continues a section numbering across its sub-headings instead of restarting', async () => {
    render(<EventTerms sections={SECTIONS} />)
    await userEvent.click(screen.getByRole('button'))
    const lists = document.querySelectorAll('ol')
    // The source document numbers 1-7 straight through §3 under three
    // sub-headings. A list restarting at 1 would renumber the rulebook.
    expect(lists[0]).not.toHaveAttribute('start', '4')
    expect(lists[1]).toHaveAttribute('start', '4')
  })

  it('renders nothing at all when an event has no rulebook', () => {
    const { container } = render(<EventTerms sections={[]} />)
    expect(container).toBeEmptyDOMElement()
  })
})

describe('ISRAEL_OPEN_TERMS', () => {
  it('carries all nine sections of the תקנון in order', () => {
    expect(ISRAEL_OPEN_TERMS).toHaveLength(9)
    expect(ISRAEL_OPEN_TERMS.map((s) => s.heading[0])).toEqual(['1', '2', '3', '4', '5', '6', '7', '8', '9'])
  })

  it('states the fee the same way the API is configured to charge it', () => {
    // 150 per PLAYER in the rulebook; the tournament row carries 300 per PAIR,
    // and effective_entry_fee halves it per resident. If someone "fixes" one of
    // these numbers without the other, a mixed pair is quoted the wrong price.
    const facts = ISRAEL_OPEN_TERMS[0].blocks.find((b) => b.kind === 'facts')
    expect(facts && facts.kind === 'facts' && facts.rows.map(([k]) => k)).toContain('דמי השתתפות')
    const fee = facts && facts.kind === 'facts' ? facts.rows.find(([k]) => k === 'דמי השתתפות')?.[1] : ''
    expect(fee).toContain('150')
    expect(fee).toContain('חינם')
  })

  it('keeps the dates the תקנון settled on, not the poster the constant started from', () => {
    expect(JSON.stringify(ISRAEL_OPEN_TERMS)).toContain('21–23 באוקטובר 2026')
    expect(JSON.stringify(ISRAEL_OPEN_TERMS)).not.toContain('28–30')
  })
})
