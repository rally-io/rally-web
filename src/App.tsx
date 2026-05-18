import { Routes, Route } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Layout } from './components/layout/Layout'
import { ProfileCompletionGate } from './components/profile/ProfileCompletionModal'
import { AuthGateModal } from './components/auth/AuthGateModal'

// Pages
import HomePage from './pages/HomePage'
import CrmPage from './pages/CrmPage'
import LevelPage from './pages/LevelPage'
import PricingPage from './pages/PricingPage'
import ContactPage from './pages/ContactPage'
import PrivacyPage from './pages/PrivacyPage'
import TermsPage from './pages/TermsPage'
import AppDownloadPage from './pages/AppDownloadPage'
import ClubsPage from './pages/ClubsPage'
import ClubDetailPage from './pages/ClubDetailPage'
import TournamentsPage from './pages/TournamentsPage'
import TournamentDetailPage from './pages/TournamentDetailPage'
import RegistrationSummaryPage from './pages/RegistrationSummaryPage'
import MyActivityPage from './pages/MyActivityPage'
import NotFoundPage from './pages/NotFoundPage'

import LoginPage from './pages/auth/LoginPage'
import AuthCallbackPage from './pages/auth/AuthCallbackPage'
import VerifyEmailPage from './pages/auth/VerifyEmailPage'
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage'
import SetPasswordPage from './pages/auth/SetPasswordPage'

export default function App() {
  const { i18n } = useTranslation()

  return (
    <div dir={i18n.language === 'he' ? 'rtl' : 'ltr'}>
      {/* Mounted once — handles blocking onboarding for both proactive guards and 403 retries */}
      <ProfileCompletionGate />
      {/* Mounted once — opens when any page calls requireSignIn() from useAuthGate */}
      <AuthGateModal />

      <Routes>
        {/* Bare auth screens (no Layout/Navbar/Footer) */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/auth/callback" element={<AuthCallbackPage />} />
        <Route path="/auth/verify-email" element={<VerifyEmailPage />} />
        <Route path="/auth/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/set-password" element={<SetPasswordPage />} />

        {/* Marketing + app shell */}
        <Route element={<Layout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/crm" element={<CrmPage />} />
          <Route path="/level" element={<LevelPage />} />
          <Route path="/pricing" element={<PricingPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/app" element={<AppDownloadPage />} />
          <Route path="/clubs" element={<ClubsPage />} />
          <Route path="/clubs/:id" element={<ClubDetailPage />} />
          <Route path="/tournaments" element={<TournamentsPage />} />
          <Route path="/tournaments/summary" element={<RegistrationSummaryPage />} />
          <Route path="/tournaments/:id" element={<TournamentDetailPage />} />
          <Route path="/my-activity" element={<MyActivityPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </div>
  )
}
