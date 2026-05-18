import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { getCountdown } from '@/lib/tournamentHelpers'

interface Props {
  label: string
  targetDate: string
  variant?: 'accent' | 'blue'
}

export function CountdownCard({ label, targetDate, variant = 'accent' }: Props) {
  const { t } = useTranslation()
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000)
    return () => clearInterval(id)
  }, [])

  const { days, hours, expired } = getCountdown(targetDate)
  void now

  if (expired) return null

  const border =
    variant === 'accent' ? 'border-rally-accent/30' : 'border-rally-blue/30'
  const numberColor =
    variant === 'accent' ? 'text-rally-accent' : 'text-rally-blue'
  const glow =
    variant === 'accent' ? 'shadow-glow-electric' : 'shadow-glow-blue'

  return (
    <div
      className={`rounded-xl bg-rally-surface border ${border} p-6 md:p-8 ${glow}`}
    >
      <p className="text-rally-text-2 text-sm md:text-base mb-4 md:mb-5">
        {label}
      </p>
      <div className="flex items-end gap-4 md:gap-6" dir="ltr">
        <div className="flex flex-col items-center">
          <span
            className={`font-display font-black tabular-nums text-5xl md:text-6xl leading-none ${numberColor}`}
          >
            {days}
          </span>
          <span className="mt-2 text-xs md:text-sm uppercase tracking-wider text-rally-text-muted">
            {t('tournament.countdownDays')}
          </span>
        </div>
        <span className={`font-display text-4xl md:text-5xl ${numberColor}/40 leading-none pb-2`}>
          :
        </span>
        <div className="flex flex-col items-center">
          <span
            className={`font-display font-black tabular-nums text-5xl md:text-6xl leading-none ${numberColor}`}
          >
            {hours}
          </span>
          <span className="mt-2 text-xs md:text-sm uppercase tracking-wider text-rally-text-muted">
            {t('tournament.countdownHours')}
          </span>
        </div>
      </div>
    </div>
  )
}
