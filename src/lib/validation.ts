// src/lib/validation.ts
import { z } from 'zod'

export const profileUpdateSchema = z.object({
  contact_number: z.string().optional(),
  skill_level: z.number().min(1.0).max(7.0).optional(),
})
