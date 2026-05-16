import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !anonKey) {
  throw new Error(
    'Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Copy .env.example to .env and fill in the values.',
  )
}

export const supabase = createClient(url, anonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,     // picks up #access_token=... on /auth/callback and /set-password
    flowType: 'implicit',         // MUST match mobile so tokens have the same shape
    storageKey: 'rally-web.supabase.auth',
  },
  global: { headers: { 'X-Client-Info': 'rally-web' } },
})
