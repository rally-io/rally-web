import { useState } from 'react'
import { Search, MapPin as GeolocationIcon } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export interface ClubSearchFilters {
  q?: string
  lat?: number
  lon?: number
  date?: string
  durations?: number[]
  court_types?: ('indoor' | 'outdoor')[]
  sort_by?: 'distance' | 'price'
  max_distance?: number
}

interface ClubSearchProps {
  onSearch: (filters: ClubSearchFilters) => void
}

const DEFAULT_MAX_DISTANCE = 50

export function ClubSearch({ onSearch }: ClubSearchProps) {
  const [q, setQ] = useState('')
  const [date, setDate] = useState('')
  const [duration, setDuration] = useState<60 | 90 | 120>(60)
  const [courtType, setCourtType] = useState<'indoor' | 'outdoor' | ''>('')
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(null)

  const buildFilters = (overrides: Partial<ClubSearchFilters> = {}): ClubSearchFilters => {
    const filters: ClubSearchFilters = {
      durations: [duration],
      sort_by: coords ? 'distance' : 'price',
    }
    if (q.trim()) filters.q = q.trim().slice(0, 100)
    if (date) filters.date = date
    if (courtType) filters.court_types = [courtType]
    if (coords) {
      filters.lat = coords.lat
      filters.lon = coords.lon
      filters.max_distance = DEFAULT_MAX_DISTANCE
    }
    return { ...filters, ...overrides }
  }

  const handleGeolocate = () => {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const next = { lat: pos.coords.latitude, lon: pos.coords.longitude }
        setCoords(next)
        onSearch(buildFilters({ lat: next.lat, lon: next.lon, max_distance: DEFAULT_MAX_DISTANCE, sort_by: 'distance' }))
      },
      () => onSearch(buildFilters()),
    )
  }

  const handleSearch = () => onSearch(buildFilters())

  return (
    <div className="bg-slate-900 border border-white/5 rounded-3xl p-6 mb-8">
      <div className="flex gap-3 mb-4">
        <div className="flex-1 relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <Input
            placeholder="Search clubs..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="pr-10"
            maxLength={100}
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
          onChange={(e) => setDuration(Number(e.target.value) as 60 | 90 | 120)}
          className="bg-slate-950 border border-white/10 rounded-xl px-4 py-2 text-white"
        >
          <option value={60}>60 min</option>
          <option value={90}>90 min</option>
          <option value={120}>120 min</option>
        </select>
        <select
          value={courtType}
          onChange={(e) => setCourtType(e.target.value as 'indoor' | 'outdoor' | '')}
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
