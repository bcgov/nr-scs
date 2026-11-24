/**
 * Inert bodies for the cross-cutting write-verb probes (SEC-11).
 *
 * THE PROBLEM THESE SOLVE. `@RequiresPermission` is method security — an AOP interceptor around the
 * handler — so request-body binding and bean validation run BEFORE it. A body-less or malformed
 * `POST`/`PUT` is rejected by the binder at 400 without authorization ever being consulted, which makes
 * "refused" true for every role including one that holds the permission. Four role suites recorded
 * these verbs as untestable for exactly that reason ("no bindable body established").
 *
 * A usable probe body must therefore satisfy bean validation completely — and then still be unable to
 * change anything.
 *
 * HOW THE SECOND HALF IS GUARANTEED: every probe targets id **99999999**, which exists in no table.
 * Authorization runs, the handler then fails to find the row, and nothing is written. So the status
 * separates cleanly:
 *
 *   403  → refused at authorization (the role lacks the permission)
 *   404  → past authorization, row not found (the role holds it)
 *   500  → past authorization, the stored procedure threw on the missing row (the renew endpoints)
 *
 * The assertion is `not 403` on the allow side rather than a pinned status, because which of 404 / 500
 * a missing row produces is the handler's business, not the permission layer's.
 *
 * Two values that cost a probe run each, recorded so nobody repeats them:
 *   - `returnType` is the WIRE enum (`LOG_TALLY`), not the legacy `cksc_type` code (`LT`). A legacy code
 *     fails deserialization and the response is "Request body is required." — which reads like a
 *     missing body, not a bad enum.
 *   - the two scaler licences must DIFFER; the service rejects a check scaler equal to the original
 *     scaler, and that rejection happens at 400, before authorization.
 *
 * Anchors verified 2026-08-31 against the seeded DB and the running backend.
 */

/** The id every probe targets. Exists in no table, so no probe can mutate a record. */
export const nonexistentRecordId = '99999999';

/** Scaler licences that exist and differ — bean validation requires both. */
const originalScalerLicenceNo = '7443';
const checkScalerLicenceNo = '7444';

/** `PUT /api/check-scales/{id}` — the six editable fields of an HBCS check scale. */
const checkScaleUpdateBody = {
  checkScaleTypeCode: 'HBCS',
  followedGoodPracticeInd: 'Y',
  originalWithinStandardInd: 'Y',
  originalScaleNetValue: 1.0,
  checkScaleNetValue: 1.0,
};

/** `PUT /api/summary-check-scales/{id}` — header-only; SPG rows are managed elsewhere. */
const summaryCheckScaleUpdateBody = {
  returnType: 'LOG_TALLY',
  checkScaleTypeCode: 'HBCS',
  originalScalerLicenceNo,
  checkScalerLicenceNo,
  timberMark: 'L44804',
  scaleSiteIdNmbr: '520',
  followedGoodPracticeInd: 'Y',
  originalWithinStandardInd: 'Y',
  checkReplacesOriginalInd: 'N',
  originalScaleDate: '2020-01-01',
  originalScaleReturnNo: 1,
  chkScaleDate: '2020-01-02',
  chkScaleReturnNo: 2,
};

const bodies: Record<string, unknown> = {
  [`PUT /api/check-scales/${nonexistentRecordId}`]: checkScaleUpdateBody,
  [`PUT /api/summary-check-scales/${nonexistentRecordId}`]: summaryCheckScaleUpdateBody,
};

/**
 * The body for a probe, or `undefined` where the endpoint takes none.
 *
 * The renew, workbench-remove and delete endpoints are all body-free, so they reach authorization
 * unaided — which is what makes the Work Bench verbs probeable at all. Three suites recorded them as
 * blocked on "no body-free gated endpoint"; these are exactly that, and always were.
 */
export const buildInertWriteBody = (method: string, path: string): unknown =>
  bodies[`${method.toUpperCase()} ${path}`];
