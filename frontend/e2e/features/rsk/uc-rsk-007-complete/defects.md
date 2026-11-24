# Defects — UC-RSK-007 Complete Scale Site Risk Assessment

> How this log works (registers, statuses, glossary): [defects-guide.md](../../../defects-guide.md).
> BA/QA own triage and Jira; this file is the queue that feeds it. Ids/values cite
> `fixtures/rsk/rsk-test-data.ts` — treat a DB re-extract as a sweep of this file for stale values.

## Divergences

- **Editing an assessment and clearing every answer silently deleted the answers (data loss)** *(FIXED)*
  - **What's wrong:** On the legacy screen, saving an edited risk assessment with no questions answered was
    rejected with "At least one question must be answered in order to save the assessment." The new app
    enforced no such rule on edit: clearing every answer and saving deleted all the responses. On this
    scale-site subject the delete **committed** — afterwards the assessment could not be opened, searched, or
    seen on the site's Risk Rating tab, though the header row still existed in the database.
  - **Expected vs actual:** Expected — the save is blocked with the "at least one question" error and the
    assessment is left unchanged. Actual (before the fix) — the save committed (HTTP 200), all responses were
    deleted, and the record was orphaned (later reads returned HTTP 404).
  - **How we caught it:** Seed an assessment via `POST /api/scale-sites/520/risk-assessments`, then
    `PUT /api/scale-site-risk-assessments/{id}` with every `responses[].answerId` set to null →
    **HTTP 200**; `SELECT COUNT(*) FROM risk_question_response WHERE risk_questionnaire_id={id}` → **0**;
    `SELECT COUNT(*) FROM risk_questionnaire WHERE risk_questionnaire_id={id}` → **1** (still there);
    `GET /api/scale-site-risk-assessments/{id}` → **HTTP 404**. Reproduced 2026-08-05.
  - **Subject difference worth noting:** the scaler twin (UC-RSK-006 Divergence #1), re-tested by a developer
    2026-09-23, did **not** commit the delete — there the post-save re-read of `SCS_RISK_SCALER_VW` returned
    no row, threw not-found, and the `@Transactional` method rolled back, so the scaler answers survived and
    the user just saw a 404. The likely cause of the split is the two DB views differing on what they return
    for an answerless assessment (this scale-site view apparently still returned a row post-save, letting the
    transaction commit = true data loss). Either way the underlying gap — no edit-time "at least one answer"
    check — was the same, and the fix removes both outcomes.
  - **Why (technical):** The shared form gated "all answered" only in create mode
    (`components/Form/RiskAssessment/index.tsx`); edit sent the PUT with no minimum-response check, and
    `RiskQuestionnaireService.save` reconciled responses without a `requireAtLeastOne`, so it deleted every
    response.
  - **Fix (2026-09-23):** the legacy ERR-002 "at least one answer" rule was enforced on the edit path both
    client-side (`RiskAssessment/index.tsx` `onSave`, edit branch) and server-side
    (`RiskQuestionnaireService.save`), thrown as a 400 **before** any response is deleted. Because the guard
    runs before `persistResponses`, no answers are ever deleted, closing the data-loss path on this subject
    and the misleading-404 path on the scaler twin alike.
  - **Superseded (2026-10-01):** the "at least one answer" rule proved insufficient — a sparse-but-non-empty
    edit still rated below the lowest band, 404'd on re-save, and would have vanished from the list (see the
    follow-on divergence below). The edit rule is now **"all questions must be answered"** (edit mirrors
    create). So this exact all-cleared case is still rejected, but with the message *"All questions must be
    answered…"* and via `requireAllAnswered`. Guarded by `update_notAllAnswered_throwsBadRequest` and the
    Edit browser test `rejects a save that leaves any question unanswered, keeping the user on the form`.
  - **Action:** BA/QA to attach the Jira key for this fix and link the scaler Divergence #1 ticket.
  - **Register / classification:** Divergence · confirmed-defect
  - **Severity/Priority:** sev2 / p1
  - **UC / Gherkin slice:** UC-RSK-007-S05 — UC-RSK-007-S05
  - **Environment / build:** fix on nr-scs branch `bugfix/risk-assess-edit` · local seeded Docker DB (`real-data-seeded-scs-db`, :1525)
  - **Data fixture:** `fixtures/rsk/rsk-test-data.ts` — seed on site `520` with `inRangeAnswers`, then clear all
  - **Status:** CLOSED (fixed) · **Found:** 2026-08-05 · **Fixed:** 2026-09-23
  - **Test:** `features/rsk/uc-rsk-007-complete/validation.feature` (An incomplete edit (any question
    unanswered) is rejected, `@S05`) — a normal green regression guard. Since the 2026-10-01 supersession it
    asserts the "All questions must be answered…" message (clearing every answer is the extreme of "not all
    answered") and that the user stays on the edit form.

- **A sparse edit 404'd on re-save, and would have vanished from the list — edit now mirrors create** *(FIXED)*
  - **What's wrong:** A follow-on to Divergence #1 that its fix did not cover. After #327 blocked an
    all-cleared save with ERR-002 ("at least one answer"), a user who then entered **one** answer and saved
    got `HTTP 404 "Scale site risk assessment not found for id: {id}"`, even though the assessment and all
    its responses were still in the database. More broadly, any edit whose saved answers rate below the
    lowest risk band triggered it.
  - **Expected vs actual:** Expected — a save either succeeds and the record stays visible, or is rejected
    with a clear message. Actual (before the fix) — HTTP 404 and the valid save **rolled back**, so the user
    could not re-save; and had the save been allowed, the record would have rated below the band and
    silently dropped out of the Risk Rating tab and every search.
  - **How we caught it:** Live repro on the seeded DB against scale-site assessment `1822` (site `614`,
    template `6`, fully answered): `PUT /api/scale-site-risk-assessments/1822` with one answerId set and the
    other nine null → **HTTP 404**; `SELECT COUNT(*) FROM risk_question_response WHERE
    risk_questionnaire_id=1822` → **10** (untouched — the `@Transactional` method rolled back). Sweeping the
    answered count showed a clean break: **≥6 → HTTP 200, ≤5 → HTTP 404** — and the 200s committed a record
    that no longer appeared in the banded view. Reproduced 2026-10-01.
  - **Why (technical):** `updateScaleSiteRiskAssessment` re-reads the header **after** the save to refresh
    the DB-derived Risk Level, via `SCS_RISK_SCALE_SITE_VW` → `SCS_RISK_SUMMARY_VW`, which inner-joins the
    bands table `SCS_RISK_RATING_VW` on `RESPS.RISK_RATING BETWEEN SRRVW.RANGE_LOW_VALUE AND
    SRRVW.RANGE_HIGH_VALUE`. The rating is the **product of section weight-sums**, so dropping answers pushes
    it below the lowest band (18 for this template); no band matches, the whole row drops out, and the
    service read the empty result as `ResourceNotFoundException` → 404 + rollback. The root gap: the edit
    rule ("at least one answer") allowed saves the banded view cannot represent — "savable" and "viewable"
    used different thresholds.
  - **Decision & fix (2026-10-01):** **edit now mirrors create — all questions must be answered.** This
    supersedes the ERR-002 "at least one answer" rule #327 introduced. A fully answered assessment always
    rates **at or above the floor** (its minimum product is well above the lowest band), so it can never drop
    **below** the lowest band — which closes this low-end vanish. Enforced client-side
    (`RiskAssessment/index.tsx` `onSave`, edit branch → `allQuestionsAnswered`, the same guard create uses)
    and server-side (`RiskQuestionnaireService.save` → `requireAllAnswered`, thrown as a 400 before any
    write). Message: *"All questions must be answered in order to save the assessment."* Same change on the
    scaler twin (UC-RSK-006). Still covers #327's data-safety (all-cleared is a subset of "not all answered").
  - **Scope note — does NOT close the HIGH end (see open defect below):** "all answered" ties *savable* to
    *not-below-band*, **not** to *viewable*. The view rates by the **product** of section weight-sums while
    the bands are sized to the **sum** of max weights, so a fully answered **high-weight** assessment rates
    **above** the top band and is still invisible — the post-save re-read still 404s. So the re-read's null is
    **not** proof of a genuinely-missing record. Verified on the seeded DB: of 79 fully-answered template-6
    rows, **72 rate 180–2304 (top band 141)**; the scaler twin has 32 of 53 above its top band 123. That
    overflow is a pre-existing DB-view defect, out of scope here (immutable Oracle view).
  - **Alternatives considered:** (a) allow the sparse save but blank the Risk Level — rejected: the record
    still vanished from the banded list/searches, which the client confirmed is never intended; (b) widen
    the read path to surface below-band records as "unrated" — rejected as a large, risky change around the
    immutable legacy view. "All answered" was the client's decision (2026-10-01).
  - **Action:** BA/QA to attach the Jira key and link Divergence #1 and the scaler twin ticket.
  - **Register / classification:** Divergence · confirmed-defect
  - **Severity/Priority:** sev2 / p1
  - **UC / Gherkin slice:** UC-RSK-007-S03 (edit) / S05 (edit answer-completeness rule)
  - **Environment / build:** fix on nr-scs branch `bugfix/SSRA-save` · local seeded Docker DB
    (`real-data-seeded-scs-db`, :1525)
  - **Data fixture:** live repro on scale-site assessment `1822` (site `614`); restored to its original 10
    responses afterward.
  - **Status:** CLOSED (fixed) · **Found:** 2026-10-01 · **Fixed:** 2026-10-01
  - **Test:** `ScaleSiteRiskAssessmentServiceTest` / `ScalerRiskAssessmentServiceTest`
    (`update_notAllAnswered_throwsBadRequest`) and the scale-site/scaler Edit browser tests (`rejects a save
    that leaves any question unanswered, keeping the user on the form`); the `@S05` scenario in
    `validation.feature` now asserts the all-answered rule.

- **A newly created assessment does not appear on the Risk Rating tab until the page is reloaded**
  - **What's wrong:** After you create a risk assessment and the app returns you to the site's Risk Rating
    tab, the new assessment is not shown in the list. It has been saved correctly — it just isn't displayed
    until the tab is reloaded or revisited fresh.
  - **Expected vs actual:** Expected (legacy) — the newly saved assessment appears in the assessments table
    with its computed rating. Actual — the table shows the list as it was when the tab first loaded; the
    just-created row is missing until a hard refresh.
  - **How we caught it:** UI create of a new assessment on site 520 → the app navigates to
    `/scale-sites/view/520?tab=risk-rating`; the created id (e.g. 2768) is confirmed persisted by
    `GET /api/scale-site-risk-assessments/2768` → **HTTP 200** (rating 90), yet the rendered table lists
    only the pre-existing rows, not 2768. Captured in the Playwright page snapshot 2026-08-05.
  - **Why (technical, optional):** The Risk Rating tab's TanStack Query is not refetched/invalidated after a
    create (the app's global `queryClientConfig` sets `refetchOnMount: false` — a documented,
    by-design caching decision), and `RiskAssessmentForm.onSave` navigates without invalidating the
    ratings query. So this stems from a deliberate global caching decision, not an RSK-specific bug.
  - **Action:** BA/QA to raise a Jira ticket (confirm whether create should invalidate the ratings list, or
    whether reload-to-refresh is acceptable given the F8 design decision).
  - **Register / classification:** Divergence · suspected-intentional-change
  - **Severity/Priority:** sev3 / p1
  - **UC / Gherkin slice:** UC-RSK-007-S01 — UC-RSK-007-S01
  - **Environment / build:** nr-scs `151d4cb` · local seeded Docker DB (:1525)
  - **Data fixture:** `fixtures/rsk/rsk-test-data.ts` — create on site `520` with `inRangeAnswers`
  - **Status:** OPEN · **Found:** 2026-08-05
  - **Test:** none (log-only — a suspected-intentional change is not asserted as a failing test). The tab's
    list rendering is covered on a FRESH mount by `features/rsk/uc-rsk-007-complete/create.feature`
    (The Risk Rating tab lists a site's assessments, `@S01 @p1`).

## Bug / Regression

- **A fully answered HIGH-risk scale-site assessment is invisible to every read path — create/edit 404 (and create rolls back)** *(OPEN — pre-existing, not introduced by the edit-completeness fix)*
  - **What's wrong:** A risk assessment that answers every question but with high-weight answers computes a
    rating **above the top risk band**, and the banded DB view then returns no row for it. Because create and
    edit both re-read the saved record through that view, the user gets a "record not found" (HTTP 404) even
    though the save was valid and fully answered — and on **create** the whole insert rolls back, so the
    assessment cannot be created at all. Such a record is also absent from the Risk Rating tab and every
    search. This is the **high-end** counterpart of the edit divergence above (which fixed only the low end);
    the "all questions answered" rule does **not** close it. Twin of the scaler finding (UC-RSK-006).
  - **Expected vs actual:** Expected — a fully answered assessment of any risk level saves and stays visible.
    Actual — a fully answered assessment whose rating exceeds the top band 404s on the post-save re-read
    (create: rolls back and nothing is saved; edit: the PUT's response is a 404 though the data persisted).
  - **How we caught it:** Reading the view source plus a DB census on the seeded DB (`real-data-seeded-scs-db`,
    :1525). `SCS_RISK_SUMMARY_VW` computes `RISK_RATING = ROUND(exp(sum(ln(section_total))), 2)` — the
    **product** of each section's summed answer weights — then inner-joins `SCS_RISK_RATING_VW` on
    `RISK_RATING BETWEEN RANGE_LOW_VALUE AND RANGE_HIGH_VALUE`. But the bands are sized to the **sum** of max
    weights (`MAX_RISK_RATING`), not the product: template 6 (SCSI) bands top out at **141** while the product
    ranges to **3780** (the scaler template 5 tops at 123 vs product 1890). Census of fully-answered rows
    already in the DB: **template 6 — 72 of 79 rate 180–2304 (above 141); template 5 — 32 of 53 rate 135–1782
    (above 123)** — i.e. 104 fully-answered real rows are already invisible.
  - **Why (technical):** The rating formula (product) and the band sizing (sum) disagree — a legacy DB-view
    design mismatch. Since the Oracle view is immutable in this project (no schema/view changes), create/edit
    cannot be made to surface these rows by touching the view; a code fix would have to stop reading the saved
    record back through the banded view (read the raw questionnaire + compute/label the rating in code across
    all read paths), which is the large, risky change explicitly rejected as alternative (b) above. Out of
    scope for the edit-completeness fix; raised here for BA/QA to ticket separately.
  - **Action:** BA/QA to raise a Jira ticket for the high-band overflow (scale-site + scaler twin, UC-RSK-006)
    and decide the remediation (view change vs. read-path rework vs. accept as legacy limitation).
  - **Register / classification:** Bug / Regression · confirmed (pre-existing)
  - **Severity/Priority:** sev2 / p2 (data-model defect; blocks creating/viewing genuinely high-risk
    assessments, but those are a minority of real rows and the behaviour predates this PR)
  - **Environment / build:** observed on local seeded Docker DB (`real-data-seeded-scs-db`, :1525); view
    source `SCS_RISK_SUMMARY_VW` / `SCS_RISK_RATING_VW`
  - **Status:** OPEN · **Found:** 2026-10-02
  - **Test:** none yet — a repro needs a high-weight fixture and would be a deliberately-RED `@discovered-bug`
    scenario; deferred to BA/QA triage (noted as a coverage follow-up).

## Coverage gaps

- **Permission-driven read-only gating (hidden Add button / display-only links) is not testable yet**
  - **What's wrong:** Legacy S07 hid the "Add Risk Assessment" button and routed Assessment ID links to a
    display-only screen for users WITHOUT the `scaleSiteAssessment` permission (STA-002/STA-003). This can't
    be exercised in the current environment.
  - **Expected vs actual:** N/A (not an app defect) — the new app has no per-element permission mechanism,
    and LOCAL mock auth authorizes every request as the single role `SCS_SYS_ADMIN`, so a permission-denied
    user cannot be produced. The read-only VIEW surface itself IS covered (S07).
  - **How we caught it:** Reconciling S07 against the app — no frontend gate exists; `MockRequestFilter`
    grants only `SCS_SYS_ADMIN`.
  - **Register / classification:** Coverage gap · blocked
  - **Severity/Priority:** sev3 / p2
  - **UC / Gherkin slice:** UC-RSK-007-S07
  - **Status:** OPEN · **Found:** 2026-08-05 — revisit when the coming RBAC rework introduces real roles.
  - **Test:** none (state not reproducible under single-role mock auth).

- **Tombstone-null "silent no-op" on Add (ERR-004) has no equivalent in the stateless new app**
  - **What's wrong:** Legacy S08 covered clicking Add when the session's scale-site tombstone was null — the
    action silently returned to the list with no error and created nothing.
  - **Expected vs actual:** N/A (not an app defect) — the new app is stateless: the scale site id is carried
    in the create route (`/scale-sites/{id}/risk-assessments/create`), so there is no session tombstone to be
    null and no silent-no-op path. (A non-existent scale site instead surfaces an "Invalid record." error
    from a failed create-init — a different behaviour than S08 describes, so not authored as S08.)
  - **How we caught it:** Reconciling S08 against the stateless REST create flow.
  - **Register / classification:** Coverage gap · not-applicable (re-ground)
  - **Severity/Priority:** sev3 / p2
  - **UC / Gherkin slice:** UC-RSK-007-S08
  - **Status:** OPEN · **Found:** 2026-08-05
  - **Test:** none (legacy session-state mechanic has no new-app equivalent).

## Spec gaps

_None — the UC-RSK-007 `.feature` scenarios did not omit any control/message/rule that its own
`-slices.md`/`-technical.md` enumerate (STA-001..003, ERR-001..004, SUC-001..002 all reconciled)._

## Verified — not a defect

- **Legacy "Cancel Assessment" re-grounds to "Back" (create never persists until Save)**
  - **What's wrong:** Nothing. Legacy S02 had a Cancel button that deleted an in-progress questionnaire; the
    new app has no Cancel button and no delete/cancel endpoint.
  - **Expected vs actual:** Expected discard-on-cancel behaviour is preserved — the new create flow only
    persists on Save, so clicking Back on the create form simply returns to the Risk Rating tab having
    written nothing. Confirmed: Back → tab, create-POST spy count = 0, tab list empty (site 525).
  - **Register / classification:** Verified — not a defect · suspected-intentional-change (re-ground)
  - **UC / Gherkin slice:** UC-RSK-007-S02
  - **Status:** verified 2026-08-05
  - **Test:** `features/rsk/uc-rsk-007-complete/create.feature` (backs out of a new assessment, `@S02 @p1`).

- **Comments > 4000 (ERR-003) is enforced as a hard input cap, so the legacy error is not browser-reachable**
  - **What's wrong:** Nothing. The Comments box is capped at 4000 characters (`TextArea maxLength=4000`), so
    a user cannot type an over-length value and the legacy "Comments can not be greater than 4000 characters."
    message never needs to fire in the browser. The backend also enforces the limit defensively
    (`RiskAssessmentApiMapper.requireCommentWithinMaxLength`).
  - **Expected vs actual:** The 4000-char constraint is enforced — just at input time rather than on submit.
    Confirmed: over-typing leaves the field holding exactly 4000 characters.
  - **Register / classification:** Verified — not a defect · suspected-intentional-change (re-ground)
  - **UC / Gherkin slice:** UC-RSK-007-S06
  - **Status:** verified 2026-08-05
  - **Test:** `features/rsk/uc-rsk-007-complete/validation.feature` (Comments field caps input, `@S06 @p2`).

- **The form's "Maximum Total" (3780) is a different number than the API's `maxRiskRating` (141) — by design**
  - **What's wrong:** Nothing, but it reads as a contradiction and cost a test-authoring cycle, so it is
    logged. On the assessment form the totals pair renders as Total **90** / Maximum Total **3780**, while
    the saved record's API detail reports `maxRiskRating` **141** and the risk bands are L 18-33 / M 34-47 /
    H 48-141. Same assessment, two different "maximums".
  - **Expected vs actual:** Both are correct under their own definition. The form's `computeMaxTotal()` uses
    the PRODUCT of each section's max-weight sum — 36 x 105 = 3780 — deliberately mirroring the legacy
    questionnaire tag; its own source comment states it does NOT use the view's `max_risk_rating` "which is
    SUM-based and would render lower than the product total". The API/view value (141) is that SUM-based
    number, and is what the banding compares against.
  - **How we caught it:** Authoring the S01 client-side-total scenario against the pinned
    `expectedRating.maxRiskRating` (141) — the form rendered 3780. Ground-truthed 2026-08-07 against
    `GET /api/scale-sites/520/risk-assessments/create-init`: per-section max-weight sums `[36, 105]`,
    product **3780**, matching the rendered `#max-risk-rating` exactly.
  - **Why (technical, optional):** `components/Form/RiskAssessment/riskAssessmentQuestionnaireUtils.ts`
    (`computeMaxTotal`) vs. the `SCS_RISK_*_VW` max. Worth a BA sanity-check only on the UX question of
    whether showing a 3780 ceiling next to a 90 total (which is actually High on an 18-141 scale) misleads
    a user; the computation itself is intentional and legacy-faithful.
  - **Register / classification:** Verified — not a defect · suspected-intentional-change (re-ground)
  - **UC / Gherkin slice:** UC-RSK-007-S01 / BR-RSK-007-01
  - **Status:** verified 2026-08-07
  - **Test:** `features/rsk/uc-rsk-007-complete/create.feature` (form shows the computed rating before save,
    `@S01 @p1`) — pins both numbers via `formDisplayedTotals` so the distinction can't silently drift.
