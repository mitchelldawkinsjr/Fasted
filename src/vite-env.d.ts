/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/react" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
  /** Optional POST endpoint for client error/warning events (JSON body). */
  readonly VITE_TELEMETRY_URL?: string;
  /** Google Analytics 4 measurement ID (e.g. G-XXXXXXXXXX). Omit in dev. */
  readonly VITE_GA_MEASUREMENT_ID?: string;
  /** Web Push VAPID public key (pair with server VAPID_PRIVATE_KEY). */
  readonly VITE_VAPID_PUBLIC_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
