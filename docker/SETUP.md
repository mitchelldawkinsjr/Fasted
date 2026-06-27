# Supabase + Deployment

Optional cloud sync for Fasted Calendar. The PWA stays offline-first; signing in uploads your progress JSON to Supabase on your VPS.

## VPS production

| Service | Container | NPM domain |
|---------|-----------|------------|
| PWA | `fasted-calendar-app:80` | `app.example.com` |
| Supabase API (Kong) | `supabase-kong:8000` | `db.app.example.com` |

Deploy path: `/opt/apps/fasted-calendar`  
Supabase path: `/opt/apps/supabase`

### First-time Supabase setup (on VPS)

```bash
cd /opt/apps/fasted-calendar
bash scripts/setup-supabase-vps.sh
sudo bash scripts/npm-add-supabase.sh
```

Run the SQL migration via Supabase Studio or:

```bash
docker exec -i supabase-db psql -U postgres -d postgres \
  < /opt/apps/fasted-calendar/supabase/migrations/20260627000000_initial.sql
```

Copy `ANON_KEY` from `/opt/apps/supabase/.env` into the app `.env`:

```bash
VITE_SUPABASE_URL=https://db.app.example.com
VITE_SUPABASE_ANON_KEY=<anon-key-from-supabase-env>
APP_PUBLISH_PORT=8022
```

### Deploy app

```bash
# From your machine
npm run deploy:vps
```

### Migrate data from PocketBase (one-time, read-only against PocketBase)

```bash
POCKETBASE_URL=https://api.app.example.com \
POCKETBASE_ADMIN_EMAIL=... \
POCKETBASE_ADMIN_PASSWORD=... \
SUPABASE_URL=https://db.app.example.com \
SUPABASE_SERVICE_ROLE_KEY=... \
node scripts/migrate-pb-to-supabase.mjs --dry-run

# Then run live (creates Supabase users for existing PocketBase accounts)
node scripts/migrate-pb-to-supabase.mjs
```

PocketBase is never modified. The `pocketbase` service in `docker-compose.prod.yml` is commented out but kept for rollback.

## Local development

Copy `.env.example` to `.env.local`:

```bash
VITE_SUPABASE_URL=http://127.0.0.1:8000
VITE_SUPABASE_ANON_KEY=your-local-anon-key
```

Run local Supabase via the official docker stack, or leave vars unset to disable cloud sync UI entirely.

## Sync behavior

- All saves go to `localStorage` first (works offline).
- When signed in, changes upload to Supabase (debounced).
- **Sign in with empty local data** → downloads cloud copy.
- **Sign in with existing local data** → uploads local copy to cloud.
- Newer `updatedAt` wins on reconcile.

## Rollback

Revert app `.env` to PocketBase URL, uncomment `pocketbase` in `docker-compose.prod.yml`, redeploy. PocketBase data is untouched.
