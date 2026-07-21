import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Check } from 'lucide-react'

export default function PricingPage() {
  const { t } = useTranslation()

  return (
    <main className="pt-16 sm:pt-24 pb-24">
      <section className="container mx-auto px-4 mb-12 sm:mb-16 text-center">
        <h1 className="font-display text-4xl md:text-6xl font-black tracking-tight">
          {t('pricing.title')}
        </h1>
      </section>

      <section className="container mx-auto px-4 max-w-5xl">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
          {/* App Tier */}
          <div className="bg-rally-surface border border-rally-border rounded-3xl p-8 sm:p-10 flex flex-col">
            <div className="mb-8">
              <h3 className="font-display text-2xl font-bold text-rally-text-2 mb-2">
                {t('pricing.app_title')}
              </h3>
              <div className="text-5xl font-black text-rally-text">
                {t('pricing.app_price')}
              </div>
            </div>
            <ul className="space-y-4 mb-10 flex-1">
              {['app_feature1', 'app_feature2', 'app_feature3'].map((key) => (
                <li key={key} className="flex items-center gap-3">
                  <Check className="text-rally-accent w-5 h-5 shrink-0" />
                  <span>{t(`pricing.${key}`)}</span>
                </li>
              ))}
            </ul>
            <Link
              to="/download"
              className="block text-center w-full py-4 border border-rally-border-strong rounded-full hover:bg-white/5 transition-colors font-display font-bold"
            >
              {t('hero.cta_app')}
            </Link>
          </div>

          {/* CRM Tier */}
          <div className="bg-rally-surface-2 border-2 border-rally-accent rounded-3xl p-8 sm:p-10 flex flex-col relative shadow-glow-electric">
            <div className="absolute top-0 right-1/2 translate-x-1/2 -translate-y-1/2 bg-rally-accent text-rally-accent-text font-bold px-4 py-1 rounded-full text-sm">
              PRO
            </div>
            <div className="mb-8 mt-4">
              <h3 className="font-display text-2xl font-bold text-rally-text-2 mb-2">
                {t('pricing.crm_title')}
              </h3>
              <div className="text-5xl font-black text-rally-text">
                {t('pricing.crm_price')}
              </div>
            </div>
            <ul className="space-y-4 mb-10 flex-1">
              {['crm_feature1', 'crm_feature2', 'crm_feature3'].map((key) => (
                <li key={key} className="flex items-center gap-3">
                  <Check className="text-rally-accent w-5 h-5 shrink-0" />
                  <span>{t(`pricing.${key}`)}</span>
                </li>
              ))}
            </ul>
            <Link
              to="/contact"
              className="block text-center w-full py-4 bg-rally-accent text-rally-accent-text rounded-full hover:bg-rally-accent-hover hover:shadow-glow-electric transition-all font-display font-bold"
            >
              {t('nav.contact')}
            </Link>
          </div>
        </div>
      </section>
    </main>
  )
}
