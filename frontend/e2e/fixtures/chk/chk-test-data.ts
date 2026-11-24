/**
 * Known-good test data for the Summary Check Scale (CHK) flows, re-grounded onto the REAL data loaded
 * into the local Docker Oracle DB (localhost:1525 / DBDOCK_01 / THE), verified 2026-07-15 against the
 * running DB and the backend's actual validators — nothing is fabricated.
 *
 * Why these exact values (re-grounding UC-CHK-005-S01's legacy Gherkin onto the new system):
 *  - The new backend enforces rules the legacy Gherkin did not:
 *      • check vs. original scaler licences must be DISTINCT  (Gherkin used "1234" for both — would 400)
 *      • exactly ONE of Load Arrival # / Weigh Slip #        (Gherkin set neither — would 400)
 *      • scale dates must not be in the future
 *      • referential existence: scaler, timber mark, scale site  (CheckScaleReferenceValidator.java)
 *  - Scalers 7443 (original) / 7444 (check) are real, DISTINCT, and both have a working scaler page
 *    (they anchor the read-only UCs too). Scale site 28E is a real loaded site.
 *  - Check Scale Type FST: the loaded CHECK_SCALE_TYPE_CODE table contains only FST/SEC (the mock
 *    LTS/SPL/STD do not exist). NOTE: the form's type dropdown is served from a startup-warmed LOV
 *    cache — after loading real data you MUST evict it (POST /api/api/internal/cache/evict) or restart
 *    the backend, else the dropdown shows the stale mock codes and the create 500s on the type FK.
 *  - Timber mark L44804: a check-scale create needs a mark that passes BOTH the backend existence check
 *    (found by scs_haul_mark_auth_srch_vw, i.e. an HMA row) AND the DB FK CKSC_HAA_FK (a HAULING_AUTHORITY
 *    row). Re-grounded 2026-07-22: the v2 extract has 183 real marks satisfying BOTH gates, so NO seed is
 *    needed (the earlier "zero overlap" premise was carried from the old extract and is false here — the
 *    chk/check-create-timber-mark.sql patch was retired). L44804 (Fort Nelson NRD) is a real mark in both,
 *    with a never-expiring window 1998-11-25..9999-12-31, so it can't age out. Verified live 2026-07-22:
 *    POST /api/summary-check-scales/create {timberMark:'L44804',...} -> HTTP 201.
 *  - Return Type "Special Forest Product" (cksc_type SFPSCS) matches the Gherkin. For SFP the Product
 *    field is required and Grade is DISABLED unless Product == 'XM'; species AL + product CA is a valid
 *    SPECIES_PRODUCT_GRADE_XREF combination (no XM here), so Grade is left blank by design.
 *  - Numeric precision: Net Volume NUMBER(7,3) (<=4 int / 3 dec), Net Value NUMBER(8,2) (<=6 int / 2 dec).
 *
 * DATES ARE TODAY-RELATIVE (see daysAgo below), never hardcoded literals — the backend rejects future
 * scale dates, and hardcoded dates silently age into failure. Mark L44804's window ends 9999-12-31, so a
 * today-relative past scale date always falls inside it — no calendar cliff.
 */

// daysAgo is used locally below for the today-relative scale dates. The date helpers live in the shared
// cross-domain module (common/dates) — consumers import them from there directly, so no re-export here.
import { daysAgo } from '../common/dates';

/** One SPG (species/product/grade) roll-up row. */
export interface SpgRowData {
  species: string; // #species option value (LOV code)
  product: string; // #product option value (enabled for SFP once species chosen)
  grade: string; // #grade — disabled/blank for SFP with a non-XM product
  originalPieces: string;
  checkPieces: string;
  originalNetVolume: string;
  checkNetVolume: string;
  originalNetValue: string;
  checkNetValue: string;
}

export interface SummaryCheckScaleCreateData {
  returnType: 'Log Tally' | 'Sample Log Tally' | 'Special Forest Product';
  checkScaleType: string; // CHECK_SCALE_TYPE_CODE: FST | SEC (real loaded codes)
  checkScalerLicence: string;
  originalScalerLicence: string;
  loadArrivalNumber: string; // set exactly one of load/weigh (XOR)
  weighSlipNumber: string;
  timberMark: string;
  scaleSiteNumber: string;
  followedGoodPractices: 'Yes' | 'No';
  originalWithinStandard: 'Yes' | 'No';
  checkReplacesOriginal: 'Yes' | 'No';
  partialLoad: 'Yes' | 'No'; // required for SFP
  originalDateOfScale: string; // YYYY-MM-DD, past
  checkDateOfScale: string; // YYYY-MM-DD, past
  originalScaleReturn: string;
  checkScaleReturn: string;
  spgRow: SpgRowData;
}

/**
 * A SECOND valid SFP roll-up row, DB-grounded like the first. species AL + product CH is a valid
 * SPECIES_PRODUCT_GRADE_XREF combination (verified 2026-07-15 against the loaded DB: AL has products
 * CA, CH, FW, HF, … for SFP). Its composite key (AL/CH/' ') is distinct from the happy-path row
 * (AL/CA/' '), so a record can hold both — needed by UC-CHK-006 add-row (S02) and delete-row (S03).
 */
export const secondSpgRow: SpgRowData = {
  species: 'AL',
  product: 'CH',
  grade: '', // SFP + non-XM product => grade blanked to ' ' by the backend
  originalPieces: '5',
  checkPieces: '5',
  originalNetVolume: '3.200',
  checkNetVolume: '3.100',
  originalNetValue: '50.00',
  checkNetValue: '48.00',
};

/** UC-CHK-005-S01 happy-path create — a fully valid Summary Check Scale for the new app. */
export const summaryCheckScaleHappyPath: SummaryCheckScaleCreateData = {
  returnType: 'Special Forest Product',
  checkScaleType: 'FST', // real CHECK_SCALE_TYPE_CODE (only FST/SEC exist in the loaded data)
  originalScalerLicence: '7443',
  checkScalerLicence: '7444',
  loadArrivalNumber: '1',
  weighSlipNumber: '',
  timberMark: 'L44804', // real mark in BOTH the search view + HAULING_AUTHORITY (no seed; re-grounded 2026-07-22, was seeded 02101 — the v2 extract has 183 real marks satisfying both create gates)
  scaleSiteNumber: '28E',
  followedGoodPractices: 'Yes',
  originalWithinStandard: 'Yes',
  checkReplacesOriginal: 'No',
  partialLoad: 'No',
  originalDateOfScale: daysAgo(60), // today-relative + past; L44804's window is 1998-11-25..9999-12-31
  checkDateOfScale: daysAgo(30), // check scaled after original, still past
  originalScaleReturn: '1',
  checkScaleReturn: '1',
  spgRow: {
    species: 'AL',
    product: 'CA', // AL/CA is a valid SPECIES_PRODUCT_GRADE_XREF SFP combo (non-XM ⇒ grade blank)
    grade: '',
    originalPieces: '10',
    checkPieces: '10',
    originalNetVolume: '15.500',
    checkNetVolume: '15.250',
    originalNetValue: '200.00',
    checkNetValue: '198.00',
  },
};

/** API create-request shape (POST /api/summary-check-scales/create) — assembled here so the update
 *  suite can SEED a fresh, known record via the API (fast, reliable) and drive the UI against it. */
interface SpgRowApiBody {
  scaleSpeciesCode: string;
  scaleProductCode: string | null;
  scaleGradeCode: string | null;
  originalScalePieceCnt: number;
  originalScaleNetVolume: number;
  originalScaleNetValue: number;
  checkScalePieceCnt: number;
  checkScaleNetVolume: number;
  checkScaleNetValue: number;
}

const toSpgRowApiBody = (r: SpgRowData): SpgRowApiBody => ({
  scaleSpeciesCode: r.species,
  scaleProductCode: r.product || null,
  scaleGradeCode: r.grade || null,
  originalScalePieceCnt: Number(r.originalPieces),
  originalScaleNetVolume: Number(r.originalNetVolume),
  originalScaleNetValue: Number(r.originalNetValue),
  checkScalePieceCnt: Number(r.checkPieces),
  checkScaleNetVolume: Number(r.checkNetVolume),
  checkScaleNetValue: Number(r.checkNetValue),
});

/**
 * Build a valid create-request body for the summary check scale create endpoint, from the pinned
 * happy-path data. `rows` selects one SPG row (default) or two (happy-path FI/LO + secondSpgRow
 * FI/PO) for the delete-row / add-row update scenarios. Dates stay today-relative via daysAgo.
 */
export function buildSummaryCheckScaleCreateBody(rows: 1 | 2 = 1): Record<string, unknown> {
  const d = summaryCheckScaleHappyPath;
  const spgRows = rows === 2 ? [d.spgRow, secondSpgRow] : [d.spgRow];
  return {
    returnType: 'SPECIAL_FOREST_PRODUCT',
    checkScaleTypeCode: d.checkScaleType,
    originalScalerLicenceNo: d.originalScalerLicence,
    checkScalerLicenceNo: d.checkScalerLicence,
    loadArrivalNumber: d.loadArrivalNumber || null,
    weighSlipNumber: d.weighSlipNumber ? Number(d.weighSlipNumber) : null,
    timberMark: d.timberMark,
    scaleSiteIdNmbr: d.scaleSiteNumber,
    followedGoodPracticeInd: d.followedGoodPractices === 'Yes' ? 'Y' : 'N',
    originalWithinStandardInd: d.originalWithinStandard === 'Yes' ? 'Y' : 'N',
    checkReplacesOriginalInd: d.checkReplacesOriginal === 'Yes' ? 'Y' : 'N',
    partialInd: d.partialLoad === 'Yes' ? 'Y' : 'N',
    originalScaleDate: d.originalDateOfScale,
    originalScaleReturnNo: Number(d.originalScaleReturn),
    chkScaleDate: d.checkDateOfScale,
    chkScaleReturnNo: Number(d.checkScaleReturn),
    chkScalerCommentTxt: 'e2e seed original comment',
    spgRows: spgRows.map(toSpgRowApiBody),
  };
}

// ============================================================================
// UC-CHK-001 — Detail (HBCS) Check Scale create
// ============================================================================
//
// The DETAIL check scale create is a two-step, HBS-driven flow (unlike the manual-entry Summary
// create above): step 1 (route /check-scales/create) collects a Return Type + a check and original
// DDN/DDV pair and POSTs /api/check-scales/validate; on success step 2 shows HBS-derived read-only
// fields + the editable outcome fields and POSTs /api/check-scales/create. So the concrete inputs are
// HBS *log-tally document numbers*, DISCOVERED from the REAL data loaded into the DB (table LOG_TALLY),
// verified 2026-07-15 against localhost:1525/DBDOCK_01 AND by exercising the real /validate + /create
// endpoints by hand. Nothing is fabricated.
//
// Doc selection rules (all chosen docs are ACTIVE version 1 — active_version_ind='Y', version=1 — so a
// hardcoded DDV of 1 always resolves the live version, and none is already used as a check or original):
//   168D492V77Y90 (scaler 167Y) + 0172812I12E50 (012E), site 16W -> S01 happy path (DISTINCT scalers)
//   017L212D02E3C (012E) + 2101K02700F30 (210F)                  -> S05 reach-step-2 (validate only)
//   2103S02700F10 (210F)                                         -> S03 "cannot be the same" (both sides)
//   212X482G90F00 (210F)                                         -> S03 "already a check" (prereq creates on it)
//   216BK82780F10 (210F)                                         -> S04 "max checks" original (prereq: 2 checks)
//   224RY42F50F5C (220F) + 383V211Y22E4C (382E)                  -> UC-002/004 editable-record seed
//   222TS34E40F40 (220F) + 2232O32730F30 (220F)                  -> S06 same-scaler divergence
// Since the loaded data has ZERO check scales linked to a log tally, the "already a check" (S03) and
// "original at max checks" (S04) states don't exist naturally; those scenarios CREATE the prerequisite
// check scale(s) at runtime via the API (self-contained + cleaned up), rather than relying on a seed.
// A created detail check scale is a single HBCS check_scale row (no SPG children — species are derived
// from the log tally at read time), and there is NO delete endpoint, so cleanup deletes the row
// directly at the DB (see steps/chk/checkScaleDbCleanup.ts).

export interface DetailCheckScaleCreateData {
  returnType: 'Log Tally' | 'Sample Log Tally';
  checkDdn: string;
  checkDdv: string;
  originalDdn: string;
  originalDdv: string;
  checkScaleType: string; // CHECK_SCALE_TYPE_CODE: FST | SEC (real loaded codes)
  followedGoodPractices: 'Yes' | 'No';
  originalWithinStandard: 'Yes' | 'No';
  comment: string;
  originalNetValue: string; // NUMBER(8,2)
  checkNetValue: string;
  /**
   * Expected read-back values. The scaler licences / site are HBS-DERIVED from the linked log_tally
   * headers at read time (the create persists them null), so they come from the seeded docs, not the
   * form — that is what makes the read-back assertion meaningful.
   */
  expected: {
    ckscType: string;
    checkScalerLicenceNo: string;
    originalScalerLicenceNo: string;
    scaleSiteIdNmbr: string;
  };
}

/** UC-CHK-001-S01 happy-path detail create — a fully valid HBCS check scale (Log Tally). */
export const detailCheckScaleHappyPath: DetailCheckScaleCreateData = {
  returnType: 'Log Tally',
  checkDdn: '168D492V77Y90',
  checkDdv: '1',
  originalDdn: '0172812I12E50',
  originalDdv: '1',
  checkScaleType: 'FST', // real CHECK_SCALE_TYPE_CODE (only FST/SEC exist in the loaded data)
  followedGoodPractices: 'Yes',
  originalWithinStandard: 'No',
  comment: 'e2e detail check scale create',
  originalNetValue: '100.50',
  checkNetValue: '99.25',
  expected: {
    ckscType: 'HBCS',
    checkScalerLicenceNo: '167Y', // 168D492V77Y90.primary_license_number
    originalScalerLicenceNo: '012E', // 0172812I12E50.primary_license_number
    scaleSiteIdNmbr: '16W', // 168D492V77Y90.scale_site_id_nmbr
  },
};

/**
 * DDN constants for the DETAIL create validation slices (S02–S04). All real docs are ACTIVE version 1.
 * `nonexistent*` values are provably absent from LOG_TALLY (verified 2026-07-15: SELECT COUNT(*) = 0) —
 * NOT fabricated data; a valid "does not exist" test needs a provably-missing DDN.
 *
 * S03 "already a check" and S04 "original at max checks" have no natural state in the real data (no
 * loaded check scale is linked to a log tally), so their scenarios CREATE the prerequisite check
 * scale(s) at runtime on the docs below and clean them up. Each creating scenario owns a UNIQUE check
 * DDN, so there is no cross-scenario state contention under parallel / --repeat-each runs.
 */
export const detailCheckScaleDdns = {
  freeCheckDdn: '2209Q42G40F7C', // active, unused — the fresh check the S04 attempt uses
  maxOriginalDdn: '216BK82780F10', // S04 original; the prereq puts 2 checks on it (see maxChecksCheckDdns)
  maxChecksCheckDdns: ['2169C82780F80', '2191K92750F80'] as const, // the 2 checks the S04 prereq creates
  usedCheckDdn: '212X482G90F00', // S03 "already a check": the prereq creates a check scale ON this DDN
  usedCheckPrereqOriginalDdn: '212ZQ32K40F5C', // the original the S03 prereq pairs with usedCheckDdn
  usedCheckScenarioOriginalDdn: '215I812730F40', // a valid, distinct original the S03 scenario then submits
  nonexistentCheckDdn: 'NOSUCHDDN01', // absent from LOG_TALLY — S02
  nonexistentOriginalDdn: 'NOSUCHORG01', // absent from LOG_TALLY — S02 / S03 partner
  duplicateDdn: '2103S02700F10', // real active doc used for BOTH sides — S03 "cannot be the same"
  version: '1',
} as const;

/**
 * Validate-only "reach step 2" pair — exists in HBS but is **never created-on by any test**, so its
 * `/validate` always returns ok. The step-2 validation scenarios (S05) use THIS to reach the outcome
 * fields, instead of sharing the happy-path create pair (S01 = 168D492V77Y90). Sharing that pair would
 * cause a parallel-execution flake: while S01's freshly-created record existed, `validate(168D492V77Y90)`
 * returns "a check scale already exists", so S05 would never reach step 2. A dedicated never-created pair
 * removes the contention. Outcome fields are inherited from the happy path and unused by S05.
 */
export const detailCheckScaleReachStep2: DetailCheckScaleCreateData = {
  ...detailCheckScaleHappyPath,
  checkDdn: '017L212D02E3C',
  checkDdv: '1',
  originalDdn: '2101K02700F30',
  originalDdv: '1',
};

// ============================================================================
// UC-CHK-002 — Detail (HBCS) Check Scale update
// ============================================================================
//
// The update E2E drives the edit screen /check-scales/edit/{id}. The loaded real data has NO persistent
// editable HBCS record (the old mock 905021 is gone), so EVERY update scenario — the S01 happy path AND
// the non-mutating reset/cancel/blocked-save ones — creates its OWN fresh editable record via the API
// (unused pair below) and cleans it up at the DB. Only S01 then PUTs; the rest never save. Each scenario
// owning its own record keeps them independent + parallel-safe. Confirmed by exercising POST
// /api/check-scales/create + PUT /api/check-scales/{id} by hand on 2026-07-15.

/** Baseline comment the edit-seed record is created with — what Reset (S02) reverts the field to. */
export const detailCheckScaleEditBaselineComment = 'e2e detail edit baseline';

/** A LEGACY (LGCS) record — S04 asserts its Edit Record + Delete buttons are disabled. Real data
 *  (2026-07-15): 145842 is a loaded LGCS check scale (GET /check-scales/search?checkScaleId=145842 →
 *  ckscType 'LGCS'). Any LGCS id works; it is opened by id, not from a list. */
export const legacyCheckScaleId = '145842';

/** Unused (active v1) HBS doc pair each update/delete scenario creates its editable record from. */
export const detailCheckScaleEditCreatePair = {
  checkDdn: '224RY42F50F5C', // scaler 220F, site 16W
  checkDdv: 1,
  originalDdn: '383V211Y22E4C', // scaler 382E
  originalDdv: 1,
} as const;

/** Create-request body used to SEED an editable record (baseline FST / Y / N / 50 / 50 + a known
 *  comment, so each edit visibly changes a field and Reset has a baseline to revert to). */
export const detailCheckScaleEditSeedBody: Record<string, unknown> = {
  checkScaleTypeCode: 'FST',
  followedGoodPracticeInd: 'Y',
  originalWithinStandardInd: 'N',
  originalScaleNetValue: 50,
  checkScaleNetValue: 50,
  chkScalerCommentTxt: detailCheckScaleEditBaselineComment,
  chkLogTallyDocNo: detailCheckScaleEditCreatePair.checkDdn,
  chkLogTallyVer: detailCheckScaleEditCreatePair.checkDdv,
  orgLogTallyDocNo: detailCheckScaleEditCreatePair.originalDdn,
  orgLogTallyVer: detailCheckScaleEditCreatePair.originalDdv,
};

// ============================================================================
// UC-CHK-003 — Detail (HBCS) Check Scale VIEW (read-only)
// ============================================================================
//
// A read-only UC: every scenario opens a PERMANENT seed record read-only and asserts the display —
// nothing mutates, so these ids are safe to share across parallel tests (no cleanup, no contention).
// All pinned + read-back-verified 2026-07-09 against localhost:1525/DBDOCK_01 via
// GET /api/check-scales/search?checkScaleId={id} and the scaler/scale-site check-scale tab endpoints.

/**
 * The record the SCALER Check Scales tab lists and links to — the happy-path VIEW subject for S01 (opened
 * from scaler 7443's tab) and S03 (opened from scaler 7444's tab under the Check filter) and S05's Back
 * scenario. Real data (2026-07-15): check scale 145988, original (primary) scaler 7443, check scaler 7444
 * — BOTH scalers have a working view page so the tab route renders — site 431, 1 species row, comment a
 * single space. It is LGCS (legacy), which is irrelevant to the view-rendering assertions (the legacy
 * button-state is covered by S04's own record). Verified via GET /scalers/7443/check-scales?filter=All
 * (has 145988), /scalers/7444/check-scales?filter=Check (has 145988) and /check-scales/search.
 * NOTE: unlike the old mock, S02 (site tab) uses a SEPARATE record (see detailCheckScaleViewViaSite) —
 * no single real record sits in both a viewable scaler's tab and a loaded site's tab.
 */
export const detailCheckScaleViewListed = {
  id: '145988',
  checkScalerLicenceNo: '7444',
  originalScalerLicenceNo: '7443',
  scaleSiteIdNmbr: '431',
  comment: ' ', // real record's chkScalerCommentTxt is a single space
  speciesRowCount: 1,
  /** Scaler whose Check Scales tab lists it as the PRIMARY ORIGINAL scaler (shows under All/Primary). */
  originalScalerTab: '7443',
  /** Scaler whose Check Scales tab lists it as the PRIMARY CHECK scaler (shows under All/Check). */
  checkScalerTab: '7444',
} as const;

/**
 * A NON-legacy record for S05 — its Edit Record + Delete buttons are ENABLED and all action buttons
 * render. The app disables Edit/Delete only when ckscType === 'LGCS' (View/CheckScale index.tsx), so any
 * non-LGCS record qualifies. Real data (2026-07-15): 146803 is an SFPSCS check scale (non-legacy). Opened
 * by direct nav (S05 asserts button state, not list entry). Verified via /check-scales/search → SFPSCS.
 */
export const detailCheckScaleViewNonLegacyId = '146803';

/**
 * The record S02 opens from the SCALE-SITE Check Scales tab (site 28E). A separate record from
 * detailCheckScaleViewListed because no single real record is in both a viewable scaler's tab and a
 * loaded site's tab. Real data: check scale 145849, site 28E, has species rows. Verified via
 * GET /scale-sites/28E/check-scales (lists 145849) and /check-scales/search (speciesSummary non-empty).
 */
export const detailCheckScaleViewViaSite = {
  id: '145849',
  scaleSiteIdNmbr: '28E',
} as const;

/** An id guaranteed absent from the DB — drives the S06 not-found error path. Not fabricated data: a
 *  provably-missing id is exactly what the not-found scenario needs. */
export const detailCheckScaleMissingId = '99999999';

/** Values S01 edits the seeded record TO (all six distinct from the baseline), + expected read-back. */
export const detailCheckScaleEditValues = {
  checkScaleType: 'SEC', // distinct from the FST baseline (only FST/SEC exist in the loaded data)
  followedGoodPractices: 'No',
  originalWithinStandard: 'Yes',
  comment: 'e2e detail update - edited',
  originalNetValue: '222.75',
  checkNetValue: '211.50',
  expected: {
    checkScaleTypeCode: 'SEC',
    followedGoodPracticeInd: 'N',
    originalWithinStandardInd: 'Y',
    chkScalerCommentTxt: 'e2e detail update - edited',
    originalScaleNetValue: 222.75,
    checkScaleNetValue: 211.5,
  },
} as const;
