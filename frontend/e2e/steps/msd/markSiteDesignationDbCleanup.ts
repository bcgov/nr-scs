import { execFileSync } from 'node:child_process';

/**
 * DB-level cleanup for Mark Site Designations (hauling mark authorizations).
 *
 * The MSD controller exposes create/update/search/letter but NO delete endpoint, so a created MSD must
 * be removed directly at the DB — the skill's sanctioned fallback (mirrors steps/chk/checkScaleDbCleanup.ts).
 * HAULING_MARK_AUTHORIZATION has five FK child tables and only an INSERT/UPDATE trigger (none on DELETE),
 * so a plain children-then-parent delete is clean and trigger-safe. Children deleted first:
 *   designated_exempt_mark_method, hauling_mark_auth_letter, hauling_mark_site_condition,
 *   species_content, hauling_mark_site — then hauling_mark_authorization.
 *
 * Uses sqlplus against the local Docker DB via `SQLPLUS`/`ORACLE_DSN` env overrides (see .env.example),
 * both defaulting to the local values. On a host with no Oracle client on PATH, point `SQLPLUS` at
 * `scripts/docker-sqlplus.sh` (forwards into the container's own sqlplus).
 */

const ORACLE_DSN = process.env.ORACLE_DSN ?? 'THE/default@localhost:1525/DBDOCK_01';
const SQLPLUS = process.env.SQLPLUS ?? 'sqlplus';

/**
 * Delete the given mark site designations by id (children first, then the parent). Throws (fails loud)
 * if sqlplus reports an error or is missing — a silently-leaked row would poison the shared seed. Ids
 * are coerced to integers before interpolation, so they cannot carry SQL.
 */
export function deleteMarkSiteDesignationsViaDb(ids: string[]): void {
  const numericIds = ids.map((id) => Number(id)).filter((n) => Number.isInteger(n));
  if (numericIds.length === 0) return;
  const idList = numericIds.join(',');

  const sql =
    `SET FEEDBACK OFF\n` +
    `WHENEVER SQLERROR EXIT SQL.SQLCODE\n` +
    `DELETE FROM designated_exempt_mark_method WHERE hauling_mark_authorization_id IN (${idList});\n` +
    `DELETE FROM hauling_mark_auth_letter WHERE hauling_mark_authorization_id IN (${idList});\n` +
    `DELETE FROM hauling_mark_site_condition WHERE hauling_mark_authorization_id IN (${idList});\n` +
    `DELETE FROM species_content WHERE hauling_mark_authorization_id IN (${idList});\n` +
    `DELETE FROM hauling_mark_site WHERE hauling_mark_authorization_id IN (${idList});\n` +
    `DELETE FROM hauling_mark_authorization WHERE hauling_mark_authorization_id IN (${idList});\n` +
    `COMMIT;\n` +
    `EXIT\n`;

  try {
    execFileSync(SQLPLUS, ['-S', ORACLE_DSN], { input: sql, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
  } catch (err) {
    const e = err as { stdout?: string; stderr?: string; message?: string };
    throw new Error(
      `[cleanup] sqlplus delete of hauling_mark_authorization ${idList} failed: ` +
        `${e.stdout ?? ''}${e.stderr ?? ''}${e.message ?? ''}`.trim(),
    );
  }
}
