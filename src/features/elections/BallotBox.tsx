import { useTranslation } from 'react-i18next'

/**
 * The ballot box from the campaign post: a padel ball with a slot cut in it.
 * When `dropping`, a ballot slip falls into the slot and the ball "gulps".
 */
export function BallotBox({ dropping = false, label }: { dropping?: boolean; label?: string }) {
  const { t } = useTranslation()
  return (
    <div className="relative mx-auto h-[200px] w-[200px]">
      {dropping && (
        // Window that ends exactly at the slot line: the slip slides down inside it
        // and vanishes as it passes the slot, like a ballot going into the box.
        <div className="absolute inset-x-0 top-[-150px] z-10 h-[201px] overflow-hidden" aria-hidden>
          <div className="elx-slip-drop absolute bottom-0 left-1/2 flex h-[86px] w-[64px] flex-col items-center justify-center gap-1 rounded-[3px] bg-[#f5f5ef] text-[#141a2e] shadow-lg">
            <img src="/rally-logo.jpg" alt="" className="h-7 w-7 rounded-md" />
            <span className="px-1 text-center text-[8px] font-bold leading-tight">
              {label ?? 'Rally'}
            </span>
          </div>
        </div>
      )}
      <div className={dropping ? 'elx-ball-gulp h-full w-full' : 'elx-ball h-full w-full'}>
        <svg
          viewBox="0 0 200 200"
          className="h-full w-full drop-shadow-[0_18px_30px_rgba(0,0,0,0.5)]"
          role="img"
          aria-label={t('elections.box_alt')}
        >
          <defs>
            <radialGradient id="elx-ball" cx="35%" cy="30%" r="75%">
              <stop offset="0%" stopColor="#ecff6a" />
              <stop offset="55%" stopColor="#cdf21c" />
              <stop offset="100%" stopColor="#8fae00" />
            </radialGradient>
          </defs>
          <circle cx="100" cy="108" r="88" fill="url(#elx-ball)" />
          <path
            d="M28 60 C 70 95, 70 140, 32 168"
            fill="none"
            stroke="#fff"
            strokeWidth="7"
            strokeLinecap="round"
            opacity="0.92"
          />
          <path
            d="M172 52 C 128 88, 128 140, 170 170"
            fill="none"
            stroke="#fff"
            strokeWidth="7"
            strokeLinecap="round"
            opacity="0.92"
          />
          <rect x="62" y="44" width="76" height="14" rx="7" fill="#1d2a06" />
          <rect x="62" y="44" width="76" height="5" rx="2.5" fill="#000" opacity="0.35" />
        </svg>
      </div>
    </div>
  )
}
