import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useClub } from '@/hooks/useClub'
import { useBookCourt } from '@/hooks/useBookCourt'
import { useOnboardingStatus } from '@/hooks/useOnboardingStatus'
import { ClubSlotPicker } from '@/components/clubs/ClubSlotPicker'
import { ProfileCompletionModal } from '@/components/profile/ProfileCompletionModal'
import { MapPin } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

export default function ClubDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data, isLoading } = useClub(id!, { include_slots: true })
  const bookCourt = useBookCourt()
  const { data: status } = useOnboardingStatus()

  const [selectedSlot, setSelectedSlot] = useState<{ court_id: string; start_time: string; end_time: string; price: number; service_fee: number } | null>(null)
  const [profileModalOpen, setProfileModalOpen] = useState(false)
  const [pendingAction, setPendingAction] = useState<any>(null)

  const handleSlotSelect = (slot: any) => setSelectedSlot(slot)

  const handleBook = async () => {
    if (!selectedSlot || !id) return
    try {
      await bookCourt.mutateAsync({
        club_id: id,
        court_id: selectedSlot.court_id,
        booking_date: new Date().toISOString().slice(0, 10),
        start_time: selectedSlot.start_time,
        end_time: selectedSlot.end_time,
        use_credits: false,
      })
      navigate('/')
    } catch (err: any) {
      if (err.isProfileFieldsRequired) {
        setPendingAction({ type: 'book', data: { club_id: id, ...selectedSlot } })
        setProfileModalOpen(true)
      } else if (err.isUnauthorized) {
        navigate('/contact')
      }
    }
  }

  if (isLoading) return <div className="pt-32 container mx-auto px-4"><Skeleton className="h-96 rounded-3xl" /></div>
  if (!data) return <div className="pt-32 container mx-auto px-4 text-center">Club not found</div>

  const club = data

  return (
    <main className="pt-32 pb-24">
      <section className="container mx-auto px-4">
        {/* Hero */}
        <div className="bg-slate-900 rounded-3xl overflow-hidden mb-8 border border-white/5">
          {club.image_url && <img src={club.image_url} alt={club.name} className="w-full h-64 object-cover" />}
          <div className="p-8">
            <h1 className="text-4xl font-bold mb-2">{club.name}</h1>
            <p className="text-gray-400 flex items-center gap-2 mb-4"><MapPin className="w-5 h-5" />{club.city}, {club.address_line1}</p>
            <div className="flex gap-3">{club.amenities.map((a: string) => <span key={a} className="text-electric-green text-sm">{a}</span>)}</div>
          </div>
        </div>

        {/* Slot Picker */}
        <div className="bg-slate-900 rounded-3xl p-8 border border-white/5">
          <h2 className="text-2xl font-bold mb-6">Book a Court</h2>
          <ClubSlotPicker
            slots={club.available_slots}
            loading={false}
            onSlotSelect={handleSlotSelect}
          />
          {selectedSlot && (
            <div className="mt-6 p-6 bg-slate-800 rounded-2xl border border-white/10">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <p className="text-gray-400">Court fee</p>
                  <p className="text-2xl font-bold text-electric-green">₪{selectedSlot.price}</p>
                </div>
                <div>
                  <p className="text-gray-400">Service fee</p>
                  <p className="text-xl font-bold">₪{selectedSlot.service_fee}</p>
                </div>
              </div>
              <Button onClick={handleBook} className="w-full" disabled={bookCourt.isPending}>
                {bookCourt.isPending ? 'Booking...' : 'Book Now'}
              </Button>
            </div>
          )}
        </div>
      </section>

      <ProfileCompletionModal
        open={profileModalOpen}
        onOpenChange={setProfileModalOpen}
        missingFields={status?.missing_steps.map((step: string) => ({ field: step, label: step, scope: 'profile' })) ?? []}
        onSuccess={() => { setProfileModalOpen(false); if (pendingAction) handleBook() }}
      />
    </main>
  )
}