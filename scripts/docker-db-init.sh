#!/bin/sh
# Prepare the SQLite database inside the container.
#
# Run once, before the app starts (see the `db-init` service in
# docker-compose.yml). It is safe to re-run.
#
#   SEED_DEMO=false   start from an empty database instead of the bundled demo
#                     data. The demo database ships with known accounts whose
#                     password is "demo" — never use it in production.
set -e

DB_PATH="${DB_PATH:-/data/custom.db}"

if [ ! -f "$DB_PATH" ]; then
  echo "[db-init] no database at $DB_PATH"
  if [ "${SEED_DEMO:-true}" = "true" ] && [ -f /app/db/custom.db ]; then
    echo "[db-init] copying the bundled demo database"
    cp /app/db/custom.db "$DB_PATH"
  else
    echo "[db-init] creating an empty database (SEED_DEMO is off)"
  fi
else
  echo "[db-init] reusing the existing database at $DB_PATH"
fi

echo "[db-init] syncing the Prisma schema"
bunx prisma db push --accept-data-loss --skip-generate

echo "[db-init] ready"
