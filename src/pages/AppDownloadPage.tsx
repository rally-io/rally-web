import { useTranslation } from 'react-i18next'
import { MapPin, BarChart2 } from 'lucide-react'

export default function AppDownloadPage() {
  const { t } = useTranslation()

  return (
    <main className="pt-32 pb-24">
      <section className="container mx-auto px-4 mb-20 text-center">
        <h1 className="text-4xl md:text-6xl font-bold mb-6">{t('nav.app')}</h1>
        <p className="text-xl text-gray-400 max-w-3xl mx-auto">{t('features.title')}</p>
      </section>

      <section className="container mx-auto px-4 max-w-6xl">
        <div className="flex flex-col md:flex-row items-center gap-12 mb-24">
          <div className="flex-1 order-2 md:order-1">
            <div className="w-16 h-16 rounded-2xl bg-electric-green/10 flex items-center justify-center mb-6 text-electric-green">
              <MapPin className="w-8 h-8" />
            </div>
            <h2 className="text-3xl font-bold mb-4">{t('features.booking_title')}</h2>
            <p className="text-lg text-gray-400 mb-8 leading-relaxed">{t('features.booking_desc')}</p>
          </div>
          <div className="flex-1 order-1 md:order-2 w-full">
            <div className="bg-slate-800 border border-white/10 rounded-3xl aspect-square flex items-center justify-center p-8">
              <MapPin className="w-32 h-32 text-electric-green/20" />
            </div>
          </div>
        </div>

        <div className="flex flex-col md:flex-row items-center gap-12 mb-24">
          <div className="flex-1 w-full">
            <div className="bg-slate-800 border border-white/10 rounded-3xl aspect-square flex items-center justify-center p-8">
              <BarChart2 className="w-32 h-32 text-electric-green/20" />
            </div>
          </div>
          <div className="flex-1">
            <div className="w-16 h-16 rounded-2xl bg-electric-green/10 flex items-center justify-center mb-6 text-electric-green">
              <BarChart2 className="w-8 h-8" />
            </div>
            <h2 className="text-3xl font-bold mb-4">{t('features.ranking_title')}</h2>
            <p className="text-lg text-gray-400 mb-8 leading-relaxed">{t('features.ranking_desc')}</p>
          </div>
        </div>

        <div className="text-center py-16 bg-slate-900 border border-white/5 rounded-3xl">
          <h3 className="text-2xl font-bold mb-8">{t('hero.cta_app')}</h3>
          <div className="flex flex-wrap justify-center gap-4 px-4">
            <img src="https://upload.wikimedia.org/wikipedia/commons/3/3c/Download_on_the_App_Store_Badge.svg" alt="App Store" className="h-12 cursor-pointer hover:scale-105 transition-transform" />
            <img src="https://upload.wikimedia.org/wikipedia/commons/7/78/Google_Play_Store_badge_EN.svg" alt="Google Play" className="h-12 cursor-pointer hover:scale-105 transition-transform" />
          </div>
        </div>
      </section>
    </main>
  )
}