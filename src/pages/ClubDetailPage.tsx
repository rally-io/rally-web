import { useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { MapPin } from 'lucide-react'
import { useClub } from '@/hooks/useClub'
import { useBookCourt } from '@/hooks/useBookCourt'
import { useAppSession } from '@/hooks/useAppSession'
import { useAuthGate } from '@/hooks/useAuthGate'
import { ClubSlotPicker, type SelectedSlot } from '@/components/clubs/ClubSlotPicker'
import { ActionGateModal } from '@/components/profile/ActionGateModal'
import { SignInRequiredPanel } from '@/components/auth/SignInRequiredPanel'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

function toApiTime(t: string) {
  // Spec 5: HH:MM:SS — backend may return either HH:MM or HH:MM:SS in slot data.
  return t.length === 5 ? `${t}:00` : t
}

export default function ClubDetailPage() {
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [date, setDate] = useState<string>(todayIso())
  const [duration, setDuration] = useState<60 | 90 | 120>(60)
  const [selectedSlot, setSelectedSlot] = useState<SelectedSlot | null>(null)
  const [gateOpen, setGateOpen] = useState(false)

  const clubParams = useMemo(() => ({ date, duration }), [date, duration])
  const { data: club, isLoading, isError } = useClub(id!, clubParams)
  const bookCourt = useBookCourt()
  const { status, playerProfile } = useAppSession()
  const { requireSignIn } = useAuthGate()
  const signedOut = status === 'signed_out'

  const runBooking = async () => {
    if (!selectedSlot || !id) return
    try {
      await bookCourt.mutateAsync({
        club_id: id,
        court_id: selectedSlot.court_id,
        booking_date: date,
        start_time: toApiTime(selectedSlot.start_time),
        end_time: toApiTime(selectedSlot.end_time),
        use_credits: false,
      })
      setSelectedSlot(null)
      navigate('/')
    } catch (err: any) {
      if (err?.isUnauthorized) {
        navigate('/contact')
      }
    }
  }

  const submitBooking = () => {
    if (!playerProfile || !playerProfile.contact_number) {
      setGateOpen(true)
      return
    }
    void runBooking()
  }

  if (isLoading) {
    return (
      <div className="pt-32 container mx-auto px-4">
        <Skeleton className="h-96 rounded-3xl" />
      </div>
    )
  }
  if (isError || !club) {
    return (
      <div className="pt-32 container mx-auto px-4 text-center text-gray-400">
        {t('clubs.not_found', { defaultValue: 'Club not found' })}
      </div>
    )
  }

  return (
    <main className="pt-32 pb-24">
      <section className="container mx-auto px-4">
        <div className="bg-slate-900 rounded-3xl overflow-hidden mb-8 border border-white/5">
          {club.image_url && <img src={club.image_url} alt={club.name} className="w-full h-64 object-cover" />}
          <div className="p-8">
            <h1 className="text-4xl font-bold mb-2">{club.name}</h1>
            <p className="text-gray-400 flex items-center gap-2 mb-4">
              <MapPin className="w-5 h-5" />
              {club.city}{club.address_line1 ? `, ${club.address_line1}` : ''}
              {club.distance_km != null && <span className="text-electric-green ms-2">· {club.distance_km.toFixed(1)} km</span>}
            </p>
            <div className="flex gap-3 flex-wrap">
              {club.amenities.map((a) => (
                <span key={a} className="text-electric-green text-sm">{a}</span>
              ))}
            </div>
            {club.description && <p className="text-gray-300 mt-4">{club.description}</p>}
          </div>
        </div>

        <div className="bg-slate-900 rounded-3xl p-8 border border-white/5">
          <div className="flex flex-wrap gap-4 items-end mb-6">
            <h2 className="text-2xl font-bold flex-1">
              {t('clubs.book_court', { defaultValue: 'Book a Court' })}
            </h2>
            <input
              type="date"
              value={date}
              min={todayIso()}
              onChange={(e) => {
                setDate(e.target.value || todayIso())
                setSelectedSlot(null)
              }}
              className="bg-slate-950 border border-white/10 rounded-xl px-4 py-2 text-white"
            />
          </div>

          <ClubSlotPicker
            slots={club.available_slots}
            loading={false}
            duration={duration}
            onDurationChange={(d) => {
              setDuration(d)
              setSelectedSlot(null)
            }}
            onSlotSelect={setSelectedSlot}
          />

          {selectedSlot && (
            signedOut ? (
              <div className="mt-6">
                <SignInRequiredPanel
                  message={t('auth.gate.sign_in_to_book')}
                  ctaLabel={t('auth.gate.sign_in_button')}
                  onSignIn={() => {
                    void requireSignIn().catch(() => {
                      // USER_CANCELLED — keep slot selection.
                    })
                  }}
                />
              </div>
            ) : (
              <div className="mt-6 p-6 bg-slate-800 rounded-2xl border border-white/10">
                <div className="flex justify-between items-center mb-4 flex-wrap gap-4">
                  <div>
                    <p className="text-gray-400">{t('clubs.court_fee', { defaultValue: 'Court fee' })}</p>
                    <p className="text-2xl font-bold text-electric-green">₪{selectedSlot.price}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">{t('clubs.service_fee', { defaultValue: 'Service fee' })}</p>
                    <p className="text-xl font-bold">₪{selectedSlot.service_fee}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">{t('clubs.court', { defaultValue: 'Court' })}</p>
                    <p className="text-xl font-bold">{selectedSlot.court_name}</p>
                  </div>
                </div>
                <Button onClick={submitBooking} className="w-full" disabled={bookCourt.isPending}>
                  {bookCourt.isPending
                    ? t('clubs.booking', { defaultValue: 'Booking...' })
                    : t('clubs.book_now', { defaultValue: 'Book Now' })}
                </Button>
              </div>
            )
          )}
        </div>
      </section>

      <ActionGateModal
        open={gateOpen}
        action="book_court"
        onOpenChange={setGateOpen}
        onConfirmed={() => void runBooking()}
      />
    </main>
  )
}
