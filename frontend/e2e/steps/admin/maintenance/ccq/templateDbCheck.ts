import { execFileSync } from 'node:child_process';

/**
 * Counts a template's condition-binding rows straight from the DB.
 *
 * Why the DB and not an API read-back: the cascade under test happens *while the parent is deleted*, so
 * once `DELETE /api/scale-auth-templates/{id}` succeeds there is no template left to GET — the join rows
 * are only observable in `SCALE_TEMPLATE_CONDITION`. An orphaned binding is invisible to every endpoint
 * the app exposes, which is exactly why a green suite could hide it.
 *
 * Same sqlplus convention as `questionDbSeed.ts` / `steps/chk/checkScaleDbCleanup.ts` (Oracle client on
 * PATH, `SQLPLUS`/`ORACLE_DSN` env overrides — see .env.example).
 */

const ORACLE_DSN = process.env.ORACLE_DSN ?? 'THE/default@localhost:1525/DBDOCK_01';
const SQLPLUS = process.env.SQLPLUS ?? 'sqlplus';

/**
 * Rows in `SCALE_TEMPLATE_CONDITION` for `templateId`. Returns 0 for a template that never had any and
 * for one whose bindings were correctly cascaded — the caller supplies the "had some before" half.
 */
export function countTemplateConditionRows(templateId: string): number {
  const id = Number(templateId);
  if (!Number.isInteger(id)) throw new Error(`[verify] invalid templateId: ${templateId}`);

  const script =
    `SET PAGESIZE 0 FEEDBACK OFF HEADING OFF VERIFY OFF\n` +
    `WHENEVER SQLERROR EXIT SQL.SQLCODE\n` +
    `select count(*) from the.scale_template_condition where scale_auth_template_id = ${id};\n` +
    `EXIT\n`;

  let out: string;
  try {
    out = execFileSync(SQLPLUS, ['-S', ORACLE_DSN], { input: script, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
  } catch (err) {
    const e = err as { stdout?: string; stderr?: string; message?: string };
    throw new Error(`[verify] sqlplus failed: ${e.stdout ?? ''}${e.stderr ?? ''}${e.message ?? ''}`.trim());
  }

  const n = Number(out.trim().split(/\r?\n/).filter(Boolean).pop());
  if (!Number.isInteger(n)) throw new Error(`[verify] unexpected sqlplus output: ${JSON.stringify(out)}`);
  return n;
}
