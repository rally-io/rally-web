import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Layout, PieChart, Users, Receipt } from 'lucide-react'

export default function CrmPage() {
  const { t } = useTranslation()

  return (
    <main className="pt-32 pb-24">
      <section className="container mx-auto px-4 mb-20 text-center">
        <h1 className="text-4xl md:text-6xl font-bold mb-6">{t('crm_features.title')}</h1>
        <p className="text-xl text-gray-400 max-w-3xl mx-auto">{t('crm_features.dashboard_desc')}</p>
      </section>

      <section className="container mx-auto px-4 max-w-6xl">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <CrmFeatureCard icon={<Layout className="w-7 h-7" />} title={t('crm_features.dashboard_title')} description={t('crm_features.dashboard_desc')} />
          <CrmFeatureCard icon={<PieChart className="w-7 h-7" />} title={t('crm_features.revenue_title')} description={t('crm_features.revenue_desc')} />
          <CrmFeatureCard icon={<Users className="w-7 h-7" />} title={t('crm_features.users_title')} description={t('crm_features.users_desc')} />
          <CrmFeatureCard icon={<Receipt className="w-7 h-7" />} title={t('crm_features.automated_title')} description={t('crm_features.automated_desc')} />
        </div>
        <div className="mt-20 text-center">
          <Link to="/contact" className="inline-flex items-center gap-2 px-8 py-4 bg-electric-green text-slate-950 font-bold rounded-full hover-glow text-lg">
            {t('hero.cta_crm')}
          </Link>
        </div>
      </section>
    </main>
  )
}

function CrmFeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="bg-slate-900 border border-white/5 p-10 rounded-3xl hover:border-electric-green/50 transition-colors">
      <div className="w-14 h-14 rounded-2xl bg-electric-green/10 flex items-center justify-center mb-6 text-electric-green">{icon}</div>
      <h3 className="text-2xl font-bold mb-4">{title}</h3>
      <p className="text-gray-400 leading-relaxed">{description}</p>
    </div>
  )
}