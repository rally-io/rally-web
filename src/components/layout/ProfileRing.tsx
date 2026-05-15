import { useOnboardingStatus } from '@/hooks/useOnboardingStatus'
import { ProfileCompletionModal } from '@/components/profile/ProfileCompletionModal'
import { useState } from 'react'

export function ProfileRing() {
  const { data: status } = useOnboardingStatus()
  const [modalOpen, setModalOpen] = useState(false)

  if (!status) return null

  const percent = status.completion_percent

  return (
    <>
      <button
        onClick={() => setModalOpen(true)}
        className="relative w-10 h-10 flex items-center justify-center"
        title={status.missing_steps.join(', ')}
      >
        <svg className="w-10 h-10 -rotate-90" viewBox="0 0 36 36">
          <circle
            cx="18"
            cy="18"
            r="15"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            className="text-slate-700"
          />
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
        <span className="absolute text-xs font-bold text-slate-50">{percent}</span>
      </button>

      <ProfileCompletionModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        missingFields={status.missing_steps.map((step) => ({
          field: step,
          label: step,
          scope: 'profile',
        }))}
        onSuccess={() => setModalOpen(false)}
      />
    </>
  )
}