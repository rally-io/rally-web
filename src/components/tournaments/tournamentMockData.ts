import type { Tournament } from '@/types/api'

export interface MockOrganizer {
  name: string
  avatar: string | null
  role: string
}

export interface MockPlayer {
  id: string
  name: string
  avatar: string | null
  skill: string | null
  initials: string
}

export interface MockScheduleEntry {
  label: string
  date: string
}

export interface MockCancellationPolicy {
  deadline: string
  refundDescription: string
  cancelFeePercent: number
}

const palette = ['bg-sky-500', 'bg-emerald-500', 'bg-fuchsia-500', 'bg-amber-500', 'bg-rose-500', 'bg-indigo-500', 'bg-teal-500', 'bg-orange-500']

export function getMockOrganizer(t: Tournament): MockOrganizer {
  return {
    name: t.club_name ? `${t.club_name} · SportiVit` : 'SportiVit',
    avatar: null,
    role: 'Tournament Organizer',
  }
}

export function getMockPlayers(t: Tournament): MockPlayer[] {
  const maxParticipants = t.max_participants ?? 10
  const registered = Math.max(0, maxParticipants - (t.available_seats ?? 0))
  const sampleNames = [
    'Yuval Y.',
    'Goni A.',
    'Ruth M.',
    'Sharon A.',
    'Maya L.',
    'Noa D.',
    'Hila K.',
    'Tal R.',
    'Lior B.',
    'Adi V.',
  ]
  return Array.from({ length: registered }, (_, i) => {
    const name = sampleNames[i % sampleNames.length]
    return {
      id: `mock-${i}`,
      name,
      avatar: null,
      skill: i % 3 === 0 ? (t.skill_level || '2.0-2.5') : null,
      initials: name.slice(0, 1),
    }
  })
}

export function getMockSchedule(t: Tournament): MockScheduleEntry[] {
  const start = t.start_date
  const end = t.end_date
  const deadline = t.registration_deadline
  return [
    { label: 'schedule_start', date: start },
    { label: 'schedule_end', date: end },
    { label: 'schedule_deadline', date: deadline },
  ]
}

export function getMockCancellationPolicy(t: Tournament): MockCancellationPolicy {
  const deadline = new Date(t.registration_deadline)
  deadline.setDate(deadline.getDate() - 2)
  return {
    deadline: deadline.toISOString(),
    refundDescription: 'cancellation_policy_body',
    cancelFeePercent: 5,
  }
}

export function colorForIndex(i: number) {
  return palette[i % palette.length]
}
