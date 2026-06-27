# Supabase + Deployment

Optional cloud sync for Fasted Calendar. The PWA stays offline-first; signing in uploads your progress JSON to Supabase on your VPS.

## VPS production

| Service | Container | NPM domain |
|---------|-----------|------------|
| PWA | `fasted-calendar-app:80` | `fasted.360web.cloud` |
| Supabase API (Kong) | `supabase-kong:8000` | `api.fasted.360web.cloud` |

Deploy path: `/opt/360ws/clients/docker-app/fasted-calendar`  
Supabase path: `/opt/360ws/clients/docker-app/supabase`

Use `api.fasted.360web.cloud` (not `db.fasted`) — DNS already resolves for the API subdomain.

### First-time Supabase setup (on VPS)

```bash
cd /opt/360ws/clients/docker-app/fasted-calendar
bash scripts/setup-supabase-vps.sh
sudo bash scripts/npm-repoint-api-to-supabase.sh
```

`setup-supabase-vps.sh` sets `ENABLE_EMAIL_AUTOCONFIRM=true` so sign-up works without SMTP.

Run the SQL migrations:

```bash
docker exec -i supabase-db psql -U postgres -d postgres \
  < /opt/360ws/clients/docker-app/fasted-calendar/supabase/migrations/20260627000000_initial.sql

docker exec -i supabase-db psql -U postgres -d postgres \
  < /opt/360ws/clients/docker-app/fasted-calendar/supabase/migrations/20260628000000_groups.sql
```

Copy `ANON_KEY` from `/opt/360ws/clients/docker-app/supabase/.env` into the app `.env`:

```bash
VITE_SUPABASE_URL=https://api.fasted.360web.cloud
VITE_SUPABASE_ANON_KEY=<anon-key-from-supabase-env>
APP_PUBLISH_PORT=8022
```

### Deploy app

```bash
npm run deploy:vps
```

### Migrate data from PocketBase (one-time, read-only against PocketBase)

```bash
POCKETBASE_URL=https://api.fasted.360web.cloud \
POCKETBASE_ADMIN_EMAIL=... \
POCKETBASE_ADMIN_PASSWORD=... \
SUPABASE_URL=https://api.fasted.360web.cloud \
SUPABASE_SERVICE_ROLE_KEY=... \
node scripts/migrate-pb-to-supabase.mjs --dry-run

node scripts/migrate-pb-to-supabase.mjs
```

PocketBase is never modified. The `pocketbase` service in `docker-compose.prod.yml` is commented out but kept for rollback.

## Local development

Copy `.env.example` to `.env.local`:

```bash
VITE_SUPABASE_URL=http://127.0.0.1:8050
VITE_SUPABASE_ANON_KEY=your-local-anon-key
```

Run local Supabase via the official docker stack, or leave vars unset to disable cloud sync UI entirely.

## Social login (OAuth)

The app supports Google and Apple sign-in via Supabase OAuth. To enable:

1. **Supabase Dashboard → Authentication → Providers** — enable Google and/or Apple and supply the required credentials (client ID + secret for Google; Service ID, Team ID, Key ID + private key for Apple).

2. **Add redirect URLs** in Supabase Dashboard → Authentication → URL Configuration:
   - `http://localhost:5173` (Vite dev server)
   - `https://fasted.360web.cloud` (production)

3. **Self-hosted Supabase**: set `ADDITIONAL_REDIRECT_URLS` in the Supabase `.env`:
   ```
   ADDITIONAL_REDIRECT_URLS=http://localhost:5173,https://fasted.360web.cloud
   ```

After clicking a social button the browser is redirected to the provider. On return, Supabase exchanges the code for a session and the `onAuthStateChange` listener in `useAuth.ts` fires, setting `isLoggedIn = true`. `reconcileWithCloud` then runs automatically via `initAuthSync` (called in `main.tsx`).

## Sync behavior

- All saves go to `localStorage` first (works offline).
- When signed in, changes upload to Supabase (debounced).
- **Sign in with empty local data** → downloads cloud copy.
- **Sign in with existing local data** → uploads local copy to cloud.
- Newer `updatedAt` wins on reconcile.

## Rollback

Revert app `.env` to PocketBase URL, uncomment `pocketbase` in `docker-compose.prod.yml`, run `sudo bash scripts/npm-add-fasted.sh` with PocketBase forward target restored, redeploy. PocketBase data is untouched.
