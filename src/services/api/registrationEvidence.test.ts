import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { AxiosRequestConfig } from 'axios'
import client from './client'
import { uploadRegistrationEvidence, listRegistrationEvidence } from './registrationEvidence'
import type { EvidenceItem } from '@/types/api'

vi.mock('./client', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}))

function makeFile(name: string): File {
  return new File([new Uint8Array(10)], name, { type: 'image/jpeg' })
}

const ITEM: EvidenceItem = {
  id: 'ev-1',
  for_player: 1,
  content_type: 'image/jpeg',
  size_bytes: 10,
  created_at: '2026-09-09T00:00:00Z',
}

describe('uploadRegistrationEvidence', () => {
  beforeEach(() => vi.mocked(client.post).mockReset())

  it('posts a multipart FormData with two files and for_player, overriding the JSON content type', async () => {
    vi.mocked(client.post).mockResolvedValue({ success: true, data: { items: [ITEM] }, meta: null, error: null })

    await uploadRegistrationEvidence('reg-1', 1, [makeFile('a.jpg'), makeFile('b.jpg')])

    expect(client.post).toHaveBeenCalledTimes(1)
    const [url, body, config] = vi.mocked(client.post).mock.calls[0]
    expect(url).toBe('/rally/v1/tournaments/registrations/reg-1/evidence')

    expect(body).toBeInstanceOf(FormData)
    const formData = body as FormData
    expect(formData.getAll('files')).toHaveLength(2)
    expect(formData.get('for_player')).toBe('1')

    // The shared client defaults every request to application/json — this call
    // must clear it so the browser sets its own multipart boundary. Assert the
    // override key is actually present (not merely that the header is absent),
    // since an omitted header would silently fall back to the client's default
    // and send FormData as JSON.
    const headers = (config as AxiosRequestConfig)?.headers as Record<string, unknown> | undefined
    expect(headers).toBeDefined()
    expect('Content-Type' in (headers as object)).toBe(true)
    expect((headers as Record<string, unknown>)['Content-Type']).toBeUndefined()
  })

  it('sends for_player=2 for the second resident', async () => {
    vi.mocked(client.post).mockResolvedValue({ success: true, data: { items: [ITEM] }, meta: null, error: null })

    await uploadRegistrationEvidence('reg-1', 2, [makeFile('a.jpg')])

    const [, body] = vi.mocked(client.post).mock.calls[0]
    expect((body as FormData).get('for_player')).toBe('2')
  })

  it('resolves with only the items this call created', async () => {
    vi.mocked(client.post).mockResolvedValue({ success: true, data: { items: [ITEM] }, meta: null, error: null })

    const result = await uploadRegistrationEvidence('reg-1', 1, [makeFile('a.jpg')])

    expect(result).toEqual([ITEM])
  })

  it('rejects when the response body is success:false, even on an HTTP 200', async () => {
    vi.mocked(client.post).mockResolvedValue({
      success: false,
      error: { code: 'EVIDENCE_UPLOAD_FAILED', message: 'Upload failed', details: null },
    })

    await expect(uploadRegistrationEvidence('reg-1', 1, [makeFile('a.jpg')])).rejects.toEqual({
      code: 'EVIDENCE_UPLOAD_FAILED',
      message: 'Upload failed',
      details: null,
    })
  })
})

describe('listRegistrationEvidence', () => {
  beforeEach(() => vi.mocked(client.get).mockReset())

  it('gets the full live evidence set for a registration', async () => {
    vi.mocked(client.get).mockResolvedValue({ success: true, data: { items: [ITEM] }, meta: null, error: null })

    const result = await listRegistrationEvidence('reg-1')

    expect(client.get).toHaveBeenCalledWith('/rally/v1/tournaments/registrations/reg-1/evidence')
    expect(result).toEqual([ITEM])
  })

  it('rejects when the response body is success:false', async () => {
    vi.mocked(client.get).mockResolvedValue({
      success: false,
      error: { code: 'FORBIDDEN', message: 'Not your registration', details: null },
    })

    await expect(listRegistrationEvidence('reg-1')).rejects.toEqual({
      code: 'FORBIDDEN',
      message: 'Not your registration',
      details: null,
    })
  })
})
