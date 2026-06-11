# PocketBase + Deployment

Optional cloud sync for Fasted Calendar. The PWA stays offline-first; signing in uploads your progress JSON to your VPS.

## VPS production (production VPS)

Follows the same pattern as other deployed projects:

| Service | Container | NPM domain |
|---------|-----------|------------|
| PWA | `fasted-calendar-app:80` | `app.example.com` |
| PocketBase | `fasted-calendar-pocketbase:8090` | `api.app.example.com` |

Deploy path: `/opt/apps/fasted-calendar`

```bash
# From your machine (requires `ssh vps` configured)
npm run deploy:vps

# First deploy only — add NPM proxy hosts on the VPS
npm run deploy:npm
```

One-time host prep on the VPS: `bash scripts/vps-bootstrap.sh`

Copy `deploy/env.production.example` → `.env` on the VPS if you need to override ports or the API URL baked into the build.

## Local Docker (PocketBase only)

```bash
cd docker
docker compose up -d pocketbase
# API at http://127.0.0.1:8090
```

The bundled `docker/Caddyfile` is for standalone TLS experiments; production uses Nginx Proxy Manager on the VPS.

## 2. Create admin account

Open `http://127.0.0.1:8090/_/` (or `https://api.yourdomain.com/_/`).

Create the first admin user on first visit.

## 3. Create the `progress` collection

In PocketBase Admin → Collections → **New collection**:

| Field | Type | Options |
|-------|------|---------|
| `user` | Relation | Collection: `users`, Max select: 1, Required |
| `data` | JSON | Required |

### API rules (Collections → progress → API Rules)

Set all rules to:

```
user = @request.auth.id
```

(Applies to List, View, Create, Update, Delete.)

## 4. CORS

Settings → Application → **Allowed origins** → add your app origin, e.g.:

- `http://localhost:5173` (dev)
- `https://app.yourdomain.com` (production)

## 5. Auth (optional)

Default: email + password (enable in Settings → Auth providers).

For Google OAuth, configure in Settings → Auth providers → Google and set redirect URL to your PocketBase API URL.

## 6. Configure the PWA

Copy `.env.example` to `.env.local`:

```bash
VITE_POCKETBASE_URL=https://api.yourdomain.com
```

Rebuild the app:

```bash
npm run build
```

## 7. Backups

Back up the Docker volume:

```bash
docker run --rm -v fasted-calendar-pwa_pb_data:/data -v $(pwd):/backup alpine \
  tar czf /backup/pb_data-backup.tar.gz -C /data .
```

## Sync behavior

- All saves go to `localStorage` first (works offline).
- When signed in, changes upload to PocketBase (debounced).
- **Sign in with empty local data** → downloads cloud copy.
- **Sign in with existing local data** → uploads local copy to cloud.
