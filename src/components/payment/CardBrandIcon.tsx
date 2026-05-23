// src/components/payment/CardBrandIcon.tsx
import type { CardBrand } from '@/types/api'

const STYLES: Record<string, string> = {
  Visa: 'bg-blue-600 text-white',
  Mastercard: 'bg-orange-500 text-white',
  Diners: 'bg-slate-600 text-white',
  Amex: 'bg-sky-700 text-white',
  Isracard: 'bg-rose-600 text-white',
  Discover: 'bg-amber-500 text-white',
}

const LABELS: Record<string, string> = {
  Visa: 'VISA',
  Mastercard: 'MC',
  Diners: 'DC',
  Amex: 'AMEX',
  Isracard: 'ISR',
  Discover: 'DISC',
}

interface Props {
  brand: CardBrand | null
}

export function CardBrandIcon({ brand }: Props) {
  const style = (brand && STYLES[brand]) ?? 'bg-rally-surface-2 text-rally-text'
  const label = (brand && LABELS[brand]) ?? '••'
  return (
    <div
      className={`w-10 h-7 rounded-md flex items-center justify-center text-[10px] font-bold tracking-wide ${style}`}
      aria-hidden="true"
    >
      {label}
    </div>
  )
}