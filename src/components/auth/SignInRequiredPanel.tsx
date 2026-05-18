import { Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface SignInRequiredPanelProps {
  message: string
  ctaLabel: string
  onSignIn: () => void
  className?: string
}

export function SignInRequiredPanel({
  message,
  ctaLabel,
  onSignIn,
  className = '',
}: SignInRequiredPanelProps) {
  return (
    <div
      className={`rounded-2xl border border-rally-border bg-rally-surface p-5 flex flex-col sm:flex-row sm:items-center gap-4 ${className}`}
    >
      <div className="flex items-center gap-3 flex-1">
        <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-rally-accent/15 text-rally-accent shrink-0">
          <Lock className="w-5 h-5" />
        </span>
        <p className="text-rally-text font-semibold leading-snug">{message}</p>
      </div>
      <Button
        onClick={onSignIn}
        className="bg-rally-accent text-rally-accent-text hover:bg-rally-accent-hover font-bold whitespace-nowrap"
      >
        {ctaLabel}
      </Button>
    </div>
  )
}
