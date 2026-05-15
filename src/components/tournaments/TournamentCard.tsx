import { Link } from 'react-router-dom'
import { Calendar, Users, MapPin } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { Tournament } from '@/types/api'

interface TournamentCardProps {
  tournament: Tournament
}

const formatLabels = { singles: 'Singles', doubles: 'Doubles', mixed: 'Mixed' }

export function TournamentCard({ tournament }: TournamentCardProps) {
  return (
    <Link to={`/tournaments/${tournament.id}`}>
      <Card className="bg-slate-900 border-white/5 hover:border-electric-green/50 transition-colors cursor-pointer h-full">
        <div className="aspect-video bg-slate-800 relative overflow-hidden rounded-t-lg">
          {tournament.thumb_url ? (
            <img src={tournament.thumb_url} alt={tournament.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-electric-green">
              <Calendar className="w-12 h-12 opacity-30" />
            </div>
          )}
          <Badge className="absolute top-3 left-3 bg-electric-green text-slate-950 text-xs">{formatLabels[tournament.format]}</Badge>
        </div>
        <CardContent className="p-4">
          <h3 className="font-bold text-lg mb-1">{tournament.name}</h3>
          <p className="text-gray-400 text-sm mb-2 flex items-center gap-1">
            <MapPin className="w-4 h-4" />
            {tournament.club_name}
          </p>
          <p className="text-gray-400 text-sm mb-3 flex items-center gap-1">
            <Calendar className="w-4 h-4" />
            {new Date(tournament.start_date).toLocaleDateString('he-IL')} – {new Date(tournament.end_date).toLocaleDateString('he-IL')}
          </p>
          <div className="flex items-center justify-between">
            <span className="text-electric-green font-bold">₪{tournament.entry_fee}</span>
            <span className="text-gray-400 text-sm flex items-center gap-1">
              <Users className="w-4 h-4" />
              {tournament.available_seats} seats
            </span>
          </div>
          {tournament.registration_status && (
            <Badge className="mt-3">{tournament.registration_status}</Badge>
          )}
        </CardContent>
      </Card>
    </Link>
  )
}