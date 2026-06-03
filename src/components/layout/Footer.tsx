import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

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
            <a href="https://apps.apple.com/il/app/rally/id6762743900" target="_blank" rel="noopener noreferrer" className="hover:opacity-80 transition-opacity">
              <img src="https://upload.wikimedia.org/wikipedia/commons/3/3c/Download_on_the_App_Store_Badge.svg" alt="App Store" className="h-7" />
            </a>
            <a href="https://play.google.com/store/apps/details?id=app.rallypadel&pli=1" target="_blank" rel="noopener noreferrer" className="hover:opacity-80 transition-opacity">
              <img src="https://upload.wikimedia.org/wikipedia/commons/7/78/Google_Play_Store_badge_EN.svg" alt="Google Play" className="h-7" />
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