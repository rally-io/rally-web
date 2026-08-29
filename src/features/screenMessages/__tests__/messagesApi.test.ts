import client from '@/services/api/client'
import { getScreenMessages, acknowledgeMessage, dismissMessage } from '../api/messages'

vi.mock('@/services/api/client', () => ({
  default: { get: vi.fn(), post: vi.fn() },
}))
vi.mock('@/i18n', () => ({ default: { language: 'en' } }))

const mockGet = vi.mocked(client.get)
const mockPost = vi.mocked(client.post)

beforeEach(() => {
  vi.clearAllMocks()
  mockGet.mockResolvedValue({ success: true, data: [] })
  mockPost.mockResolvedValue({ success: true, data: { acknowledged: true } })
})

describe('getScreenMessages', () => {
  it('calls the collection path with NO trailing slash', async () => {
    // redirect_slashes=False is set app-wide in rally-api, so a trailing
    // slash 404s rather than redirecting. This endpoint is deliberately
    // unlike /rally/v1/tournaments/ and /rally/v1/events/, which need one.
    await getScreenMessages({ scope: 'tournament', id: 't-1' })
    expect(mockGet).toHaveBeenCalledWith('/rally/v1/messages', expect.anything())
  })

  it('sends the scope and id as params', async () => {
    await getScreenMessages({ scope: 'tournament', id: 't-1' })
    expect(mockGet.mock.calls[0][1]).toMatchObject({
      params: { scope: 'tournament', id: 't-1' },
    })
  })

  it('omits id entirely for the global scope', async () => {
    await getScreenMessages({ scope: 'global' })
    expect('id' in (mockGet.mock.calls[0][1] as any).params).toBe(false)
  })

  it('sends no Accept-Language override', async () => {
    // A message has ONE language — the one its author typed — so there is
    // nothing for the server to resolve. The override used to desynchronise
    // from the register call, which carried the BROWSER's language: the
    // acceptance receipt could then attest to a locale the player never had on
    // screen. Removing it removes that whole class of mismatch.
    await getScreenMessages({ scope: 'club', id: 'c-1' })
    expect((mockGet.mock.calls[0][1] as any).headers).toBeUndefined()
  })
})

describe('acknowledgeMessage / dismissMessage', () => {
  it('posts the version to the acknowledge path', async () => {
    await acknowledgeMessage('m-1', 3)
    expect(mockPost).toHaveBeenCalledWith(
      '/rally/v1/messages/m-1/acknowledge',
      { version: 3 },
    )
  })

  it('posts the version to the dismiss path', async () => {
    await dismissMessage('m-1', 3)
    expect(mockPost).toHaveBeenCalledWith(
      '/rally/v1/messages/m-1/dismiss',
      { version: 3 },
    )
  })
})
