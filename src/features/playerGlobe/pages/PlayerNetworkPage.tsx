import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAppSession } from '@/hooks/useAppSession'
import { useAuth } from '@/hooks/useAuth'
import { useAuthGate } from '@/hooks/useAuthGate'
import { cn } from '@/lib/utils'
import { NetworkSearch } from '../components/NetworkSearch'
import { PlayerCard } from '../components/PlayerCard'
import { PlayerGlobe } from '../components/PlayerGlobe'
import { DEFAULT_BACKGROUND } from '../constants'
import { useNodeSearch } from '../hooks/useNodeSearch'
import type { PlayerGlobeHandle } from '../hooks/usePlayerGlobe'
import { usePlayerNetwork } from '../hooks/usePlayerNetwork'

/* The ball is the hero: the stage starts right under the navbar and fills the viewport
   (minus the sticky navbar, 95px at desktop widths, measured). Everything else floats over
   it — a glass panel on the start edge with the title line, the search and "find me"
   (a slim bar over the top of the stage on phones), and the pinned player on the end edge
   (a bottom sheet on phones), so search and card never collide. */
export default function PlayerNetworkPage() {
  const { t } = useTranslation()
  const { graph, index, isLoading, isError, refetch } = usePlayerNetwork()
  /* A network node's id IS the Supabase auth uid (players.id == rally_users.user_id), so the
     signed-in user's own id is the only thing "find me" needs — no profile fetch. The player
     profile payload has no id field at all, so it could never have answered this. */
  const { session } = useAuth()
  const myId = session?.user?.id ?? null
  /* A signed-in viewer with no player row yet (profile incomplete) 403s on both the
     consumer stats endpoint and the social-profile endpoint; the client interceptor takes
     that 403 as "go finish your profile" and navigates the whole page to /profile/edit
     mid-card-open. Gate the two signed-in-only requests on the session actually being
     `ready`, not just present — the card itself still opens for any signed-in viewer
     (see `myId` below), it just shows the public career block only until the profile
     exists. */
  const { status: appSessionStatus } = useAppSession()
  const readyViewerId = myId && appSessionStatus === 'ready' ? myId : null
  const { requireSignIn } = useAuthGate()
  const globeRef = useRef<PlayerGlobeHandle>(null)

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<string | null>(null)
  const [pendingFindMe, setPendingFindMe] = useState(false)
  const [pendingOpen, setPendingOpen] = useState<string | null>(null)
  const results = useNodeSearch(index, query)

  const focus = useCallback((id: string) => {
    setStatus(null)
    setQuery('')
    setSelectedId(id)
    globeRef.current?.focusPlayer(id)
  }, [])

  /* The ball, hover and search stay public — opening a player (the card with stats and
     connections) is the sign-in moment. Every path that can open a player (globe click,
     search pick, a card row) funnels through here. */
  const openPlayer = useCallback(
    (id: string) => {
      if (myId) {
        focus(id)
        return
      }
      requireSignIn()
        .then(() => setPendingOpen(id))
        .catch(() => setPendingOpen(null))
    },
    [myId, focus, requireSignIn],
  )
  useEffect(() => {
    if (!pendingOpen || !myId || !index) return
    setPendingOpen(null)
    focus(pendingOpen)
  }, [pendingOpen, myId, index, focus])

  const locate = useCallback(
    (id: string) => {
      if (index?.nodeById.has(id)) focus(id)
      else setStatus(t('network.findMeNotOnBall'))
    },
    [index, focus, t],
  )

  /* One lookup covers every state: signed in and on the ball → pinned; signed in but with no
     matches yet (or no player row at all) → the "not on the ball yet" line; signed out → the
     gate, then the effect below finishes once the session lands. */
  const findMe = useCallback(() => {
    setStatus(null)
    if (myId) {
      locate(myId)
      return
    }
    // The session arrives asynchronously after the gate resolves; the effect below finishes.
    requireSignIn()
      .then(() => setPendingFindMe(true))
      .catch(() => setPendingFindMe(false))
  }, [myId, locate, requireSignIn])

  useEffect(() => {
    if (!pendingFindMe || !index || !myId) return
    setPendingFindMe(false)
    locate(myId)
  }, [pendingFindMe, index, myId, locate])

  // Set, not restored — the same as every other titled page in the app (ClubDetailPage).
  useEffect(() => {
    document.title = t('network.pageTitle')
  }, [t])

  const close = useCallback(() => {
    setSelectedId(null)
    globeRef.current?.clearSelection()
  }, [])

  const selected = selectedId && index ? (index.nodeById.get(selectedId) ?? null) : null
  const empty = graph !== null && graph.nodes.length === 0

  return (
    <main className="relative">
      <section
        className="relative h-[calc(100dvh-95px)] max-h-[900px] min-h-[520px] w-full"
        style={{ background: DEFAULT_BACKGROUND }}
      >
        {/* The search panel. Start edge on purpose — the right in Hebrew, the left in
            English — because the player card is anchored to the end edge. Results drop from
            the search row over the ball; the panel must not clip them. */}
        <div
          className={cn(
            'absolute z-30 border border-rally-border bg-rally-surface/90 shadow-lg backdrop-blur-xl',
            'inset-x-3 top-3 rounded-2xl p-2.5',
            'md:inset-x-auto md:start-6 md:top-6 md:w-[380px] md:rounded-[20px] md:p-5',
          )}
        >
          <div className="hidden md:block">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-rally-accent">{t('network.eyebrow')}</p>
            <h1 className="mt-2 mb-4 font-display text-2xl font-black leading-tight tracking-tight text-rally-text">
              {t('network.panelTitle')}
            </h1>
          </div>
          <NetworkSearch
            query={query}
            onQueryChange={setQuery}
            results={results}
            onPick={openPlayer}
            onFindMe={findMe}
            statusMessage={status}
            disabled={!index}
          />
        </div>

        {graph && index && !empty && (
          <PlayerGlobe
            ref={globeRef}
            graph={graph}
            index={index}
            className="absolute inset-0"
            onSelect={(id) => {
              if (!id) {
                setSelectedId(null)
                return
              }
              setQuery('')
              setStatus(null)
              if (myId) setSelectedId(id)
              else {
                globeRef.current?.clearSelection()
                openPlayer(id)
              }
            }}
          />
        )}
        {isLoading && !graph && (
          <p className="absolute inset-0 grid place-items-center text-sm tracking-[0.08em] text-rally-text-muted">
            {t('network.loading')}
          </p>
        )}
        {isError && !graph && (
          <div className="absolute inset-0 grid place-items-center">
            <div className="text-center">
              <p className="mb-4 text-rally-text-2">{t('network.error')}</p>
              <button
                type="button"
                onClick={refetch}
                className="rounded-full border border-rally-border px-5 py-2.5 text-sm font-semibold text-rally-text transition-colors hover:border-rally-accent/40"
              >
                {t('network.retry')}
              </button>
            </div>
          </div>
        )}
        {empty && (
          <p className="absolute inset-0 grid place-items-center px-6 text-center text-rally-text-2">{t('network.empty')}</p>
        )}
        {selected && index && myId && (
          <PlayerCard node={selected} index={index} viewerId={readyViewerId} onFocus={openPlayer} onClose={close} />
        )}
      </section>
    </main>
  )
}
