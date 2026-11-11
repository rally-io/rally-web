import type { CustomQuestion, PublicRoster, RosterRow } from './types'

const FORMULA_PREFIXES = ['=', '+', '-', '@', '\t', '\r']

/** Excel/Sheets read a cell starting with these as a formula. Same guard as rally-api's csv_export. */
function safeText(value: string): string {
  return FORMULA_PREFIXES.includes(value.charAt(0)) ? `'${value}` : value
}

function quote(cell: string): string {
  return /[",\r\n]/.test(cell) ? `"${cell.replace(/"/g, '""')}"` : cell
}

/**
 * A phone as TEXT. rally-api already sends "(+972) 501234567" — the leading "(" stops Excel
 * dropping zeros or reading a formula — and that passes through. Anything else (a bare
 * "0501234567" or "+972…") goes in as a text literal, after stripping everything a phone cannot
 * contain so the literal cannot be made to carry a formula.
 */
export function phoneCell(phone: string): string {
  const trimmed = phone.trim()
  if (!trimmed) return ''
  if (trimmed.startsWith('(')) return trimmed
  return `="${trimmed.replace(/[^\d+\-() ]/g, '')}"`
}

export interface AnswerLabels { yes: string; no: string }

function single(value: unknown, labels: AnswerLabels): string {
  if (value === undefined || value === null) return ''
  if (typeof value === 'boolean') return value ? labels.yes : labels.no
  if (Array.isArray(value)) return value.map((v) => single(v, labels)).join(', ')
  return String(value)
}

/**
 * One answer as display text. The question says how to read it: a per-participant answer is
 * `[p1, p2]` and joins with " | "; a shared multiselect is a plain list and joins with ", ".
 */
export function formatAnswer(value: unknown, question: Pick<CustomQuestion, 'per_participant'>, labels: AnswerLabels): string {
  if (question.per_participant && Array.isArray(value)) return value.map((v) => single(v, labels)).join(' | ')
  return single(value, labels)
}

export interface CsvLabels extends AnswerLabels {
  category: string
  status: string
  statusValues: Record<RosterRow['status'], string>
  firstName: string
  lastName: string
  phone: string
  email: string
  level: string
  partner: string
  documents: string
  registeredAt: string
}

/** The roster as a UTF-8-BOM CSV string (the BOM is what makes Excel read Hebrew correctly). */
export function rosterToCsv(roster: PublicRoster, labels: CsvLabels): string {
  const questions = roster.questions.filter((q) => !q.archived)
  const header = [
    labels.category, labels.status, labels.firstName, labels.lastName, labels.phone, labels.email,
    labels.level, labels.partner, ...questions.map((q) => q.label), labels.documents, labels.registeredAt,
  ]
  const lines = [header.map((h) => quote(safeText(h))).join(',')]
  for (const row of roster.rows) {
    const cells = [
      safeText(row.category),
      labels.statusValues[row.status] ?? row.status,
      safeText(row.first_name),
      safeText(row.last_name),
      phoneCell(row.phone),
      safeText(row.email ?? ''),
      row.skill_level == null ? '' : String(row.skill_level),
      safeText(row.partner_name ?? ''),
      ...questions.map((q) => safeText(formatAnswer(row.answers[q.id], q, labels))),
      row.has_documents ? labels.yes : labels.no,
      row.registered_at,
    ]
    lines.push(cells.map(quote).join(','))
  }
  return `\uFEFF${lines.join('\r\n')}\r\n`
}

/** Browser download of a CSV string. */
export function downloadCsv(filename: string, csv: string): void {
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
