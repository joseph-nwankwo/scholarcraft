#!/bin/sh
set -e

echo "[start] DATABASE_URL first 20 chars: $(printf '%s' "$DATABASE_URL" | cut -c1-20)"
echo "[start] Running Prisma migrations..."
npx prisma migrate deploy

echo "[start] Starting ScholarSuite backend..."
exec node dist/app.js
