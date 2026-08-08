import { useTranslation } from 'react-i18next'

interface Props {
  /** `sm` for the card overlay, `md` for the detail page's status row. */
  size?: 'sm' | 'md'
  className?: string
}

/**
 * "LIVE" pill for a tournament being played right now.
 *
 * Red on purpose — that is the broadcast convention players already read as
 * "happening now", and it keeps the badge from being mistaken for one of the
 * lime registration CTAs. The label stays the Latin word LIVE in Hebrew too
 * (see `tournament.liveBadge`), which is how Israeli sports feeds write it.
 */
export function LiveBadge({ size = 'sm', className = '' }: Props) {
  const { t } = useTranslation()
  const sizing =
    size === 'md'
      ? 'px-3.5 py-1.5 text-sm gap-2'
      : 'px-2.5 py-1 text-[11px] gap-1.5'
  return (
    <span
      dir="ltr"
      className={`inline-flex items-center rounded-full bg-rally-error text-white font-black uppercase tracking-wider shadow-md ${sizing} ${className}`}
    >
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
      </span>
      {t('tournament.liveBadge')}
    </span>
  )
}
