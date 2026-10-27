import { useMemo, type CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Share2 } from 'lucide-react'
import { trackElections } from '@/lib/analytics'
import { BrandLogo } from './BrandLogo'
import { ELECTION_WINNER_DATE, WHATSAPP_COMMUNITY_URL, getBrand, getClub } from './config'
import type { ElectionVote } from './types'

const SHARE_URL =
  'https://rallypadel.app/elections?utm_source=share&utm_medium=referral&utm_campaign=elections2026'

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.03-.52-.07-.15-.67-1.61-.92-2.21-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.21 3.08c.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.69.63.71.23 1.36.2 1.87.12.57-.08 1.76-.72 2-1.41.25-.7.25-1.29.17-1.41-.07-.13-.27-.2-.57-.35M12.05 21.5h-.01a9.4 9.4 0 0 1-4.8-1.31l-.34-.2-3.57.93.95-3.48-.22-.36a9.4 9.4 0 0 1-1.44-5.02c0-5.2 4.24-9.43 9.44-9.43 2.52 0 4.89.98 6.67 2.77a9.37 9.37 0 0 1 2.76 6.67c0 5.2-4.24 9.43-9.44 9.43m8.03-17.46A11.27 11.27 0 0 0 12.05.72C5.8.72.7 5.8.7 12.07c0 2 .52 3.95 1.52 5.67L.6 23.62l6.02-1.58a11.33 11.33 0 0 0 5.42 1.38h.01c6.26 0 11.35-5.09 11.35-11.35 0-3.03-1.18-5.88-3.32-8.03" />
    </svg>
  )
}

function Confetti() {
  const pieces = useMemo(
    () =>
      Array.from({ length: 22 }, (_, i) => ({
        left: `${(i * 37) % 100}%`,
        color: ['#ccff00', '#0055ff', '#ffffff'][i % 3],
        style: {
          '--dx': `${((i * 53) % 120) - 60}px`,
          '--rot': `${(i * 97) % 720}deg`,
          '--dur': `${1.8 + ((i * 13) % 10) / 10}s`,
          '--delay': `${((i * 7) % 6) / 10}s`,
        } as CSSProperties,
      })),
    [],
  )
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {pieces.map((p, i) => (
        <span
          key={i}
          className="elx-confetti"
          style={{ ...p.style, left: p.left, background: p.color }}
        />
      ))}
    </div>
  )
}

export function ThankYou({
  vote,
  already = false,
}: {
  vote: ElectionVote | null
  already?: boolean
}) {
  const { t } = useTranslation()
  const club = getClub(vote?.club_id)
  const chain = getBrand(vote?.chain_id)

  const share = async () => {
    trackElections('share')
    const text = t('elections.done.share_text', { club: club?.name ?? '' })
    if (navigator.share) {
      try {
        await navigator.share({ text, url: SHARE_URL })
      } catch {
        // dismissed
      }
      return
    }
    window.open(
      `https://wa.me/?text=${encodeURIComponent(`${text} ${SHARE_URL}`)}`,
      '_blank',
      'noopener',
    )
  }

  return (
    <div className="elx-step-in relative text-center">
      {!already && <Confetti />}
      <div className="elx-stamp mx-auto mt-2 flex h-20 w-20 items-center justify-center rounded-full border-4 border-rally-accent text-4xl font-black text-rally-accent">
        ✓
      </div>
      <h1 className="mt-4 font-display text-[34px] font-black leading-none">
        {t(already ? 'elections.done.title_already' : 'elections.done.title')}
      </h1>
      <p className="mt-2 text-[15px] text-white/80">{t('elections.done.raffle')}</p>

      {club && (
        <div className="mx-auto mt-5 flex max-w-xs flex-col gap-2 text-start">
          <div className="elx-paper flex items-center gap-3 px-3 py-2.5">
            <BrandLogo brandId={club.brand} className="h-9 w-9 text-xs" />
            <span className="min-w-0">
              <span className="block text-[11px] text-[#141a2e]/55">
                {t('elections.done.your_club')}
              </span>
              <span className="block truncate font-display text-sm font-bold">{club.name}</span>
            </span>
          </div>
          {chain && (
            <div className="elx-paper flex items-center gap-3 px-3 py-2.5">
              <BrandLogo brandId={chain.id} className="h-9 w-9 text-xs" />
              <span className="min-w-0">
                <span className="block text-[11px] text-[#141a2e]/55">
                  {t('elections.done.your_chain')}
                </span>
                <span className="block truncate font-display text-sm font-bold">{chain.name}</span>
              </span>
            </div>
          )}
        </div>
      )}

      <div className="mt-7 rounded-2xl border border-[#25d366]/40 bg-[#25d366]/10 p-4">
        <p className="font-display text-lg font-black leading-snug">
          {t('elections.done.wa_title', { date: ELECTION_WINNER_DATE })}
        </p>
        <a
          href={WHATSAPP_COMMUNITY_URL}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => trackElections('whatsapp_click')}
          className="elx-wa mt-3 flex h-14 w-full items-center justify-center gap-2.5 rounded-full font-display text-[17px] font-black text-white active:scale-[0.98]"
        >
          <WhatsAppIcon className="h-6 w-6" />
          {t('elections.done.wa_cta')}
        </a>
      </div>

      <button
        type="button"
        onClick={share}
        className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-full border border-white/20 font-display text-[15px] font-bold text-white active:scale-[0.98]"
      >
        <Share2 className="h-4 w-4" />
        {t('elections.done.share')}
      </button>

      <Link
        to="/download"
        className="mt-4 inline-block text-[13px] text-white/60 underline underline-offset-4"
      >
        {t('elections.done.app')}
      </Link>
    </div>
  )
}
