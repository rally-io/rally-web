import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { ELECTION_CLOSES_AT } from './config'

const pad = (n: number) => String(n).padStart(2, '0')

export function Countdown({ className }: { className?: string }) {
  const { t } = useTranslation()
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [])

  const left = Math.max(0, ELECTION_CLOSES_AT.getTime() - now)
  const days = Math.floor(left / 86_400_000)
  const h = Math.floor(left / 3_600_000) % 24
  const m = Math.floor(left / 60_000) % 60
  const s = Math.floor(left / 1000) % 60

  return (
    <div className={cn('flex items-center justify-center gap-2 text-sm text-white/70', className)}>
      <span>{t('elections.countdown.label')}</span>
      <span className="font-display font-bold text-white">
        {t('elections.countdown.days', { count: days })}
      </span>
      <span className="font-display font-bold tabular-nums text-white" dir="ltr">
        {pad(h)}:{pad(m)}:{pad(s)}
      </span>
    </div>
  )
}
