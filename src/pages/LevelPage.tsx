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

  const evolution = [
    { matches: '0', influence: t('level_page.table_influence_0'), highlight: false, bold: false },
    { matches: '5', influence: '~71%', highlight: true, bold: false },
    { matches: '10', influence: '~92%', highlight: true, bold: false },
    { matches: '20+', influence: '~99%', highlight: true, bold: true },
  ]

  const thClass = 'px-4 py-3 font-display font-semibold text-start'
  const tableWrapClass =
    'bg-rally-surface rounded-3xl overflow-hidden border border-rally-border max-w-2xl mx-auto'

  return (
    <main className="pt-16 sm:pt-24 pb-24">
      {/* Hero */}
      <section className="container mx-auto px-4 max-w-4xl mb-12 sm:mb-16">
        <div className="text-center mb-12">
          <h1 className="font-display text-4xl md:text-6xl font-black tracking-tight mb-6">
            {t('level_page.title')}
          </h1>
          <p className="text-xl text-rally-text-2 max-w-2xl mx-auto leading-relaxed">
            {t('level_page.intro1')}
          </p>
        </div>
      </section>

      {/* Tier Table */}
      <section className="container mx-auto px-4 max-w-4xl mb-16 sm:mb-24">
        <h2 className="font-display text-3xl font-black mb-8">{t('level_page.tiers_title')}</h2>
        <div className={tableWrapClass}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-rally-surface-2/60 text-rally-text-2 border-b border-rally-border">
                  <th className={thClass}>{t('level_page.table_tier')}</th>
                  <th className={thClass}>{t('level_page.table_range')}</th>
                  <th className={thClass}>{t('level_page.table_meaning')}</th>
                </tr>
              </thead>
              <tbody className="text-rally-text-2 divide-y divide-rally-border-subtle">
                {tiers.map((tier) => (
                  <tr key={tier.label} className="hover:bg-white/5 transition-colors">
                    <td className="px-4 py-2.5 whitespace-nowrap text-start">
                      {tier.emoji} {tier.label}
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap text-start" dir="ltr">
                      {tier.range}
                    </td>
                    <td className="px-4 py-2.5 text-start">{tier.desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <p className="mt-6 text-rally-text-muted italic">{t('level_page.tiers_summary')}</p>
      </section>

      {/* Initial Level */}
      <section className="container mx-auto px-4 max-w-4xl mb-16 sm:mb-24">
        <h2 className="font-display text-3xl font-black mb-6">{t('level_page.initial_title')}</h2>
        <div className="bg-rally-surface border border-rally-border rounded-3xl p-8">
          <p className="text-lg text-rally-text-2 mb-8 leading-relaxed">
            {t('level_page.initial_intro')}
          </p>
          <p className="text-lg font-medium text-rally-text mb-6">
            {t('level_page.initial_covers')}
          </p>
          <div className="space-y-6 text-rally-text-2">
            <p>
              🏋️ <strong className="text-rally-text">{t('level_page.area1_title')}</strong> —{' '}
              {t('level_page.area1_desc')}
            </p>
            <p>
              🎾 <strong className="text-rally-text">{t('level_page.area2_title')}</strong> —{' '}
              {t('level_page.area2_desc')}
            </p>
            <p>
              🏆 <strong className="text-rally-text">{t('level_page.area3_title')}</strong> —{' '}
              {t('level_page.area3_desc')}
            </p>
          </div>
        </div>
      </section>

      {/* Evolution */}
      <section className="container mx-auto px-4 max-w-4xl mb-16 sm:mb-24">
        <h2 className="font-display text-3xl font-black mb-6">{t('level_page.evolves_title')}</h2>
        <div className="space-y-6 text-lg text-rally-text-2 leading-relaxed mb-12">
          <p>{t('level_page.evolves_p1')}</p>
          <p>{t('level_page.evolves_p2')}</p>
          <p>{t('level_page.evolves_p3')}</p>
          <p>{t('level_page.evolves_p4')}</p>
        </div>
        <div className={tableWrapClass}>
          <table className="w-full">
            <thead>
              <tr className="bg-rally-surface-2/60 text-rally-text-2 border-b border-rally-border">
                <th className={`${thClass} w-1/2`}>{t('level_page.table_matches')}</th>
                <th className={`${thClass} w-1/2`}>{t('level_page.table_influence')}</th>
              </tr>
            </thead>
            <tbody className="text-rally-text-2 divide-y divide-rally-border-subtle">
              {evolution.map((row) => (
                <tr key={row.matches} className="hover:bg-white/5 transition-colors">
                  <td className="p-4 font-medium text-start" dir="ltr">
                    {row.matches}
                  </td>
                  <td
                    className={`p-4 text-start ${row.highlight ? 'text-rally-accent' : ''} ${row.bold ? 'font-bold' : ''}`}
                  >
                    {row.influence}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-center text-rally-text-muted italic max-w-2xl mx-auto mt-8">
          {t('level_page.evolves_summary')}
        </p>
      </section>

      {/* Accuracy */}
      <section className="container mx-auto px-4 max-w-4xl">
        <h2 className="font-display text-3xl font-black mb-6">{t('level_page.accuracy_title')}</h2>
        <div className="space-y-6 text-lg text-rally-text-2 leading-relaxed bg-gradient-to-br from-rally-surface to-rally-surface-2 p-8 md:p-10 rounded-3xl border border-rally-border">
          <p>{t('level_page.accuracy_p1')}</p>
          <p>{t('level_page.accuracy_p2')}</p>
          <p className="text-rally-accent font-medium">{t('level_page.accuracy_p3')}</p>
        </div>
      </section>
    </main>
  )
}
