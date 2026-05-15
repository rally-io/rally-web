import { useParams } from 'react-router-dom'
import { useTournament } from '@/hooks/useTournament'
import { TournamentRegistration } from '@/components/tournaments/TournamentRegistration'
import { Calendar, MapPin, Users, Trophy } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import type { Prize, Sponsor } from '@/types/api'

export default function TournamentDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { data, isLoading } = useTournament(id!)

  if (isLoading) return <div className="pt-32 container mx-auto px-4"><Skeleton className="h-96 rounded-3xl" /></div>
  if (!data) return <div className="pt-32 container mx-auto px-4 text-center">Tournament not found</div>

  const t = data
  const deadline = new Date(t.registration_deadline)
  const isClosed = deadline < new Date()

  return (
    <main className="pt-32 pb-24">
      <section className="container mx-auto px-4 max-w-4xl">
        {/* Hero */}
        <div className="bg-slate-900 rounded-3xl overflow-hidden mb-8 border border-white/5">
          {t.image_url && <img src={t.image_url} alt={t.name} className="w-full h-64 object-cover" />}
          <div className="p-8">
            <div className="flex items-center gap-3 mb-4">
              <Badge className="bg-electric-green text-slate-950">{t.format}</Badge>
              <Badge variant="outline">{t.skill_level}</Badge>
            </div>
            <h1 className="text-4xl font-bold mb-2">{t.name}</h1>
            <p className="text-gray-400 flex items-center gap-2 mb-4"><MapPin className="w-5 h-5" />{t.club_name}</p>
            <p className="text-gray-400 flex items-center gap-2 mb-4"><Calendar className="w-5 h-5" />{new Date(t.start_date).toLocaleDateString('he-IL')} – {new Date(t.end_date).toLocaleDateString('he-IL')}</p>
            <p className="text-gray-400 flex items-center gap-2 mb-4"><Users className="w-5 h-5" />{t.available_seats} seats available</p>
            {t.description && <p className="text-gray-300 mt-4">{t.description}</p>}
          </div>
        </div>

        {/* Prizes */}
        {t.prizes && t.prizes.length > 0 && (
          <div className="bg-slate-900 rounded-3xl p-8 border border-white/5 mb-8">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2"><Trophy className="w-6 h-6 text-electric-green" />Prizes</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {t.prizes.map((prize: Prize) => (
                <div key={prize.id} className="bg-slate-800 rounded-2xl p-4 text-center">
                  <p className="font-bold text-lg mb-2">{prize.title}</p>
                  <p className="text-gray-400 text-sm">{prize.description}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Sponsors */}
        {t.sponsors && t.sponsors.length > 0 && (
          <div className="bg-slate-900 rounded-3xl p-8 border border-white/5 mb-8">
            <h2 className="text-2xl font-bold mb-6">Sponsors</h2>
            <div className="flex flex-wrap gap-4">
              {t.sponsors.map((sponsor: Sponsor) => (
                <a key={sponsor.id} href={sponsor.website_url} target="_blank" rel="noopener noreferrer" className="text-electric-green hover:underline">{sponsor.name}</a>
              ))}
            </div>
          </div>
        )}

        {/* Registration */}
        {isClosed ? (
          <div className="bg-slate-900 rounded-3xl p-8 border border-white/5 text-center">
            <p className="text-gray-400 text-xl">Registration closed</p>
          </div>
        ) : (
          <TournamentRegistration tournamentId={id!} />
        )}

        {/* My Registration Status */}
        {t.my_registration && (
          <div className="mt-8 bg-slate-900 rounded-3xl p-6 border border-white/5">
            <h3 className="font-bold text-lg mb-2">Your Registration</h3>
            <p className="text-electric-green">{t.registration_status}</p>
          </div>
        )}
      </section>
    </main>
  )
}