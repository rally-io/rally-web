import { describe, expect, it } from 'vitest'
import { formatAnswer, phoneCell, rosterToCsv, type CsvLabels } from '../csv'
import type { PublicRoster } from '../types'

const labels: CsvLabels = {
  yes: 'Yes', no: 'No', category: 'Category', status: 'Status', statusValues: { confirmed: 'Confirmed', waitlisted: 'Waiting' },
  firstName: 'First', lastName: 'Last', phone: 'Phone', email: 'Email', level: 'Level', partner: 'Partner', documents: 'Docs', registeredAt: 'At',
}
const roster: PublicRoster = {
  customer_name: 'Acme', event_name: 'Day', generated_at: '2026-11-05T10:00:00Z',
  questions: [
    { id: 'q_aaaaaa11', label: 'Dept, team', type: 'text', required: false, options: [], per_participant: false, archived: false },
    { id: 'q_bbbbbb22', label: 'Size', type: 'select', required: false, options: [], per_participant: true, archived: false },
    { id: 'q_cccccc33', label: 'Gone', type: 'text', required: false, options: [], per_participant: false, archived: true },
  ],
  rows: [{
    category: 'Open', status: 'confirmed', first_name: 'Dana', last_name: 'Levi', phone: '(+972) 501234567', email: 'd@acme.com',
    skill_level: 3.5, partner_name: '=cmd', answers: { q_aaaaaa11: 'Sales "East"', q_bbbbbb22: ['M', 'L'] }, has_documents: true, registered_at: '2026-11-05T09:00:00Z',
  }, {
    category: 'Open', status: 'waitlisted', first_name: 'Omer', last_name: '', phone: '0501234567', email: null,
    skill_level: null, partner_name: null, answers: {}, has_documents: false, registered_at: '2026-11-05T09:30:00Z',
  }],
}

describe('rosterToCsv', () => {
  const csv = rosterToCsv(roster, labels)
  const lines = csv.slice(1).trim().split('\r\n')

  it('starts with a UTF-8 BOM so Excel reads Hebrew', () => expect(csv.charCodeAt(0)).toBe(0xfeff))
  it('has the fixed columns, then live questions only', () => {
    expect(lines[0]).toBe('Category,Status,First,Last,Phone,Email,Level,Partner,"Dept, team",Size,Docs,At')
  })
  it('quotes commas and quotes, joins per-participant answers, and neutralises formulas', () => {
    expect(lines[1]).toContain('"Sales ""East"""')
    expect(lines[1]).toContain('M | L')
    expect(lines[1]).toContain("'=cmd")
  })
  it('writes phones as text', () => {
    expect(lines[1]).toContain('(+972) 501234567')
    // CSV-quoted, so the cell's value is the text literal ="0501234567"
    expect(lines[2]).toContain('"=""0501234567"""')
  })
})

describe('phoneCell', () => {
  it('passes the API format through, wraps a bare number as text, strips anything formula-like', () => {
    expect(phoneCell('(+972) 50')).toBe('(+972) 50')
    expect(phoneCell('+972501234567')).toBe('="+972501234567"')
    expect(phoneCell('1+1";x')).toBe('="1+1"')
    expect(phoneCell('')).toBe('')
  })
})

describe('formatAnswer', () => {
  it('reads shared lists and per-participant pairs by the question', () => {
    expect(formatAnswer(['a', 'b'], { per_participant: false }, labels)).toBe('a, b')
    expect(formatAnswer(['a', 'b'], { per_participant: true }, labels)).toBe('a | b')
    expect(formatAnswer(true, { per_participant: false }, labels)).toBe('Yes')
    expect(formatAnswer(undefined, { per_participant: false }, labels)).toBe('')
  })
})
