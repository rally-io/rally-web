import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Check } from 'lucide-react'

export default function PricingPage() {
  const { t } = useTranslation()

  return (
    <main className="pt-32 pb-24">
      <section className="container mx-auto px-4 mb-20 text-center">
        <h1 className="text-4xl md:text-6xl font-bold mb-6">{t('pricing.title')}</h1>
      </section>

      <section className="container mx-auto px-4 max-w-5xl">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* App Tier */}
          <div className="bg-slate-900 border border-white/10 rounded-3xl p-10 flex flex-col">
            <div className="mb-8">
              <h3 className="text-2xl font-bold text-gray-300 mb-2">{t('pricing.app_title')}</h3>
              <div className="text-5xl font-black text-white">{t('pricing.app_price')}</div>
            </div>
            <ul className="space-y-4 mb-10 flex-1">
              <li className="flex items-center gap-3"><Check className="text-electric-green w-5 h-5" /><span>{t('pricing.app_feature1')}</span></li>
              <li className="flex items-center gap-3"><Check className="text-electric-green w-5 h-5" /><span>{t('pricing.app_feature2')}</span></li>
              <li className="flex items-center gap-3"><Check className="text-electric-green w-5 h-5" /><span>{t('pricing.app_feature3')}</span></li>
            </ul>
            <Link to="/app" className="block text-center w-full py-4 border border-white/20 rounded-xl hover:bg-white/5 transition-colors font-bold">{t('hero.cta_app')}</Link>
          </div>

          {/* CRM Tier */}
          <div className="bg-slate-800 border-2 border-electric-green rounded-3xl p-10 flex flex-col relative shadow-[0_0_50px_rgba(57,255,20,0.1)]">
            <div className="absolute top-0 right-1/2 translate-x-1/2 -translate-y-1/2 bg-electric-green text-slate-950 font-bold px-4 py-1 rounded-full text-sm">PRO</div>
            <div className="mb-8 mt-4">
              <h3 className="text-2xl font-bold text-gray-300 mb-2">{t('pricing.crm_title')}</h3>
              <div className="text-5xl font-black text-white">{t('pricing.crm_price')}</div>
            </div>
            <ul className="space-y-4 mb-10 flex-1">
              <li className="flex items-center gap-3"><Check className="text-electric-green w-5 h-5" /><span>{t('pricing.crm_feature1')}</span></li>
              <li className="flex items-center gap-3"><Check className="text-electric-green w-5 h-5" /><span>{t('pricing.crm_feature2')}</span></li>
              <li className="flex items-center gap-3"><Check className="text-electric-green w-5 h-5" /><span>{t('pricing.crm_feature3')}</span></li>
            </ul>
            <Link to="/contact" className="block text-center w-full py-4 bg-electric-green text-slate-950 rounded-xl hover-glow font-bold">{t('nav.contact')}</Link>
          </div>
        </div>
      </section>
    </main>
  )
}