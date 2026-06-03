// src/components/payment/SavedCardRow.tsx
import { useTranslation } from 'react-i18next'
import type { SavedCard } from '@/types/api'
import { CardBrandIcon } from './CardBrandIcon'

interface Props {
  card: SavedCard
  selected: boolean
  onSelect: (cardId: string) => void
}

function formatExpiry(mmyy: string): string {
  if (mmyy.length !== 4) return mmyy
  return `${mmyy.slice(0, 2)}/${mmyy.slice(2)}`
}

export function SavedCardRow({ card, selected, onSelect }: Props) {
  const { t } = useTranslation()
  return (
    <button
      type="button"
      onClick={() => onSelect(card.id)}
      className={`w-full flex items-center gap-3 rounded-2xl border px-4 py-3 text-start transition-colors ${
        selected
          ? 'border-rally-accent bg-rally-accent/5'
          : 'border-rally-border bg-rally-surface hover:border-rally-accent/40'
      }`}
      aria-pressed={selected}
    >
      <span
        className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
          selected ? 'border-rally-accent' : 'border-rally-border'
        }`}
        aria-hidden="true"
      >
        {selected && <span className="w-2.5 h-2.5 rounded-full bg-rally-accent" />}
      </span>
      <CardBrandIcon brand={card.brand} />
      <div className="flex-1 min-w-0">
        <p className="text-rally-text font-semibold" dir="ltr">
          {(card.brand ?? t('payment.cardFallback'))} •••• {card.card_last4}
        </p>
        <p className="text-xs text-rally-text-2">
          {t('payment.cardExpires', { expiry: formatExpiry(card.card_expiry) })}
          {card.issuer ? ` · ${card.issuer}` : ''}
        </p>
      </div>
      {card.is_default && (
        <span className="text-[10px] uppercase tracking-wider bg-rally-accent/15 text-rally-accent px-2 py-1 rounded-full font-bold">
          {t('payment.defaultBadge')}
        </span>
      )}
    </button>
  )
}