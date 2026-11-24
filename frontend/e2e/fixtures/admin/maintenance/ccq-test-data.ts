import { randomUUID } from 'node:crypto';

import { daysAgo } from '../../common/dates';

/**
 * Known-good test data for the Maintain Inspection Question (CCQ) flow, PINNED from the seeded local
 * Docker Oracle DB (localhost:1525 / DBDOCK_01 / THE) on 2026-07-15. Every value here was verified
 * against the running DB and the backend's actual validators — nothing is fabricated.
 *
 * Provenance (queried via the seeded-SCS-DB container's own sqlplus, port 1521 inside the
 * container / 1525 on the host):
 *  - Inspection Type codes (LOV_SCALE_SITE_INSPCTN_TYPE_CODE via `the.scale_site_inspctn_type_code`):
 *      MIN=Minor, REG=Regular, MAJ=Major, AUT=Automated. Matches legacy's four checkboxes.
 *  - Scaling Method codes (`the.scale_method_type_code`): P=Piece Scale, W=Weight Scale,
 *      S=Special Forest Product, **C=Cruise Based** — a 4th code the LEGACY screen never exposed
 *      (legacy only had Piece/Weigh/SFP checkboxes). Re-grounding note, not a defect: the new app's
 *      `ActiveMultiSelect` lists whatever `GET /api/scale-method-type-lov` returns, unfiltered.
 *  - Valid Response codes (`the.inspection_answer_code`): Y=Yes, N=No, NA=Not applicable. Matches legacy.
 *  - `INSPECTION_RESPONSE` links a question to an inspection to mark it "used" (`questionUsed`) —
 *      `select distinct inspection_question_id from the.inspection_response` shows 44 real "used"
 *      questions (e.g. 401-416), but none are safe to mutate directly (shared, and their scaling
 *      questions/types differ) — see `questionDbSeed.ts` for the dedicated disposable "used" fixture
 *      this suite creates instead.
 *  - `INSPECTION_RESPONSE.INSPECTION_ID` FKs to `SCALE_INSPECTION_REPORT` (not a generic "inspection"
 *      table). The real-data extract's FK-one-hop gap means most existing `INSPECTION_RESPONSE.
 *      inspection_id` values are ORPHANS with no live parent row (confirmed: id 74292 — first one found
 *      by a naive query — has zero matching `scale_inspection_report` rows; a live INSERT would 400
 *      `ORA-02291`). Inspection id **322429** was confirmed to have a real parent row and is pinned as
 *      the FK target for the dedicated "used" seed row.
 *
 * DATES ARE TODAY-RELATIVE (see daysAgo), never hardcoded literals. Unlike CHK's scale dates, the
 * Inspection Question Effective/Expiry dates have no "must not be future" rule (confirmed: neither
 * `validateForm` (frontend) nor `InspectionQuestionService.validateQuestionRequestParams` (backend)
 * checks that) — only "Expiry >= Effective" is enforced. A wide, safely-future expiry keeps every test
 * window valid without a calendar-cliff risk.
 */

export const INSPECTION_TYPE_CODES = { minor: 'MIN', standard: 'REG', major: 'MAJ', automated: 'AUT' } as const;
export const SCALING_METHOD_CODES = { piece: 'P', weigh: 'W', sfp: 'S', cruise: 'C' } as const;
export const VALID_RESPONSE_CODES = { yes: 'Y', no: 'N', notApplicable: 'NA' } as const;

/** Inspection id with a real (non-orphan) `SCALE_INSPECTION_REPORT` parent row — see provenance above. */
export const USED_QUESTION_INSPECTION_ID = 322429;

export type InspectionQuestionBody = {
  questionText: string;
  commentRequiredInd: string;
  sortOrderNo: number;
  effectiveDate: string;
  expiryDate: string;
  inspectionTypeCodes: string[];
  scalingMethodTypeCodes: string[];
  validResponseCodes: string[];
}

/** A fully valid create/update body. Each call gets a unique question text + sort order (parallel-safe). */
export function buildInspectionQuestionBody(label: string): InspectionQuestionBody {
  // Globally-unique suffix (a v4 UUID) so the exact-1 read-back on questionText can never collide across
  // parallel workers — a monotonic counter resets per worker process and Date.now()+Math.random() has a
  // (small) same-ms collision window.
  const unique = randomUUID();
  return {
    questionText: `E2E CCQ ${label} ${unique}`,
    commentRequiredInd: 'N',
    sortOrderNo: 500 + Math.floor(Math.random() * 400), // clear of the real seed's 1-32 range; not unique-constrained
    effectiveDate: daysAgo(1),
    expiryDate: daysAgo(-3650), // ~10 years out — far enough that it can't age out mid-suite
    inspectionTypeCodes: [INSPECTION_TYPE_CODES.minor],
    scalingMethodTypeCodes: [SCALING_METHOD_CODES.piece],
    validResponseCodes: [VALID_RESPONSE_CODES.yes, VALID_RESPONSE_CODES.no],
  };
}

/**
 * An inspection-question id that provably does NOT exist — the comparand for the not-found branch of the
 * question detail read (UC-CCQ-002 S07).
 *
 * Provenance (verified 2026-09-08 against the running stack, re-verify after any DB re-extract):
 *   GET /api/inspection-questions  -> 86 rows, max inspectionQuestionId = 1268
 *   GET /api/inspection-questions/999999999 -> HTTP 404 {"code":"NOT_FOUND", ...}
 * Nine digits sits far above the sequence, so no create in this suite can collide with it.
 */
export const ABSENT_QUESTION_ID = 999999999;
