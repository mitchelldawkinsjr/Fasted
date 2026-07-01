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

# VPS databases created before schema_migrations existed may already have tables applied manually.
migration_count="$(
  docker exec "$DB_CONTAINER" psql -U postgres -d postgres -tAc \
    "SELECT COUNT(*) FROM public.schema_migrations"
)"

if [ "$migration_count" = "0" ]; then
  user_progress_exists="$(
    docker exec "$DB_CONTAINER" psql -U postgres -d postgres -tAc \
      "SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_progress')"
  )"
  groups_exist="$(
    docker exec "$DB_CONTAINER" psql -U postgres -d postgres -tAc \
      "SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'groups')"
  )"
  group_commitments_exist="$(
    docker exec "$DB_CONTAINER" psql -U postgres -d postgres -tAc \
      "SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'group_commitments')"
  )"

  mark_applied() {
    local version="$1"
    echo "Legacy DB: marking $version as already applied"
    docker exec "$DB_CONTAINER" psql -U postgres -d postgres -v ON_ERROR_STOP=1 \
      -c "INSERT INTO public.schema_migrations (version) VALUES ('${version//\'/\'\'}') ON CONFLICT DO NOTHING"
  }

  if [ "$user_progress_exists" = "t" ]; then
    mark_applied "20260627000000_initial.sql"
  fi
  if [ "$groups_exist" = "t" ]; then
    mark_applied "20260628000000_groups.sql"
    mark_applied "20260628000001_fix_membership_rls.sql"
  fi
  if [ "$group_commitments_exist" = "t" ]; then
    mark_applied "20260630000000_group_commitments.sql"
  fi
fi

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
