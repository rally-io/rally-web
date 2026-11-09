import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../api', async (orig) => ({ ...(await orig<typeof import('../api')>()), uploadCorporateEvidence: vi.fn() }))
import { uploadCorporateEvidence } from '../api'
import { uploadAllEvidence } from '../evidence'

const file = (n: string) => new File(['x'], n, { type: 'application/pdf' })
// Braces matter: an arrow returning the mock makes vitest call it as a teardown hook.
beforeEach(() => { vi.mocked(uploadCorporateEvidence).mockReset() })

describe('uploadAllEvidence', () => {
  it('uploads each participant independently with the registration token', async () => {
    vi.mocked(uploadCorporateEvidence).mockResolvedValue(undefined)
    const out = await uploadAllEvidence('r1', 'tok', { 1: [file('a')], 2: [file('b'), file('c')] }, [1, 2])
    expect(out).toEqual({ 1: { outcome: 'ok' }, 2: { outcome: 'ok' } })
    expect(uploadCorporateEvidence).toHaveBeenCalledWith('r1', 'tok', 1, expect.any(Array))
    expect(uploadCorporateEvidence).toHaveBeenCalledWith('r1', 'tok', 2, expect.any(Array))
  })

  it('one participant failing never blocks the other and never throws', async () => {
    vi.mocked(uploadCorporateEvidence).mockImplementation(async (_r, _t, slot) => { if (slot === 1) throw { code: 'INVALID_DOCUMENT' } })
    const out = await uploadAllEvidence('r1', 'tok', { 1: [file('a')], 2: [file('b')] }, [1, 2])
    expect(out).toEqual({ 1: { outcome: 'failed', code: 'INVALID_DOCUMENT' }, 2: { outcome: 'ok' } })
  })

  it('survives every upload failing', async () => {
    vi.mocked(uploadCorporateEvidence).mockImplementation(async () => { throw { status: null, code: 'NETWORK_ERROR' } })
    const out = await uploadAllEvidence('r1', 'tok', { 1: [file('a')], 2: [file('b')] }, [1, 2])
    expect(out).toEqual({ 1: { outcome: 'failed', code: 'NETWORK_ERROR' }, 2: { outcome: 'failed', code: 'NETWORK_ERROR' } })
  })

  it('skips participants with no files without calling the API for them', async () => {
    vi.mocked(uploadCorporateEvidence).mockResolvedValue(undefined)
    const out = await uploadAllEvidence('r1', 'tok', { 1: [], 2: [file('b')] }, [1, 2])
    expect(out).toEqual({ 1: { outcome: 'skipped' }, 2: { outcome: 'ok' } })
    expect(uploadCorporateEvidence).toHaveBeenCalledTimes(1)
  })
})
