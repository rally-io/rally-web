import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { APP_STORE_URL, PLAY_STORE_URL, APP_STORE_BADGE, PLAY_STORE_BADGE } from '@/lib/appLinks'

export function Footer() {
  const { t } = useTranslation()

  return (
    <footer className="border-t border-slate-800 bg-slate-950 py-8">
      <div className="container mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="text-sm text-slate-400">
          © 2026 Rally — {t('footer.rights') || 'כל הזכויות שמורות'}
        </div>
        <nav className="flex items-center gap-6">
          <div className="flex gap-3">
            <a href={APP_STORE_URL} target="_blank" rel="noopener noreferrer" className="hover:opacity-80 transition-opacity">
              <img src={APP_STORE_BADGE} alt="App Store" className="h-7" />
            </a>
            <a href={PLAY_STORE_URL} target="_blank" rel="noopener noreferrer" className="hover:opacity-80 transition-opacity">
              <img src={PLAY_STORE_BADGE} alt="Google Play" className="h-7" />
            </a>
          </div>
          <span className="w-px h-5 bg-slate-700" />
          <Link to="/privacy" className="text-sm text-slate-400 hover:text-electric-green transition-colors">
            {t('footer.privacy') || 'פרטיות'}
          </Link>
          <Link to="/terms" className="text-sm text-slate-400 hover:text-electric-green transition-colors">
            {t('footer.terms') || 'תנאים'}
          </Link>
        </nav>
      </div>
    </footer>
  )
}