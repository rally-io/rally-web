// src/i18n/index.ts
import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import { defaultLanguage } from './config'
import he from './locales/he.json'
import en from './locales/en.json'

const savedLang = (() => {
  try {
    return localStorage.getItem('rallyLang')
  } catch {
    return null
  }
})()

i18n.use(initReactI18next).init({
  resources: { he: { translation: he }, en: { translation: en } },
  lng: savedLang || defaultLanguage,
  fallbackLng: defaultLanguage,
  initImmediate: false,
})

export default i18n