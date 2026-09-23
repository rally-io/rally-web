import { useAppSession } from '@/hooks/useAppSession'
import { useAuth } from '@/hooks/useAuth'

/**
 * The signed-in viewer's id, but ONLY once their own player profile exists — the single
 * gate every signed-in-only, viewer-scoped request on a public surface must pass.
 *
 * A signed-in viewer with no player row yet (profile incomplete) 403s on the consumer
 * endpoints (`/rally/v1/players/:id/stats`, `/rally/v1/social/profile/:id`); the shared
 * client's interceptor reads that 403 as "go finish your profile" and navigates the whole
 * page to /profile/edit. On a page whose primary visitor came to READ, that is not a
 * silent failure — it is the visitor losing the page. So the id is withheld until the app
 * session is `ready`, which disables those queries at the hook that consumes it.
 *
 * `null` covers all three of: signed out, session still loading, and signed in without a
 * player row. Callers must treat it as "ask for nothing extra", never as an error.
 *
 * A network node's id IS the Supabase auth uid (players.id == rally_users.user_id), so the
 * session's user id is directly comparable to a player id — no profile fetch needed.
 */
export function useReadyViewerId(): string | null {
  const { session } = useAuth()
  const { status } = useAppSession()
  const myId = session?.user?.id ?? null
  return myId && status === 'ready' ? myId : null
}
