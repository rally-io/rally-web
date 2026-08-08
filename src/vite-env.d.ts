/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  readonly VITE_API_BASE_URL: string
  /** Poll interval in ms for the public live tournament page. Defaults to 10000. */
  readonly VITE_POLL_INTERVAL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
