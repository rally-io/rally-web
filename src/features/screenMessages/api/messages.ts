import client from '@/services/api/client'
import type { ApiResponse } from '@/types/api'
import type { ScreenMessage, ScreenMessagesQuery } from '../types'

/** No trailing slash. `redirect_slashes=False` is set app-wide in rally-api, so
 *  `/rally/v1/messages/` 404s rather than redirecting — unlike the collection
 *  endpoints this repo already calls (`/rally/v1/tournaments/`). */
const BASE = '/rally/v1/messages'

// No Accept-Language override here any more. A message has ONE language — the
// one its author typed — so there is nothing for the server to resolve, and the
// header cannot desynchronise from the register call the way it used to: message
// reads carried the UI language while POST /register carried the browser's, so a
// receipt could attest to a locale the player never had on screen.

export async function getScreenMessages(
  query: ScreenMessagesQuery,
): Promise<ApiResponse<ScreenMessage[]>> {
  const params: Record<string, string> = { scope: query.scope }
  if (query.id) params.id = query.id
  return client.get(BASE, { params })
}

export async function acknowledgeMessage(
  messageId: string,
  version: number,
): Promise<ApiResponse<{ acknowledged: boolean }>> {
  return client.post(`${BASE}/${messageId}/acknowledge`, { version })
}

export async function dismissMessage(
  messageId: string,
  version: number,
): Promise<ApiResponse<{ dismissed: boolean }>> {
  return client.post(`${BASE}/${messageId}/dismiss`, { version })
}
