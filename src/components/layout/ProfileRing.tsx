import { useAppSession } from '@/hooks/useAppSession'
import { useAuth } from '@/hooks/useAuth'

function getInitials(displayName: string, email: string | null | undefined): string {
  const trimmed = displayName.trim()
  if (trimmed) {
    const parts = trimmed.split(/\s+/)
    return parts.length >= 2
      ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      : parts[0][0].toUpperCase()
  }
  return email ? email[0].toUpperCase() : '?'
}

export function ProfileRing() {
  const { onboardingStatus, playerProfile } = useAppSession()
  const { user } = useAuth()
  if (!onboardingStatus) return null

  const meta = (user?.user_metadata ?? {}) as Record<string, string>
  const profileName = `${playerProfile?.first_name ?? ''} ${playerProfile?.last_name ?? ''}`.trim()
  const metaName = (meta.full_name ?? meta.name ?? `${meta.first_name ?? ''} ${meta.last_name ?? ''}`).trim()
  const displayName = profileName || metaName || user?.email || ''

  const percent = onboardingStatus.completion_percent
  const initials = getInitials(displayName, user?.email ?? null)

  return (
    <div
      className="relative w-10 h-10 flex items-center justify-center"
      title={onboardingStatus.missing_steps.join(', ')}
    >
      <div className="absolute inset-0 flex items-center justify-center">
        <svg className="w-10 h-10 -rotate-90" viewBox="0 0 36 36">
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
      </div>
      <span className="relative z-10 text-xs font-semibold text-slate-100 leading-none select-none">
        {initials}
      </span>
    </div>
  )
}
