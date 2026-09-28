import { useTranslation } from 'react-i18next'
import { CalendarDays, Clock, MapPin, Lock } from 'lucide-react'
import type { CorporateEventBase } from '@/constants/corporateEvents'
import { DetailChip } from './DetailChip'
import { RallyWordmark } from './RallyWordmark'

/**
 * The client's hero: blurred backdrop + image, the "closed event" pill, company,
 * tournament name, hosting club, and the date / time / location chips. Renders
 * the config's Hebrew labels verbatim — copy, not data.
 */
export function EventHero({ event, fallbackImage }: {
  event: CorporateEventBase
  /** The tournament's CRM banner (`image_url`), used when the entry brings no
   *  artwork of its own. Absent while the tournament is still loading. */
  fallbackImage?: string | null
}) {
  const { t } = useTranslation()
  const image = event.heroImage ?? fallbackImage ?? null
  const isContain = event.heroFit === 'contain'
  // Over the artwork unless there is none, or the event says its artwork has no
  // free corner — then above the title, never on top of the client's logos.
  const wordmarkInFlow = !image || event.wordmarkOverHero === false
  // A blank line is a paragraph; a lone newline is where the client's poster
  // wrapped, meaningless at any other width, so it reflows as a space.
  const introParagraphs = (event.intro ?? '')
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.replace(/\s+/g, ' ').trim())
    .filter(Boolean)

  const company = (
    <p className="font-display text-sm sm:text-base font-bold text-rally-accent">
      {event.company}
    </p>
  )

  const titleBlock = (
    <>
      {event.closedBadge !== false && (
        <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-rally-accent/40 bg-rally-accent/10 text-rally-accent text-xs font-bold backdrop-blur mb-4">
          <Lock className="w-3.5 h-3.5" />
          <span className="tracking-wide">{t('corporate.eyebrow')}</span>
        </span>
      )}
      {wordmarkInFlow ? (
        // Shares the company's row rather than taking one of its own: the
        // client's name on one side, the platform's mark on the other.
        <div className="flex items-center justify-between gap-4 mb-2">
          {company}
          <RallyWordmark className="h-10 sm:h-11" />
        </div>
      ) : (
        <div className="mb-1">{company}</div>
      )}
      <h1 className="font-display text-3xl sm:text-4xl font-black tracking-tight leading-[1.1] text-rally-text whitespace-pre-line">
        {event.tournamentName}
      </h1>
      {event.hostedAtLine !== false && (
        <p className="text-sm sm:text-base text-rally-text-2 mt-2">
          {t('corporate.hostedAt')} {event.clubName}
        </p>
      )}
      {introParagraphs.length > 0 && (
        // The lead reads brightest and the closing line — the call to act — in
        // the accent; the middle stays quiet so the block reads as one pitch.
        // `dir="auto"`: the copy is in the client's language, whatever the UI's.
        <div className="mt-4 space-y-2 text-sm sm:text-[15px] leading-normal sm:leading-relaxed" data-testid="event-intro">
          {introParagraphs.map((paragraph, index) => {
            const isLead = index === 0
            const isCallToAction = index === introParagraphs.length - 1 && index > 0
            return (
              <p
                key={index}
                dir="auto"
                // `text-pretty` keeps a lone last word from wrapping onto a line of its own.
                className={'text-pretty ' + (
                  isLead ? 'text-rally-text'
                    : isCallToAction ? 'font-semibold text-rally-accent'
                      : 'text-rally-text-2'
                )}
              >
                {paragraph}
              </p>
            )
          })}
        </div>
      )}
    </>
  )

  const detailChips = (
    <dl className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      <DetailChip icon={<CalendarDays className="w-4 h-4" />} label={t('corporate.detailsDate')} value={event.dateLabel} />
      <DetailChip icon={<Clock className="w-4 h-4" />} label={t('corporate.detailsTime')} value={event.timeLabel} isolateLtr />
      <DetailChip icon={<MapPin className="w-4 h-4" />} label={t('corporate.detailsLocation')} value={event.clubAddress} />
    </dl>
  )

  // No artwork and no banner (or the tournament has not loaded yet): the band
  // would collapse around a missing <img>, so the header runs without one.
  if (!image) {
    return (
      <header className="relative">
        <div className="container mx-auto px-4 max-w-xl pt-6 sm:pt-8">{titleBlock}</div>
        <div className="container mx-auto px-4 max-w-xl mt-6">{detailChips}</div>
      </header>
    )
  }

  if (isContain) {
    return (
      <header className="relative">
        <div className="relative overflow-hidden">
          <img src={image} alt="" aria-hidden className="absolute inset-0 h-full w-full object-cover scale-125 blur-2xl" />
          <img src={image} alt={event.clubName} className="relative mx-auto block w-full max-h-[220px] sm:max-h-[300px] object-contain" />
          {!wordmarkInFlow && <RallyWordmark className="absolute top-4 start-4 sm:top-6 sm:start-6 z-10" />}
        </div>
        <div className="container mx-auto px-4 max-w-xl pt-6 sm:pt-8">{titleBlock}</div>
        <div className="container mx-auto px-4 max-w-xl mt-6">{detailChips}</div>
      </header>
    )
  }

  return (
    <header className="relative">
      <div className="relative h-[430px] sm:h-[380px] overflow-hidden">
        <img src={image} alt="" aria-hidden className="absolute inset-0 h-full w-full object-cover scale-125 blur-2xl" />
        <img src={image} alt={event.clubName} className="absolute inset-x-0 top-0 w-full h-full object-cover" />
        <div aria-hidden className="absolute inset-0 bg-rally-bg/55" />
        <div aria-hidden className="absolute inset-0 bg-gradient-to-b from-rally-bg/70 via-transparent to-rally-bg" />
        {!wordmarkInFlow && <RallyWordmark className="absolute top-4 start-4 sm:top-6 sm:start-6 z-10" />}
        <div className="relative h-full container mx-auto px-4 max-w-xl flex flex-col">
          <div className="mt-auto pb-8 sm:pb-24">{titleBlock}</div>
        </div>
      </div>
      <div className="container mx-auto px-4 max-w-xl mt-4 sm:-mt-12 relative">{detailChips}</div>
    </header>
  )
}
