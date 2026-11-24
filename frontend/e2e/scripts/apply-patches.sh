#!/usr/bin/env bash
# ============================================================================
# Apply the SCS E2E real-test-data seed patches to the local Docker DB.
#
# WHAT IT DOES: runs every `<domain>/*.sql` patch (excluding `*.teardown.sql`)
# under ../scs-real-test-data-patches/. These are the minimal, idempotent seed
# rows the E2E suite needs but the real extract can't supply (see that folder's
# README). They are NOT baked into the DB image, so a fresh container needs them.
#
# AUTO-DISCOVERY: patches are found by convention, so adding a new patch that
# follows `scs-real-test-data-patches/<domain>/<name>.sql` (+ a matching
# `<name>.teardown.sql`) is picked up here with NO edit to this script.
#
# MINIMAL SETUP: uses sqlplus. On a host with the Oracle client on PATH this
# works as-is. On a host WITHOUT it (e.g. a dev container), point SQLPLUS at the
# bundled wrapper that runs sqlplus inside the DB container:
#     SQLPLUS=e2e/scripts/docker-sqlplus.sh ./e2e/scripts/apply-patches.sh
# Overridable env (defaults match the pre-seeded image):
#     ORACLE_DSN   (default THE/default@localhost:1525/DBDOCK_01)
#     SQLPLUS      (default sqlplus)
#
#   Usage:  ./e2e/scripts/apply-patches.sh     (run from nr-scs/frontend/)
# ============================================================================
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PATCHES_DIR="$HERE/../scs-real-test-data-patches"
ORACLE_DSN="${ORACLE_DSN:-THE/default@localhost:1525/DBDOCK_01}"
SQLPLUS="${SQLPLUS:-sqlplus}"

shopt -s nullglob

echo "Applying SCS E2E seed patches"
echo "  from: $PATCHES_DIR"
echo "  DSN:  $ORACLE_DSN   (SQLPLUS=$SQLPLUS)"

found=0
for patch in "$PATCHES_DIR"/*/*.sql; do
  case "$patch" in *.teardown.sql) continue ;; esac
  found=1
  rel="$(basename "$(dirname "$patch")")/$(basename "$patch")"
  echo ""
  echo "-> $rel"
  # Pipe the file CONTENT (not @file) so this works identically for a local
  # sqlplus and for docker-sqlplus.sh (docker exec can't read a host path).
  # WHENEVER SQLERROR EXIT makes a SQL error abort with a non-zero status;
  # pipefail + set -e then stop the run instead of silently continuing.
  { printf 'WHENEVER SQLERROR EXIT SQL.SQLCODE\n'; cat "$patch"; printf '\nEXIT\n'; } \
    | "$SQLPLUS" -S -L "$ORACLE_DSN" | sed 's/^/    /'
done

if [ "$found" -eq 0 ]; then
  echo "No patches found under $PATCHES_DIR — nothing to apply."
  exit 0
fi

echo ""
echo "Done. If the backend was ALREADY running when you applied these, evict its"
echo "LOV cache so it doesn't serve stale codes:"
echo "    curl -s -X POST http://localhost:8080/api/api/internal/cache/evict"
echo "  (or restart the backend). Start the DB BEFORE the backend on a cold boot."
