import { Link } from 'react-router-dom'
import { MapPin } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { Club } from '@/types/api'

interface ClubCardProps {
  club: Club
}

export function ClubCard({ club }: ClubCardProps) {
  return (
    <Link to={`/clubs/${club.id}`}>
      <Card className="bg-slate-900 border-white/5 hover:border-electric-green/50 transition-colors cursor-pointer h-full">
        <div className="aspect-video bg-slate-800 relative overflow-hidden rounded-t-lg">
          {club.thumb_url ? (
            <img src={club.thumb_url} alt={club.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-electric-green">
              <MapPin className="w-12 h-12 opacity-30" />
            </div>
          )}
          {club.has_availability && (
            <Badge className="absolute top-3 left-3 bg-electric-green text-slate-950 text-xs">Available</Badge>
          )}
        </div>
        <CardContent className="p-4">
          <h3 className="font-bold text-lg mb-1">{club.name}</h3>
          <p className="text-gray-400 text-sm mb-2 flex items-center gap-1">
            <MapPin className="w-4 h-4" />
            {club.city}
            {club.distance_km != null && <span className="text-electric-green">· {club.distance_km.toFixed(1)} km</span>}
          </p>
          <div className="flex items-center gap-2 mb-3">
            {club.court_types.map((type) => (
              <Badge key={type} variant="outline" className="text-xs">{type}</Badge>
            ))}
          </div>
          <div className="flex items-center justify-between">
            <span className="text-electric-green font-bold">₪{club.starts_from}<span className="text-gray-400 text-sm font-normal"> /hour</span></span>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}