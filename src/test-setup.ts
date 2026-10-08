import '@testing-library/jest-dom'
import { vi } from 'vitest'
import i18n from '@/i18n'

// Ensure Supabase client can initialize in test environment
vi.stubEnv('VITE_SUPABASE_URL', 'https://test.supabase.co')
vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'test-anon-key')

// Force English locale for all tests
beforeAll(async () => {
  await i18n.changeLanguage('en')
})
