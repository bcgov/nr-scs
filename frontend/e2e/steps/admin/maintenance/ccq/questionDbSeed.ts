import { execFileSync } from 'node:child_process';

import { USED_QUESTION_INSPECTION_ID } from '../../../../fixtures/admin/maintenance/ccq-test-data';

/**
 * Marks/unmarks an inspection question as "used" (`InspectionQuestionRepository.isQuestionUsed`) by
 * linking/unlinking a row in `INSPECTION_RESPONSE` — the app exposes no endpoint for this, so it's a
 * **test-data fix, not an app defect** (see the skill's "Data gaps are handled case-by-case" rule):
 * S07 (update-blocked) and S08 (delete-blocked) need a disposable "used" question that nothing else in
 * the suite depends on, and the real extract's existing 44 "used" questions are all shared production
 * rows unsuitable to mutate. `answerCode` MUST be one of the question's own `validResponseCodes`
 * (composite FK `INSPECTION_RESPONSE(inspection_question_id, inspection_answer_code)` ->
 * `INSPECTION_VALID_RESPONSE`).
 *
 * Uses sqlplus (Oracle client on PATH, or `SQLPLUS`/`ORACLE_DSN` env overrides — see .env.example) —
 * same convention as steps/chk/checkScaleDbCleanup.ts.
 */

const ORACLE_DSN = process.env.ORACLE_DSN ?? 'THE/default@localhost:1525/DBDOCK_01';
const SQLPLUS = process.env.SQLPLUS ?? 'sqlplus';

/** Answer codes are string-interpolated into SQL, so whitelist them (defence-in-depth: today they are
 *  only the pinned Y/N/NA, but this stops any future caller smuggling SQL through the code). */
function assertSafeAnswerCode(answerCode: string): void {
  if (!/^[A-Z]{1,2}$/.test(answerCode)) {
    throw new Error(`[seed] refusing unsafe answerCode: ${JSON.stringify(answerCode)} (expected 1-2 uppercase letters)`);
  }
}

function runSql(sql: string, label: string): void {
  const script = `SET FEEDBACK OFF\nWHENEVER SQLERROR EXIT SQL.SQLCODE\n${sql}\nCOMMIT;\nEXIT\n`;
  try {
    execFileSync(SQLPLUS, ['-S', ORACLE_DSN], { input: script, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
  } catch (err) {
    const e = err as { stdout?: string; stderr?: string; message?: string };
    throw new Error(`[${label}] sqlplus failed: ${e.stdout ?? ''}${e.stderr ?? ''}${e.message ?? ''}`.trim());
  }
}

/** Links `questionId` to a real inspection so `isQuestionUsed(questionId)` returns true. */
export function markQuestionUsedViaDb(questionId: string, answerCode: string): void {
  const qid = Number(questionId);
  if (!Number.isInteger(qid)) throw new Error(`[seed] invalid questionId: ${questionId}`);
  assertSafeAnswerCode(answerCode);
  runSql(
    `INSERT INTO the.inspection_response ` +
      `(inspection_id, inspection_question_id, inspection_answer_code, follow_up_completed_ind) ` +
      `VALUES (${USED_QUESTION_INSPECTION_ID}, ${qid}, '${answerCode}', 'N');`,
    'seed',
  );
}

/** Removes the link row created by markQuestionUsedViaDb, so cleanup can delete the question itself. */
export function unmarkQuestionUsedViaDb(questionId: string, answerCode: string): void {
  const qid = Number(questionId);
  if (!Number.isInteger(qid)) return;
  assertSafeAnswerCode(answerCode);
  runSql(
    `DELETE FROM the.inspection_response ` +
      `WHERE inspection_id = ${USED_QUESTION_INSPECTION_ID} ` +
      `AND inspection_question_id = ${qid} AND inspection_answer_code = '${answerCode}';`,
    'cleanup',
  );
}
