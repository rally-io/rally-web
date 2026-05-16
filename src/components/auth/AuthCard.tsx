import { type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

interface AuthCardProps {
  title: string
  subtitle?: string
  children: ReactNode
  footer?: ReactNode
}

export function AuthCard({ title, subtitle, children, footer }: AuthCardProps) {
  const { i18n } = useTranslation()
  const toggleLocale = () => i18n.changeLanguage(i18n.language === 'he' ? 'en' : 'he')

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-between mb-6">
          <div className="text-2xl font-bold text-electric-green">Rally</div>
          <button
            onClick={toggleLocale}
            className="text-xs text-slate-400 hover:text-electric-green"
          >
            {i18n.language === 'he' ? 'EN' : 'עב'}
          </button>
        </div>
        <div className="rounded-2xl border border-white/10 bg-slate-900 p-8 shadow-xl">
          <h1 className="text-2xl font-bold text-slate-50 mb-1">{title}</h1>
          {subtitle && <p className="text-sm text-slate-400 mb-6">{subtitle}</p>}
          {children}
        </div>
        {footer && <div className="mt-6 text-center">{footer}</div>}
      </div>
    </div>
  )
}
