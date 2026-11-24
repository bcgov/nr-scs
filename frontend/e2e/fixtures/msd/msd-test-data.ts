import { daysAgo, daysAhead } from '../common/dates';

/**
 * MSD (Mark Site Designation) create — DB-grounded known values; re-grounded 2026-07-21 for the new extract.
 *
 * The create happy path (UC-MSD-001 S01/S02) needs a mark that satisfies BOTH the mark-holder existence
 * view (Gate B) AND HAULING_AUTHORITY membership (Gate A, insert FK HMKA_HAA_FK). No real extract mark
 * does out of the box, but it is bridged by a MINIMAL one-row seed:
 * `scs-real-test-data-patches/msd/msd-create-mark.sql` inserts a single forest_file_client link row (reusing an
 * existing client) so the holder view's arm-4 resolves mark ES20R4 (already in HAULING_AUTHORITY). See
 * `creatableTimberMark` below. Re-verify on any DB re-extract (real data is non-deterministic).
 */

/**
 * A timber mark provably ABSENT from the mark-holder view — the backend returns HTTP 404
 * `No mark holder found for timber mark {mark}` for it, on BOTH the lookup GET and the create POST.
 * Confirmed 2026-07-20: GET /api/mark-site-designations?timberMark=ZZZQ999 -> 404;
 * POST /api/mark-site-designations {timberMark:'ZZZQ999',…} -> 404 (same message).
 * Syntactically valid (<=20 chars) so it passes the client "required" check and reaches the server.
 */
export const absentTimberMark = 'ZZZQ999';

/** The exact re-grounded not-found message (replaces legacy ERR-002 "A Timber Mark could not be found for {0}."). */
export const markNotFoundMessage = (mark: string) => `No mark holder found for timber mark ${mark}`;

/**
 * A Reg / Dist (org unit) value the DistrictSelect actually offers. The <Select id="district"> option
 * value is the org-unit number as a string; 1831 = "DRM - Rocky Mountain Natural Resource District".
 * Confirmed present in ORG_UNIT and in GET /api/region-district-lov (codes 1826/1831/18/1828/1829/1832).
 */
export const regDistOrgUnitNo = '1831';

/**
 * A scale-site id provably ABSENT so the "Site # not found" client check fires. Max field length is 8,
 * so 8 nines (not 9). Confirmed 2026-07-20: GET /api/scale-sites/search?scaleSiteIdNmbr=99999999 -> [].
 */
export const absentScaleSiteId = '99999999';

/**
 * A valid, minimal set of MSD basics used to REACH the "Add Conditions" advanced section or the Save
 * POST without depending on a creatable mark. `timberMark` is the absent mark on purpose: "Add
 * Conditions" validates only field presence + date order (no existence check), so a nonexistent mark
 * still reveals the advanced section; and driving Save with it exercises the server-reject 404 path.
 * Dates are today-relative (never hardcoded): effective yesterday, expiry ~a year out (order valid).
 */
export const validBasics = () => ({
  timberMark: absentTimberMark,
  effectiveDate: daysAgo(1),
  expiryDate: daysAhead(365),
  regDist: regDistOrgUnitNo,
  districtWide: 'Y' as '' | 'Y' | 'N',
  estVolume: '',
  estTruckLoads: '',
});

/** Effective/expiry pair that violates the date-order rule (expiry before effective) for S05. */
export const expiryBeforeEffective = () => ({ effectiveDate: daysAgo(1), expiryDate: daysAgo(30) });

/**
 * A real species code the SCALE_SPECIES_CODE LOV offers, used to reach the species content-percent
 * guards (content-required / content-integer) — those need a species SELECTED first. 'AL' = Alder.
 * Confirmed 2026-07-22: GET /api/static-lov?tableKey=SCALE_SPECIES_CODE includes {code:'AL',…}.
 * (The "duplicate species" + "invalid species" guards are UI-unreachable — the Species <Select> filters
 * out already-added codes and only offers valid ones — so they are defensive-only, not asserted here.)
 */
export const validSpeciesCode = 'AL';

// --- Happy-path create (S01/S02) — requires the msd-create-mark.sql seed applied -----------------

/**
 * A timber mark that is CREATABLE — satisfies both the mark-holder view (Gate B) and HAULING_AUTHORITY
 * membership (Gate A, insert FK HMKA_HAA_FK). No real extract mark does out of the box; 'ES20R4' (a real
 * blanket_road_mark already in HAULING_AUTHORITY, file A18674 in prov_forest_use) is made creatable by
 * `scs-real-test-data-patches/msd/msd-create-mark.sql` (apply via `scripts/apply-patches.sh`), which inserts ONE forest_file_client link row
 * (reusing existing client 00000001) so the holder view's arm-4 resolves ES20R4 (validated live → create
 * HTTP 201). Re-grounded 2026-07-21 (was AF904 — its holder chain is gone from this extract). If S01/S02
 * fail with 404 "No mark holder found…", that seed has not been (re)applied to this container.
 */
export const creatableTimberMark = 'ES20R4';

/**
 * The mark-holder fields the create screen's "Update Timber Mark" lookup populates for the creatable mark
 * ES20R4 (disabled #mark-holder-name / #mark-status / #mark-holder-client / #mark-holder-loc). Positive
 * counterpart to the not-found lookup (UC-MSD-001 Divergence #1). Ground-truthed 2026-08-04:
 *   curl 'http://localhost:8080/api/mark-site-designations?timberMark=ES20R4'
 *     -> {"timberMark":"ES20R4","markHolderClient":"00000001","markHolderLoc":"00",
 *         "markHolderName":"MANAGEMENT ABEYANCE","markStatus":"HI"}
 * Depends on the msd-create-mark.sql seed (same seed that makes ES20R4 creatable). RE-VERIFY on re-extract.
 */
export const creatableMarkHolder = {
  name: 'MANAGEMENT ABEYANCE',
  status: 'HI',
  client: '00000001',
  loc: '00',
} as const;

/** A second real SCALE_SPECIES_CODE (Balsam) for the multi-row species flow. AL (Alder) is validSpeciesCode. */
export const secondSpeciesCode = 'BA';
export const speciesLabelByCode: Record<string, string> = { AL: 'Alder', BA: 'Balsam' };

/**
 * A scale site that is both SEARCHABLE (so the create form's "Add" can find it — the search view
 * SCS_SCALE_SITE_SEARCH_VW is otherwise empty) and CREATABLE (real scale_site row). Site '520'
 * (TEMBEC - CANAL FLATS, district 1831) is unblocked by step 4 of msd-create-mark.sql (ORG_UNIT 1904).
 * Confirmed 2026-07-20: GET /api/scale-sites/search?scaleSiteIdNmbr=520 -> the site; create with it -> 201.
 */
export const creatableScaleSiteId = '520';

/**
 * Pool of searchable + creatable scale sites for S02. There is a DB UNIQUE key on hauling_mark_site
 * (timber mark + scale site), so two MSD creates on the SAME (ES20R4, site) collide with
 * "Database Exception: A record already exists with the same unique key" — a real parallel-safety flake
 * seen under --repeat-each. Since ES20R4 is the only creatable mark, each concurrent worker instead takes
 * a DISTINCT site (by parallelIndex) so no two overlapping runs share the (mark, site) key. All 12 are
 * district-1831 sites made searchable by the ORG_UNIT 1904 seed and are real scale_site rows.
 * Sequential repeats on one worker reuse a site safely (each test cleans up before the next starts).
 */
export const creatableScaleSitePool = [
  '520', '525', '540', '561', '503', '51A', '51D', '51K', '51X', '580', '595', '5VE',
];

/** Pick a scale site for the given worker slot (0-based), wrapping if there are more workers than sites. */
export const pickScaleSite = (parallelIndex: number): string =>
  creatableScaleSitePool[parallelIndex % creatableScaleSitePool.length];

/** Valid, creatable happy-path basics for the given District Wide indicator (ES20R4 + today-relative dates). */
export const happyBasics = (districtWide: 'Y' | 'N') => ({
  timberMark: creatableTimberMark,
  effectiveDate: daysAgo(1),
  expiryDate: daysAhead(365),
  regDist: regDistOrgUnitNo,
  districtWide,
  estVolume: '',
  estTruckLoads: '',
});

// --- Scale Site MSD tab (UC-MSD-005) -------------------------------------------------------------
//
// The Scale Site view's "MSD" tab (route /scale-sites/view/{id}?tab=msd) lists the timber marks
// designated to a site via GET /api/scale-sites/{id}/mark-site-designations → view SCS_MSD_VW =
//   (district_wide='N' marks joined through hauling_mark_site to the site)
//   UNION (district_wide='Y' marks expanded to EVERY site in the same org_unit_no).

/**
 * A real, STABLE (non-pool → no test mutates it) scale site whose MSD tab lists site-specific marks.
 * Site 28E shows F / FD2100 / GE5412 (owner 00001227), all district_wide='N' hauling_mark_site rows.
 * Confirmed 2026-07-22: GET /api/scale-sites/28E/mark-site-designations includes GE5412; summary → 200.
 */
export const scaleSiteWithMarks = '28E';
/** A timber mark the 28E MSD tab renders as a link (used for the render + link-navigation slices). */
export const scaleSiteWithMarksTimberMark = 'GE5412';

/**
 * A real, viewable scale site whose MSD tab is EMPTY. Per SCS_MSD_VW a site is tab-empty iff it has no
 * district_wide='N' mark AND its org_unit has no district_wide='Y' mark. Site 201 (org_unit 1823,
 * "CANADIAN FOREST PROD.") is one of 93 such sites; org_unit ≠ 1831 so it stays empty even while
 * UC-MSD-001 S01's transient district-wide create (org_unit 1831) is live under parallel load.
 * Confirmed 2026-07-22: GET /api/scale-sites/201/mark-site-designations → []; summary → 200.
 * Query: SELECT scale_site_id_nmbr FROM the.scale_site WHERE scale_site_id_nmbr NOT IN
 *        (SELECT scale_site_id_nmbr FROM the.scs_msd_vw) AND org_unit_no <> 1831.
 */
export const emptyMsdTabScaleSite = '201';

// --- Update (UC-MSD-002) -------------------------------------------------------------------------

/**
 * The full CREATE request body used to API-SEED a record that UC-MSD-002 scenarios then edit. Mirrors
 * the shape the create page posts (services/markSiteDesignation.service MarkSiteDesignationCreateRequest);
 * ES20R4 + today-relative dates + Reg/Dist 1831, so it satisfies the two-gate create rule (seed applied).
 * Pass scaleSites for a District Wide=N seed (each must be a searchable+creatable site — see the pool).
 */
export const buildMsdCreateBody = (
  districtWide: 'Y' | 'N',
  scaleSites: string[] = [],
) => ({
  timberMark: creatableTimberMark,
  effectiveDate: daysAgo(1),
  expiryDate: daysAhead(365),
  orgUnitNo: Number(regDistOrgUnitNo),
  districtWideInd: districtWide,
  scaleSites,
});

/**
 * A discovered REAL Mark Site Designation that already has an issued letter (letterExists=true), used
 * READ-ONLY by UC-MSD-002 S04 to assert the restricted edit mode (only Expiry editable; all other
 * fields disabled; "Letter issued" banner). No save => no mutation => parallel-safe, no cleanup.
 *
 * Discovered 2026-07-20 (real extract, non-deterministic — RE-VERIFY on re-extract):
 *   SELECT DISTINCT hauling_mark_authorization_id FROM hauling_mark_auth_letter ORDER BY 1;  -- 74 rows
 *   GET /api/mark-site-designations/1390 -> {letterExists:true, timberMark:'40751', districtWideInd:'N',
 *     effectiveDate:'2008-02-02', expiryDate:'2010-08-18'}  (loads on the edit page without error).
 * If S04 fails because 1390 no longer resolves or letterExists=false, pick another id from the query above.
 */
export const letterMarkSiteDesignationId = '1390';

/** A value provably absent so "opening a non-existent MSD to edit" (ERR-024 re-grounded) shows an error. */
export const absentAuthorizationId = '99999999';

/** New free-text values the happy-path update (S01) writes, then reads back — literals are fine (not dates). */
export const updatedGeographicLocation = 'E2E UPDATED LOCATION';
export const updatedEstVolume = '4242';

// --- View (UC-MSD-003) ---------------------------------------------------------------------------
//
// The View screen is READ-ONLY (route /mark-site-designations/view?haulingMarkAuthorizationId={id},
// GET /api/mark-site-designations/{id}). View tests therefore need no seed and no cleanup — they open
// DISCOVERED REAL records read-only, which is parallel-safe by construction (no test mutates them; the
// MSD create/update flows only ever touch ES20R4-based records they own). Re-verify on any DB re-extract
// (real data is non-deterministic).

/**
 * A discovered REAL, letterless MSD that is "rich" — it has a Scale Site, a Species Content row, AND
 * Conditions — so a single record exercises every section of the read-only view (UC-MSD-003 S01).
 * `letterExists=false`, so the letter button reads "Create Letter".
 *
 * Discovered 2026-07-21 (real extract; RE-VERIFY on re-extract — this is the ONLY letterless MSD in the
 * current extract with all three child collections populated):
 *   -- DB: sites=1, species=1, conditions=6, no hauling_mark_auth_letter row
 *   SELECT hma.hauling_mark_authorization_id FROM hauling_mark_authorization hma
 *    WHERE EXISTS(SELECT 1 FROM hauling_mark_site s        WHERE s.hauling_mark_authorization_id=hma.hauling_mark_authorization_id)
 *      AND EXISTS(SELECT 1 FROM species_content sc         WHERE sc.hauling_mark_authorization_id=hma.hauling_mark_authorization_id)
 *      AND EXISTS(SELECT 1 FROM hauling_mark_site_condition c WHERE c.hauling_mark_authorization_id=hma.hauling_mark_authorization_id)
 *      AND NOT EXISTS(SELECT 1 FROM hauling_mark_auth_letter l WHERE l.hauling_mark_authorization_id=hma.hauling_mark_authorization_id);
 *   -- API: GET /api/mark-site-designations/2681 -> the pinned values below (letterExists:false).
 * If S01 fails to find these values, re-run the query above and re-pin (id + expected).
 */
export const richViewMsdId = '2681';

/**
 * The exact values GET /api/mark-site-designations/2681 returns, as the read-only view renders them.
 * Dates are the raw ISO strings the API emits (the view prints them verbatim — no locale formatting),
 * so these are deterministic literals, NOT today-relative: they describe an existing historical record,
 * not a value under test. Null header fields render as an empty string.
 */
export const richViewExpected = {
  msdNumber: '2681',
  timberMark: '23/159',
  geographicLocation: 'castlegar',
  population: '5021',
  effectiveDate: '2009-04-01',
  expiryDate: '2014-04-01',
  // one Scale Site row (plain text — the new app does NOT hyperlink Site # — see defects.md Divergence #2)
  scaleSite: { idNmbr: '561', name: 'SLOCAN FOREST PRODUCTS' },
  // one Species Content row; Content renders as "N%". Species code SP is mapped to its label via the
  // SCALE_SPECIES_CODE LOV, so assert the deterministic Content cell rather than the (LOV-dependent) label.
  speciesContentPercent: '100%',
  // first Condition row (6 total); Mandatory? renders Y -> "Yes".
  condition: { number: '185', title: 'DIRECT TRANSPORTATION', mandatory: 'Yes' },
} as const;

// UC-MSD-003 S03 (letterExists=true -> "View Letter") reuses `letterMarkSiteDesignationId` (1390) above.
// UC-MSD-003 S06 (not-found) reuses `absentAuthorizationId` (99999999) above; GET returns HTTP 404
// {code:"NOT_FOUND", message:"No mark site designation found with id 99999999"} — confirmed 2026-07-21.
