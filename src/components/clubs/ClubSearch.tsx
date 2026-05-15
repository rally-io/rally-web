import { useState } from 'react'
import { Search, MapPin as GeolocationIcon } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

interface ClubSearchProps {
  onSearch: (filters: Record<string, any>) => void
}

export function ClubSearch({ onSearch }: ClubSearchProps) {
  const [text, setText] = useState('')
  const [date, setDate] = useState('')
  const [duration, setDuration] = useState(60)
  const [courtType, setCourtType] = useState<'indoor' | 'outdoor' | ''>('')

  const handleGeolocate = () => {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      (pos) => onSearch({ lat: pos.coords.latitude, lng: pos.coords.longitude, radius: 10, text, date, duration, court_type: courtType }),
      () => onSearch({ text, date, duration, court_type: courtType })
    )
  }

  const handleSearch = () => {
    onSearch({ text, date, duration, court_type: courtType, lat: undefined, lng: undefined, radius: undefined })
  }

  return (
    <div className="bg-slate-900 border border-white/5 rounded-3xl p-6 mb-8">
      <div className="flex gap-3 mb-4">
        <div className="flex-1 relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <Input
            placeholder="Search clubs..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="pr-10"
          />
        </div>
        <Button variant="outline" onClick={handleGeolocate} title="Use my location">
          <GeolocationIcon className="w-5 h-5" />
        </Button>
        <Button onClick={handleSearch}>Search</Button>
      </div>
      <div className="flex flex-wrap gap-3">
        <Input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-auto"
        />
        <select
          value={duration}
          onChange={(e) => setDuration(Number(e.target.value))}
          className="bg-slate-950 border border-white/10 rounded-xl px-4 py-2 text-white"
        >
          <option value={60}>60 min</option>
          <option value={90}>90 min</option>
          <option value={120}>120 min</option>
        </select>
        <select
          value={courtType}
          onChange={(e) => setCourtType(e.target.value as any)}
          className="bg-slate-950 border border-white/10 rounded-xl px-4 py-2 text-white"
        >
          <option value="">All types</option>
          <option value="indoor">Indoor</option>
          <option value="outdoor">Outdoor</option>
        </select>
      </div>
    </div>
  )
}