// src/i18n/config.ts
export const languages = ['he', 'en'] as const
export type Language = typeof languages[number]
export const defaultLanguage: Language = 'he'