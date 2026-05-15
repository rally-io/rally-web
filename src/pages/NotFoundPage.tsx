import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Construction } from 'lucide-react'

export default function NotFoundPage() {
  const { t } = useTranslation()

  return (
    <main className="flex-grow flex items-center justify-center pt-32 pb-24">
      <section className="container mx-auto px-4 text-center">
        <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-electric-green/10 text-electric-green mb-8">
          <Construction className="w-12 h-12" />
        </div>
        <h1 className="text-5xl md:text-7xl font-bold mb-6 text-white">{t('common.coming_soon')}</h1>
        <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-10">{t('common.working_hard')}</p>
        <Link to="/" className="inline-flex items-center gap-3 px-8 py-4 bg-electric-green text-slate-950 font-bold rounded-full hover-glow text-lg transition-transform hover:scale-105">
          {t('common.back_home')}
        </Link>
      </section>
    </main>
  )
}