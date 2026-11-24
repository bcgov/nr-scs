import { daysAgo, daysAhead } from '../common/dates';

/**
 * DB-pinned test data for Scaler Performance Remarks (UC-PRF-001/002/003), against the real-data seeded
 * Oracle image. Real data is non-deterministic across re-extracts — re-verify these anchors (and their
 * "0 existing remarks" / check-scale-exists assumptions) whenever the image is rebuilt, using the queries
 * in each provenance comment.
 *
 * Endpoints under test (base `/api`):
 *   GET|POST /scalers/{scalerLicenceNo}/performance-remarks
 *   PUT|DELETE /scalers/{scalerLicenceNo}/performance-remarks/{id}
 * Issue-Type LOVs (GET /static-lov?tableKey=...): SCALER_PERFORMANCE_ACTN_CODE, SCALER_PERFORMANCE_OUTCM_CODE.
 */

/**
 * Primary anchor scaler — a real THE.SCALER row whose scaler page loads and whose performance-remarks list
 * is reachable. Every create/update/delete scenario id-scopes its assertions to the remark IT creates, so a
 * shared anchor is parallel-safe (no scenario asserts a count or "empty" on it).
 *
 * Provenance (re-verify on re-extract):
 *   SELECT scaler_licence_no FROM the.scaler WHERE scaler_licence_no='5828';   -- SCALER_LICENCE_NO VARCHAR2(4)
 *   SELECT COUNT(*) FROM the.scaler_performance_remark WHERE scaler_licence_no='5828';  -- 0
 *   GET /api/scalers/5828                       -> 200 (working scaler page; client 00034698, org 1834)
 *   GET /api/scalers/5828/performance-remarks   -> 200 [] (no pre-existing rows)
 * NB: SCALER_LICENCE_NO is VARCHAR2(4) — always a string, never longer than 4 chars.
 * Named `prf`-prefixed because fixtures/scl/scaler-edit-test-data.ts also exports an `anchorScalerLicenceNo`
 * (coincidentally also '5828', but for a different subject — SCALER_TRAINING reads, not PRF writes); the
 * distinct name makes an import-path slip a compile error rather than a silent cross-domain mix-up.
 */
export const prfAnchorScalerLicenceNo = '5828';

/**
 * A SECOND scaler that has zero performance remarks AND that no scenario ever writes to — the read-only
 * "empty list" state (parallel-safe because nothing mutates it). Distinct from the anchor.
 *   SELECT COUNT(*) FROM the.scaler_performance_remark WHERE scaler_licence_no='7443';  -- 0
 *   GET /api/scalers/7443/performance-remarks   -> 200 []   (client 00004404, org 1826)
 */
export const emptyStateScalerLicenceNo = '7443';

/** Real Issue-Type codes (confirmed via GET /static-lov). Action set: DGS/NAC/RSS; Outcome set: RS/RW. */
export const actionCode = 'NAC'; // "No Action" — SCALER_PERFORMANCE_ACTN_CODE
export const outcomeCode = 'RW'; // "Recommend Warning" — SCALER_PERFORMANCE_OUTCM_CODE

/**
 * A real, existing check-scale id for the valid `checkScaleId` FK case (the create write path enforces the
 * FK via checkScaleService.existsById). Verify it still exists on re-extract:
 *   SELECT check_scale_id FROM the.check_scale WHERE check_scale_id=145988;   -- present
 *   POST create with "checkScaleId":145988  -> HTTP 201 (accepted)
 */
export const validCheckScaleId = '145988';

/**
 * A check-scale id guaranteed ABSENT, for the server-side "check scale does not exist" rejection.
 *   SELECT MAX(check_scale_id)+999999 FROM the.check_scale;   -- max 146997 -> 1146996 absent
 *   POST create with "checkScaleId":1146996  -> HTTP 400 VALIDATION_ERROR, fieldError on checkScaleId
 */
export const nonExistentCheckScaleId = '1146996';

/** Canonical valid create payload (Action arm). Date is today-relative so it never ages into "future". */
export const happyActionRemark = {
  dateOfIncident: daysAgo(3),
  issueType: 'Action' as const,
  actionCode,
  description: 'E2E: observed incorrect scaling method during check scale visit.',
};

/** Canonical valid create payload (Outcome arm) — the mirror of happyActionRemark. */
export const happyOutcomeRemark = {
  dateOfIncident: daysAgo(4),
  issueType: 'Outcome' as const,
  outcomeCode,
  description: 'E2E: recommend a warning after repeated late data submission.',
};

/** A future date for the "Date of Incident cannot be in the future" checks (today-relative). */
export const futureDate = daysAhead(3);

/**
 * Client-side validation messages enforced by `validatePerformanceRemarkForm`
 * (nr-scs performanceRemarkFormUtils.ts). These are the NEW-app strings the form renders inline — they
 * differ from the legacy Struts validator messages in the UC Gherkin (see this UC's defects.md, spec-gap).
 */
export const messages = {
  dateRequired: 'Date of Incident is required.',
  dateFuture: 'Date of Incident cannot be in the future.',
  actionRequired: 'Action is required.',
  outcomeRequired: 'Outcome is required.',
  descriptionRequired: 'Description is required.',
  suspensionOrder: 'Suspension start date must be on or before the suspension end date.',
  checkScalePositive: 'Associated Check Scale # must be a positive number.',
} as const;

/**
 * SERVER-side rejection message for a well-formed but non-existent check-scale id — the backend returns
 * 400 VALIDATION_ERROR with a fieldError on `checkScaleId`, which the form maps back inline under the
 * Associated Check Scale # field. Verified live for id 1146996:
 *   {"code":"VALIDATION_ERROR","fieldErrors":[{"field":"checkScaleId",
 *    "message":"A check scale could not be found for 1146996."}]}
 */
export const checkScaleServerNotFound = `A check scale could not be found for ${nonExistentCheckScaleId}.`;

