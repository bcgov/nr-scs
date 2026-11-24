#!/usr/bin/env bash
# ============================================================================
# Tear down the SCS E2E real-test-data seed patches (reverse of apply-patches.sh).
#
# WHAT IT DOES: runs every `<domain>/*.teardown.sql` under
# ../scs-real-test-data-patches/, in REVERSE discovery order, removing only the
# sentinel-marked (`E2E_SEED`) rows each patch added — leaving the real extract
# as found. Use it to reset a container to a pristine (un-patched) state, or
# before re-snapshotting a clean image.
#
# AUTO-DISCOVERY: same convention as apply — a new patch's `<name>.teardown.sql`
# is picked up automatically, no edit here.
#
# MINIMAL SETUP: identical to apply-patches.sh — plain sqlplus, or
# `SQLPLUS=e2e/scripts/docker-sqlplus.sh` on a host without an Oracle client.
# Overridable env: ORACLE_DSN (default THE/default@localhost:1525/DBDOCK_01),
# SQLPLUS (default sqlplus).
#
#   Usage:  ./e2e/scripts/teardown-patches.sh  (run from nr-scs/frontend/)
# ============================================================================
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PATCHES_DIR="$HERE/../scs-real-test-data-patches"
ORACLE_DSN="${ORACLE_DSN:-THE/default@localhost:1525/DBDOCK_01}"
SQLPLUS="${SQLPLUS:-sqlplus}"

shopt -s nullglob

echo "Tearing down SCS E2E seed patches"
echo "  from: $PATCHES_DIR"
echo "  DSN:  $ORACLE_DSN   (SQLPLUS=$SQLPLUS)"

teardowns=( "$PATCHES_DIR"/*/*.teardown.sql )
if [ "${#teardowns[@]}" -eq 0 ]; then
  echo "No teardown scripts found under $PATCHES_DIR — nothing to tear down."
  exit 0
fi

# Reverse order so patches undo in the opposite order they were applied.
for (( i=${#teardowns[@]}-1; i>=0; i-- )); do
  patch="${teardowns[i]}"
  rel="$(basename "$(dirname "$patch")")/$(basename "$patch")"
  echo ""
  echo "-> $rel"
  { printf 'WHENEVER SQLERROR EXIT SQL.SQLCODE\n'; cat "$patch"; printf '\nEXIT\n'; } \
    | "$SQLPLUS" -S -L "$ORACLE_DSN" | sed 's/^/    /'
done

echo ""
echo "Done. The seed rows are removed. Re-apply with ./scripts/apply-patches.sh"
echo "before running seed-dependent scenarios (and evict the LOV cache after)."
