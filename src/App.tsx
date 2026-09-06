import { lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Layout } from './components/layout/Layout'
import { AuthGateModal } from './components/auth/AuthGateModal'
import RouteTracker from './components/analytics/RouteTracker'

// Lazy on purpose: this feature ships its own theme stylesheet, which @imports the
// Karantina display face. A static import would make every marketing page fetch it.
const LiveTournamentPage = lazy(() => import('./features/publicTournament'))
// Lazy on purpose: the player network pulls in three.js and its own textures — only this
// route should pay for them.
const PlayerNetworkPage = lazy(() => import('./features/playerGlobe'))

// Pages
import HomePage from './pages/HomePage'
import CrmPage from './pages/CrmPage'
import AppDownloadPage from './pages/AppDownloadPage'
import CoachesPage from './pages/CoachesPage'
import LevelPage from './pages/LevelPage'
import RankingPage from './features/leagueRanking/pages/RankingPage'
import PlayerSeasonPage from './features/leagueRanking/pages/PlayerSeasonPage'
import HowScoringPage from './features/leagueRanking/pages/HowScoringPage'
import PricingPage from './pages/PricingPage'
import ContactPage from './pages/ContactPage'
import PrivacyPage from './pages/PrivacyPage'
import TermsPage from './pages/TermsPage'
import ClubsPage from './pages/ClubsPage'
import ClubDetailPage from './pages/ClubDetailPage'
import ClubTournamentsPage from './pages/ClubTournamentsPage'
import ClubEventsPage from './pages/ClubEventsPage'
import TournamentsPage from './pages/TournamentsPage'
import TournamentDetailPage from './pages/TournamentDetailPage'
import OrganizerTournamentsPage from './pages/OrganizerTournamentsPage'
import MyActivityPage from './pages/MyActivityPage'
import EditProfilePage from './pages/EditProfilePage'
import PaymentMethodPage from './pages/payment/PaymentMethodPage'
import PaymentReturnPage from './pages/payment/PaymentReturnPage'
import PaymentConfirmingPage from './pages/payment/PaymentConfirmingPage'
import PaymentFailedPage from './pages/payment/PaymentFailedPage'
import CorporateSignupPage from './pages/CorporateSignupPage'
import NotFoundPage from './pages/NotFoundPage'

import LoginPage from './pages/auth/LoginPage'
import AuthCallbackPage from './pages/auth/AuthCallbackPage'
import VerifyEmailPage from './pages/auth/VerifyEmailPage'
import WelcomePage from './pages/auth/WelcomePage'
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage'
import SetPasswordPage from './pages/auth/SetPasswordPage'

export default function App() {
  const { i18n } = useTranslation()

  return (
    <div dir={i18n.language === 'he' ? 'rtl' : 'ltr'}>
      {/* Mounted once — opens when any page calls requireSignIn() from useAuthGate */}
      <AuthGateModal />

      <RouteTracker />
      <Routes>
        {/* Bare auth screens (no Layout/Navbar/Footer) */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/auth/callback" element={<AuthCallbackPage />} />
        <Route path="/auth/verify-email" element={<VerifyEmailPage />} />
        <Route path="/auth/welcome" element={<WelcomePage />} />
        <Route path="/auth/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/set-password" element={<SetPasswordPage />} />

        {/* Unlisted closed-event signup. Bare on purpose: employees get a
            private link to sign up and nothing else — no nav, no app prompt. */}
        <Route path="/join/:slug" element={<CorporateSignupPage />} />

        {/* Public live tournament results. Bare on purpose: this is a spectator screen
            shown on club TVs and phones — Navbar/Footer would eat the vertical space the
            bracket's auto-paging depends on. It owns its own theming and dir. */}
        <Route
          path="/live/:token"
          element={
            <Suspense fallback={<div className="min-h-screen bg-rally-bg" />}>
              <LiveTournamentPage />
            </Suspense>
          }
        />

        {/* Marketing + app shell */}
        <Route element={<Layout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/download" element={<AppDownloadPage />} />
          <Route path="/crm" element={<CrmPage />} />
          <Route path="/level" element={<LevelPage />} />
          {/* The player network on the padel ball. */}
          <Route
            path="/network"
            element={
              <Suspense fallback={<div className="min-h-[60vh] bg-rally-bg" />}>
                <PlayerNetworkPage />
              </Suspense>
            }
          />
          {/* Public league ranking. Inside Layout on purpose: unlike /live/:token this
              is a marketing surface — it should carry the nav and be linkable. */}
          <Route path="/ranking" element={<RankingPage />} />
          <Route path="/ranking/player/:id" element={<PlayerSeasonPage />} />
          <Route path="/ranking/how" element={<HowScoringPage />} />
          <Route path="/pricing" element={<PricingPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/coaches" element={<CoachesPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/app" element={<AppDownloadPage />} />
          <Route path="/clubs" element={<ClubsPage />} />
          <Route path="/clubs/:id" element={<ClubDetailPage />} />
          <Route path="/clubs/:id/tournaments" element={<ClubTournamentsPage />} />
          <Route path="/clubs/:id/events" element={<ClubEventsPage />} />
          <Route path="/tournaments" element={<TournamentsPage />} />
          <Route path="/tournaments/:id" element={<TournamentDetailPage />} />
          <Route path="/organizers/:slug" element={<OrganizerTournamentsPage />} />
          <Route path="/my-activity" element={<MyActivityPage />} />
          <Route path="/profile/edit" element={<EditProfilePage />} />
          <Route path="/payment-method" element={<PaymentMethodPage />} />
          <Route path="/payments/return" element={<PaymentReturnPage />} />
          <Route path="/payments/confirming" element={<PaymentConfirmingPage />} />
          <Route path="/payments/failed" element={<PaymentFailedPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </div>
  )
}
