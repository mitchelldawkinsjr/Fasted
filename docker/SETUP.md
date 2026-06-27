# Supabase + Deployment

Optional cloud sync for Fasted Calendar. The PWA stays offline-first; signing in uploads your progress JSON to Supabase on your VPS.

Set these environment variables before running setup scripts:

| Variable | Example | Purpose |
|----------|---------|---------|
| `SITE_URL` | `https://app.example.com` | Public PWA URL (OAuth redirects) |
| `API_URL` | `https://api.example.com` | Supabase API URL |
| `APP_DOMAIN` | `app.example.com` | NPM proxy host for the PWA |
| `API_DOMAIN` | `api.example.com` | NPM proxy host for Supabase Kong |
| `DEPLOY_DIR` | `/opt/apps/fasted-calendar` | App install path on VPS |
| `SUPABASE_DIR` | `/opt/apps/supabase` | Supabase docker stack path |
| `DOCKER_NETWORK` | `fasted-network` | Shared Docker network name |

## VPS production

| Service | Container | Proxy domain |
|---------|-----------|--------------|
| PWA | `fasted-calendar-app:80` | `$APP_DOMAIN` |
| Supabase API (Kong) | `supabase-kong:8000` | `$API_DOMAIN` |

### First-time Supabase setup (on VPS)

```bash
cd "${DEPLOY_DIR:-/opt/apps/fasted-calendar}"
SITE_URL=https://app.example.com API_URL=https://api.example.com bash scripts/setup-supabase-vps.sh
APP_DOMAIN=app.example.com API_DOMAIN=api.example.com sudo bash scripts/npm-add-fasted.sh
```

`setup-supabase-vps.sh` sets `ENABLE_EMAIL_AUTOCONFIRM=true` so sign-up works without SMTP.

Run the SQL migrations:

```bash
docker exec -i supabase-db psql -U postgres -d postgres \
  < "${DEPLOY_DIR:-/opt/apps/fasted-calendar}/supabase/migrations/20260627000000_initial.sql"

docker exec -i supabase-db psql -U postgres -d postgres \
  < "${DEPLOY_DIR:-/opt/apps/fasted-calendar}/supabase/migrations/20260628000000_groups.sql"

docker exec -i supabase-db psql -U postgres -d postgres \
  < "${DEPLOY_DIR:-/opt/apps/fasted-calendar}/supabase/migrations/20260628000001_fix_membership_rls.sql"
```

Copy `ANON_KEY` from `${SUPABASE_DIR}/.env` into the app `.env`:

```bash
VITE_SUPABASE_URL=https://api.example.com
VITE_SUPABASE_ANON_KEY=<anon-key-from-supabase-env>
APP_PUBLISH_PORT=8022
```

### Deploy app

```bash
VPS_REMOTE=user@your-vps npm run deploy:vps
```

Or push to `main` with GitHub Actions secrets `VPS_SSH_KEY`, `VPS_HOST`, and `VPS_USER` configured.

## Local development

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
# Edit VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY, or leave unset to disable cloud sync UI
npm run dev
```

Run local Supabase via the official docker stack, or leave vars unset to disable cloud sync UI entirely.

## Social login (OAuth)

The app supports Google and Facebook sign-in via Supabase OAuth. To enable:

1. **Supabase Dashboard → Authentication → Providers** — enable Google and/or Facebook and supply the required credentials.

2. **Add redirect URLs** in Supabase Dashboard → Authentication → URL Configuration:
   - `http://localhost:5173` (Vite dev server)
   - `https://app.example.com` (production)

3. **Self-hosted Supabase**: set `ADDITIONAL_REDIRECT_URLS` in the Supabase `.env`:
   ```
   ADDITIONAL_REDIRECT_URLS=http://localhost:5173,https://app.example.com
   ```

After clicking a social button the browser is redirected to the provider. On return, Supabase exchanges the code for a session and the `onAuthStateChange` listener in `useAuth.ts` fires. `reconcileWithCloud` then runs automatically via `initAuthSync`.

## Sync behavior

- All saves go to `localStorage` first (works offline).
- When signed in, changes upload to Supabase (debounced).
- **Sign in with empty local data** → downloads cloud copy.
- **Sign in with existing local data** → uploads local copy to cloud.
- Newer `updatedAt` wins on reconcile.

## One-time PocketBase migration

If migrating from a legacy PocketBase install, use `scripts/migrate-pb-to-supabase.mjs` with env vars set (see script header). PocketBase is no longer part of the production stack.
