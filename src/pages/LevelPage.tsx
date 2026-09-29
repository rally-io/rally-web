import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import {
  BlockIcon,
  describeLevel,
  explainerBlocksFor,
  LevelChip,
} from '@/components/players/level'
import { useSkillLadder } from '@/hooks/useSkillLadder'
import type { SkillBand } from '@/lib/skillLadder'
import { scaleCopyValues } from '@/lib/skillScaleCopy'

/* The legend: one chip per state a player can meet, with the same values as the spec's
   Appendix B mockups. Fixed on purpose — this is documentation, not data. */
const LEGEND = [
  { descriptor: describeLevel(4.25, true, 91), captionKey: 'level.sealLabel' },
  { descriptor: describeLevel(3.5, false, 40), captionKey: 'level.notVerified' },
  { descriptor: describeLevel(null, undefined, null), captionKey: 'level.none' },
]

/** Bronze under 3.0, Silver under 4.0, Gold from 4.0 — rally-api's `get_skill_tier` cuts, which sit
    where the scale change moves nothing. Read off a band's floor. */
function tierEmoji(band: SkillBand): string {
  if (band.min < 3.0) return '🟤'
  if (band.min < 4.0) return '⚪'
  return '🟡'
}

/** "1.0 – 1.9" for every band but the top one, which shows its real ceiling: "4.5 – 5.0". */
function bandRangeText(band: SkillBand, isTop: boolean): string {
  const hi = isTop ? band.max : band.max - 0.1
  return `${band.min.toFixed(1)} – ${hi.toFixed(1)}`
}

/** One literal `t()` per code either ladder serves, so the key scan sees every one. A code the
    web does not know yet shows its row without a description rather than a raw key. */
function bandDescription(code: string, t: (key: string) => string): string {
  switch (code) {
    case 'D2': return t('level_page.tier_d2_desc')
    case 'D1': return t('level_page.tier_d1_desc')
    case 'C2': return t('level_page.tier_c2_desc')
    case 'C1': return t('level_page.tier_c1_desc')
    case 'B2': return t('level_page.tier_b2_desc')
    case 'B1': return t('level_page.tier_b1_desc')
    case 'A2': return t('level_page.tier_a2_desc')
    case 'A1': return t('level_page.tier_a1_desc')
    case 'A': return t('level_page.tier_a_desc')
    default: return ''
  }
}

export default function LevelPage() {
  const { t } = useTranslation()
  const ladder = useSkillLadder()
  const blocks = explainerBlocksFor(ladder)

  // The served ladder, row for row: eight bands on the 1–7 scale, seven (A2 + A1 → A) on 1–5.
  const tiers = ladder.bands.map((band, i) => ({
    code: band.code,
    range: bandRangeText(band, i === ladder.bands.length - 1),
    desc: bandDescription(band.code, t),
    emoji: tierEmoji(band),
  }))

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
            {t('level_page.intro1', { ...scaleCopyValues(ladder) })}
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
                  <tr key={tier.code} className="hover:bg-white/5 transition-colors">
                    <td className="px-4 py-2.5 whitespace-nowrap text-start">
                      {tier.emoji} {tier.code}
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
        <div className="space-y-6 text-lg text-rally-text-2 leading-relaxed">
          <p>{t('level_page.evolves_p1')}</p>
          <p>{t('level_page.evolves_p2')}</p>
          <p>{t('level_page.evolves_p3')}</p>
        </div>
        <p className="text-center text-rally-text-muted italic max-w-2xl mx-auto mt-8">
          {t('level_page.evolves_summary')}
        </p>
      </section>

      {/* Verified level — spec §10. The legend shows the three marks a player will meet in
          the app; the blocks are the same six as the in-app explainer sheet. */}
      <section className="container mx-auto px-4 max-w-4xl mb-16 sm:mb-24">
        <h2 className="font-display text-3xl font-black mb-6">{t('level.sealLabel')}</h2>
        <ul className="mb-10 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {LEGEND.map(({ descriptor, captionKey }) => (
            <li key={captionKey} className="flex flex-col items-center gap-3 rounded-3xl border border-rally-border bg-rally-surface p-6">
              <LevelChip descriptor={descriptor} size="lg" showLabel={false} />
              <span className="text-sm text-rally-text-2">{t(captionKey)}</span>
            </li>
          ))}
        </ul>
        <ol className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {blocks.map((block) => (
            <li key={block.key} className="flex gap-4 rounded-3xl border border-rally-border bg-rally-surface p-6">
              <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rally-surface-2">
                <BlockIcon icon={block.icon} />
              </span>
              <div className="min-w-0">
                <h3 className="font-display text-lg font-bold text-rally-text">{t(`level.explainer.${block.key}.title`)}</h3>
                <p className="mt-1 text-rally-text-2 leading-relaxed">{t(`level.explainer.${block.key}.body`, block.values)}</p>
              </div>
            </li>
          ))}
        </ol>
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

      {/* These tiers are the same bands the league ranking is scaled by, so the two
          pages belong together. Cross-linked rather than duplicated: the tier content
          is maintained here and here only. */}
      <section className="container mx-auto px-4 max-w-4xl mt-12">
        <Link
          to="/ranking"
          className="inline-flex items-center gap-2 text-rally-accent font-medium hover:underline"
        >
          {t('level_page.see_ranking')}
        </Link>
      </section>
    </main>
  )
}
