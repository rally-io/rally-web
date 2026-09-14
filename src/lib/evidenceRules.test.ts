import { describe, it, expect } from 'vitest'
import {
  EVIDENCE_MAX_FILES,
  EVIDENCE_MAX_BYTES,
  EVIDENCE_ACCEPT,
  validateEvidenceFiles,
  waivedAmount,
} from './evidenceRules'

function makeFile(name: string, type: string, sizeBytes = 100): File {
  return new File([new Uint8Array(sizeBytes)], name, { type })
}

describe('validateEvidenceFiles — count', () => {
  it('allows up to EVIDENCE_MAX_FILES total (existing + incoming)', () => {
    const existing = [makeFile('a.jpg', 'image/jpeg')]
    const incoming = [makeFile('b.jpg', 'image/jpeg')]
    expect(existing.length + incoming.length).toBe(EVIDENCE_MAX_FILES)
    expect(validateEvidenceFiles(existing, incoming)).toBeNull()
  })

  it('rejects when existing + incoming exceeds EVIDENCE_MAX_FILES', () => {
    const existing = [makeFile('a.jpg', 'image/jpeg'), makeFile('b.jpg', 'image/jpeg')]
    const incoming = [makeFile('c.jpg', 'image/jpeg')]
    expect(validateEvidenceFiles(existing, incoming)).toBe('evidenceTooMany')
  })

  it('rejects a single incoming batch that alone exceeds the max', () => {
    const incoming = [makeFile('a.jpg', 'image/jpeg'), makeFile('b.jpg', 'image/jpeg'), makeFile('c.jpg', 'image/jpeg')]
    expect(validateEvidenceFiles([], incoming)).toBe('evidenceTooMany')
  })
})

describe('validateEvidenceFiles — type', () => {
  it('accepts every type in EVIDENCE_ACCEPT', () => {
    for (const type of EVIDENCE_ACCEPT.split(',')) {
      expect(validateEvidenceFiles([], [makeFile('f', type)])).toBeNull()
    }
  })

  it('rejects a disallowed mime type', () => {
    expect(validateEvidenceFiles([], [makeFile('f.txt', 'text/plain')])).toBe('evidenceBadFile')
  })
})

describe('validateEvidenceFiles — size', () => {
  it('accepts a file at exactly EVIDENCE_MAX_BYTES', () => {
    const file = makeFile('a.jpg', 'image/jpeg', EVIDENCE_MAX_BYTES)
    expect(validateEvidenceFiles([], [file])).toBeNull()
  })

  it('rejects a file over EVIDENCE_MAX_BYTES', () => {
    const file = makeFile('a.jpg', 'image/jpeg', EVIDENCE_MAX_BYTES + 1)
    expect(validateEvidenceFiles([], [file])).toBe('evidenceBadFile')
  })
})

describe('waivedAmount', () => {
  it('one resident of a doubles pair halves the fee', () => {
    expect(waivedAmount(150, 2, 1)).toBe(75)
  })

  it('two residents of a doubles pair waive the whole fee', () => {
    expect(waivedAmount(150, 2, 2)).toBe(0)
  })

  it('the sole player of a singles entry waives the whole fee', () => {
    expect(waivedAmount(150, 1, 1)).toBe(0)
  })

  it('no residents declared leaves the fee untouched', () => {
    expect(waivedAmount(150, 2, 0)).toBe(150)
  })
})
