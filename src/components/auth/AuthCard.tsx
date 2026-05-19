import { type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { ArrowLeft } from 'lucide-react'
import { Logo } from '@/components/ui/Logo'

interface AuthCardProps {
  title: string
  subtitle?: string
  children: ReactNode
  footer?: ReactNode
  onBack?: () => void
}

export function AuthCard({ title, subtitle, children, footer, onBack }: AuthCardProps) {
  const { i18n } = useTranslation()
  const toggleLocale = () => i18n.changeLanguage(i18n.language === 'he' ? 'en' : 'he')

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            {onBack && (
              <button
                onClick={onBack}
                aria-label="Back"
                className="inline-flex items-center justify-center w-11 h-11 rounded-full hover:bg-white/5 text-slate-300 hover:text-rally-accent transition-colors"
              >
                <ArrowLeft className="w-5 h-5 rtl:rotate-180" />
              </button>
            )}
            <div className="text-2xl font-bold text-rally-accent">Rally</div>
          </div>
          <button
            onClick={toggleLocale}
            className="text-xs text-slate-400 hover:text-rally-accent"
          >
            {i18n.language === 'he' ? 'EN' : 'עב'}
          </button>
        </div>
        <div className="rounded-2xl border border-white/10 bg-slate-900 p-6 sm:p-8 shadow-xl">
          <div className="flex justify-center mb-5">
            <Logo size="md" showText={false} />
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-black text-slate-50 text-center mb-2 leading-tight">
            {title}
          </h1>
          {subtitle && (
            <p className="text-sm sm:text-base text-slate-400 text-center mb-6 leading-relaxed">
              {subtitle}
            </p>
          )}
          {!subtitle && <div className="mb-6" />}
          {children}
        </div>
        {footer && <div className="mt-6 text-center">{footer}</div>}
      </div>
    </div>
  )
}
