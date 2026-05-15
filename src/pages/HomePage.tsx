import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { MapPin, Trophy, BarChart2, CreditCard } from 'lucide-react'

export default function HomePage() {
  const { t } = useTranslation()

  return (
    <>
      {/* Hero */}
      <section className="container mx-auto px-4 pt-32 pb-24 text-center">
        <h1 className="text-4xl md:text-6xl font-bold mb-6">{t('hero.headline')}</h1>
        <p className="text-xl text-gray-400 max-w-3xl mx-auto mb-10">{t('hero.subheadline')}</p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link to="/app" className="px-8 py-4 bg-electric-green text-slate-950 font-bold rounded-full hover-glow text-lg">
            {t('hero.cta_app')}
          </Link>
          <Link to="/crm" className="px-8 py-4 border border-white/20 rounded-full hover:bg-white/5 font-bold text-lg">
            {t('hero.cta_crm')}
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="container mx-auto px-4 max-w-6xl pb-24">
        <h2 className="text-3xl font-bold text-center mb-12">{t('features.title')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <FeatureCard
            icon={<MapPin className="w-8 h-8" />}
            title={t('features.booking_title')}
            description={t('features.booking_desc')}
          />
          <FeatureCard
            icon={<Trophy className="w-8 h-8" />}
            title={t('features.tournaments_title')}
            description={t('features.tournaments_desc')}
          />
          <FeatureCard
            icon={<BarChart2 className="w-8 h-8" />}
            title={t('features.ranking_title')}
            description={t('features.ranking_desc')}
          />
          <FeatureCard
            icon={<CreditCard className="w-8 h-8" />}
            title={t('features.payments_title')}
            description={t('features.payments_desc')}
          />
        </div>
      </section>
    </>
  )
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="bg-slate-900 border border-white/5 p-8 rounded-3xl">
      <div className="w-14 h-14 rounded-2xl bg-electric-green/10 flex items-center justify-center mb-6 text-electric-green">
        {icon}
      </div>
      <h3 className="text-2xl font-bold mb-4">{title}</h3>
      <p className="text-gray-400 leading-relaxed">{description}</p>
    </div>
  )
}