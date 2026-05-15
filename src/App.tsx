import { Routes, Route } from 'react-router-dom'
import { Layout } from './components/layout/Layout'
import { useTranslation } from 'react-i18next'

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
import NotFoundPage from './pages/NotFoundPage'

export default function App() {
  const { i18n } = useTranslation()

  return (
    <div dir={i18n.language === 'he' ? 'rtl' : 'ltr'}>
      <Routes>
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
          <Route path="/tournaments/:id" element={<TournamentDetailPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </div>
  )
}