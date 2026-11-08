#!/bin/sh
set -e

echo "[start] Running Prisma migrations..."
npx prisma migrate deploy

echo "[start] Starting ScholarSuite backend..."
exec node dist/app.js
