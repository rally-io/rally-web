// src/i18n/index.ts
import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import { defaultLanguage } from './config'
import he from './locales/he.json'
import en from './locales/en.json'

i18n.use(initReactI18next).init({
  resources: { he: { translation: he }, en: { translation: en } },
  lng: localStorage.getItem('rallyLang') || defaultLanguage,
  fallbackLng: defaultLanguage,
})

export default i18n