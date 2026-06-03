// src/pages/payment/PaymentFailedPage.tsx
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { X } from 'lucide-react'
import { pendingPayment } from '@/hooks/usePendingPayment'

export default function PaymentFailedPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const handleGoHome = () => {
    pendingPayment.clear()
    navigate('/')
  }

  return (
    <main className="min-h-screen bg-rally-bg flex items-center justify-center px-4">
      <div className="container max-w-md mx-auto text-center space-y-6">
        <div className="mx-auto w-20 h-20 rounded-full bg-rally-error/15 flex items-center justify-center">
          <X className="w-10 h-10 text-rally-error" />
        </div>
        <div className="space-y-2">
          <h1 className="font-display text-3xl font-black text-rally-text">
            {t('payment.failedTitle')}
          </h1>
          <p className="text-rally-text-2">{t('payment.failedSubtitle')}</p>
        </div>
        <div className="space-y-3">
          <button
            onClick={() => navigate(-1)}
            className="w-full h-12 rounded-full bg-rally-accent text-rally-accent-text font-bold"
          >
            {t('payment.tryAgain')}
          </button>
          <button
            onClick={handleGoHome}
            className="w-full h-12 rounded-full border border-rally-border text-rally-text font-semibold"
          >
            {t('payment.goHome')}
          </button>
        </div>
      </div>
    </main>
  )
}