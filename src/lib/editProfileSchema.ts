import { z } from 'zod'
import type { SkillBounds } from './skillLevel'

// Schema is intentionally permissive: every field is optional so that the user
// can submit any single dirty field via PATCH without being blocked by another
// field's emptiness. Per-flow requirements (e.g. POST needs first_name/last_name
// to create the players row) are enforced in EditProfilePage itself, not here.
//
// Built per ladder: `skill` is `typedBounds(ladder)` — 1.0–7.0 before the scale
// flip, 1.0–5.0 after it — because rally-api refuses a level above typed_max.
export function buildEditProfileSchema(skill: SkillBounds) {
  return z.object({
    first_name: z.string().trim().max(50).optional().or(z.literal('')),
    last_name: z.string().trim().max(50).optional().or(z.literal('')),
    country_code: z.string().min(1).optional(),
    contact_number: z
      .string()
      .trim()
      .optional()
      .or(z.literal(''))
      .refine((val) => !val || /^\d{6,15}$/.test(val), 'edit_profile.validation.phoneInvalid'),
    skill_level: z.number().min(skill.min).max(skill.max).nullable().optional(),
  })
}

export type EditProfileFormValues = z.infer<ReturnType<typeof buildEditProfileSchema>>
