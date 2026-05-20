import { z } from 'zod'
import { SKILL_MIN, SKILL_MAX } from './skillLevel'

export const editProfileSchema = z.object({
  first_name: z
    .string()
    .trim()
    .min(1, 'edit_profile.validation.firstNameRequired')
    .max(50),
  last_name: z
    .string()
    .trim()
    .min(1, 'edit_profile.validation.lastNameRequired')
    .max(50),
  country_code: z.string().min(1),
  contact_number: z
    .string()
    .trim()
    .min(1, 'edit_profile.validation.phoneRequired')
    .regex(/^\d{6,15}$/, 'edit_profile.validation.phoneInvalid'),
  skill_level: z.number().min(SKILL_MIN).max(SKILL_MAX),
})

export type EditProfileFormValues = z.infer<typeof editProfileSchema>
