import { useTranslation } from 'react-i18next'
import { BrandLogo } from './BrandLogo'
import { CHAINS } from './config'

export function ChainBallot({
  selected,
  onSelect,
}: {
  selected: string | null
  onSelect: (id: string) => void
}) {
  const { t } = useTranslation()
  return (
    <div
      className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4"
      role="radiogroup"
      aria-label={t('elections.chain.title')}
    >
      {CHAINS.map((chain) => {
        const isSel = chain.id === selected
        return (
          <button
            key={chain.id}
            type="button"
            role="radio"
            aria-checked={isSel}
            data-selected={isSel}
            onClick={() => onSelect(chain.id)}
            className="elx-paper flex flex-col items-center gap-2 px-3 pb-3.5 pt-4 text-center active:scale-[0.98]"
          >
            {isSel && (
              <span
                className="elx-stamp absolute end-2 top-2 flex h-9 w-9 items-center justify-center rounded-full border-2 border-[#141a2e] bg-rally-accent text-base font-black text-[#141a2e]"
                aria-hidden
              >
                ✓
              </span>
            )}
            <BrandLogo brandId={chain.id} className="h-16 w-16 text-lg" />
            <span className="font-display text-[15px] font-black leading-tight">{chain.name}</span>
            <span className="text-[12px] text-[#141a2e]/60">
              {t('elections.chain.branches', { count: chain.branches })}
            </span>
          </button>
        )
      })}
    </div>
  )
}
