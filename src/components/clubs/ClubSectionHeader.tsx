import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowRight } from 'lucide-react'

interface Props {
  title: string
  seeAllTo?: string
}

export function ClubSectionHeader({ title, seeAllTo }: Props) {
  const { t } = useTranslation()
  return (
    <div className="flex items-center justify-between gap-4 mb-5">
      <h2 className="font-display text-2xl md:text-3xl font-bold text-rally-text">
        {title}
      </h2>
      {seeAllTo && (
        <Link
          to={seeAllTo}
          className="shrink-0 inline-flex items-center gap-1.5 text-sm font-semibold text-rally-accent hover:text-rally-accent-hover transition-colors"
        >
          {t('clubs.seeAll')}
          <ArrowRight className="w-4 h-4 rtl:rotate-180" />
        </Link>
      )}
    </div>
  )
}
