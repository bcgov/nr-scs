import { SEEDED } from '../common/seededValues';

/**
 * Known-good test data for the Scaler Risk Assessment (RSK, legacy UC-RSK-006) create/edit/view flows,
 * re-grounded onto the REAL data in the local Docker Oracle DB (localhost:1525 / DBDOCK_01 / THE).
 * DISCOVERED + verified 2026-08-08 both by querying the DB (via scripts/docker-sqlplus.sh) and by
 * exercising the real create-init / create / update endpoints by hand (create-init -> POST -> GET
 * read-back -> PUT edit -> GET read-back -> sqlplus delete). Nothing is fabricated. Re-verify on a DB
 * re-extract — real data is non-deterministic.
 *
 * This is the SCALER twin of `rsk-test-data.ts` (the scale-site UC-RSK-007 fixture). The scaler subject
 * uses the SCLE template (id 5), a DIFFERENT template than the scale-site SCSI template (id 6), so every
 * question/answer id, the rating ranges, and the in-range answer set below are scaler-specific.
 *
 * Why these exact values (re-grounding the legacy UC-RSK-006 Gherkin onto the new React app):
 *
 *  - THE RATING-RANGE GATE (identical mechanic to scale-site). Every read path for a scaler risk
 *    assessment (create read-back, GET-by-id, search, and the Risk Rating tab) goes through
 *    SCS_RISK_SCALER_VW -> SCS_RISK_SUMMARY_VW, which INNER JOINs the computed rating into a defined risk
 *    range: RESPS.RISK_RATING BETWEEN SRRVW.RANGE_LOW_VALUE AND SRRVW.RANGE_HIGH_VALUE, where
 *    RISK_RATING = the PRODUCT of each section's summed answer weights (ROUND(exp(sum(ln(section_total))),2)).
 *    Template 5 (the active SCLE template) defines ranges L 9-21, M 22-32, H 33-123 (max 123). So an
 *    assessment whose product-rating falls OUTSIDE 9..123 is invisible to EVERY read path: the create's
 *    post-insert read-back returns 0 rows -> 404, and because create is @Transactional the whole insert
 *    ROLLS BACK. The answer set below is chosen so the product lands squarely in-range.
 *    (Discovered: `SELECT risk_type_code,range_low_value,range_high_value FROM scs_risk_rating_vw
 *     WHERE risk_questionnaire_template_id=5`.)
 *
 *  - SCALER 019D — the happy-path create subject. SCS_RISK_SCALER_VW inner-joins the scaler
 *    to forest_client (client_number) and org_unit (org_unit_no); 019D satisfies both AND has NO existing
 *    risk assessments, so its Risk Rating tab starts empty and a freshly-created row is the only row on it.
 *    Verified: POST create on 019D with the in-range answers below -> 201, rating 90/High, GET read-back
 *    200. (Discovered: the empty-tab + joinable candidate query in the header comment of `scaler` below.)
 *
 *  - THE ACTIVE TEMPLATE is id 5, version 2, type SCLE, with 2 sections / 6 questions
 *    (section 71: q241,q242; section 72: q243-q246). create-init returns it for any scaler. The
 *    question/answer ids below are template-5-specific: if the active template changes on a re-extract,
 *    `selectOption` on a missing option id fails LOUD (a clear re-ground signal), and the preflight anchor
 *    (preflight/anchors.setup.ts) re-derives the replacement.
 *
 * NOTE — there is NO delete/cancel endpoint for scaler risk assessments (the legacy "Cancel Assessment"
 * button that deleted a draft has no new-app equivalent; the new app never persists until Save). Created
 * rows are removed directly at the DB (children RISK_QUESTION_RESPONSE then parent RISK_QUESTIONNAIRE) via
 * steps/rsk/riskAssessmentDbCleanup.ts — the skill's sanctioned no-endpoint fallback.
 */

/** The active SCLE template the scaler create surface binds to. Only the id is consumed (the preflight
 *  anchor asserts create-init returns it); the version/max are documented in the header prose above. */
export const SCALER_RSK_TEMPLATE = {
  templateId: 5,
} as const;

/**
 * Happy-path create subject: a real scaler the read-back view accepts, with an empty Risk Rating tab.
 * Discovered 2026-08-08 with:
 *   SELECT sclr.scaler_licence_no, sclr.client_number, sclr.org_unit_no, ou.org_unit_name
 *   FROM scaler sclr JOIN forest_client fc ON fc.client_number=sclr.client_number
 *                    JOIN org_unit ou ON ou.org_unit_no=sclr.org_unit_no
 *   WHERE sclr.scaler_licence_no NOT IN (SELECT scaler_licence_no FROM risk_questionnaire
 *                                        WHERE scaler_licence_no IS NOT NULL);
 * Header values (region/district) come from the create-init response for 019D.
 *
 * `clientName` is "LAST, FIRST" — the shape BOTH header paths return, asserted exactly (toHaveValue)
 * on the create surface and the read-only view. The two paths compose it in different places, so
 * pinning one value is what keeps them honest: the view/edit/search paths read
 * SCS_RISK_SCALER_VW.CLIENT_NAME, which the view itself composes (`fc.client_name || ', ' ||
 * fc.legal_first_name` for an individual — 019D is client_type_code 'I'), while create-init reads the
 * two raw tombstone columns and composes them in ScalerRiskAssessmentService. Create-init used to
 * return the surname alone; that was the QA-reported create-page defect (see
 * features/rsk/uc-rsk-006-complete/defects.md, third divergence — fixed 2026-09-17).
 */
export const scalerHappyPath = {
  scalerLicenceNo: '019D',
  clientName: SEEDED.riskCompleteScalerClientName,
  regionName: 'Cariboo Natural Resource Region',
  districtName: 'Cariboo-Chilcotin Natural Resource District',
} as const;

/**
 * A distinct real scaler that NOTHING in this suite creates on, so its Risk Rating tab is reliably empty
 * across the parallel run — used by the cancel/back-out scenario (UC-RSK-006-S04) to assert the empty-list
 * state and the no-write path without racing the happy path's creates on 019D. Also empty + joinable per
 * the same discovery query. Verified 2026-08-08: create-init returns the 6-question template for 044E.
 */
export const scalerEmptyTab = {
  scalerLicenceNo: '044E',
} as const;

/**
 * The canonical IN-RANGE answer set: question id -> answer id (template 5 / SCLE). Section 71 weights sum
 * to 6 (q241=3 + q242=3); section 72 weights sum to 15 (q243=6 + q244=3 + q245=3 + q246=3); their product
 * is 6 x 15 = 90, which lands in the High band (33-123), so the created assessment is visible to every read
 * path. Verified 2026-08-08: POST with these -> 201, riskRating 90, codeDescription "High".
 * (Discovered weights: `SELECT rq.risk_question_id, rva.risk_valid_answer_id, rva.answer_weighting
 *  FROM risk_question rq JOIN risk_valid_answer rva ON rva.risk_question_id=rq.risk_question_id
 *  WHERE rq.risk_template_section_id IN (71,72)`.)
 */
export const scalerInRangeAnswers = [
  { questionId: 241, answerId: 303 }, // weight 3
  { questionId: 242, answerId: 306 }, // weight 3  -> section 71 total = 6
  { questionId: 243, answerId: 326 }, // weight 6
  { questionId: 244, answerId: 330 }, // weight 3
  { questionId: 245, answerId: 333 }, // weight 3
  { questionId: 246, answerId: 342 }, // weight 3  -> section 72 total = 15 ; 6 * 15 = 90 (High)
] as const;

/** The rating the in-range answer set computes to, asserted on the read-back and the tab row. (The risk
 *  type code + range bounds that classify 90 as High are documented in the header prose above.) */
export const scalerExpectedRating = {
  riskRating: 90,
  codeDescription: 'High',
} as const;

/**
 * The totals the FORM renders client-side, which are deliberately NOT both the numbers the API returns for
 * the saved record:
 *  - `total` 90 — the product rule, identical to the persisted `scalerExpectedRating.riskRating`.
 *  - `maxTotal` 1890 — the PRODUCT of each section's max-weight sum. `computeMaxTotal()`
 *    (riskAssessmentQuestionnaireUtils.ts) computes this "like the legacy questionnaire tag" and explicitly
 *    does NOT use the view's `max_risk_rating` (123), which is SUM-based. Two different definitions of
 *    "maximum" — do not "fix" this to 123.
 * Ground-truthed 2026-08-08: template 5 per-section max sums = section 71 (max 9 + max 9 = 18) and
 * section 72 (max 60 + 9 + 9 + 27 = 105) -> product 18 x 105 = 1890.
 */
export const scalerFormDisplayedTotals = {
  total: 90,
  maxTotal: 1890,
} as const;

/**
 * A single-answer change used by the edit happy path (UC-RSK-006-S05): flip q243 from answer 326 (weight
 * 6) to 325 (weight 9). Section 72 total 15 -> 18; product 6 x 18 = 108 — still in the High band (<= 123),
 * so the edited row remains visible to the read-back. Verified 2026-08-08 via GET read-back: rating 108.
 * (NB q241/q242 cannot be raised without overflowing 123 at this baseline — section 71 x 15 exceeds 123
 * for any q241 answer above weight 3 — so the edit deliberately changes a section-72 answer.)
 */
export const scalerEditAnswerChange = {
  questionId: 243,
  newAnswerId: 325,
  expectedRating: 108,
} as const;

/** The comment the API seed writes. The create/edit UI comments are typed as literals in the feature
 *  files (a Gherkin step arg, so they can't import this) and asserted on read-back via `world.expected`;
 *  only the seed value — which has no feature literal — is pinned here. */
export const scalerRiskComments = {
  seed: 'e2e RSK seeded scaler assessment',
} as const;

/**
 * Carbon's Comments TextArea hard-caps input at this length (maxLength={MAX_COMMENTS_LENGTH}); the legacy
 * "Comments can not be greater than 4000 characters." message (ERR-003) is therefore not reachable via the
 * browser. UC-RSK-006-S03 asserts the cap holds when over-typing.
 */
export const SCALER_COMMENTS_MAX_LENGTH = 4000;
