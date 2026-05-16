import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

export function LegalDisclaimer() {
  const { t } = useTranslation()
  return (
    <p className="mt-6 text-center text-xs text-slate-500">
      {t('auth.legal.prefix') || 'By continuing you agree to our'}{' '}
      <Link to="/terms" className="underline hover:text-electric-green">
        {t('auth.legal.terms') || 'Terms'}
      </Link>{' '}
      &middot;{' '}
      <Link to="/privacy" className="underline hover:text-electric-green">
        {t('auth.legal.privacy') || 'Privacy'}
      </Link>
    </p>
  )
}
