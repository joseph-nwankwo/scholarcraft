#!/usr/bin/env bash
# PostgreSQL restore script — restores from a compressed dump
# Usage: ./scripts/restore.sh <backup-file.sql.gz> [--force]
# WARNING: This drops and recreates the database schema.
set -euo pipefail

BACKUP_FILE="${1:-}"
FORCE="${2:-}"

if [[ -z "$BACKUP_FILE" ]]; then
  echo "Usage: $0 <backup-file.sql.gz> [--force]"
  exit 1
fi

if [[ ! -f "$BACKUP_FILE" ]]; then
  echo "❌ Backup file not found: $BACKUP_FILE"
  exit 1
fi

# ── Resolve DB connection ──────────────────────────────────────────────────────
if [[ -n "${DATABASE_URL:-}" ]]; then
  DB_USER=$(echo "$DATABASE_URL" | sed -E 's|postgresql://([^:]+):.*|\1|')
  DB_PASS=$(echo "$DATABASE_URL" | sed -E 's|postgresql://[^:]+:([^@]+)@.*|\1|')
  DB_HOST=$(echo "$DATABASE_URL" | sed -E 's|postgresql://[^@]+@([^:/]+).*|\1|')
  DB_PORT=$(echo "$DATABASE_URL" | sed -E 's|.*:([0-9]+)/.*|\1|')
  DB_NAME=$(echo "$DATABASE_URL" | sed -E 's|.*/([^?]+).*|\1|')
else
  DB_USER="${POSTGRES_USER:-lecturercraft}"
  DB_PASS="${POSTGRES_PASSWORD:-lecturercraft_dev}"
  DB_HOST="${POSTGRES_HOST:-localhost}"
  DB_PORT="${POSTGRES_PORT:-5432}"
  DB_NAME="${POSTGRES_DB:-lecturercraft}"
fi

# ── Confirm unless --force ─────────────────────────────────────────────────────
if [[ "$FORCE" != "--force" ]]; then
  echo "⚠️  WARNING: This will DROP and recreate database '${DB_NAME}' from ${BACKUP_FILE}"
  echo "All existing data will be lost. Type 'yes' to continue:"
  read -r CONFIRM
  if [[ "$CONFIRM" != "yes" ]]; then
    echo "Restore cancelled."
    exit 0
  fi
fi

echo "🔄 Restoring database '${DB_NAME}' from ${BACKUP_FILE}…"

# ── Terminate existing connections ────────────────────────────────────────────
PGPASSWORD="$DB_PASS" psql \
  --host="$DB_HOST" --port="$DB_PORT" --username="$DB_USER" \
  --dbname=postgres \
  --command="SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='${DB_NAME}' AND pid <> pg_backend_pid();" \
  > /dev/null 2>&1 || true

# ── Drop + recreate DB ────────────────────────────────────────────────────────
PGPASSWORD="$DB_PASS" psql \
  --host="$DB_HOST" --port="$DB_PORT" --username="$DB_USER" \
  --dbname=postgres \
  --command="DROP DATABASE IF EXISTS \"${DB_NAME}\";"

PGPASSWORD="$DB_PASS" psql \
  --host="$DB_HOST" --port="$DB_PORT" --username="$DB_USER" \
  --dbname=postgres \
  --command="CREATE DATABASE \"${DB_NAME}\" ENCODING 'UTF8' LC_COLLATE 'en_US.UTF-8' LC_CTYPE 'en_US.UTF-8' TEMPLATE template0;"

# ── Restore ───────────────────────────────────────────────────────────────────
gunzip -c "$BACKUP_FILE" | PGPASSWORD="$DB_PASS" psql \
  --host="$DB_HOST" --port="$DB_PORT" --username="$DB_USER" \
  --dbname="$DB_NAME" \
  --quiet

echo "✅ Database restored successfully from ${BACKUP_FILE}"
echo "💡 Run 'npm run db:migrate:prod' if schema migrations are needed after restore."
