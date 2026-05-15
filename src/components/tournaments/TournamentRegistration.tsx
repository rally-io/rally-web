import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { registerTournament } from '@/services/api/profile'

interface TournamentRegistrationProps {
  tournamentId: string
  onSuccess?: () => void
}

export function TournamentRegistration({ tournamentId, onSuccess }: TournamentRegistrationProps) {
  const [partnerType, setPartnerType] = useState<'none' | 'existing' | 'invite'>('none')
  const [partnerName, setPartnerName] = useState('')
  const [invite, setInvite] = useState({ firstName: '', lastName: '', phone: '', country: '+972' })
  const [useCredits, setUseCredits] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async () => {
    setLoading(true)
    setError('')
    try {
      await registerTournament(tournamentId, {
        partner_type: partnerType,
        partner_player_id: partnerType === 'existing' ? partnerName : null,
        invite_first_name: partnerType === 'invite' ? invite.firstName : null,
        invite_last_name: partnerType === 'invite' ? invite.lastName : null,
        invite_phone: partnerType === 'invite' ? invite.phone : null,
        invite_country_code: partnerType === 'invite' ? invite.country : null,
        use_credits: useCredits,
      })
      onSuccess?.()
    } catch (err: any) {
      setError(err.message || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-slate-900 rounded-3xl p-8 border border-white/5">
      <h3 className="text-2xl font-bold mb-6">Register</h3>

      <div className="space-y-4 mb-6">
        <Label>Partner</Label>
        <div className="flex gap-3">
          {(['none', 'existing', 'invite'] as const).map((type) => (
            <button
              key={type}
              onClick={() => setPartnerType(type)}
              className={`px-4 py-2 rounded-xl text-sm font-medium ${partnerType === type ? 'bg-electric-green text-slate-950' : 'bg-slate-800 text-gray-300'}`}
            >
              {type === 'none' ? 'Solo' : type === 'existing' ? 'Existing' : 'Invite Guest'}
            </button>
          ))}
        </div>
      </div>

      {partnerType === 'existing' && (
        <div className="mb-6">
          <Label>Partner Name</Label>
          <Input value={partnerName} onChange={(e) => setPartnerName(e.target.value)} placeholder="Enter partner's name" className="mt-2" />
        </div>
      )}

      {partnerType === 'invite' && (
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div><Label>First Name</Label><Input value={invite.firstName} onChange={(e) => setInvite({ ...invite, firstName: e.target.value })} className="mt-2" /></div>
          <div><Label>Last Name</Label><Input value={invite.lastName} onChange={(e) => setInvite({ ...invite, lastName: e.target.value })} className="mt-2" /></div>
          <div><Label>Phone</Label><Input value={invite.phone} onChange={(e) => setInvite({ ...invite, phone: e.target.value })} className="mt-2" /></div>
          <div><Label>Country Code</Label><Input value={invite.country} onChange={(e) => setInvite({ ...invite, country: e.target.value })} className="mt-2" /></div>
        </div>
      )}

      <Separator className="my-6" />

      <label className="flex items-center gap-3 mb-6 cursor-pointer">
        <input type="checkbox" checked={useCredits} onChange={(e) => setUseCredits(e.target.checked)} className="w-5 h-5 accent-electric-green" />
        <span className="text-gray-300">Use credits</span>
      </label>

      {error && <p className="text-red-400 mb-4">{error}</p>}

      <Button onClick={handleSubmit} disabled={loading} className="w-full bg-electric-green text-slate-950 hover:bg-electric-green/90">
        {loading ? 'Registering...' : 'Register'}
      </Button>
    </div>
  )
}