import { execFileSync } from 'node:child_process';

/**
 * DB-level cleanup + minimal DB-level fixtures for DETAIL (HBCS) check scales.
 *
 * The detail check-scale controller now HAS a delete endpoint (`DELETE /api/check-scales/{id}`), but
 * cleanup deliberately stays at the DB: that endpoint is the subject under test in UC-CHK-004, and it
 * is refused for every role but the administrator (see sec/check-scaler-role), so teardown must not
 * depend on it. This is the skill's sanctioned fallback ("when no endpoint exists — or it cannot be
 * trusted for teardown — delete directly at the DSN with admin creds"). A created detail check scale is
 * a single `check_scale` row (its species summary is derived from the linked log tally at read time, so
 * there are no child rows to cascade), which makes a plain `DELETE ... WHERE check_scale_id IN (...)`
 * complete. The seeded F-CHECK-CREATE log-tally docs are intentionally left in place for reuse.
 *
 * Uses sqlplus against the local Docker DB, invoked via `SQLPLUS`/`ORACLE_DSN` env overrides (see
 * .env.example) — same convention as steps/admin/maintenance/ccq/questionDbSeed.ts. Both default to the local-Docker
 * values; on a host with no Oracle client on PATH, point `SQLPLUS` at `scripts/docker-sqlplus.sh`, which
 * forwards the call into the seeded-SCS-DB container's own sqlplus.
 */

const ORACLE_DSN = process.env.ORACLE_DSN ?? 'THE/default@localhost:1525/DBDOCK_01';
const SQLPLUS = process.env.SQLPLUS ?? 'sqlplus';

/** Ids that survive integer coercion — so an id can never carry SQL into the statements below. */
function numericIdsOf(ids: string[]): number[] {
  return ids.map((id) => Number(id)).filter((n) => Number.isInteger(n));
}

/** Run one statement + COMMIT through sqlplus, failing loud with sqlplus's own output on error. */
function runSql(statement: string, failureLabel: string): void {
  const sql = ['SET FEEDBACK OFF', 'WHENEVER SQLERROR EXIT SQL.SQLCODE', statement, 'COMMIT;', 'EXIT', ''].join('\n');

  try {
    execFileSync(SQLPLUS, ['-S', ORACLE_DSN], { input: sql, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
  } catch (err) {
    const e = err as { stdout?: string; stderr?: string; message?: string };
    throw new Error(`${failureLabel}: ${e.stdout ?? ''}${e.stderr ?? ''}${e.message ?? ''}`.trim());
  }
}

/**
 * Delete the given check scales by id. Throws (fails loud) if sqlplus reports an error or is missing —
 * a silently-leaked row would poison the shared seed and cause phantom failures elsewhere.
 */
export function deleteCheckScalesViaDb(ids: string[]): void {
  const numericIds = numericIdsOf(ids);
  if (numericIds.length === 0) return;
  runSql(
    `DELETE FROM check_scale WHERE check_scale_id IN (${numericIds.join(',')});`,
    `[cleanup] sqlplus delete of check_scale ${numericIds.join(',')} failed`,
  );
}

/**
 * Flip a freshly-created HBCS record to LEGACY (`cksc_type = 'LGCS'`) so the read-only-legacy rules can
 * be exercised on a DISPOSABLE record.
 *
 * Why a seeded legacy record and not the pinned real one (`legacyCheckScaleId`): the legacy scenarios
 * that need it PROBE MUTATION (does the server refuse an update / a delete on a legacy record?). If the
 * server has no legacy guard — which is exactly the suspicion under test — the probe would mutate or
 * destroy a pinned real anchor that UC-CHK-002 S04, UC-CHK-003 S04 and UC-CHK-004 S07 all assert
 * against. So the probe owns a throwaway record instead. `cksc_type` is the single column the app reads
 * to decide legacy (frontend `isLegacy`), so flipping it is a faithful minimal fixture.
 *
 * It is a DB-level fixture because no API can produce an LGCS record: the create endpoint derives
 * `ckscType` from the return type (LOG_TALLY => HBCS).
 */
export function markCheckScaleLegacyViaDb(id: string): void {
  const [numericId] = numericIdsOf([id]);
  if (numericId === undefined) throw new Error(`[seed] not a numeric check scale id: ${id}`);
  runSql(
    `UPDATE check_scale SET cksc_type = 'LGCS' WHERE check_scale_id = ${numericId};`,
    `[seed] sqlplus could not mark check_scale ${numericId} legacy`,
  );
}
