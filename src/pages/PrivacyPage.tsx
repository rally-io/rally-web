import { useTranslation } from 'react-i18next'

export default function PrivacyPage() {
  const { t } = useTranslation()

  return (
    <main className="pt-32 pb-24">
      <section className="container mx-auto px-4 max-w-4xl">
        <h1 className="text-4xl md:text-5xl font-bold mb-4 text-center">{t('privacy.title')}</h1>
        <p className="text-gray-500 mb-12 text-center">{t('privacy.updated')}</p>

        <div className="bg-slate-900 rounded-3xl p-8 md:p-12 border border-white/5">
          <div className="mb-10">
            <p className="text-gray-400 leading-relaxed mb-4">{t('privacy.intro1')}</p>
            <p className="text-gray-400 leading-relaxed">{t('privacy.intro2')}</p>
          </div>

          <div className="mb-10">
            <h2 className="text-2xl font-bold text-slate-200 mb-4 pb-2 border-b border-white/10">{t('privacy.general_title')}</h2>
            <p className="text-gray-400 leading-relaxed mb-4">{t('privacy.general_p1')}</p>
            <p className="text-gray-400 leading-relaxed mb-4">{t('privacy.general_p2')}</p>
            <p className="text-gray-400 leading-relaxed mb-4">{t('privacy.general_p3')}</p>
            <p className="text-gray-400 leading-relaxed mb-4">{t('privacy.general_p4')}</p>
            <p className="text-gray-400 leading-relaxed mb-4">{t('privacy.general_p5')}</p>
            <p className="text-gray-400 leading-relaxed">{t('privacy.general_p6')}</p>
          </div>

          <div className="mb-10">
            <h2 className="text-2xl font-bold text-slate-200 mb-4 pb-2 border-b border-white/10">{t('privacy.database_title')}</h2>
            <p className="text-gray-400 leading-relaxed mb-4">{t('privacy.database_intro')}</p>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li className="text-gray-400">{t('privacy.database_li1')}</li>
              <li className="text-gray-400">{t('privacy.database_li2')}</li>
              <li className="text-gray-400">{t('privacy.database_li3')}</li>
              <li className="text-gray-400">{t('privacy.database_li4')}</li>
              <li className="text-gray-400">{t('privacy.database_li5')}</li>
              <li className="text-gray-400">{t('privacy.database_li6')}</li>
            </ul>
          </div>

          <div className="mb-10">
            <h2 className="text-2xl font-bold text-slate-200 mb-4 pb-2 border-b border-white/10">{t('privacy.marketing_title')}</h2>
            <p className="text-gray-400 leading-relaxed mb-4">{t('privacy.marketing_intro')}</p>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li className="text-gray-400">{t('privacy.marketing_li1')}</li>
              <li className="text-gray-400">{t('privacy.marketing_li2')}</li>
              <li className="text-gray-400">{t('privacy.marketing_li3')}</li>
              <li className="text-gray-400">{t('privacy.marketing_li4')}</li>
              <li className="text-gray-400">{t('privacy.marketing_li5')}</li>
            </ul>
            <p className="text-gray-400 leading-relaxed mb-4">{t('privacy.marketing_p1')}</p>
            <p className="text-gray-400 leading-relaxed">{t('privacy.marketing_p2')}</p>
          </div>

          <div className="mb-10">
            <h2 className="text-2xl font-bold text-slate-200 mb-4 pb-2 border-b border-white/10">{t('privacy.thirdparty_title')}</h2>
            <p className="text-gray-400 leading-relaxed mb-4">{t('privacy.thirdparty_intro')}</p>
            <ul className="list-disc pl-6 space-y-2">
              {[1,2,3,4,5,6,7,8,9,10].map(i => (
                <li key={i} className="text-gray-400">{t(`privacy.thirdparty_li${i}`)}</li>
              ))}
            </ul>
          </div>

          <div className="mb-10">
            <h2 className="text-2xl font-bold text-slate-200 mb-4 pb-2 border-b border-white/10">{t('privacy.aggregated_title')}</h2>
            <p className="text-gray-400 leading-relaxed">{t('privacy.aggregated_p1')}</p>
          </div>
        </div>
      </section>
    </main>
  )
}