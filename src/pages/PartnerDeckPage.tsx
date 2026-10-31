import { useMemo, type ReactNode } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { SignInRequiredPanel } from '@/components/auth/SignInRequiredPanel'
import { DeckSpinner } from '@/components/partners/DeckMessage'
import { PartnerDeck } from '@/components/partners/PartnerDeck'
import { PartnerDeckHeader } from '@/components/partners/PartnerDeckHeader'
import { eventPagePathForTournament } from '@/constants/corporateEvents'
import { useAppSession } from '@/hooks/useAppSession'
import { useAuth } from '@/hooks/useAuth'
import { useAuthGate } from '@/hooks/useAuthGate'
import { useTournamentPartnerDraft } from '@/hooks/useTournamentPartnerDraft'
import { partnerDeckPath } from '@/lib/findPartner'
import { courtViewerOf } from '@/lib/partners/viewer'

/**
 * The partner finder for one tournament, at the same path as the app's. A tournament registered
 * only on its event page gets no deck (its page never shows the row; this covers a typed URL).
 * Remounted per account, like the tournament page: the deck and the partner draft belong to one.
 */
export default function PartnerDeckPage() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const eventPage = eventPagePathForTournament(id)
  if (eventPage) return <Navigate to={eventPage} replace />
  return <PartnerDeckGate key={`${id}:${user?.id ?? 'anonymous'}`} tournamentId={id!} />
}

/** The tournament page's partner-section gates, then the deck. The page decides where each way
    out leads; Register together goes back to the tournament with the partner picked. */
function PartnerDeckGate({ tournamentId }: { tournamentId: string }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { requireSignIn } = useAuthGate()
  const { status, playerProfile, needsDetails, refetchOnboarding } = useAppSession()
  const [, selectPartner] = useTournamentPartnerDraft(tournamentId, user?.id ?? '')
  const viewer = useMemo(() => courtViewerOf(playerProfile), [playerProfile])

  const tournamentPath = `/tournaments/${tournamentId}`
  const returnTo = encodeURIComponent(partnerDeckPath(tournamentId))

  const gate = (body: ReactNode) => (
    <>
      <PartnerDeckHeader tournamentId={tournamentId} />
      <div className="pt-4">{body}</div>
    </>
  )

  const content = (() => {
    if (status === 'loading') return gate(<DeckSpinner testId="partner-page-loading" />)
    if (status === 'signed_out') {
      return gate(
        <SignInRequiredPanel
          message={t('tournament.partnerSignInPrompt')}
          ctaLabel={t('auth.gate.sign_in_button')}
          onSignIn={() => {
            void requireSignIn()
              .then(() => refetchOnboarding())
              .catch(() => {
                // USER_CANCELLED: the panel stays.
              })
          }}
        />,
      )
    }
    if (needsDetails || status === 'profile_incomplete') {
      return gate(
        <SignInRequiredPanel
          message={t('tournament.partnerCompleteProfilePrompt')}
          ctaLabel={t('user_menu.complete_profile')}
          onSignIn={() => navigate(`/profile/edit?purpose=tournament&returnTo=${returnTo}`)}
        />,
      )
    }
    if (status === 'profile_error') {
      return gate(
        <div role="alert" className="space-y-2 text-sm text-rally-text-2">
          <p>{t('edit_profile.loadError')}</p>
          <button type="button" onClick={() => void refetchOnboarding()} className="font-semibold text-rally-accent">
            {t('edit_profile.retry')}
          </button>
        </div>,
      )
    }
    return (
      <PartnerDeck
        tournamentId={tournamentId}
        viewer={viewer}
        onRegisterTogether={(partner) => {
          selectPartner({ phase: 'selected', partner })
          navigate(tournamentPath, { state: { scrollTo: 'partner-section' } })
        }}
        onOpenTournament={() => navigate(tournamentPath)}
        onEditProfile={() => navigate(`/profile/edit?returnTo=${returnTo}`)}
      />
    )
  })()

  return (
    <main className="min-h-screen bg-rally-bg pb-10 pt-24">
      <div className="mx-auto flex min-h-[calc(100dvh-8.5rem)] max-w-[420px] flex-col px-4">{content}</div>
    </main>
  )
}
