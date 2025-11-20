#!/bin/sh
set -e

if [ -n "$DATABASE_URL" ]; then
  echo "Applying Prisma migrations..."
  npx prisma migrate deploy
fi

echo "Starting Memory-as-a-Service API"
exec node dist/server.js
