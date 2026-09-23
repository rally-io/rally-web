import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'

/**
 * Mirrors the active locale onto <html>. index.html ships a static
 * `lang="he" dir="rtl"`, and the `dir` on App's wrapper div only reaches its own
 * subtree — Radix dialogs, sheets and toasts portal into <body>, so without this
 * they stay RTL after switching to English.
 */
export function useDocumentLanguage(): void {
  const { i18n } = useTranslation()
  const lang = i18n.language

  useEffect(() => {
    const root = document.documentElement
    root.lang = lang
    root.dir = lang === 'he' ? 'rtl' : 'ltr'
  }, [lang])
}
