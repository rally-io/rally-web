import { useAppSession } from '@/hooks/useAppSession'
import { useAuth } from '@/hooks/useAuth'

function getInitials(user: { email?: string | null; user_metadata?: Record<string, string> } | null): string {
  if (!user) return '?'
  const meta = user.user_metadata ?? {}
  const first = (meta.first_name ?? '').trim()
  const last = (meta.last_name ?? '').trim()
  if (first && last) return (first[0] + last[0]).toUpperCase()
  if (first) return first[0].toUpperCase()
  const full = (meta.full_name ?? meta.name ?? '').trim()
  if (full) {
    const parts = full.split(/\s+/)
    return parts.length >= 2
      ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      : parts[0][0].toUpperCase()
  }
  const email = user.email ?? ''
  return email ? email[0].toUpperCase() : '?'
}

export function ProfileRing() {
  const { onboardingStatus } = useAppSession()
  const { user } = useAuth()
  if (!onboardingStatus) return null

  const percent = onboardingStatus.completion_percent
  const initials = getInitials(user)

  return (
    <div
      className="relative w-10 h-10 flex items-center justify-center"
      title={onboardingStatus.missing_steps.join(', ')}
    >
      <svg className="w-10 h-10 -rotate-90 absolute" viewBox="0 0 36 36">
        <circle cx="18" cy="18" r="15" fill="none" stroke="currentColor" strokeWidth="3" className="text-slate-700" />
        <circle
          cx="18"
          cy="18"
          r="15"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeDasharray={`${percent} 100`}
          className="text-electric-green transition-all"
        />
      </svg>
      <span className="relative z-10 text-xs font-semibold text-slate-100 leading-none select-none">
        {initials}
      </span>
    </div>
  )
}
