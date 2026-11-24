/**
 * UC-QRY-007 (Search Risk Assessments) — SCALE SITE subject. DB-grounded known values, discovered
 * 2026-08-11 against the real extract (container real-data-seeded-scs-db, :1525) via the app's own read
 * path `GET /api/scale-site-risk-assessments/search` (SP-backed). This is the scale-site twin of
 * fixtures/rsk/scaler-risk-assessment-test-data.ts (a different page/branch/endpoint). The parameter search
 * is READ-ONLY, so these are pinned by real id/value and shared freely across parallel tests — no mutation,
 * no cleanup. Real data is non-deterministic across re-extracts: RE-VERIFY each query on a DB re-extract.
 *
 * Ground-truth 2026-08-11 (blank search = browse-all returned 9 rows):
 *   ?riskQuestionnaireId=1822      -> 1 row  (the single-result / cell-data anchor below)
 *   ?riskTypeCode=H                -> 9 rows (ALL nine — this extract is uniformly High)
 *   ?siteName=WELDWOOD%25          -> 2 rows (1822, 2327)   ?siteName=WELDWOOD -> []  (exact unless %)
 *   ?riskQuestionnaireId=18%25     -> 6 rows (1822,1844,1846,1848,1850,1861)  ?=18 -> []  (wildcard vs exact)
 *   ?riskQuestionnaireId=18%25&siteName=WELDWOOD%25 -> 1 row (1822)  (multi-criteria intersection anchor)
 *   ?riskQuestionnaireId=18%25&primarySort=21&secondarySort=1 -> [1850,1846,1844,1848,1861,1822]  (sort anchor)
 *   ?orgUnitNo=1619                -> 3 rows (incl. 1861)  (Reg/Dist widget anchor: RWC - South Island NRD)
 *   ?ownerClientNumber=00055821    -> 1 row  (1822)        (Site Owner Client/Loc widget anchor)
 *   ?methodTypes=P                 -> 1 row  (1861)        (Site Type multiselect anchor: Piece Scale)
 *   ?riskQuestionnaireId=99999999  -> []  (the zero-results anchor)
 *
 * EXTRACT SHAPE — this scale-site extract is THIN and important gaps follow from it (all logged in
 * defects.md as data gaps, NOT app defects):
 *   - All 9 assessments are LEVEL = High (`riskTypeCode=H`): `?riskTypeCode=M`/`L` -> [], so there is NO
 *     single-result-by-Level case (the scaler suite's "Level Medium -> 1" arm has no scale-site twin here).
 *   - All 9 are on DISTINCT sites and the largest groundable result set is 9 (< the 10/page slice), so the
 *     client-side pagination scenario the scaler suite runs (Level High -> 14 = 2 pages) is NOT reproducible.
 *   - All 9 are INCOMPLETE (`?completeInd=Y` -> [], `=N` -> 9), so a positive "Complete = Yes" filter has no
 *     data (same gap the scaler suite logged).
 *
 * DRIFT GUARD: every export below is asserted in preflight/anchors.setup.ts (which runs once before the
 * suite) against the live search endpoint — so a reseed that shifts these counts/order or the assessment-1822
 * cell data fails there with a clear re-ground pointer, not as an opaque mid-suite mismatch. The feature
 * files (search.feature / zero-results.feature) repeat these values as Gherkin literals, so on a re-pin keep
 * those literals in sync with the values here (and re-verify against the queries above).
 */

/**
 * A specific Assessment ID matching EXACTLY ONE scale site risk assessment -> the single-result case, and
 * the deterministic row used for the columns + cell-data assertion. Cell values are the app's rendered
 * display (Rating/Max, Responses/Questions, Range are composed client-side in
 * pages/Queries/ScaleSiteRiskAssessments). `siteName` is the trimmed prefix asserted in the cell (the raw
 * extract value has trailing punctuation/whitespace — a substring keeps the assertion stable).
 * Query: GET /api/scale-site-risk-assessments/search?riskQuestionnaireId=1822 -> 1 row.
 */
export const singleResultAssessment = {
  value: '1822',
  expectedCount: 1,
  riskQuestionnaireId: '1822',
  ratingMaxRating: '90 / 141',
  responsesQuestions: '2 / 10',
  level: 'High',
  range: '48-141',
  version: '2',
  scaleSiteIdNmbr: '614',
  siteName: 'WELDWOOD WMS LK DIV',
  district: 'RCB - Cariboo-Chilcotin Natural Resource District',
  ownerClientDisplay: '00055821 / 00',
} as const;

/**
 * A Level (risk type) value matching MORE THAN ONE assessment -> the dropdown-filter / multi-result path.
 * This extract is uniformly High, so `High` returns all 9. The Select's option VALUE is the code (`H`);
 * its visible label is the description (`High`) — the step selects by label. Assessment 1822 is guaranteed
 * in the set and asserted as a link to its view.
 * Query: GET /api/scale-site-risk-assessments/search?riskTypeCode=H -> 9 rows.
 */
export const levelFilter = {
  code: 'H',
  label: 'High',
  expectedCount: 9,
  anAssessmentId: '1822',
} as const;

/**
 * A Scale Site Name wildcard matching MORE THAN ONE assessment -> a text-filter multi-result path AND the
 * larger operand of the multi-criteria intersection below. Site Name matching is EXACT unless a `%` is
 * supplied and is case-sensitive (ground-truth 2026-08-11: `WELDWOOD` -> [], `weldwood%` -> [],
 * `WELDWOOD%` -> 2). Assessment 1822 is guaranteed in the set.
 * Query: GET /api/scale-site-risk-assessments/search?siteName=WELDWOOD%25 -> 2 rows (1822, 2327).
 */
export const siteNameFilter = {
  value: 'WELDWOOD%',
  expectedCount: 2,
  anAssessmentId: '1822',
} as const;

/**
 * MULTI-CRITERIA intersection -> proves the two filters combine (AND) rather than one clobbering the other
 * in the single params object `doSearch` builds (index.tsx:277-297). Assessment ID `18%` alone -> 6 rows;
 * Site Name `WELDWOOD%` alone -> 2 rows; together they narrow to exactly assessment 1822. The intersection
 * is a PROPER subset of BOTH operands (1 < 6 and 1 < 2), so a field-clobber in EITHER direction (one field
 * overwriting the other) returns the wrong count here while still passing every single-criterion arm.
 * Query: GET ...?riskQuestionnaireId=18%25&siteName=WELDWOOD%25 -> 1 row (1822).
 */
export const multiCriteriaIdAndSiteName = {
  assessmentIdValue: '18%',
  siteNameValue: 'WELDWOOD%',
  expectedCount: 1,
  anAssessmentId: '1822',
} as const;

/**
 * WILDCARD / partial matching on Assessment ID. Ground-truth 2026-08-11: matching is EXACT unless the
 * caller supplies a `%` wildcard — a bare `18` returns [] (18 != any id), but `18%` resolves the prefix to
 * the six 18xx assessments. The two values are asserted TOGETHER so the suite proves the wildcard path
 * works AND distinguishes it from an exact match. (Site Name uses the same exact-unless-`%` semantics — see
 * siteNameFilter — so this one anchor documents the rule for every text field.)
 * Query: GET ...?riskQuestionnaireId=18%25 -> 6 rows;  ?riskQuestionnaireId=18 -> [].
 */
export const wildcardAssessmentId = {
  wildcardValue: '18%',
  exactNoMatchValue: '18',
  expectedCount: 6,
  anAssessmentId: '1822',
} as const;

/**
 * SORT ORDER (legacy server-side behaviour, not a UI nicety). Legacy selects a Primary/Secondary Sort and
 * the search passes both to the API using the legacy sort codes; the scale-site page maps its Select labels
 * to those codes (SORT_OPTIONS: 'Assessment ID'->1, 'Site Name'->21, ... — index.tsx:82-90). All 9 rows are
 * High, so sorting by Level cannot reorder; sorting by Site Name CAN. Ground-truth 2026-08-11 on the
 * `18%`-wildcard set (6 rows): Primary=Site Name(21), Secondary=Assessment ID(1) reorders to
 * [1850,1846,1844,1848,1861,1822] — alphabetical by site name (Aspen, Coastland, Nagaard, RICHMOND, SHOAL,
 * WELDWOOD). This differs from the default Assessment-ID order [1822,1844,1846,1848,1850,1861], so it proves
 * the app applies BOTH sort params, not just the default.
 * Query: GET ...?riskQuestionnaireId=18%25&primarySort=21&secondarySort=1 -> [1850,1846,1844,1848,1861,1822].
 */
export const sortBySiteNameThenId = {
  assessmentIdValue: '18%',
  primaryLabel: 'Site Name',
  primaryCode: 21,
  secondaryLabel: 'Assessment ID',
  secondaryCode: 1,
  expectedOrder: ['1850', '1846', '1844', '1848', '1861', '1822'],
} as const;

/**
 * MSG-001 — the legacy screen renders "Choose your search parameters." (message key `search.choose.params`)
 * on page load. The new app renders the SAME text as the filter accordion heading (index.tsx:349). A
 * page-load anchor, not a search result.
 */
export const searchParamsHeading = 'Choose your search parameters.';

/**
 * Reg / Dist filter driven through the `DistrictSelect` WIDGET (`#orgUnitNo`). Same wiring as the scaler
 * twin: option value = region/district code, label = LOV description, `doSearch` sends `Number(orgUnitNo)`
 * (index.tsx:287). "RWC - South Island Natural Resource District" (code 1619) resolves 3 of the 9
 * assessments (a distinct-district subset, so it is NOT exposed to the whole-extract parallel-seed hazard
 * that forces the Level=High arm to a lower-bound — the create/seed suites write to site 520, a different
 * district). Includes anchor 1861 (SHOAL ISLANDS, South Island). Proves the widget commits `orgUnitNo`.
 * Query: GET /api/scale-site-risk-assessments/search?orgUnitNo=1619 -> 3 rows (incl. 1861).
 */
export const districtFilter = {
  label: 'RWC - South Island Natural Resource District',
  orgUnitNo: '1619',
  expectedCount: 3,
  anAssessmentId: '1861',
} as const;

/**
 * Site Owner (Client / Loc) filter driven through the `ClientLocSearch` WIDGET's Client # box
 * (`#ownerClientNumber`). Unlike the scaler page, `doSearch` here sends BOTH `ownerClientNumber` and
 * `ownerClientLocnCode` (index.tsx:290-291); the loc box defaults to blank, so typing just the client
 * number sends `ownerClientNumber` alone. Client 00055821 owns exactly the site-614 assessment 1822. The
 * Client # must be ZERO-PADDED to 8 digits (ground-truth 2026-08-20). NB the picker-MODAL writeback path
 * remains deferred (defects.md Coverage gap #6); this anchor covers the type-in path.
 * Query: GET /api/scale-site-risk-assessments/search?ownerClientNumber=00055821 -> 1 row (1822).
 */
export const ownerClientFilter = {
  ownerClientNumber: '00055821',
  expectedCount: 1,
  anAssessmentId: '1822',
} as const;

/**
 * Site Type filter driven through the `ActiveMultiSelect` WIDGET (`#method-types`, a Carbon
 * FilterableMultiSelect). Items are `{code, description}`; `doSearch` sends `methodTypes` as an ARRAY of the
 * selected items' CODES (index.tsx:288). Of the 9 assessments only one carries a scale-method type —
 * assessment 1861 (site 16G, SHOAL ISLANDS) is "Piece Scale" (code `P`); the other 8 have none — so
 * selecting "Piece Scale" resolves exactly that one row. This is the ONLY widget on either risk page with no
 * plain-Select/text twin, so the multiselect interaction is the sole proof its selection reaches the param.
 * Query: GET /api/scale-site-risk-assessments/search?methodTypes=P -> 1 row (1861).
 */
export const siteTypeFilter = {
  label: 'Piece Scale',
  code: 'P',
  expectedCount: 1,
  anAssessmentId: '1861',
} as const;

/**
 * An Assessment ID matching NO assessment -> zero results (S05).
 * Query: GET /api/scale-site-risk-assessments/search?riskQuestionnaireId=99999999 -> [] (confirmed 2026-08-11).
 */
export const noMatchAssessmentId = '99999999';
