import { useTranslation } from 'react-i18next'

export interface RtlInfo {
  isRTL: boolean
  dir: 'rtl' | 'ltr'
  rowReverse: string          // tailwind class
  textAlign: 'right' | 'left'
  locale: 'he-IL' | 'en-US'
}

export function useRtl(): RtlInfo {
  const { i18n } = useTranslation()
  const isRTL = i18n.dir() === 'rtl'
  return {
    isRTL,
    dir: isRTL ? 'rtl' : 'ltr',
    rowReverse: isRTL ? 'flex-row-reverse' : 'flex-row',
    textAlign: isRTL ? 'right' : 'left',
    locale: isRTL ? 'he-IL' : 'en-US',
  }
}
