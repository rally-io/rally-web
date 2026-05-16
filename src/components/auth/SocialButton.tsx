import type { ReactNode } from 'react'
import type { OAuthProvider } from '@/contexts/AuthContext'

interface SocialButtonProps {
  provider: OAuthProvider
  label: string
  icon: ReactNode
  onClick: () => void
  disabled?: boolean
}

const STYLES: Record<OAuthProvider, string> = {
  google: 'bg-white text-slate-900 hover:bg-slate-100',
  apple: 'bg-black text-white hover:bg-slate-800 border border-white/10',
  facebook: 'bg-[#1877F2] text-white hover:bg-[#166fe5]',
}

export function SocialButton({ provider, label, icon, onClick, disabled }: SocialButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`w-full flex items-center justify-center gap-3 rounded-md px-4 py-2.5 text-sm font-medium transition-colors disabled:opacity-50 ${STYLES[provider]}`}
    >
      <span className="w-5 h-5 flex items-center justify-center">{icon}</span>
      <span>{label}</span>
    </button>
  )
}
