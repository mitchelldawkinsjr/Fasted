#!/usr/bin/env bash
# Apply pending Supabase SQL migrations on the VPS (idempotent via schema_migrations).
set -euo pipefail

DEPLOY_DIR="${DEPLOY_DIR:-/opt/apps/fasted-calendar}"
DB_CONTAINER="${SUPABASE_DB_CONTAINER:-supabase-db}"
MIGRATIONS_DIR="${MIGRATIONS_DIR:-${DEPLOY_DIR}/supabase/migrations}"

if ! docker ps --format '{{.Names}}' | grep -qx "$DB_CONTAINER"; then
  echo "ERROR: Postgres container '$DB_CONTAINER' is not running."
  echo "Start Supabase first: SITE_URL=... API_URL=... bash scripts/setup-supabase-vps.sh"
  exit 1
fi

if [ ! -d "$MIGRATIONS_DIR" ]; then
  echo "ERROR: Migrations directory not found: $MIGRATIONS_DIR"
  exit 1
fi

echo "Ensuring schema_migrations tracking table..."
docker exec -i "$DB_CONTAINER" psql -U postgres -d postgres -v ON_ERROR_STOP=1 <<'SQL'
CREATE TABLE IF NOT EXISTS public.schema_migrations (
  version text PRIMARY KEY,
  applied_at timestamptz DEFAULT now()
);
SQL

shopt -s nullglob
migration_files=("$MIGRATIONS_DIR"/*.sql)
shopt -u nullglob

if [ "${#migration_files[@]}" -eq 0 ]; then
  echo "No migration files found in $MIGRATIONS_DIR"
  exit 0
fi

IFS=$'\n' migration_files=($(printf '%s\n' "${migration_files[@]}" | sort))
unset IFS

applied_count=0
skipped_count=0

for file in "${migration_files[@]}"; do
  version="$(basename "$file")"
  already_applied="$(
    docker exec "$DB_CONTAINER" psql -U postgres -d postgres -tAc \
      "SELECT 1 FROM public.schema_migrations WHERE version = '${version//\'/\'\'}'"
  )"

  if [ "$already_applied" = "1" ]; then
    echo "Skipping $version (already applied)"
    skipped_count=$((skipped_count + 1))
    continue
  fi

  echo "Applying $version..."
  docker exec -i "$DB_CONTAINER" psql -U postgres -d postgres -v ON_ERROR_STOP=1 < "$file"
  docker exec "$DB_CONTAINER" psql -U postgres -d postgres -v ON_ERROR_STOP=1 \
    -c "INSERT INTO public.schema_migrations (version) VALUES ('${version//\'/\'\'}')"
  applied_count=$((applied_count + 1))
done

echo "Migrations complete: ${applied_count} applied, ${skipped_count} skipped."
