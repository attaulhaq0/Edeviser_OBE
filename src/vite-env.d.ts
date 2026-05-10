/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly VITE_SENTRY_DSN?: string;
  /**
   * Optional demo account password. When non-empty, the login page renders
   * the Quick Demo Access panel. Production builds leave this unset so the
   * literal never ships in the browser bundle.
   */
  readonly VITE_DEMO_PASSWORD?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
