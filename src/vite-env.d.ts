/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/react" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
  /** Optional POST endpoint for client error/warning events (JSON body). */
  readonly VITE_TELEMETRY_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
