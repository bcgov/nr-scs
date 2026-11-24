/**
 * Known-good test data for the Scale Site Risk Assessment (RSK, legacy UC-RSK-007) flows, re-grounded
 * onto the REAL data in the local Docker Oracle DB (localhost:1525 / DBDOCK_01 / THE). DISCOVERED +
 * verified 2026-08-05 both by querying the DB and by exercising the real create-init / create / update
 * endpoints by hand (create-init -> POST -> GET read-back -> risk-ratings tab -> sqlplus delete).
 * Nothing is fabricated. Re-verify on DB re-extract — real data is non-deterministic.
 *
 * Why these exact values (re-grounding the legacy UC-RSK-007 Gherkin onto the new React app):
 *
 *  - THE RATING-RANGE GATE (the #1 discovery). Every read path for a scale site risk assessment
 *    (create read-back, GET-by-id, search, and the Risk Rating tab) goes through SCS_RISK_SCALE_SITE_VW
 *    -> SCS_RISK_SUMMARY_VW, which INNER JOINs the computed rating into a defined risk range:
 *        RESPS.RISK_RATING BETWEEN SRRVW.RANGE_LOW_VALUE AND SRRVW.RANGE_HIGH_VALUE
 *    where RISK_RATING = the PRODUCT of each section's summed answer weights
 *    (ROUND(exp(sum(ln(section_total))),2)). Template 6 (the active SCSI template) defines ranges
 *    L 18-33, M 34-47, H 48-141 (max 141). So an assessment whose product-rating falls OUTSIDE 18..141
 *    is invisible to EVERY read path: the create's post-insert read-back returns 0 rows -> 404, and
 *    because create is @Transactional the whole insert ROLLS BACK. Answering every question with its
 *    highest-weight option overflows 141 and silently rolls back — this is a DATA/behaviour subtlety,
 *    not a broken site. The answer set below is chosen so the product lands squarely in-range.
 *    (Discovered: `SELECT text FROM all_views WHERE view_name='SCS_RISK_SUMMARY_VW'` +
 *     `SELECT risk_type_code,range_low_value,range_high_value FROM scs_risk_rating_vw
 *      WHERE risk_questionnaire_template_id=6`.)
 *
 *  - SCALE SITE 520 (TEMBEC - CANAL FLATS) — the happy-path create subject. It (a) passes the view's
 *    org_unit (district/region) inner joins, and (b) has NO existing risk assessments, so its Risk
 *    Rating tab starts empty and a freshly-created row is the ONLY row on it. 520 is also the shared
 *    INS/QRY anchor (stable across sessions). Verified: POST create on 520 with the in-range answers
 *    below -> 201, rating 90/141 (High), GET read-back 200, tab shows exactly the new row.
 *    (Discovered: the 9 existing assessments live on other sites; `GET /scale-sites/520/risk-ratings`
 *     -> [] before a create.)
 *
 *  - THE ACTIVE TEMPLATE is id 6, version 2, type SCSI, with 2 sections / 10 questions
 *    (Values (A): q281-284; Likelihood (B): q285-290). create-init returns it for any scale site.
 *    The question/answer ids below are template-6-specific: if the active template changes on a
 *    re-extract, `selectOption` on a missing option id fails LOUD (a clear re-ground signal), and the
 *    anchor query in each block re-derives the replacement.
 *
 * NOTE — there is NO delete/cancel endpoint for scale site risk assessments. Created rows are removed
 * directly at the DB (children RISK_QUESTION_RESPONSE then parent RISK_QUESTIONNAIRE) via
 * steps/rsk/riskAssessmentDbCleanup.ts — the skill's sanctioned no-endpoint fallback.
 */

/** The active SCSI template the create surface binds to (id/version/max are stable within an extract). */
export const RSK_TEMPLATE = {
  templateId: 6,
  versionNo: 2,
  maxRiskRating: 141,
} as const;

/** Happy-path create subject: a real site the read-back view accepts, with an empty Risk Rating tab. */
export const riskHappyPathSite = {
  scaleSiteIdNmbr: '520',
  siteName: 'TEMBEC - CANAL FLATS',
  regionName: 'Kootenay-Boundary Natural Resource Region',
  districtName: 'Rocky Mountain Natural Resource District',
} as const;

/**
 * A distinct real site that NOTHING in this suite creates on, so its Risk Rating tab is reliably empty
 * across the parallel run — used by the back-out/discard scenario (S02) to assert the empty-list state
 * and the no-write path without racing the happy path's creates on site 520. Verified 2026-08-05:
 * `GET /scale-sites/525/risk-ratings` -> [] and create-init returns the 10-question template.
 */
export const riskEmptyTabSite = {
  scaleSiteIdNmbr: '525',
  siteName: 'TEMBEC - ELKO',
} as const;

/**
 * The canonical IN-RANGE answer set: question id -> answer id. These weights sum to 6 (section A) and
 * 15 (section B); their product is 6 x 15 = 90, which lands in the High band (48-141), so the created
 * assessment is visible to every read path. This is a replay of a real accepted assessment's answers
 * (the DB's own row 1822 on site 614, rating 90) — chosen precisely because its rating is known-good.
 * Verified 2026-08-05: POST with these -> 201, riskRating 90, codeDescription "High".
 * (Discovered: `SELECT risk_question_id, risk_valid_answer_id FROM risk_question_response
 *  WHERE risk_questionnaire_id=1822 ORDER BY risk_question_id`.)
 */
export const inRangeAnswers = [
  { questionId: 281, answerId: 403 }, // weight 3
  { questionId: 282, answerId: 407 }, // weight 0
  { questionId: 283, answerId: 411 }, // weight 0
  { questionId: 284, answerId: 414 }, // weight 3  -> section A total = 6
  { questionId: 285, answerId: 435 }, // weight 0
  { questionId: 286, answerId: 437 }, // weight 3
  { questionId: 287, answerId: 440 }, // weight 3
  { questionId: 288, answerId: 443 }, // weight 3
  { questionId: 289, answerId: 445 }, // weight 0
  { questionId: 290, answerId: 447 }, // weight 6  -> section B total = 15 ; 6 * 15 = 90 (High)
] as const;

/** The rating the in-range answer set computes to, asserted on the read-back and the tab row. */
export const expectedRating = {
  riskRating: 90,
  maxRiskRating: 141,
  codeDescription: 'High',
  riskTypeCode: 'H',
  rangeLowValue: 48,
  rangeHighValue: 141,
} as const;

/**
 * The totals the FORM renders client-side, which are deliberately NOT both the same numbers the API
 * returns for the saved record:
 *  - `total` 90 — the product rule, identical to the persisted `expectedRating.riskRating`.
 *  - `maxTotal` 3780 — the PRODUCT of each section's max-weight sum (36 x 105). `computeMaxTotal()`
 *    computes this "like the legacy questionnaire tag" and explicitly does NOT use the view's
 *    `max_risk_rating` (`expectedRating.maxRiskRating` = 141), which is SUM-based and would render
 *    lower than the product total. Two different definitions of "maximum" — see defects.md
 *    "Verified — not a defect". Do not "fix" this to 141.
 * Ground-truthed 2026-08-07: GET /api/scale-sites/520/risk-assessments/create-init (template 6) ->
 * per-section max sums [36, 105] -> product 3780, matching the rendered #max-risk-rating.
 */
export const formDisplayedTotals = {
  total: 90,
  maxTotal: 3780,
} as const;

/**
 * A single-answer change used by the edit happy path (UC-RSK-007-S03): flip q281 from answer 403
 * (weight 3) to 402 (weight 6). Section A total 6 -> 9; product 9 x 15 = 135 — still in the High band
 * (<= 141), so the edited row remains visible to the read-back. (401, weight 9, would give 180 and
 * overflow the range, so it is deliberately NOT used.)
 */
export const editAnswerChange = {
  questionId: 281,
  newAnswerId: 402,
  expectedRating: 135,
} as const;

/** Comments a create/edit scenario types (short, distinct — asserted on read-back). */
export const riskComments = {
  create: 'e2e RSK scale site create',
  edited: 'e2e RSK scale site edit — updated comments',
  seed: 'e2e RSK seeded assessment',
} as const;

/**
 * Carbon's Comments TextArea hard-caps input at this length (maxLength={MAX_COMMENTS_LENGTH}); the
 * legacy "Comments can not be greater than 4000 characters." message is therefore not reachable via
 * the browser (re-ground of ERR-003). UC-RSK-007-S06 asserts the cap holds when over-typing.
 */
export const COMMENTS_MAX_LENGTH = 4000;
