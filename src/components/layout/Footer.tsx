import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

export function Footer() {
  const { t } = useTranslation()

  return (
    <footer className="border-t border-rally-border bg-rally-bg py-8">
      <div className="container mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="text-sm text-rally-text-2">
          © 2026 Rally — {t('footer.rights') || 'כל הזכויות שמורות'}
        </div>
        <nav className="flex gap-6">
          <Link to="/privacy" className="text-sm text-rally-text-2 hover:text-rally-accent transition-colors">
            {t('footer.privacy') || 'פרטיות'}
          </Link>
          <Link to="/terms" className="text-sm text-rally-text-2 hover:text-rally-accent transition-colors">
            {t('footer.terms') || 'תנאים'}
          </Link>
        </nav>
      </div>
    </footer>
  )
}