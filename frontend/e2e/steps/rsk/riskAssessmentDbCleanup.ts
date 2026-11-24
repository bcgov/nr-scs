import { execFileSync } from 'node:child_process';

/**
 * DB-level cleanup for Scale Site Risk Assessments (RSK, UC-RSK-007).
 *
 * The scale site risk assessment controller exposes create-init / create / get / update / search but
 * NO delete or cancel endpoint, so a created assessment must be removed directly at the DB — the
 * skill's sanctioned fallback ("when no endpoint exists, delete directly at the DSN with admin creds";
 * mirrors steps/chk/checkScaleDbCleanup.ts and steps/msd/markSiteDesignationDbCleanup.ts).
 *
 * RISK_QUESTIONNAIRE has exactly one FK child, RISK_QUESTION_RESPONSE, and only INSERT/UPDATE triggers
 * (SCS_RIQR_BR_IU_TRG / SCS_RQRS_BR_IU_TRG — none on DELETE), so a plain children-then-parent delete is
 * clean and trigger-safe. This also cleans up a row orphaned by the edit-clears-all-answers divergence
 * (UC-RSK-007-S05): that row keeps its RISK_QUESTIONNAIRE row (0 responses) and 404s on every read, but
 * a delete-by-id removes it regardless of read-path visibility.
 *
 * Uses sqlplus against the local Docker DB via `SQLPLUS`/`ORACLE_DSN` env overrides (see .env.example),
 * both defaulting to the local values. On a host with no Oracle client on PATH, point `SQLPLUS` at
 * `scripts/docker-sqlplus.sh` (forwards into the seeded-SCS-DB container's own sqlplus).
 */

const ORACLE_DSN = process.env.ORACLE_DSN ?? 'THE/default@localhost:1525/DBDOCK_01';
const SQLPLUS = process.env.SQLPLUS ?? 'sqlplus';

/**
 * Delete the given risk assessments by id (child responses first, then the questionnaire). Throws
 * (fails loud) if sqlplus reports an error or is missing — a silently-leaked row would poison the
 * shared seed and surface phantom rows on a site's Risk Rating tab. Ids are coerced to integers before
 * interpolation, so they cannot carry SQL.
 */
export function deleteRiskAssessmentsViaDb(ids: string[]): void {
  const numericIds = ids.map((id) => Number(id)).filter((n) => Number.isInteger(n));
  if (numericIds.length === 0) return;
  const idList = numericIds.join(',');

  const sql =
    `SET FEEDBACK OFF\n` +
    `WHENEVER SQLERROR EXIT SQL.SQLCODE\n` +
    `DELETE FROM risk_question_response WHERE risk_questionnaire_id IN (${idList});\n` +
    `DELETE FROM risk_questionnaire WHERE risk_questionnaire_id IN (${idList});\n` +
    `COMMIT;\n` +
    `EXIT\n`;

  try {
    execFileSync(SQLPLUS, ['-S', ORACLE_DSN], {
      input: sql,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
  } catch (err) {
    const e = err as { stdout?: string; stderr?: string; message?: string };
    throw new Error(
      `[cleanup] sqlplus delete of risk_questionnaire ${idList} failed: ` +
        `${e.stdout ?? ''}${e.stderr ?? ''}${e.message ?? ''}`.trim(),
    );
  }
}
