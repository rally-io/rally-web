import { lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Layout } from './components/layout/Layout'
import { AuthGateModal } from './components/auth/AuthGateModal'
import RouteTracker from './components/analytics/RouteTracker'

// Lazy on purpose: this feature ships its own theme stylesheet, which @imports the
// Karantina display face. A static import would make every marketing page fetch it.
const LiveTournamentPage = lazy(() => import('./features/publicTournament'))

// Pages
import HomePage from './pages/HomePage'
import CrmPage from './pages/CrmPage'
import AppDownloadPage from './pages/AppDownloadPage'
import CoachesPage from './pages/CoachesPage'
import LevelPage from './pages/LevelPage'
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
import RegistrationSummaryPage from './pages/RegistrationSummaryPage'
import MyActivityPage from './pages/MyActivityPage'
import EditProfilePage from './pages/EditProfilePage'
import PaymentsMovedPage from './pages/payment/PaymentsMovedPage'
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
          <Route path="/tournaments/summary" element={<RegistrationSummaryPage />} />
          <Route path="/tournaments/:id" element={<TournamentDetailPage />} />
          <Route path="/my-activity" element={<MyActivityPage />} />
          <Route path="/profile/edit" element={<EditProfilePage />} />
          <Route path="/payment-method" element={<PaymentsMovedPage />} />
          <Route path="/payments/return" element={<PaymentReturnPage />} />
          <Route path="/payments/confirming" element={<PaymentConfirmingPage />} />
          <Route path="/payments/failed" element={<PaymentFailedPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </div>
  )
}
