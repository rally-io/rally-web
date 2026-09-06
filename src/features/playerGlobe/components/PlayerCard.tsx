import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { X } from 'lucide-react'
import { Avatar } from '@/components/tournaments/Avatar'
import { FollowButton } from '@/components/players/FollowButton'
import { cn } from '@/lib/utils'
import { TIER_COLOR } from '../constants'
import { useFollow } from '../hooks/useFollow'
import type { NetworkIndex, PeerRef } from '../lib/networkIndex'
import type { GlobeNode } from '../types'
import { PlayerStatsTab } from './PlayerStatsTab'

export interface PlayerCardProps {
  node: GlobeNode
  index: NetworkIndex
  /** the signed-in viewer's id, or null when signed out or their player profile isn't
      ready yet — gates the Follow button and the card's full-stats request (see
      PlayerStatsTab); the page only sets this once the viewer's own profile is `ready`,
      since the two requests it gates 403 for a profile-less viewer */
  viewerId: string | null
  onFocus: (id: string) => void
  onClose: () => void
}

function PeerList({
  label, peers, index, onFocus, accent, className,
}: {
  label: string
  peers: PeerRef[]
  index: NetworkIndex
  onFocus: (id: string) => void
  accent: boolean
  className?: string
}) {
  const { t } = useTranslation()
  return (
    <section className={cn('flex flex-col gap-2', className)} aria-label={label}>
      <h3 className="flex items-center gap-2 text-[11px] font-semibold tracking-[0.08em] text-rally-text-muted">
        <span className={cn('inline-block h-[3px] w-3.5 rounded-sm', accent ? 'bg-rally-accent' : 'bg-slate-300')} />
        {label} · {peers.length}
      </h3>
      {peers.length === 0 ? (
        <p className="text-xs text-rally-text-muted">{t('network.noPeers')}</p>
      ) : (
        <ul className="flex flex-col gap-2" aria-label={label}>
          {peers.map((peer) => {
            const other = index.nodeById.get(peer.id)
            if (!other) return null
            return (
              <li key={peer.id}>
                <button
                  type="button"
                  onClick={() => onFocus(peer.id)}
                  className="flex min-h-[48px] w-full items-center gap-2.5 rounded-2xl border border-rally-border bg-rally-surface-2 px-2.5 py-2 text-start transition-colors hover:border-rally-accent/40"
                >
                  <Avatar name={other.name} src={other.avatarUrl} size={32} />
                  <span className="min-w-0 flex-1 truncate text-sm text-rally-text">{other.name}</span>
                  <span
                    className={cn('shrink-0 text-xs font-semibold tabular-nums', accent ? 'text-rally-accent' : 'text-rally-text-2')}
                  >
                    {t('network.games', { count: peer.games })}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

/** Wires the follow hook to the presentational button for one player. The button itself
    renders nothing until the relationship is known, so there is no flash of a wrong state. */
function PlayerCardFollow({ playerId, viewerId }: { playerId: string; viewerId: string }) {
  const follow = useFollow(playerId, viewerId)
  return (
    <FollowButton
      isFollowing={follow.isFollowing}
      isLoaded={follow.isLoaded}
      isPending={follow.isPending}
      error={follow.error}
      onToggle={follow.toggle}
      // The shared button right-aligns itself for header rows; under the name it should sit
      // on the reading-start side like the name and club above it.
      className="items-start"
    />
  )
}

/** The pinned player. Floats over the stage from `md` up; below that it is a bottom sheet.
    Opens on the Stats tab (career block, level chart, top partners/clubs); Connections holds
    the partner/rival lists, with a phone-only switch between the two lists at narrow widths. */
export function PlayerCard({ node, index, viewerId, onFocus, onClose }: PlayerCardProps) {
  const { t } = useTranslation()
  const [view, setView] = useState<'stats' | 'connections'>('stats')
  const [tab, setTab] = useState<'partners' | 'rivals'>('partners')
  const partners = index.partnersOf.get(node.id) ?? []
  const rivals = index.rivalsOf.get(node.id) ?? []

  return (
    <aside
      className={cn(
        'z-40 flex flex-col gap-4 border border-rally-border bg-rally-surface/95 p-5 shadow-lg backdrop-blur-xl',
        // A fixed sheet height on phones: with max-h the sheet resized to each tab's content,
        // so tapping Connections after Stats dropped the whole sheet (and the tab under the
        // thumb) by a couple hundred pixels. The body scrolls inside; short tabs leave room.
        'fixed inset-x-0 bottom-0 h-[70dvh] rounded-t-[20px]',
        'md:absolute md:inset-x-auto md:bottom-6 md:end-6 md:top-6 md:h-auto md:w-[360px] md:rounded-[20px]',
      )}
      aria-label={t('network.playerCard')}
    >
      <span aria-hidden className="mx-auto h-1 w-10 rounded-full bg-white/25 md:hidden" />

      <header className="flex items-start gap-3">
        {/* The tier ring is the ball's own TIER_COLOR, so the card and the coin the user
            just clicked cannot disagree about what "gold" looks like. */}
        <span
          className={cn('shrink-0 rounded-full border-2', !node.skillTier && 'border-rally-border')}
          style={{ borderColor: node.skillTier ? TIER_COLOR[node.skillTier] : undefined }}
        >
          <Avatar name={node.name} src={node.avatarUrl} size={56} />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-xl font-bold leading-tight text-rally-text" dir="auto">
            {node.name}
          </h2>
          {node.club && (
            <p className="mt-1 truncate text-sm text-rally-text-2">
              {node.club.name} · {node.club.city}
            </p>
          )}
          {viewerId && viewerId !== node.id && (
            // Under the name rather than beside it: the card is ~320px wide on phones and on
            // desktop alike, and a pill in the header row left the name and club ~90px.
            // Keyed by the target player: without it, React reuses the same PlayerCardFollow
            // (and its useFollow instance) across a selection change, and an in-flight follow
            // for the old player can settle after the mutation's own options have rebound to
            // the new one — see useFollow's mutationKey comment for the mechanism.
            <div className="mt-2">
              <PlayerCardFollow key={node.id} playerId={node.id} viewerId={viewerId} />
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label={t('network.close')}
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-rally-border text-rally-text-2 transition-colors hover:text-rally-text"
        >
          <X className="h-4 w-4" />
        </button>
      </header>

      <div className="flex gap-2">
        {(['stats', 'connections'] as const).map((key) => (
          <button
            key={key}
            type="button"
            aria-pressed={view === key}
            onClick={() => setView(key)}
            className={cn(
              'h-11 flex-1 rounded-full text-sm font-semibold transition-colors',
              view === key ? 'bg-rally-accent text-rally-accent-text' : 'border border-rally-border text-rally-text-2',
            )}
          >
            {t(`network.tabs.${key}`)}
          </button>
        ))}
      </div>

      {/* Sibling of the scroll region, not inside it, so it stays reachable while a long
          partner/rival list scrolls underneath it on phone widths. */}
      {view === 'connections' && (
        <div className="flex gap-2 md:hidden">
          {(['partners', 'rivals'] as const).map((key) => (
            <button
              key={key}
              type="button"
              aria-pressed={tab === key}
              onClick={() => setTab(key)}
              className={cn(
                'h-11 flex-1 rounded-full text-sm font-semibold transition-colors',
                tab === key ? 'bg-rally-accent text-rally-accent-text' : 'border border-rally-border text-rally-text-2',
              )}
            >
              {t(`network.${key}`)} · {key === 'partners' ? partners.length : rivals.length}
            </button>
          ))}
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto">
        {view === 'stats' ? (
          <PlayerStatsTab node={node} viewerId={viewerId} />
        ) : (
          <div className="flex flex-col gap-4">
            <PeerList
              label={t('network.partners')}
              peers={partners}
              index={index}
              onFocus={onFocus}
              accent
              className={cn(tab !== 'partners' && 'hidden md:flex')}
            />
            <PeerList
              label={t('network.rivals')}
              peers={rivals}
              index={index}
              onFocus={onFocus}
              accent={false}
              className={cn(tab !== 'rivals' && 'hidden md:flex')}
            />
          </div>
        )}
      </div>
    </aside>
  )
}
