import { Clock } from 'lucide-react'
import type { TimeSlot } from '@/types/api'

export interface SelectedSlot {
  court_id: string
  court_name: string
  start_time: string
  end_time: string
  price: number
  service_fee: number
  duration: number
}

interface ClubSlotPickerProps {
  slots: TimeSlot[]
  loading: boolean
  duration: 60 | 90 | 120
  onDurationChange: (duration: 60 | 90 | 120) => void
  onSlotSelect: (slot: SelectedSlot) => void
}

export function ClubSlotPicker({ slots, loading, duration, onDurationChange, onSlotSelect }: ClubSlotPickerProps) {
  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-14 bg-slate-800 rounded-xl animate-pulse" />
        ))}
      </div>
    )
  }

  const filteredSlots = slots.filter((s) => s.available && s.duration === duration)

  return (
    <div>
      <div className="flex gap-3 mb-6">
        {([60, 90, 120] as const).map((d) => (
          <button
            key={d}
            onClick={() => onDurationChange(d)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              duration === d ? 'bg-electric-green text-slate-950' : 'bg-slate-800 text-gray-300 hover:bg-slate-700'
            }`}
          >
            {d} min
          </button>
        ))}
      </div>
      {filteredSlots.length === 0 ? (
        <p className="text-gray-400 text-center py-8">No slots available for this date and duration.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {filteredSlots.map((slot) => {
            const court = slot.available_courts[0]
            if (!court) return null
            return (
              <button
                key={`${slot.start_time}-${court.id}`}
                onClick={() =>
                  onSlotSelect({
                    court_id: court.id,
                    court_name: court.name,
                    start_time: slot.start_time,
                    end_time: slot.end_time,
                    price: slot.price,
                    service_fee: slot.service_fee,
                    duration: slot.duration,
                  })
                }
                className="bg-slate-900 border border-white/10 rounded-xl p-4 text-left hover:border-electric-green/50 transition-colors"
              >
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-4 h-4 text-electric-green" />
                  <span className="font-medium text-sm">{slot.start_time.slice(0, 5)}</span>
                </div>
                <div className="text-electric-green font-bold text-lg">₪{slot.price}</div>
                <div className="text-gray-500 text-xs">+₪{slot.service_fee} service · {court.name}</div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
