import { execFileSync } from 'node:child_process';

/**
 * DB-level cleanup for Scale Sites.
 *
 * The ScaleSiteController exposes create/update/search/summary/tombstone but NO delete endpoint, so a
 * created scale site must be removed directly at the DB — the skill's sanctioned fallback (mirrors
 * steps/msd/markSiteDesignationDbCleanup.ts). SCALE_SITE's children are SITE_SCALING_METHOD (the priority
 * rows) and SCALE_SITE_CONTACT (contacts, UC-SST-006); delete both first, then the parent. The
 * BEFORE-INSERT/UPDATE trigger (SCS_SCST_BR_IU_TRG) has no DELETE arm, so a plain children-then-parent
 * delete is clean. (Contacts also have a DELETE endpoint, but removing them here keeps the site teardown
 * self-contained regardless of what a test created.)
 *
 * Uses sqlplus against the local Docker DB via `SQLPLUS`/`ORACLE_DSN` env overrides (see .env.example),
 * both defaulting to the local values. On a host with no Oracle client on PATH, point `SQLPLUS` at
 * `scripts/docker-sqlplus.sh` (forwards into the container's own sqlplus).
 */

const ORACLE_DSN = process.env.ORACLE_DSN ?? 'THE/default@localhost:1525/DBDOCK_01';
const SQLPLUS = process.env.SQLPLUS ?? 'sqlplus';

/**
 * Delete the given scale sites by id (children first, then the parent). Throws (fails loud) if sqlplus
 * reports an error or is missing — a silently-leaked row would poison the shared seed. Ids are the
 * system-generated 4-char alphanumeric scale-site numbers; each is validated against a strict allowlist
 * (`[A-Za-z0-9]{1,4}`) and single-quoted, so they cannot carry SQL. A malformed id THROWS (it is never
 * silently skipped — that would mask a leaked row); an empty list is a no-op.
 */
export function deleteScaleSitesViaDb(ids: string[]): void {
  if (ids.length === 0) return;
  // Strict allowlist. A real scale-site id is a system-generated 4-char alphanumeric; anything else can't be
  // one, so — matching this function's "fail loud" contract — we THROW rather than silently drop it. Silently
  // filtering a malformed id would mask a leaked row (the exact thing teardown must never do); it also
  // guarantees every id is safe to single-quote inline (no id can carry SQL).
  const malformed = ids.filter((id) => !/^[A-Za-z0-9]{1,4}$/.test(id));
  if (malformed.length > 0) {
    throw new Error(
      `[cleanup] refusing to delete scale sites — malformed id(s) not matching [A-Za-z0-9]{1,4}: ` +
        `${malformed.map((id) => JSON.stringify(id)).join(', ')}. A real scale-site id is a system-generated ` +
        `4-char alphanumeric — investigate how a bad id reached teardown before re-running.`,
    );
  }
  const idList = ids.map((id) => `'${id}'`).join(',');

  const sql =
    `SET FEEDBACK OFF\n` +
    `WHENEVER SQLERROR EXIT SQL.SQLCODE\n` +
    `DELETE FROM scale_site_contact WHERE scale_site_id_nmbr IN (${idList});\n` +
    `DELETE FROM site_scaling_method WHERE scale_site_id_nmbr IN (${idList});\n` +
    `DELETE FROM scale_site WHERE scale_site_id_nmbr IN (${idList});\n` +
    `COMMIT;\n` +
    `EXIT\n`;

  try {
    execFileSync(SQLPLUS, ['-S', ORACLE_DSN], { input: sql, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
  } catch (err) {
    const e = err as { stdout?: string; stderr?: string; message?: string };
    throw new Error(
      `[cleanup] sqlplus delete of scale_site ${idList} failed: ` +
        `${e.stdout ?? ''}${e.stderr ?? ''}${e.message ?? ''}`.trim(),
    );
  }
}

/** Sentinel the probe below selects when the id generator would yield NULL (helper table unseeded). */
const UNSEEDED_SENTINEL = '__UNSEEDED__';

/**
 * Preflight probe: is the SCALE_SITE id generator seeded, and what id would it produce next?
 *
 * The scale-site PK is assigned by a BEFORE-INSERT trigger (`SCS_SCST_BR_IU_TRG`) that draws the smallest
 * unused id from the `THE.INTEGER_NUMBER` helper table. The one-hop real extract leaves that table EMPTY
 * (nothing FKs to it), so `MIN(free id)` is NULL and every scale-site create fails with a sanitized
 * ORA-01400 → HTTP 500. There is NO read API for `INTEGER_NUMBER`, so — exactly as the cleanup above does,
 * and as the reviewer noted — we shell out to sqlplus and run the generator's own expression.
 *
 * Returns the id the trigger would generate next (a non-null 4-char string like '1001') when the seed is
 * present, or `null` when the helper table is unseeded (the create-500 condition the preflight must catch).
 * Throws only when sqlplus itself cannot run (missing client / bad DSN / connection error) — a distinct,
 * environment-level failure the caller reports separately from a genuinely-absent seed. Read-only: it
 * SELECTs, never writes, so it leaves the DB exactly as found.
 */
export function nextGeneratedScaleSiteIdOrNull(): string | null {
  const sql =
    `SET HEADING OFF\n` +
    `SET FEEDBACK OFF\n` +
    `SET PAGESIZE 0\n` +
    `SET TRIMSPOOL ON\n` +
    `WHENEVER SQLERROR EXIT SQL.SQLCODE\n` +
    // Mirror the trigger's generator exactly: smallest id > 1000 not already taken by a SCALE_SITE row.
    // NVL to a sentinel so an unseeded table (MIN -> NULL) is distinguishable from a sqlplus failure.
    `SELECT NVL(\n` +
    `  (SELECT MIN(x) FROM (\n` +
    `     SELECT TO_CHAR(integer_value) x FROM integer_number WHERE integer_value > 1000\n` +
    `     MINUS\n` +
    `     SELECT scale_site_id_nmbr FROM scale_site)),\n` +
    `  '${UNSEEDED_SENTINEL}') AS next_id\n` +
    `FROM dual;\n` +
    `EXIT\n`;

  let out: string;
  try {
    out = execFileSync(SQLPLUS, ['-S', ORACLE_DSN], { input: sql, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
  } catch (err) {
    const e = err as { stdout?: string; stderr?: string; message?: string };
    throw new Error(
      `[preflight] sqlplus probe of INTEGER_NUMBER failed (could not run the scale-site id generator): ` +
        `${e.stdout ?? ''}${e.stderr ?? ''}${e.message ?? ''}`.trim(),
    );
  }

  // -S + HEADING OFF + PAGESIZE 0 prints just the value; take the first non-empty trimmed line.
  const value = out.split('\n').map((l) => l.trim()).find((l) => l.length > 0) ?? UNSEEDED_SENTINEL;
  return value === UNSEEDED_SENTINEL ? null : value;
}
