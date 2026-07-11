#!/bin/sh
set -eu
npx prisma migrate deploy
if [ "${SEED_ON_START:-false}" = "true" ]; then
  npm run db:seed
fi
exec "$@"
