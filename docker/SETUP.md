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

## GitHub Actions

CI deploy reads production paths from **repository variables** (Settings → Secrets and variables → Actions → Variables). SSH credentials stay in **secrets**.

| Kind | Name | Purpose |
|------|------|---------|
| Secret | `VPS_SSH_KEY` | SSH private key |
| Secret | `VPS_HOST` | VPS hostname |
| Secret | `VPS_USER` | SSH user |
| Variable | `DEPLOY_DIR` | App path on VPS |
| Variable | `SUPABASE_DIR` | Supabase stack path on VPS |
| Variable | `DOCKER_NETWORK` | Shared Docker network name |
| Variable | `APP_DOMAIN` | PWA public hostname (NPM setup scripts) |
| Variable | `API_DOMAIN` | Supabase API hostname (NPM setup scripts) |
| Variable | `SITE_URL` | Full PWA URL for OAuth redirects |
| Variable | `API_URL` | Full Supabase API URL |

Only `DEPLOY_DIR`, `SUPABASE_DIR`, and `DOCKER_NETWORK` are used on every deploy. Domain/URL variables are for one-time VPS setup scripts run manually on the server.

## VPS production

| Service | Container | Proxy domain |
|---------|-----------|--------------|
| PWA | `fasted-calendar-app:80` | `$APP_DOMAIN` |
| Supabase API (Kong) | `supabase-kong:8000` | `$API_DOMAIN` |

The PWA container (`deploy/nginx.conf`) serves `index.html`, `/sw.js`, `/registerSW.js`, and Workbox files with `Cache-Control: no-cache, max-age=0, must-revalidate`. Only hashed JS/CSS bundles under `/assets/` (Vite filename hashes) use `public, max-age=31536000, immutable`; stable-name assets such as PNGs under `/assets/` are served with `no-cache` so image updates reach returning users. After deploys, users see an in-app **Update available — Refresh** toast when a new service worker is waiting.

### First-time Supabase setup (on VPS)

```bash
cd "${DEPLOY_DIR:-/opt/apps/fasted-calendar}"
SITE_URL=https://app.example.com API_URL=https://api.example.com bash scripts/setup-supabase-vps.sh
APP_DOMAIN=app.example.com API_DOMAIN=api.example.com sudo bash scripts/npm-add-fasted.sh
```

`setup-supabase-vps.sh` sets `ENABLE_EMAIL_AUTOCONFIRM=true` so sign-up works without SMTP.

Run the SQL migrations (applies only pending files, safe to re-run):

```bash
cd "${DEPLOY_DIR:-/opt/apps/fasted-calendar}"
bash scripts/apply-supabase-migrations.sh
```

Manual one-off (same order as the script):

| Migration | Purpose |
|-----------|---------|
| `20260627000000_initial.sql` | `user_progress` table, RLS |
| `20260628000000_groups.sql` | Organizations, groups, shared journal |
| `20260628000001_fix_membership_rls.sql` | Membership RLS fixes |
| `20260630000000_group_commitments.sql` | `group_commitments`, `member_covenants`, leader-safe progress |
| `20260631000000_backfill_group_commitments.sql` | Default commitments for existing groups |
| `20260704123000_telemetry_events.sql` | Insert-only client telemetry event store |

Deploys to `main` also run `scripts/apply-supabase-migrations.sh` when `supabase-db` is running.

Copy `ANON_KEY` from `${SUPABASE_DIR}/.env` into the app `.env`:

```bash
VITE_SUPABASE_URL=https://api.example.com
VITE_SUPABASE_ANON_KEY=<anon-key-from-supabase-env>
APP_PUBLISH_PORT=8022
```

### Telemetry visibility

Client auth/sync failures can be reported two ways:

- `VITE_TELEMETRY_URL=https://...` posts JSON events to an external telemetry receiver.
- `VITE_TELEMETRY_SUPABASE=true` stores events in the `telemetry_events` table after `20260704123000_telemetry_events.sql` is applied.

Browser clients can only insert telemetry events; there are no client read/update/delete policies. To inspect recent events as an operator:

```bash
SUPABASE_URL=https://api.example.com \
SUPABASE_SERVICE_ROLE_KEY=<service-role-key-from-supabase-env> \
npm run telemetry:report -- --hours 24 --level error
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
