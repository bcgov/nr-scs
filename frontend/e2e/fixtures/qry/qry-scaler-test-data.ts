/**
 * QRY-003 (Search Scalers) — DB-grounded known values, discovered 2026-07-23 against the real extract
 * (container real-data-seeded-scs-db, :1525) via `GET /api/scalers/search` (→ SP scaler search) and
 * `GET /api/check-scales/search?checkScaleId=` (the check-scale-branch target). Scaler search is
 * READ-ONLY, so these are pinned by real id/value and shared freely across parallel tests — no mutation,
 * no cleanup. Real data is non-deterministic across re-extracts: RE-VERIFY with each comment's query.
 */

/**
 * A LAST NAME matching MORE THAN ONE scaler → the multi-result happy path (S01).
 * Query: GET /api/scalers/search?clientName=RATHROCK&primarySort=1&secondarySort=0
 *        -> 3 rows: 323E (RATHROCK REMINGTON), 565D (RATHROCK LAGINA), N113 (RATHROCK GOTTHARD).
 */
export const multiResultLastName = {
  value: 'RATHROCK',
  expectedCount: 3,
  /** One licence guaranteed in the result set — asserted as a link to its scaler view. */
  aLicence: '323E',
} as const;

/**
 * A specific LICENCE # matching EXACTLY ONE scaler → the single-result case (S02). The legacy app
 * auto-forwarded to the scaler summary here; the new app instead lists the single row (see defects.md
 * Divergence #1). Also the deterministic row used for the columns + cell-data assertion.
 * Query: GET /api/scalers/search?scalerLicenceNo=914D -> 1 row {clientName:'ABERNATHA',
 *        legalFirstName:'ADAH', orgUnitName:'Thompson Rivers Natural Resource District'}.
 */
export const singleResultLicence = {
  value: '914D',
  expectedCount: 1,
  lastName: 'ABERNATHA',
  firstName: 'ADAH',
  regDist: 'Thompson Rivers Natural Resource District',
} as const;

/**
 * A last-name value matching NO scaler → zero results (S03).
 * Query: GET /api/scalers/search?clientName=ZZZNOMATCH -> [] (confirmed 2026-07-23).
 */
export const noMatchLastName = 'ZZZNOMATCH';

/**
 * A VALID check scale id for the "OR enter check scale #" branch (S04). Entering it and searching
 * navigates to /check-scales/view/{id}, which renders the Check Scale view (heading "Check Scale").
 * This is the CHK-pinned `legacyCheckScaleId` (an LGCS record).
 * Query: GET /api/check-scales/search?checkScaleId=145842 -> 1 row (confirmed 2026-07-23).
 */
export const validCheckScaleId = '145842';

/**
 * A NON-EXISTENT numeric check scale id (S05). Search looks it up via search?checkScaleId=, which returns
 * [], so the form stays put with the field error "No records were found.".
 * Query: GET /api/check-scales/search?checkScaleId=999999999 -> [] (confirmed 2026-07-23).
 */
export const notFoundCheckScaleId = '999999999';

/**
 * A NON-NUMERIC check scale id (S05, second error path). The form rejects it before any request with the
 * field error "Check Scale # must be a number.". (Sent straight to the API it would still be an HTTP 500 —
 * `GET /api/check-scales/search?checkScaleId=ABC` fails Spring's `Long` bind; see defects.md Divergence #2.)
 */
export const nonNumericCheckScaleId = 'ABC';
