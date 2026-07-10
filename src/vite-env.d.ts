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
  /**
   * UI prototype migration feature flags (see src/lib/featureFlags.ts). Each is
   * the string "true" | "false" (unset → old UI). Read via static member access
   * so Vite inlines them; a per-browser localStorage override can supersede them.
   */
  readonly VITE_FF_NEW_UI_CHROME?: string;
  readonly VITE_FF_NEW_UI_AUTH?: string;
  readonly VITE_FF_NEW_UI_DASHBOARDS?: string;
  readonly VITE_FF_NEW_UI_MODULES?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
