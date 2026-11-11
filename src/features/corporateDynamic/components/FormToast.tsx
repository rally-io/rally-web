import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AlertCircle } from 'lucide-react'

/**
 * A transient "Please fix the errors" notice. `tick` is a counter the form bumps on every refused
 * submit; each bump re-opens the toast for a few seconds. (The app's shadcn toast primitives are
 * not themed for this site and nothing mounts them, so this is a small rally-token one, pinned
 * clear of the sticky register bar.)
 */
export function FormToast({ tick, durationMs = 4500 }: { tick: number; durationMs?: number }) {
  const { t } = useTranslation()
  const [visibleTick, setVisibleTick] = useState(0)

  useEffect(() => {
    if (tick === 0) return
    setVisibleTick(tick)
    const timer = setTimeout(() => setVisibleTick(0), durationMs)
    return () => clearTimeout(timer)
  }, [tick, durationMs])

  if (visibleTick === 0) return null
  return (
    <div className="fixed inset-x-0 bottom-24 z-50 flex justify-center px-4 pointer-events-none">
      <div
        role="status" aria-live="polite" data-testid="form-toast"
        className="pointer-events-auto inline-flex items-center gap-2 rounded-full bg-rally-error px-5 py-3 text-sm font-bold text-white shadow-lg"
      >
        <AlertCircle className="w-4 h-4 shrink-0" aria-hidden />
        {t('corporate.dyn.fixErrors')}
      </div>
    </div>
  )
}
