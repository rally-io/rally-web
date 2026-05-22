import { z } from 'zod'
import { SKILL_MIN, SKILL_MAX } from './skillLevel'

export const editProfileSchema = z.object({
  first_name: z
    .string()
    .trim()
    .max(50)
    .optional()
    .or(z.literal('')),
  last_name: z
    .string()
    .trim()
    .max(50)
    .optional()
    .or(z.literal('')),
  country_code: z.string().min(1).optional(),
  contact_number: z
    .string()
    .trim()
    .optional()
    .or(z.literal(''))
    .refine((val) => !val || /^\d{6,15}$/.test(val), 'edit_profile.validation.phoneInvalid'),
  skill_level: z.number().min(SKILL_MIN).max(SKILL_MAX).optional(),
})

export type EditProfileFormValues = z.infer<typeof editProfileSchema>
