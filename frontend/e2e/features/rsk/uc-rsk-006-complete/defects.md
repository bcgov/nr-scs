# Defects — UC-RSK-006 Complete Scaler Risk Assessment

> How this log works (registers, statuses, glossary): [defects-guide.md](../../../defects-guide.md).
> BA/QA own triage and Jira; this file is the queue that feeds it. Ids/values cite
> `fixtures/rsk/scaler-risk-complete-test-data.ts` — treat a DB re-extract as a sweep of this file for
> stale values.

## Divergences

- **Editing a scaler assessment and clearing every answer showed a misleading "record not found" error** *(FIXED)*
  - **What's wrong:** On the legacy screen, saving an edited risk assessment with no questions answered was
    rejected with "At least one question must be answered in order to save the assessment." (ERR-002). The
    new app enforced no such rule on edit: clearing every answer and saving deleted all the responses and
    then failed with a confusing "record not found" (HTTP 404) error, as if the record had been deleted.
  - **Expected vs actual:** Expected — the save is blocked with the "at least one question" error and the
    assessment is left unchanged. Actual (before the fix) — the user got a 404 "Scaler risk assessment not
    found for id: {id}", though the record was in fact left intact (see the mechanism below).
  - **Correction to the earlier write-up (was inaccurate):** this was originally logged as "PUT → HTTP 200,
    all responses deleted, record orphaned (every later read 404s)". A developer re-test on 2026-09-23 showed
    the record is **not** orphaned: the save returns a 404 and, on returning to the list, the assessment is
    still present with all its original answers and remains editable. The data survived; the defect was the
    missing validation plus a misleading error, not data loss (see mechanism).
  - **Why (technical):** The shared form gated "all answered" only in create mode
    (`components/Form/RiskAssessment/index.tsx`), and the write path's `RiskQuestionnaireService.save`
    reconciled responses with no minimum-answer check. So a cleared-out edit deleted every response inside
    the `@Transactional updateScalerRiskAssessment`; the post-save re-read of `SCS_RISK_SCALER_VW` returns no
    row for an answerless assessment, so the service threw `ResourceNotFoundException` → the transaction
    **rolled back** (which is why the answers survived) and the raw 404 reached the user. The data-safety was
    therefore accidental (a rollback tripped by an unrelated not-found), not a guard.
  - **Fix (2026-09-23):** the legacy ERR-002 "at least one answer" rule was enforced on the edit path both
    client-side (`RiskAssessment/index.tsx` `onSave`, edit branch — keeps the user on the form with the
    message, no PUT sent) and server-side (`RiskQuestionnaireService.save`), thrown as a 400 before any
    response is deleted, so a hand-crafted PUT is rejected too. Same fix covered the scale-site twin
    (UC-RSK-007 Divergence #1).
  - **Superseded (2026-10-01):** the "at least one answer" rule proved insufficient — a sparse-but-non-empty
    edit still rated below the lowest band, 404'd on re-save, and would have vanished from the list (see the
    follow-on divergence below). The edit rule is now **"all questions must be answered"** (edit mirrors
    create), via `requireAllAnswered` with the message *"All questions must be answered…"*. Guarded by
    `update_notAllAnswered_throwsBadRequest` and the Edit browser test `rejects a save that leaves any
    question unanswered, keeping the user on the form`.
  - **Action:** BA/QA to attach the Jira key for this fix and link the scale-site Divergence #1 ticket.
  - **Register / classification:** Divergence · confirmed-defect
  - **Severity/Priority:** sev2 / p1
  - **UC / Gherkin slice:** UC-RSK-006-S05 — UC-RSK-006-S05
  - **Environment / build:** fix on nr-scs branch `bugfix/risk-assess-edit` · local seeded Docker DB (`real-data-seeded-scs-db`, :1525)
  - **Data fixture:** `fixtures/rsk/scaler-risk-complete-test-data.ts` — seed on scaler `019D` with `scalerInRangeAnswers`, then clear all
  - **Status:** CLOSED (fixed) · **Found:** 2026-08-08 · **Fixed:** 2026-09-23
  - **Test:** `features/rsk/uc-rsk-006-complete/validation.feature` (An incomplete scaler edit (any question
    unanswered) is rejected, `@S05`) — a normal green regression guard. Since the 2026-10-01 supersession it
    asserts the "All questions must be answered…" message and that the user stays on the edit form.

- **A sparse scaler edit 404'd on re-save, and would have vanished from the list — edit now mirrors create** *(FIXED)*
  - **What's wrong:** A follow-on to Divergence #1 that its fix did not cover. After #327 blocked an
    all-cleared save with ERR-002 ("at least one answer"), a user who then entered **one** answer and saved
    got `HTTP 404 "Scaler risk assessment not found for id: {id}"`, even though the assessment and all its
    responses were still in the database. More broadly, any edit whose saved answers rate below the lowest
    risk band triggered it.
  - **Expected vs actual:** Expected — a save either succeeds and the record stays visible, or is rejected
    with a clear message. Actual (before the fix) — HTTP 404 and the valid save **rolled back**, so the user
    could not re-save; and had the save been allowed, the record would have rated below the band and silently
    dropped out of the Risk Rating tab and every search.
  - **How we caught it:** Live repro on the seeded DB against scaler assessment `1945` (licence `575E`,
    template `5`, fully answered): `PUT /api/scaler-risk-assessments/1945` with one answerId set and the rest
    null → **HTTP 404** with the responses untouched (the `@Transactional` method rolled back). Reproduced
    2026-10-01; the scale-site twin (UC-RSK-007) was swept the same way (break point ≥6 of 10 answers, and
    the 200s committed a record that no longer appeared in the banded view).
  - **Why (technical):** `updateScalerRiskAssessment` re-reads the header **after** the save to refresh the
    DB-derived Risk Level, via `SCS_RISK_SCALER_VW` → `SCS_RISK_SUMMARY_VW`, which inner-joins the bands
    table `SCS_RISK_RATING_VW` on `RESPS.RISK_RATING BETWEEN SRRVW.RANGE_LOW_VALUE AND
    SRRVW.RANGE_HIGH_VALUE`. The rating is the **product of section weight-sums**, so dropping answers pushes
    it below the lowest band (9 for this template); no band matches, the whole row drops out, and the service
    read the empty result as `ResourceNotFoundException` → 404 + rollback. The root gap: the edit rule ("at
    least one answer") allowed saves the banded view cannot represent — "savable" and "viewable" used
    different thresholds. (Same mechanism Divergence #1's write-up correction already noted for the scaler
    view; #327 fixed only the all-cleared entry path, not the sub-band re-read.)
  - **Decision & fix (2026-10-01):** **edit now mirrors create — all questions must be answered.** This
    supersedes the ERR-002 "at least one answer" rule #327 introduced. A fully answered assessment always
    rates **at or above the floor**, so it can never drop **below** the lowest band — which closes this
    low-end vanish. Enforced client-side (`RiskAssessment/index.tsx` `onSave`, edit branch →
    `allQuestionsAnswered`, the same guard create uses) and server-side (`RiskQuestionnaireService.save` →
    `requireAllAnswered`, thrown as a 400 before any write). Message: *"All questions must be answered in
    order to save the assessment."* Same change on the scale-site twin (UC-RSK-007). Still covers #327's
    data-safety.
  - **Scope note — does NOT close the HIGH end (see open defect below):** "all answered" ties *savable* to
    *not-below-band*, **not** to *viewable*. The view rates by the **product** of section weight-sums
    (`exp(sum(ln(section_total)))`) while the bands are sized to the **sum** of max weights (its own
    `MAX_RISK_RATING`), so a fully answered **high-weight** assessment rates **above** the top band and is
    still invisible — the post-save re-read still 404s (and, on the `@Transactional` create path, rolls
    back). So the re-read's null is **not** proof of a genuinely-missing record. Verified on the seeded DB:
    of 53 fully-answered template-5 rows, **32 rate 135–1782 (top band 123)**; of 79 template-6 rows, **72
    rate 180–2304 (top band 141)** — 104 fully-answered rows already sit above-band. That overflow is a
    pre-existing DB-view defect, out of scope here (immutable Oracle view).
  - **Alternatives considered:** (a) allow the sparse save but blank the Risk Level — rejected: the record
    still vanished from the banded list/searches, which the client confirmed is never intended; (b) widen the
    read path to surface below-band records as "unrated" — rejected as a large, risky change around the
    immutable legacy view. "All answered" was the client's decision (2026-10-01).
  - **Action:** BA/QA to attach the Jira key and link Divergence #1 and the scale-site twin ticket.
  - **Register / classification:** Divergence · confirmed-defect
  - **Severity/Priority:** sev2 / p1
  - **UC / Gherkin slice:** UC-RSK-006-S03 (edit) / S05 (edit answer-completeness rule)
  - **Environment / build:** fix on nr-scs branch `bugfix/SSRA-save` · local seeded Docker DB
    (`real-data-seeded-scs-db`, :1525)
  - **Data fixture:** live repro on scaler assessment `1945` (licence `575E`); restored to its original 6
    responses afterward.
  - **Status:** CLOSED (fixed) · **Found:** 2026-10-01 · **Fixed:** 2026-10-01
  - **Test:** `ScalerRiskAssessmentServiceTest` / `ScaleSiteRiskAssessmentServiceTest`
    (`update_notAllAnswered_throwsBadRequest`) and the scaler/scale-site Edit browser tests (`rejects a save
    that leaves any question unanswered, keeping the user on the form`); the `@S05` scenario in
    `validation.feature` now asserts the all-answered rule.

- **A newly created scaler assessment does not appear on the Risk Rating tab until the page is reloaded**
  - **What's wrong:** After you create a risk assessment and the app returns you to the scaler's Risk Rating
    tab, the new assessment is not shown in the list. It has been saved correctly — it just isn't displayed
    until the tab is reloaded or revisited fresh.
  - **Expected vs actual:** Expected (legacy) — the newly saved assessment appears in the assessments table
    with its computed rating. Actual — the table shows the list as it was when the tab first loaded; the
    just-created row is missing until a hard refresh.
  - **Why (technical, optional):** The Risk Rating tab's TanStack Query is not refetched/invalidated after a
    create (the app's global `queryClientConfig` sets `refetchOnMount: false` — a documented,
    by-design caching decision). This is the shared `RiskRatingTabView` used by BOTH subjects, so it is
    the same behaviour the scale-site twin logged as its Divergence #2 — recorded here for parity, not as a
    separate root cause.
  - **Action:** BA/QA to raise a Jira ticket (or fold into the scale-site Divergence #2 ticket — same
    shared component).
  - **Register / classification:** Divergence · suspected-intentional-change
  - **Severity/Priority:** sev3 / p1
  - **UC / Gherkin slice:** UC-RSK-006-S01
  - **Environment / build:** nr-scs `5f0b0d0` · local seeded Docker DB (:1525)
  - **Data fixture:** `fixtures/rsk/scaler-risk-complete-test-data.ts` — create on scaler `019D` with `scalerInRangeAnswers`
  - **Status:** OPEN · **Found:** 2026-08-08
  - **Test:** none (log-only — a suspected-intentional change is not asserted as a failing test). The tab's
    list rendering is covered on a FRESH mount by `features/rsk/uc-rsk-006-complete/create.feature`
    (The Risk Rating tab lists a scaler's assessments, `@S01 @p1`).

- **The Create screen's Name field showed only the scaler's last name, not "LAST, FIRST"** *(FIXED)*
  - **What's wrong:** On the Scaler Risk Assessment **Create** screen, the Name field under "Scaler Record"
    showed the surname alone (e.g. "SAMPLE") instead of the full "LAST, FIRST" name the legacy screen shows
    (e.g. "SAMPLE, ALEX"). The first name was missing entirely. Only the Create screen was affected — the
    Edit, View and search screens already showed the full name.
  - **Expected vs actual:** Expected — "SAMPLE, ALEX". Actual — "SAMPLE".
  - **How we caught it:** QA-reported. Confirmed 2026-09-17 against the local stack, which
    shows both paths side by side: `GET /api/scalers/019D/risk-assessments/create-init` → `clientName`
    is the surname only, while `GET /api/scaler-risk-assessments/723` (the view/edit path) →
    `clientName` is the full "LAST, FIRST" name.
  - **Why (technical):** Create-init is the one header path that reads the scaler tombstone
    (`scs_scaler_tombstone_vw`), which exposes `client_name` and `legal_first_name` as two separate raw
    columns; `ScalerRiskAssessmentService.buildCreateInitDetail` copied `client_name` straight into
    `clientName` and dropped `legal_first_name`. Every other path reads `scs_risk_scaler_vw`, whose
    `CLIENT_NAME` the **view itself** composes (`fc.client_name || ', ' || fc.legal_first_name` for an
    individual), which is why only Create was wrong. Legacy composed it in the UI, in the
    `<scs:scalerTombstone/>` tag (`ScsScalerTombstone.java`), which appended `", " + legal_first_name`
    whenever it was present.
  - **Fix:** `buildCreateInitDetail` now composes the name the way the legacy tag did, so `clientName`
    carries the same "LAST, FIRST" shape on all four paths and the shared form needs no change. A
    corporation (no `legal_first_name`) still shows the bare name — no trailing comma. Covered by
    `ScalerRiskAssessmentServiceTest.CreateInit` (`createInit_buildsBlankDetail`,
    `createInit_noLegalFirstName_showsClientNameAlone`, `createInit_noClientName_showsLegalFirstNameAlone`).
  - **Register / classification:** Divergence · confirmed-defect
  - **Severity/Priority:** sev3 / p2
  - **UC / Gherkin slice:** UC-RSK-006-S01 (the create-surface header)
  - **Environment / build:** nr-scs `97e7723` (fix on branch `bugfix/sra-create-miss-name`) · local seeded Docker DB (`real-data-seeded-scs-db`, :1525)
  - **Data fixture:** `fixtures/rsk/scaler-risk-complete-test-data.ts` — `scalerHappyPath.clientName`, now
    pinned to the full "LAST, FIRST" name (was surname only)
  - **Status:** CLOSED (fixed) · **Found:** 2026-09-17 · **Fixed:** 2026-09-17
  - **Test:** `features/rsk/uc-rsk-006-complete/create.feature` (The create form shows the scaler record
    header…, `@S01 @p1`) and `view.feature` (…displayed read-only…, `@p1`) — both assert the pinned name
    **exactly** (`toHaveValue`) via the shared `the scaler record header shows the pinned client, region and
    district` step, so the two paths are now held to one value. NB: the fixture previously pinned the
    surname-only create-init value, so the `view.feature` assertion was already RED against the view path's
    full name (Expected: surname / Received: "LAST, FIRST"); re-pinning turns both green.

## Bug / Regression

- **A fully answered HIGH-risk scaler assessment is invisible to every read path — create/edit 404 (and create rolls back)** *(OPEN — pre-existing, not introduced by the edit-completeness fix)*
  - **What's wrong:** A risk assessment that answers every question but with high-weight answers computes a
    rating **above the top risk band**, and the banded DB view then returns no row for it. Because create and
    edit both re-read the saved record through that view, the user gets a "record not found" (HTTP 404) even
    though the save was valid and fully answered — and on **create** the whole insert rolls back, so the
    assessment cannot be created at all. Such a record is also absent from the Risk Rating tab and every
    search. This is the **high-end** counterpart of Divergence #2 (which fixed only the low end); the
    "all questions answered" rule does **not** close it.
  - **Expected vs actual:** Expected — a fully answered assessment of any risk level saves and stays visible.
    Actual — a fully answered assessment whose rating exceeds the top band 404s on the post-save re-read
    (create: rolls back and nothing is saved; edit: the PUT's response is a 404 though the data persisted).
  - **How we caught it:** Reading the view source plus a DB census on the seeded DB (`real-data-seeded-scs-db`,
    :1525). `SCS_RISK_SUMMARY_VW` computes `RISK_RATING = ROUND(exp(sum(ln(section_total))), 2)` — the
    **product** of each section's summed answer weights — then inner-joins `SCS_RISK_RATING_VW` on
    `RISK_RATING BETWEEN RANGE_LOW_VALUE AND RANGE_HIGH_VALUE`. But the bands are sized to the **sum** of max
    weights (`MAX_RISK_RATING`), not the product: template 5 bands top out at **123** while the product ranges
    to **1890**; template 6 tops at **141** while the product ranges to **3780**. Census of fully-answered
    rows already in the DB: **template 5 — 32 of 53 rate 135–1782 (above 123); template 6 — 72 of 79 rate
    180–2304 (above 141)** — i.e. 104 fully-answered real rows are already invisible. (Query: per-questionnaire
    `ROUND(EXP(SUM(LN(section_weight_sum))),2)` grouped by in-band vs out-of-band and complete vs partial.)
  - **Why (technical):** The rating formula (product) and the band sizing (sum) disagree — a legacy DB-view
    design mismatch. Since the Oracle view is immutable in this project (no schema/view changes), create/edit
    cannot be made to surface these rows by touching the view; a code fix would have to stop reading the saved
    record back through the banded view (e.g. read the raw questionnaire + compute/label the rating in code for
    all read paths), which is the large, risky change explicitly rejected as alternative (b) under Divergence
    #2. Out of scope for the edit-completeness fix; raised here for BA/QA to ticket separately.
  - **Action:** BA/QA to raise a Jira ticket for the high-band overflow (scaler + scale-site twin, UC-RSK-007)
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

- **Permission-driven read-only gating (hidden Add button / display-only links / notAuthorized) is not testable yet**
  - **What's wrong:** Legacy S06 hid the "Add Risk Assessment" button and routed Assessment ID links to a
    display-only screen for users WITHOUT the `scalerAssessment` permission (STA-002/STA-003), and returned
    the notAuthorized page (ERR-004) on direct add/edit URL access. This can't be exercised in the current
    environment.
  - **Expected vs actual:** N/A (not an app defect) — the new app has no per-element permission mechanism,
    and LOCAL mock auth authorizes every request as the single role `SCS_SYS_ADMIN`, so a permission-denied
    user cannot be produced. The read-only VIEW surface itself IS covered (view.feature).
  - **How we caught it:** Reconciling S06 against the app — no frontend gate exists; the mock request filter
    grants only `SCS_SYS_ADMIN`.
  - **Register / classification:** Coverage gap · blocked
  - **Severity/Priority:** sev3 / p2
  - **UC / Gherkin slice:** UC-RSK-006-S06
  - **Status:** OPEN · **Found:** 2026-08-08 — revisit when the coming RBAC rework introduces real roles.
  - **Test:** none (state not reproducible under single-role mock auth).

- **Tombstone-null "silent no-op" on Add (STA-004) has no equivalent in the stateless new app**
  - **What's wrong:** Legacy S07 covered clicking Add when the session's scaler tombstone was null — the
    action silently returned to the list (`mapping.getInputForward()`) with no error and created nothing.
  - **Expected vs actual:** N/A (not an app defect) — the new app is stateless: the scaler licence is
    carried in the create route (`/scalers/{scalerLicenceNo}/risk-assessments/create`), so there is no
    session tombstone to be null and no silent-no-op path.
  - **How we caught it:** Reconciling S07 against the stateless REST create flow.
  - **Register / classification:** Coverage gap · not-applicable (re-ground)
  - **Severity/Priority:** sev3 / p2
  - **UC / Gherkin slice:** UC-RSK-006-S07
  - **Status:** OPEN · **Found:** 2026-08-08
  - **Test:** none (legacy session-state mechanic has no new-app equivalent).

## Spec gaps

- **The read-only display surface (P118) is covered by the app but omitted from the UC-RSK-006 Gherkin**
  - **What's wrong:** The UC-RSK-006 slice catalog DELIBERATELY EXCLUDED the read-only display
    (`scalerAssessmentDisplay.do` / P118), routing it to a sibling read-only-role UC (UC-RSK-001) — see
    `UC-RSK-006-slices.md:41`. But the new React app renders a scaler read-only VIEW surface from the shared
    form (`mode="view"`, `/scaler-risk-assessments/view/:riskQuestionnaireId`) that IS reachable under the
    single `SCS_SYS_ADMIN` mock role, and its scale-site twin (UC-RSK-007 S07) is covered. So the behaviour
    exists and is tested here even though the RSK-006 `.feature` has no slice for it.
  - **Expected vs actual:** N/A (not an app defect) — this is a Gherkin-vs-source gap: the display surface is
    real and worth covering, so it is covered (view.feature) and flagged for a BA to regenerate the
    `.feature` with a read-only-view slice if desired.
  - **Register / classification:** Spec gap (gherkin-incomplete-vs-source)
  - **Severity/Priority:** sev3 / p1
  - **UC / Gherkin slice:** UC-RSK-006 (no source slice) · source citation `UC-RSK-006-slices.md:41`
  - **Status:** OPEN · **Found:** 2026-08-08 — BA to decide whether to regenerate the `.feature`.
  - **Test:** `features/rsk/uc-rsk-006-complete/view.feature` (A scaler assessment is displayed read-only, `@p1`).

## Verified — not a defect

- **Legacy "Cancel Assessment" re-grounds to "Back" (create never persists until Save)**
  - **What's wrong:** Nothing. Legacy S04 had a Cancel button that deleted an in-progress questionnaire draft
    (`cancelScalerAssessment()` → `cancelRiskAssessment(bo)`); the new app has no Cancel button and no
    delete/cancel endpoint.
  - **Expected vs actual:** Expected discard-on-cancel behaviour is preserved — the new create flow only
    persists on Save, so clicking Back on the create form simply returns to the Risk Rating tab having
    written nothing. Confirmed: Back → tab, create-POST spy count = 0, tab list empty (scaler 044E).
  - **Register / classification:** Verified — not a defect · suspected-intentional-change (re-ground)
  - **UC / Gherkin slice:** UC-RSK-006-S04
  - **Status:** verified 2026-08-08
  - **Test:** `features/rsk/uc-rsk-006-complete/create.feature` (backs out of a new scaler assessment, `@S04 @p1`).

- **Comments > 4000 (ERR-003) is enforced as a hard input cap, so the legacy error is not browser-reachable**
  - **What's wrong:** Nothing. The Comments box is capped at 4000 characters (`TextArea maxLength=4000`), so
    a user cannot type an over-length value and the legacy "Comments can not be greater than 4000 characters."
    message never needs to fire in the browser.
  - **Expected vs actual:** The 4000-char constraint is enforced — just at input time rather than on submit.
    Confirmed: over-typing leaves the field holding exactly 4000 characters.
  - **Register / classification:** Verified — not a defect · suspected-intentional-change (re-ground)
  - **UC / Gherkin slice:** UC-RSK-006-S03
  - **Status:** verified 2026-08-08
  - **Test:** `features/rsk/uc-rsk-006-complete/validation.feature` (Comments field caps input, `@S03 @p2`).

- **The form's "Maximum Total" (1890) is a different number than the API's `maxRiskRating` (123) — by design**
  - **What's wrong:** Nothing, but it reads as a contradiction, so it is logged (same class as the scale-site
    twin's note). On the assessment form the totals pair renders as Total **90** / Maximum Total **1890**,
    while the saved record's API detail reports `maxRiskRating` **123** and the SCLE risk bands are
    L 9-21 / M 22-32 / H 33-123. Same assessment, two different "maximums".
  - **Expected vs actual:** Both are correct under their own definition. The form's `computeMaxTotal()` uses
    the PRODUCT of each section's max-weight sum — 18 x 105 = 1890 — deliberately mirroring the legacy
    questionnaire tag; it does NOT use the view's SUM-based `max_risk_rating` (123), which is what the
    banding compares against.
  - **How we caught it:** Ground-truthing the S01 client-side-total scenario 2026-08-08: template 5
    per-section max-weight sums `[18, 105]`, product **1890**, matching the rendered `#max-risk-rating`.
  - **Register / classification:** Verified — not a defect · suspected-intentional-change (re-ground)
  - **UC / Gherkin slice:** UC-RSK-006-S01 / BR-RSK-006-01
  - **Status:** verified 2026-08-08
  - **Test:** `features/rsk/uc-rsk-006-complete/create.feature` (form shows the computed rating before save,
    `@S01 @p1`) — pins both numbers via `scalerFormDisplayedTotals` so the distinction can't silently drift.
