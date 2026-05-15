import { useState } from 'react'
import { Clock } from 'lucide-react'
import type { TimeSlot } from '@/types/api'

interface ClubSlotPickerProps {
  slots: TimeSlot[]
  loading: boolean
  onSlotSelect: (slot: { court_id: string; start_time: string; end_time: string; price: number; service_fee: number }) => void
}

export function ClubSlotPicker({ slots, loading, onSlotSelect }: ClubSlotPickerProps) {
  const [duration, setDuration] = useState(60)

  if (loading) {
    return <div className="space-y-2">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-14 bg-slate-800 rounded-xl animate-pulse" />)}</div>
  }

  if (slots.length === 0) {
    return <p className="text-gray-400 text-center py-8">No slots available for this date and duration.</p>
  }

  return (
    <div>
      <div className="flex gap-3 mb-6">
        {[60, 90, 120].map((d) => (
          <button
            key={d}
            onClick={() => setDuration(d)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${duration === d ? 'bg-electric-green text-slate-950' : 'bg-slate-800 text-gray-300 hover:bg-slate-700'}`}
          >
            {d} min
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {slots.filter((s) => s.duration === duration && s.available).map((slot) => (
          <button
            key={`${slot.start_time}-${slot.available_courts[0]?.id}`}
            onClick={() => onSlotSelect({ court_id: slot.available_courts[0]?.id || '', start_time: slot.start_time, end_time: slot.end_time, price: slot.price, service_fee: slot.service_fee })}
            className="bg-slate-900 border border-white/10 rounded-xl p-4 text-left hover:border-electric-green/50 transition-colors"
          >
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-electric-green" />
              <span className="font-medium text-sm">{slot.start_time.slice(0, 5)}</span>
            </div>
            <div className="text-electric-green font-bold text-lg">₪{slot.price}</div>
            <div className="text-gray-500 text-xs">+₪{slot.service_fee} service</div>
          </button>
        ))}
      </div>
    </div>
  )
}