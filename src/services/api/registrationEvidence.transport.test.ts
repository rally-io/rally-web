import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { AxiosAdapter, AxiosRequestConfig } from 'axios'
import client from './client'
import { uploadRegistrationEvidence } from './registrationEvidence'

/**
 * The one test in this repo that lets real axios run.
 *
 * `registrationEvidence.test.ts` mocks `./client` wholesale, so it can only
 * check the SHAPE of the config object the upload passes. That cannot catch the
 * failure this file exists for: axios's `transformRequest` JSON-encodes a
 * FormData body whenever the request's content type says json, and the shared
 * client defaults every request to `application/json`. The upload's
 * `Content-Type: undefined` override is the only thing stopping that. If an
 * axios upgrade ever changes how per-request headers merge, every proof of
 * address would post as `{}`, the server would reject it, the page's upload
 * closure would swallow the error, and the player would sit looking at
 * "0 files attached" with a picker that appears to do nothing.
 *
 * A stub adapter runs AFTER `transformRequest` and instead of xhr/fetch, so the
 * discriminating assertion is what the body actually IS by that point — a
 * FormData instance, or a JSON string. Deliberately not the header: on this path
 * axios has already rewritten it to `application/x-www-form-urlencoded`, and on a
 * `postForm` path it would read `multipart/form-data`. Neither is `undefined`,
 * so asserting the header here would prove nothing.
 */
describe('evidence upload transport (real axios, stub adapter)', () => {
  const originalAdapter = client.defaults.adapter
  let seen: AxiosRequestConfig | null = null

  beforeEach(() => {
    seen = null
    const stub: AxiosAdapter = (config) => {
      seen = config
      return Promise.resolve({
        data: { success: true, data: { items: [] }, meta: null, error: null },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: config as never,
      })
    }
    client.defaults.adapter = stub
  })

  afterEach(() => {
    client.defaults.adapter = originalAdapter
    vi.restoreAllMocks()
  })

  it('reaches the transport still carrying FormData, not a JSON-encoded body', async () => {
    const file = new File([new Uint8Array(10)], 'arnona.jpg', { type: 'image/jpeg' })

    await uploadRegistrationEvidence('reg-1', 1, [file])

    expect(seen).not.toBeNull()
    const config = seen as unknown as AxiosRequestConfig
    // The assertion that matters. `transformRequest` has already run by here.
    expect(config.data).toBeInstanceOf(FormData)
    expect(typeof config.data).not.toBe('string')

    const body = config.data as FormData
    expect(body.getAll('files')).toHaveLength(1)
    expect(body.get('for_player')).toBe('1')
  })

  it('would fail loudly if the content-type override were dropped', async () => {
    // Same request WITHOUT the override, proving the guard in
    // registrationEvidence.ts is load-bearing rather than decorative: with the
    // client's json default left in place, axios turns the FormData into a string.
    const body = new FormData()
    body.append('files', new File([new Uint8Array(10)], 'arnona.jpg', { type: 'image/jpeg' }))
    body.append('for_player', '1')

    await client.post('/rally/v1/tournaments/registrations/reg-1/evidence', body)

    const config = seen as unknown as AxiosRequestConfig
    expect(typeof config.data).toBe('string')
  })
})
