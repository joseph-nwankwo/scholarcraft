#!/usr/bin/env bash
# PostgreSQL backup script — creates a compressed, timestamped dump
# Usage: ./scripts/backup.sh [output-dir]
# Supports both local postgres and Docker Compose deployments.
set -euo pipefail

# ── Configuration ─────────────────────────────────────────────────────────────
OUTPUT_DIR="${1:-./backup}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${OUTPUT_DIR}/lecturercraft_${TIMESTAMP}.sql.gz"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"

# ── Resolve DB connection ──────────────────────────────────────────────────────
if [[ -n "${DATABASE_URL:-}" ]]; then
  # Parse DATABASE_URL: postgresql://user:pass@host:port/dbname
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

# ── Create output directory ───────────────────────────────────────────────────
mkdir -p "$OUTPUT_DIR"

echo "🗄  Starting backup of database '${DB_NAME}' → ${BACKUP_FILE}"

# ── Dump with gzip compression ────────────────────────────────────────────────
PGPASSWORD="$DB_PASS" pg_dump \
  --host="$DB_HOST" \
  --port="$DB_PORT" \
  --username="$DB_USER" \
  --dbname="$DB_NAME" \
  --format=plain \
  --no-owner \
  --no-acl \
  --encoding=UTF8 \
  | gzip -9 > "$BACKUP_FILE"

BACKUP_SIZE=$(du -sh "$BACKUP_FILE" | cut -f1)
echo "✅ Backup complete: ${BACKUP_FILE} (${BACKUP_SIZE})"

# ── Upload to S3 (optional) ───────────────────────────────────────────────────
if [[ -n "${AWS_S3_BACKUP_BUCKET:-}" ]]; then
  S3_KEY="backups/$(basename "$BACKUP_FILE")"
  aws s3 cp "$BACKUP_FILE" "s3://${AWS_S3_BACKUP_BUCKET}/${S3_KEY}" \
    --storage-class STANDARD_IA
  echo "☁️  Uploaded to s3://${AWS_S3_BACKUP_BUCKET}/${S3_KEY}"
fi

# ── Prune old local backups ───────────────────────────────────────────────────
echo "🧹 Removing backups older than ${RETENTION_DAYS} days…"
find "$OUTPUT_DIR" -name "lecturercraft_*.sql.gz" -mtime "+${RETENTION_DAYS}" -delete
echo "Done."
