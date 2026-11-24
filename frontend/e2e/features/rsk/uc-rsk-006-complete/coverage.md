# Coverage — UC-RSK-006 Complete Scaler Risk Assessment

> New to these files? See [`coverage-guide.md`](../../../coverage-guide.md) at the e2e root for the column
> + status-flag legend.

Sources reconciled: `gherkin/UC-RSK-006-S01..S07.feature` + `UC-RSK-006-slices.md` (control/message/field
matrix) + `UC-RSK-006-technical.md` (STA-001..004 / ERR-001..004 catalog), against the new app's shared
risk-assessment write path: `components/Form/RiskAssessment/index.tsx` (`allQuestionsAnswered` create
gate, `onSave`/`onBack`), `RiskAssessmentQuestionnaire.tsx` (answer `Select`s, comments `maxLength`),
`components/Form/RiskAssessment/scalerConfig.ts` (routes/redirects), `pages/View/shared/RiskRatingTabView.tsx`
(the Risk Rating tab), `services/scalerRiskAssessments.service.ts`, and the backend
`ScalerRiskAssessmentController` / service. Endpoints + write path were ground-truthed by hand on
2026-08-08 (create-init → POST → GET read-back → PUT edit read-back → PUT clear-all → 404 → sqlplus delete).

This is the SCALER twin of UC-RSK-007 (scale site). The scaler subject uses the SCLE template (id 5), NOT
the scale-site SCSI template (id 6), so every question/answer id, the rating ranges, and the in-range set
are scaler-specific.

**Test data (real, 2026-08-08, see `fixtures/rsk/scaler-risk-complete-test-data.ts`):** happy-path create
scaler **019D** (read-back view accepts it via SCS_RISK_SCALER_VW's client+org inner joins;
Risk Rating tab starts empty). Active template **5** (SCLE, v2), 2 sections / 6 questions. The **in-range
answer set** computes a product rating of **90 = High**, which lands inside template 5's ranges (L 9-21 /
M 22-32 / H 33-123); answering with the highest-weight options overflows 123 and makes the row invisible to
every read path (`@Transactional` create then rolls back). Scaler **044E** (never mutated) is the empty-tab
anchor for the back-out path. Edit/view/divergence assessments are **API-seeded** on 019D (owned +
DB-cleaned), so they don't depend on a real record surviving a re-extract.

| Source item | Source citation | App enforcement point | Scenario (tags) | Status | Gap/defect |
|---|---|---|---|---|---|
| Happy-path create end-to-end (rating computed + persisted) | S01 / SUC-001 | create gate → POST `/scalers/{lic}/risk-assessments` → redirect to tab; GET read-back | create `@S01 @p0` | covered | — |
| Add Risk Assessment button rendered on the tab (STA-001) | S01 controls / STA-001 | `RiskRatingTabView` Add button (createPath set) | create `@S01` (tab open + Add hop) | covered | — |
| Questionnaire answered via the widget (all responses non-null) | S01 fields | `answerAll` over `Select id="question-<qid>"`; read-back asserts each `selectedAnswerId` | create `@S01 @p0` | covered | — |
| Comments persisted (optional) | S01 fields | `onSave` sends `comments`; read-back asserts it | create `@S01`, edit `@S05` | covered | — |
| Computed rating shown in the assessments table | S01 / BR-RSK-006-01 | `RiskRatingTable` Rating/Level cells | create `@S01 @p1` (fresh tab lists seeded row 90/High) | covered | — |
| Form shows the computed rating BEFORE save | S01 / BR-RSK-006-01 | `computeGrandTotal`/`computeMaxTotal` render `#risk-rating` / `#max-risk-rating` | create `@S01 @p1` (total 90 / max 1890) | covered | — |
| Record tombstone header (licence + client + region + district) | S01 controls / P115 | shared form `config.headerFields` → `#scaler-licence-no` / `#client-name` / `#region-name` / `#district-name` (create-init tombstone on create; assessment detail on view) | create `@S01 @p1` + view `@p1` (all 4 fields) | covered | — |
| New row appears in the tab IMMEDIATELY after create | S01 (final step) | tab serves stale react-query cache after create (global `refetchOnMount:false`) | — (asserted on a fresh mount instead, `@S01 @p1`) | divergence (log-only) | Divergence #2 |
| Cancel/discard an in-progress new assessment (S04) | S04 | re-ground: no Cancel/no delete endpoint — Back discards (nothing POSTed until Save) | create `@S04 @p1` (Back + spy=0 + empty tab) | covered (re-ground) | verified-not-defect #1 |
| Edit an existing assessment (update responses + comments) | S05 / SUC-002 | `onSave` (edit) → PUT `/scaler-risk-assessments/{id}`; GET read-back | edit `@S05 @p1` | covered | — |
| Back from edit without saving | S05 (Back) | `onBack` (edit/view) → `config.successRedirect(detail)` = the owning scaler's Risk Rating tab (`/scalers/view/{licence}?tab=risk-rating`, same landing as Save — fixed in #316, matching legacy) | edit `@S05 @p2` (Back → Risk Rating tab + record reads back unchanged) | covered | — |
| All questions required on CREATE (ERR-001) | S02 / ERR-001 | `allQuestionsAnswered` gate + backend `requireAllAnswered` | validation `@S02 @p1 @ERR-001` (error + spy=0) | covered | — |
| All questions required on EDIT (edit mirrors create) | S05 | enforced on edit: `onSave` (edit branch) → `allQuestionsAnswered` + `RiskQuestionnaireService.save` → `requireAllAnswered` block an incomplete save before any write | validation `@S05 @p1` | covered | Divergence #1 (FIXED 2026-09-23) + follow-on (all-answered, 2026-10-01) |
| Comments max 4000 (ERR-003) | S03 / ERR-003 | re-ground: `TextArea maxLength=4000` hard-caps input (legacy message not browser-reachable) | validation `@S03 @p2 @ERR-003` (cap holds) | covered (re-ground) | verified-not-defect #2 |
| Read-only display of an assessment (P118) | (omitted by S06 slice — see spec gap) | view surface (`mode="view"`): answer selects + comments disabled; Back + Edit | view `@p1` | covered | Spec gap #1 |
| Add button hidden / links → display-only / notAuthorized when permission denied (STA-002/003, ERR-004) | S06 | no per-element permission gate in the new app; mock auth grants only `SCS_SYS_ADMIN` | — | blocked | Coverage gap #1 |
| Tombstone-null silent no-op on Add (STA-004) | S07 | re-ground: the new app is stateless (scaler licence in the URL) — no session tombstone, no silent no-op equivalent | — | not-applicable | Coverage gap #2 |

**Symmetry check:** the create-vs-edit "required answers" mirror is now exact — both arms enforce
all-answered: the CREATE arm (ERR-001) is covered green (S02) and the EDIT arm is covered green (S05, was
Divergence #1 + its 2026-10-01 all-answered follow-on). The comments-max-length constraint uses the SAME `TextArea` component on both
create and edit, so one arm (create, S03) proves the cap for both. Every rendered questionnaire question is
answered by the pinned in-range map, and the read-back asserts each `selectedAnswerId`, so all 6 questions
are exercised. Subject symmetry vs UC-RSK-007 (scale site): every scale-site scenario has a scaler twin
except that scale-site's search is UC-QRY-007 (a separate UC) — scaler search is already covered there.

**Role / permission coverage:** blocked by mock auth (grants only `SCS_SYS_ADMIN`) + no frontend
element-permission mechanism — the S06 permission gating (STA-002 display-only links / STA-003 hidden Add
button / ERR-004 notAuthorized) is not reproducible; logged in Coverage gap #1. The read-only VIEW surface
itself IS covered (view.feature). No `@skip` scenarios authored (the denied-user state cannot be produced
at all).

**Status values:** `covered` · `covered (re-ground)` · `not-applicable` (legacy-only / no new-app
equivalent) · `blocked` (env/auth) · `divergence` (see `defects.md`). **2 divergences** found — Divergence
#1 (edit accepted zero answers and surfaced a misleading "record not found" 404; FIXED 2026-09-23, its
scenario is now a normal green regression guard) and Divergence #2 (Risk Rating tab shows a stale list
immediately after create; log-only, stems from the shared `refetchOnMount:false` design decision). Both
mirror the scale-site twin's findings on the shared write path / shared tab component.
