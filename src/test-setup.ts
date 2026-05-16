import '@testing-library/jest-dom'
import i18n from '@/i18n'

// Force English locale for all tests
beforeAll(async () => {
  await i18n.changeLanguage('en')
})
