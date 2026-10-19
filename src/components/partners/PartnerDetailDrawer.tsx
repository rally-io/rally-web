import { useState } from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { PlayerCard } from '@/features/playerGlobe/components/PlayerCard'
import { usePlayerNetwork } from '@/features/playerGlobe/hooks/usePlayerNetwork'
import { buildNetworkIndex } from '@/features/playerGlobe/lib/networkIndex'
import { useReadyViewerId } from '@/hooks/useReadyViewerId'
import { useReturnFocus } from '@/hooks/useReturnFocus'
import { toGlobeNode } from '@/lib/partners/toGlobeNode'
import type { PartnerCard, PartnerDecision } from '@/types/partnerPool'
import { PartnerActions } from './PartnerActions'

/** Until the network loads (cached five minutes) the card shows no partners or rivals. */
const EMPTY_INDEX = buildNetworkIndex({ nodes: [], links: [] })

interface PartnerDetailDrawerProps {
  /** the deck card to show; null closes it */
  card: PartnerCard | null
  onClose: () => void
  onSwipe: (card: PartnerCard, decision: PartnerDecision) => void
  /** Where focus goes on close when what opened the drawer has left the page: a swipe from
      the footer takes the deck card that opened it away. */
  returnFocusFallback?: () => HTMLElement | null
}

/**
 * The globe's player card for a deck card (ported from rally-mobile's PartnerDetailSheet):
 * the same stats, partners and rivals, with pass / like pinned in its footer. Focusing a
 * partner inside switches the card to them, as on the globe; the footer acts only on the deck
 * card, so it hides while anyone else is shown. PlayerCard places itself (a bottom sheet on a
 * phone, a floating panel from `md`); a click on the dimmed area around it closes.
 */
export function PartnerDetailDrawer({ card, onClose, onSwipe, returnFocusFallback }: PartnerDetailDrawerProps) {
  const index = usePlayerNetwork().index ?? EMPTY_INDEX
  const viewerId = useReadyViewerId()
  /** Someone the viewer focused inside the card, remembered for the deck card it came from. */
  const [focus, setFocus] = useState<{ from: string; id: string } | null>(null)
  const returnFocus = useReturnFocus(returnFocusFallback)

  const cardId = card?.player_id ?? null
  const shownId = focus && focus.from === cardId ? focus.id : cardId
  const node = !card ? null : shownId !== card.player_id ? (index.nodeById.get(shownId ?? '') ?? toGlobeNode(card)) : toGlobeNode(card)
  const onDeckCard = card !== null && node?.id === card.player_id

  return (
    <DialogPrimitive.Root open={card !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/60" />
        <DialogPrimitive.Content
          {...returnFocus}
          aria-describedby={undefined}
          data-testid="partner-detail"
          className="fixed inset-0 z-50 outline-none"
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose()
          }}
        >
          {/* Names the dialog for assistive tech; PlayerCard shows the name as its own heading. */}
          <DialogPrimitive.Title asChild>
            <span className="sr-only">{node?.name}</span>
          </DialogPrimitive.Title>
          {card && node && (
            <PlayerCard
              key={node.id}
              node={node}
              index={index}
              viewerId={viewerId}
              onFocus={(id) => setFocus({ from: card.player_id, id })}
              onClose={onClose}
              footer={
                onDeckCard ? (
                  <div data-testid="partner-detail-footer" className="pt-1">
                    <PartnerActions onPass={() => onSwipe(card, 'pass')} onLike={() => onSwipe(card, 'like')} />
                  </div>
                ) : undefined
              }
            />
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
