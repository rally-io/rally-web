import { useEffect, useRef, useState, type CSSProperties, type ReactNode, type RefObject } from 'react'
import { useTranslation } from 'react-i18next'
import { LevelChip, describeLevel } from '@/components/players/level'
import { Avatar } from '@/components/tournaments/Avatar'
import { NO_TIER_COLOR, TIER_COLOR } from '@/features/playerGlobe/constants'
import { courtPlacement, type CourtHalf } from '@/lib/partners/court'
import { COURT_SIDES, formatReasons } from '@/lib/partners/reasons'
import { globeTierOf } from '@/lib/partners/toGlobeNode'
import { cn } from '@/lib/utils'
import type { PartnerCard as PartnerCardData } from '@/types/partnerPool'
import { PartnerCourt, type CourtSide } from './PartnerCourt'

/** The signed-in player, drawn as a faint "you" on the court next to the card's player. */
export interface CourtViewer {
  side: string | null
  name: string
  avatarUrl: string | null
}

/**
 * Where the avatar stands, as a slice of the court's width. Physical (`left`, never `start`):
 * a right-side player is on the right in Hebrew too. The halves' centres sit a little inside
 * the quarter marks because the court narrows towards the net.
 */
const PLAYER_SLOT: Record<CourtHalf | 'centre', CSSProperties> = {
  left: { left: '10%', width: '40%' },
  right: { left: '50%', width: '40%' },
  centre: { left: '0%', width: '100%' },
}

/** The viewer's marker beside the card's player, as a share of the player's avatar. */
const YOU_SCALE = 0.5
const AVATAR_DEFAULT = 88

/**
 * One deck card (ported from rally-mobile's PartnerCard): the player's half of a padel court
 * on top, with them standing on the side they play and, when the viewer's side is known, a
 * faint "you" where `courtPlacement` puts the viewer. Below: name and club, badges, level /
 * matches / wins, and up to three "Why you two" lines. Purely presentational: the stack owns
 * the pointer, the click and the keys.
 */
export function PartnerCard({ card, viewer }: { card: PartnerCardData; viewer?: CourtViewer }) {
  const { t } = useTranslation()
  const tier = globeTierOf(card)
  const tierColor = tier ? TIER_COLOR[tier] : NO_TIER_COLOR
  const reasons = formatReasons(t, card.reasons)
  const isNew = card.matches_played === 0 || card.win_rate == null
  const side: CourtSide = card.court_side && COURT_SIDES.has(card.court_side) ? (card.court_side as CourtSide) : null

  return (
    <article
      data-testid={`partner-card-${card.player_id}`}
      className="flex h-full flex-col overflow-hidden rounded-3xl border border-rally-border bg-rally-surface"
    >
      <CourtHero card={card} side={side} viewer={viewer} tierColor={tierColor} />

      <div className="flex flex-col gap-3 px-[18px] pb-4 pt-3.5">
        <div className="flex flex-col items-center gap-0.5 text-center">
          <h2 dir="auto" className="w-full truncate font-display text-[26px] font-black leading-tight text-rally-text">
            {card.name}
          </h2>
          {card.club && (
            <p className="w-full truncate text-sm text-rally-text-2">
              {card.club.name} · {card.club.city}
            </p>
          )}
          {card.since > 0 && (
            <p data-testid="partner-card-since" className="text-xs text-rally-text-muted">
              {t('partners.since', { year: card.since })}
            </p>
          )}
        </div>

        {(card.likes_you || card.looking || card.ring === 3) && (
          <div className="flex flex-wrap justify-center gap-2">
            {card.likes_you && <Badge label={t('partners.likesYou')} accent testId="partner-badge-likes-you" />}
            {card.looking && <Badge label={t('partners.lookingBadge')} testId="partner-badge-looking" />}
            {card.ring === 3 && <Badge label={t('partners.outsideNetwork')} testId="partner-badge-outside" />}
          </div>
        )}

        <div data-testid="partner-tiles" className="flex items-stretch rounded-2xl bg-rally-surface-2 py-2.5">
          <Stat label={t('partners.tile.level')} testId="partner-tile-level">
            {card.skill_level != null ? (
              <span className="inline-flex items-center gap-1.5">
                <LevelChip descriptor={describeLevel(card.skill_level, card.level_verified, card.level_reliability)} />
                {card.skill_tier && <span className="text-xs font-extrabold text-rally-text-muted">{card.skill_tier}</span>}
              </span>
            ) : (
              <span className="text-xl font-extrabold text-rally-text">—</span>
            )}
          </Stat>
          <span aria-hidden className="my-1 w-px bg-rally-border-subtle" />
          <Stat label={t('partners.tile.matches')} testId="partner-tile-matches">
            <span className="text-xl font-extrabold tabular-nums text-rally-text">{card.matches_played}</span>
          </Stat>
          <span aria-hidden className="my-1 w-px bg-rally-border-subtle" />
          <Stat label={t('partners.tile.wins')} testId="partner-tile-wins">
            <span className={cn('text-center font-extrabold tabular-nums text-rally-text', isNew ? 'text-xs' : 'text-xl')}>
              {isNew ? t('partners.newToRally') : `${Math.round(card.win_rate as number)}%`}
            </span>
          </Stat>
        </div>

        {reasons.length > 0 && (
          <section data-testid="partner-reasons" className="flex flex-col gap-1.5">
            <h3 className="text-[13px] font-extrabold text-rally-text-2">{t('partners.whyYouTwo')}</h3>
            {reasons.map((line) => (
              <p key={line} className="flex items-center gap-2">
                <span aria-hidden className="h-1.5 w-1.5 shrink-0 rounded-full bg-rally-accent" />
                <span data-testid="partner-reason" className="min-w-0 flex-1 truncate text-[15px] text-rally-text">
                  {line}
                </span>
              </p>
            ))}
          </section>
        )}
      </div>
    </article>
  )
}

/** The hero's height, kept live where ResizeObserver exists (not in jsdom). */
function useHeight(): [RefObject<HTMLDivElement>, number | null] {
  const ref = useRef<HTMLDivElement>(null)
  const [height, setHeight] = useState<number | null>(null)
  useEffect(() => {
    const el = ref.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(([entry]) => setHeight(entry.contentRect.height))
    observer.observe(el)
    return () => observer.disconnect()
  }, [])
  return [ref, height]
}

/** The half court with the player on their side. Grows to fill the card's spare height. */
function CourtHero({
  card,
  side,
  viewer,
  tierColor,
}: {
  card: PartnerCardData
  side: CourtSide
  viewer?: CourtViewer
  tierColor: string
}) {
  const { t } = useTranslation()
  const [ref, height] = useHeight()
  // The avatar scales with the room it gets: small phones keep the stats in view.
  const avatarSize = height ? Math.round(Math.min(104, Math.max(64, height * 0.46))) : AVATAR_DEFAULT
  const placement = courtPlacement(side, viewer?.side)
  const youSize = Math.round(avatarSize * YOU_SCALE)
  // Same half: the marker overlaps the player's ring on the outer edge, so the clash shows.
  const sameHalf = placement.you !== null && placement.you === placement.them
  const you = viewer && placement.you ? <YouMarker viewer={viewer} size={youSize} /> : null

  return (
    <div
      ref={ref}
      data-testid="partner-court"
      className="relative min-h-[132px] flex-1 border-b border-rally-border bg-rally-bg"
    >
      <PartnerCourt side={side} />

      {you && !sameHalf && (
        <div
          data-testid="partner-court-you-slot"
          className="pointer-events-none absolute inset-y-0 flex items-center justify-center pt-[6%]"
          style={PLAYER_SLOT[placement.you as CourtHalf]}
        >
          {you}
        </div>
      )}

      <div
        data-testid="partner-court-player"
        className="pointer-events-none absolute inset-y-0 flex items-center justify-center pt-[6%]"
        style={PLAYER_SLOT[placement.them]}
      >
        <div className="relative">
          <span
            data-testid="partner-card-ring"
            className="block rounded-full border-[3px] bg-rally-bg p-[3px]"
            style={{ borderColor: tierColor, boxShadow: `0 0 14px ${tierColor}8c` }}
          >
            <Avatar name={card.name} src={card.avatar_url} size={avatarSize} />
          </span>
          {you && sameHalf && (
            <div
              className="absolute -bottom-[18px]"
              style={placement.them === 'left' ? { left: -youSize * 0.45 } : { right: -youSize * 0.45 }}
            >
              {you}
            </div>
          )}
        </div>
      </div>

      {side && (
        <div
          data-testid="partner-tile-side"
          className="absolute bottom-2.5 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-xl bg-rally-surface-2 px-3 py-1 text-xs"
        >
          <span className="text-rally-text-muted">{t('partners.tile.side')}</span>
          <span className="whitespace-nowrap font-extrabold text-rally-accent">{t(`partners.side.${side}`)}</span>
        </div>
      )}
    </div>
  )
}

/** The viewer, faint and dashed, so the card's player stays the subject. */
function YouMarker({ viewer, size }: { viewer: CourtViewer; size: number }) {
  const { t } = useTranslation()
  return (
    <div data-testid="partner-court-you" className="flex flex-col items-center gap-1 opacity-80">
      <span className="block rounded-full border-2 border-dashed border-white/55 p-0.5">
        <Avatar name={viewer.name} src={viewer.avatarUrl} size={size} />
      </span>
      <span className="text-[11px] font-extrabold text-rally-text-2">{t('partners.you')}</span>
    </div>
  )
}

function Stat({ label, testId, children }: { label: string; testId: string; children: ReactNode }) {
  return (
    <div data-testid={testId} className="flex flex-1 flex-col items-center justify-between gap-1 px-1">
      <div className="flex min-h-7 items-center justify-center">{children}</div>
      <span className="truncate text-[11px] text-rally-text-muted">{label}</span>
    </div>
  )
}

function Badge({ label, accent = false, testId }: { label: string; accent?: boolean; testId: string }) {
  return (
    <span
      data-testid={testId}
      className={cn(
        'truncate rounded-xl border px-2.5 py-1 text-xs font-bold',
        accent ? 'border-rally-accent bg-rally-accent text-rally-accent-text' : 'border-rally-border text-rally-text-2',
      )}
    >
      {label}
    </span>
  )
}
