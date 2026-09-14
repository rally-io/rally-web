import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

export function LegalDisclaimer() {
  const { t } = useTranslation()
  return (
    <p className="mt-6 text-center text-xs text-rally-text-muted">
      {t('auth.legal.prefix')}{' '}
      <Link to="/terms" className="underline font-medium text-rally-text-2 hover:text-rally-accent">
        {t('auth.legal.terms')}
      </Link>{' '}
      {t('auth.legal.and')}{' '}
      <Link to="/privacy" className="underline font-medium text-rally-text-2 hover:text-rally-accent">
        {t('auth.legal.privacy')}
      </Link>
    </p>
  )
}
