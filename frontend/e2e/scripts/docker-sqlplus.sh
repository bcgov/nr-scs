#!/usr/bin/env bash
# Forwards sqlplus invocations into the local seeded-SCS-DB Docker container's own Oracle client,
# for hosts (like this dev container) that have no system-wide `sqlplus`/Oracle Instant Client on PATH.
# Used by db-cleanup helpers via `SQLPLUS=e2e/scripts/docker-sqlplus.sh` (see e2e/.env.example).
set -euo pipefail

# Default matches the pre-seeded image's container (docker run --name real-data-seeded-scs-db …); override
# with SCS_DB_CONTAINER if you named it differently.
CONTAINER="${SCS_DB_CONTAINER:-real-data-seeded-scs-db}"
SQLPLUS_BIN="${SCS_DB_SQLPLUS_BIN:-/opt/oracle/product/26ai/dbhomeFree/bin/sqlplus}"
# Callers pass the HOST-facing DSN (port 1525, the container's published port); translate to the
# CONTAINER-internal listener port (1521) since sqlplus runs inside the container via docker exec.
HOST_PORT="${SCS_DB_HOST_PORT:-1525}"
CONTAINER_PORT="${SCS_DB_CONTAINER_PORT:-1521}"

args=()
for a in "$@"; do
  args+=("${a//:$HOST_PORT\//:$CONTAINER_PORT/}")
done

exec docker exec -i "$CONTAINER" "$SQLPLUS_BIN" "${args[@]}"
