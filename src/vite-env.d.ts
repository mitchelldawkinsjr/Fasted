/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/react" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
  /** Sentry DSN for client error monitoring. Omit in dev. */
  readonly VITE_SENTRY_DSN?: string;
  /** Google Analytics 4 measurement ID (e.g. G-XXXXXXXXXX). Omit in dev. */
  readonly VITE_GA_MEASUREMENT_ID?: string;
  /** Web Push VAPID public key (pair with server VAPID_PRIVATE_KEY). */
  readonly VITE_VAPID_PUBLIC_KEY?: string;
  /** Set by Playwright so DEV-only UI (e.g. reminder previews) stays out of e2e/visual. */
  readonly VITE_E2E?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
