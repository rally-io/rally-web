import { useTranslation } from 'react-i18next'

export default function LevelPage() {
  const { t } = useTranslation()

  const tiers = [
    { label: t('level_page.tier_d2'), range: t('level_page.tier_d2_range'), desc: t('level_page.tier_d2_desc'), emoji: '🟤' },
    { label: t('level_page.tier_d1'), range: t('level_page.tier_d1_range'), desc: t('level_page.tier_d1_desc'), emoji: '🟤' },
    { label: t('level_page.tier_c2'), range: t('level_page.tier_c2_range'), desc: t('level_page.tier_c2_desc'), emoji: '🟤' },
    { label: t('level_page.tier_c1'), range: t('level_page.tier_c1_range'), desc: t('level_page.tier_c1_desc'), emoji: '⚪' },
    { label: t('level_page.tier_b2'), range: t('level_page.tier_b2_range'), desc: t('level_page.tier_b2_desc'), emoji: '⚪' },
    { label: t('level_page.tier_b1'), range: t('level_page.tier_b1_range'), desc: t('level_page.tier_b1_desc'), emoji: '🟡' },
    { label: t('level_page.tier_a2'), range: t('level_page.tier_a2_range'), desc: t('level_page.tier_a2_desc'), emoji: '🟡' },
    { label: t('level_page.tier_a1'), range: t('level_page.tier_a1_range'), desc: t('level_page.tier_a1_desc'), emoji: '🟡' },
  ]

  return (
    <main className="pt-32 pb-24">
      {/* Hero */}
      <section className="container mx-auto px-4 max-w-4xl mb-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-6xl font-bold mb-6 text-white">{t('level_page.title')}</h1>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed">{t('level_page.intro1')}</p>
        </div>
      </section>

      {/* Tier Table */}
      <section className="container mx-auto px-4 max-w-4xl mb-24">
        <h2 className="text-3xl font-bold mb-8 text-white">{t('level_page.tiers_title')}</h2>
        <div className="bg-slate-900 rounded-3xl overflow-hidden border border-white/5 max-w-2xl mx-auto">
          <table className="w-full text-left" dir="ltr">
            <thead>
              <tr className="bg-slate-800/50 text-slate-300 border-b border-white/10">
                <th className="px-4 py-3 font-semibold">Tier</th>
                <th className="px-4 py-3 font-semibold">Range</th>
                <th className="px-4 py-3 font-semibold">What it means</th>
              </tr>
            </thead>
            <tbody className="text-slate-300 divide-y divide-white/5">
              {tiers.map((tier) => (
                <tr key={tier.label} className="hover:bg-slate-800/30 transition-colors">
                  <td className="px-4 py-2.5 whitespace-nowrap">{tier.emoji} {tier.label}</td>
                  <td className="px-4 py-2.5 whitespace-nowrap">{tier.range}</td>
                  <td className="px-4 py-2.5">{tier.desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-6 text-gray-400 italic">{t('level_page.tiers_summary')}</p>
      </section>

      {/* Initial Level */}
      <section className="container mx-auto px-4 max-w-4xl mb-24">
        <h2 className="text-3xl font-bold mb-6 text-white">{t('level_page.initial_title')}</h2>
        <div className="bg-slate-900 rounded-3xl p-8">
          <p className="text-lg text-gray-300 mb-8 leading-relaxed">{t('level_page.initial_intro')}</p>
          <p className="text-lg font-medium text-white mb-6">{t('level_page.initial_covers')}</p>
          <div className="space-y-6 text-gray-400">
            <p>🏋️ <strong>{t('level_page.area1_title')}</strong> — {t('level_page.area1_desc')}</p>
            <p>🎾 <strong>{t('level_page.area2_title')}</strong> — {t('level_page.area2_desc')}</p>
            <p>🏆 <strong>{t('level_page.area3_title')}</strong> — {t('level_page.area3_desc')}</p>
          </div>
        </div>
      </section>

      {/* Evolution */}
      <section className="container mx-auto px-4 max-w-4xl mb-24">
        <h2 className="text-3xl font-bold mb-6 text-white">{t('level_page.evolves_title')}</h2>
        <div className="space-y-6 text-lg text-gray-300 leading-relaxed mb-12">
          <p>{t('level_page.evolves_p1')}</p>
          <p>{t('level_page.evolves_p2')}</p>
          <p>{t('level_page.evolves_p3')}</p>
          <p>{t('level_page.evolves_p4')}</p>
        </div>
        <div className="bg-slate-900 rounded-3xl overflow-hidden border border-white/5 max-w-2xl mx-auto">
          <table className="w-full text-left" dir="ltr">
            <thead>
              <tr className="bg-slate-800/50 text-slate-300 border-b border-white/10">
                <th className="p-4 font-semibold w-1/2">Matches played</th>
                <th className="p-4 font-semibold w-1/2">Influence of match results</th>
              </tr>
            </thead>
            <tbody className="text-slate-300 divide-y divide-white/5">
              <tr className="hover:bg-slate-800/30 transition-colors">
                <td className="p-4 font-medium">0</td>
                <td className="p-4">0% — pure questionnaire</td>
              </tr>
              <tr className="hover:bg-slate-800/30 transition-colors">
                <td className="p-4 font-medium">5</td>
                <td className="p-4 text-electric-green">~71%</td>
              </tr>
              <tr className="hover:bg-slate-800/30 transition-colors">
                <td className="p-4 font-medium">10</td>
                <td className="p-4 text-electric-green">~92%</td>
              </tr>
              <tr className="hover:bg-slate-800/30 transition-colors">
                <td className="p-4 font-medium">20+</td>
                <td className="p-4 text-electric-green font-bold">~99%</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="text-center text-gray-400 italic max-w-2xl mx-auto mt-8">{t('level_page.evolves_summary')}</p>
      </section>

      {/* Accuracy */}
      <section className="container mx-auto px-4 max-w-4xl">
        <h2 className="text-3xl font-bold mb-6 text-white">{t('level_page.accuracy_title')}</h2>
        <div className="space-y-6 text-lg text-gray-300 leading-relaxed bg-gradient-to-br from-slate-900 to-slate-800 p-8 md:p-10 rounded-3xl border border-white/10">
          <p>{t('level_page.accuracy_p1')}</p>
          <p>{t('level_page.accuracy_p2')}</p>
          <p className="text-electric-green font-medium">{t('level_page.accuracy_p3')}</p>
        </div>
      </section>
    </main>
  )
}