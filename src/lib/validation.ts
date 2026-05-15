// src/lib/validation.ts
import { z } from 'zod'

export const bookCourtSchema = z.object({
  club_id: z.string().uuid(),
  court_id: z.string().uuid(),
  booking_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  start_time: z.string().regex(/^\d{2}:\d{2}:\d{2}$/),
  end_time: z.string().regex(/^\d{2}:\d{2}:\d{2}$/),
  use_credits: z.boolean(),
})

export const tournamentRegistrationSchema = z.object({
  partner_type: z.enum(['none', 'existing', 'invite']),
  partner_player_id: z.string().uuid().nullable().optional(),
  invite_first_name: z.string().nullable().optional(),
  invite_last_name: z.string().nullable().optional(),
  invite_phone: z.string().nullable().optional(),
  invite_country_code: z.string().nullable().optional(),
  use_credits: z.boolean(),
})

export const profileUpdateSchema = z.object({
  contact_number: z.string().optional(),
  skill_level: z.number().min(1.0).max(7.0).optional(),
})