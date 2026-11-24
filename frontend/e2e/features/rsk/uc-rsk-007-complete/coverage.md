# Coverage — UC-RSK-007 Complete Scale Site Risk Assessment

> New to these files? See [`coverage-guide.md`](../../../coverage-guide.md) at the e2e root for the column + status-flag legend.

Sources reconciled: `gherkin/UC-RSK-007-S01..S08.feature` + `UC-RSK-007-slices.md` (control/message/field
matrix) + `UC-RSK-007-technical.md` (STA-001..003 / ERR-001..004 catalog), against the new app's shared
risk-assessment write path: `components/Form/RiskAssessment/index.tsx` (`allQuestionsAnswered` create
gate, `onSave`/`onBack`), `RiskAssessmentQuestionnaire.tsx` (answer `Select`s, comments `maxLength`),
`components/Form/RiskAssessment/scaleSiteConfig.ts` (routes/redirects), `pages/View/shared/RiskRatingTabView.tsx`
(the Risk Rating tab), `services/scaleSiteRiskAssessments.service.ts`, and the backend
`ScaleSiteRiskAssessmentController` / `ScaleSiteRiskAssessmentService` / `RiskQuestionnaireService`
(`requireAllAnswered`, `RiskAssessmentApiMapper.requireCommentWithinMaxLength`). Endpoints + write path
were ground-truthed by hand on 2026-08-05 (create-init → POST → GET read-back → risk-ratings tab →
sqlplus delete; PUT clear-all-answers → orphan).

**Test data (real, 2026-08-05, see `fixtures/rsk/rsk-test-data.ts`):** happy-path create site **520**
(TEMBEC - CANAL FLATS; read-back view accepts it; Risk Rating tab starts empty). Active template **6**
(SCSI, v2), 2 sections / 10 questions. The **in-range answer set** (question→answer map, replay of
accepted DB row 1822) computes a product rating of **90 = High**, which lands inside template 6's ranges
(L 18-33 / M 34-47 / H 48-141); answering with the highest-weight options overflows 141 and makes the row
invisible to every read path (`@Transactional` create then rolls back). Site **525** (never mutated) is
the empty-tab anchor for the back-out path. Edit/view/divergence assessments are **API-seeded** on 520
(owned + DB-cleaned), so they don't depend on a real record surviving a re-extract.

**Expected suite status — all-green.** This UC previously shipped one deliberate red (the S05 edit-orphan
divergence); that defect was FIXED 2026-09-23 (Divergence #1) and its `validation.feature` S05 scenario is a
normal green regression guard. As of 2026-10-01 the edit rule was tightened to "all questions must be
answered" (edit mirrors create — see the follow-on divergence), and S05 now asserts that message. No
`@discovered-divergence` / `@discovered-bug` reds remain in this UC.

| Source item | Source citation | App enforcement point | Scenario (tags) | Status | Gap/defect |
|---|---|---|---|---|---|
| Happy-path create end-to-end (rating computed + persisted) | S01 / SUC-001 | create gate → POST `/scale-sites/{id}/risk-assessments` → redirect to tab; GET read-back | create `@S01 @p0` | covered | — |
| Add Risk Assessment button rendered on the tab | S01 controls / STA-001 | `RiskRatingTabView` Add button (createPath set) | create `@S01` (tab open + Add hop) | covered | — |
| Questionnaire answered via the widget (all responses non-null) | S01 fields | `answerAll` over `Select id="question-<qid>"`; read-back asserts each `selectedAnswerId` | create `@S01 @p0` | covered | — |
| Comments persisted (optional) | S01 fields | `onSave` sends `comments`; read-back asserts it | create `@S01`, edit `@S03` | covered | — |
| Computed rating shown in the assessments table | S01 / BR-RSK-007-01 | `RiskRatingTable` Rating/Level cells | create `@S01 @p1` (fresh tab lists seeded row 90/High) | covered | — |
| Rating computed + displayed on the FORM before save | S01 / BR-RSK-007-01 (new-app control; legacy P112 had no totals field) | `computeGrandTotal`/`computeMaxTotal` → read-only `#risk-rating` / `#max-risk-rating` | create `@S01 @p1` (90 out of 3780, spy=0) | covered (re-ground) | verified-not-defect #3 (form max 3780 ≠ API `maxRiskRating` 141) |
| New row appears in the tab IMMEDIATELY after create | S01 (final step) | tab serves stale react-query cache after create (global `refetchOnMount:false`, no invalidation) | — (asserted on a fresh mount instead, `@S01 @p1`) | divergence (log-only) | Divergence #2 |
| Cancel/discard an in-progress new assessment | S02 | re-ground: no Cancel/no delete endpoint — Back discards (nothing POSTed until Save) | create `@S02 @p1` (Back + spy=0 + empty tab) | covered (re-ground) | verified-not-defect #1 |
| Edit an existing assessment (update responses + comments) | S03 / SUC-002 | `onSave` (edit) → PUT `/scale-site-risk-assessments/{id}`; GET read-back | edit `@S03 @p1` | covered | — |
| Back from edit without saving | S03 (Back) | `onBack` → `listPath` | (covered implicitly by S02 Back mechanics) | covered (re-ground) | — |
| All questions required on CREATE (ERR-001) | S04 / ERR-001 | `allQuestionsAnswered` gate (`index.tsx:223-226`) + backend `requireAllAnswered` | validation `@S04 @p1 @ERR-001` (error + spy=0) | covered | — |
| All questions required on EDIT (edit mirrors create) | S05 | enforced on edit: `onSave` (edit branch) → `allQuestionsAnswered` + `RiskQuestionnaireService.save` → `requireAllAnswered` block an incomplete save before any write | validation `@S05 @p1` | covered | Divergence #1 (FIXED 2026-09-23) + follow-on (all-answered, 2026-10-01) |
| Comments max 4000 (ERR-003) | S06 / ERR-003 | re-ground: `TextArea maxLength=4000` hard-caps input (legacy message not browser-reachable); backend also enforces | validation `@S06 @p2 @ERR-003` (cap holds) | covered (re-ground) | verified-not-defect #2 |
| Read-only display of an assessment (P114) | S07 | view surface (`mode="view"`): answer selects + comments disabled; Back + Edit | view `@S07 @p1` | covered | — |
| Add button hidden / links → display-only when permission denied (STA-002/STA-003) | S07 | no per-element permission gate in the new app; mock auth grants only `SCS_SYS_ADMIN` | — | blocked | Coverage gap #1 |
| Tombstone-null Add fails silently (ERR-004) | S08 | re-ground: the new app is stateless (scale site id in the URL) — no session tombstone, no silent no-op equivalent | — | not-applicable | Coverage gap #2 |

**Symmetry check:** the create-vs-edit "required answers" mirror is now exact — both arms enforce
all-answered: the CREATE arm (ERR-001) is covered green (S04) and the EDIT arm is covered green (S05, was
Divergence #1 + its 2026-10-01 all-answered follow-on). The comments-max-length constraint uses the SAME `TextArea` component on both
create and edit, so one arm (create, S06) proves the cap for both. Every rendered questionnaire question is
answered by the pinned in-range map, and the read-back asserts each `selectedAnswerId`, so all 10 questions
are exercised.

**Role / permission coverage:** blocked by mock auth (grants only `SCS_SYS_ADMIN`) + no frontend
element-permission mechanism — the S07 permission gating (STA-002 display-only links / STA-003 hidden Add
button) is not reproducible; logged in Coverage gap #1. The read-only VIEW surface itself IS covered (S07).
No `@skip` scenarios authored (the denied-user state cannot be produced at all).

**Status values:** `covered` · `covered (re-ground)` · `not-applicable` (legacy-only / no new-app
equivalent) · `blocked` (env/auth) · `divergence` (see `defects.md`). **2 divergences** found — Divergence #1
(edit accepted zero answers and committed a delete of all responses; FIXED 2026-09-23, its scenario is now a
normal green regression guard) and Divergence #2 (Risk Rating tab shows a stale list immediately after create; log-only, stems from
the documented `refetchOnMount:false` design decision).
