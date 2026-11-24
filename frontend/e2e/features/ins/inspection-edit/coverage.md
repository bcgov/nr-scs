# Coverage — Edit Site Inspection (app-only, no legacy UC)

> New to these files? See [`coverage-guide.md`](../../../coverage-guide.md) at the e2e root for the column + status-flag legend.

**This suite has no legacy Gherkin to reconcile against.** The new app's inspection EDIT screen
(`/scale-sites/:id/inspections/edit/:inspectionId`, PUT `/api/scale-sites/inspection/{id}`) is an
**app-only capability**: UC-INS-003 was the only legacy INS use case that reached the legacy edit form,
and it went there purely to capture a compliance/enforcement issue — which the new app never built (see
[`../uc-ins-003-compliance-enforcement/coverage.md`](../uc-ins-003-compliance-enforcement/coverage.md),
which flagged this suite for authoring: *"Worth a dedicated 'Edit Inspection' suite as app-only
coverage — flagged, not authored"*). So the inventory below is built from the **app's own write path**
rather than from a `-slices.md` / `-technical.md` pair, and the "Source citation" column cites the app.

Sources reconciled: `pages/Edit/ScaleSiteInspection/index.tsx` (`validateFormValues`,
`buildUpdateRequest`, the reset/back/submit handlers, the three unavailable-record branches),
`components/Form/ScaleSiteInspectionDetails` + `…Questions` (mode="edit"),
`components/Form/ScaleSiteInspectionDetails/fieldErrors.ts`,
`services/scaleSiteInspections.service.ts`, and backend `ScaleSiteInspectionService.updateScaleSiteInspection`
/ `InspectionValidator`. **Every endpoint behaviour below was ground-truthed by hand on 2026-09-09**
(create → edit read → PUT happy → PUT future-date → PUT bad-inspector → PUT follow-up-inconsistent →
PUT partial-question-set → PUT missing-id → DELETE), against nr-scs `main` @ `53221c5`.

**Test data:** every scenario **seeds its own inspection** via the create API (`seedInspection`) on site
**520** and deletes it on teardown — ids and rationale are pinned in
[`fixtures/ins/ins-test-data.ts`](../../../fixtures/ins/ins-test-data.ts), not repeated here. It must
never edit the shared real anchor the security suites read: under `fullyParallel` that would corrupt
another suite's fixture. Dates are today-relative (`daysAgo`/`daysAhead`) — the inspection date must be
non-future, while a follow-up **due** date legitimately may be in the future.

| Source item | Source citation (app) | App enforcement point | Scenario (tags) | Status | Gap/defect |
|---|---|---|---|---|---|
| Happy-path update end-to-end (header + every answer + follow-up) + read-back | write path | stage-less form → PUT → `/view/{id}` + edit read-back | edit `@S01 @p0` | covered | — |
| Entry from the view's "Edit Record" action | `View/…/index.tsx:263-274` | `PermissionGate` → `navigate(edit route)` | navigation `@S02 @p1` | covered | — |
| Back abandons changes, returns to the detail view | `index.tsx:810-817` | `navigate(inspectionDetailPath)` | navigation `@S02 @p1` (spy=0 **and** record unchanged) | covered | — |
| Reset restores the values the form loaded with | `handleReset` (`index.tsx:560-569`) | `cloneFormValues(initialValues)` | navigation `@S03 @p2` (compared to the API baseline, no literals) | covered | — |
| Inspection Date required | `validateFormValues` (`:199`) | client, pre-PUT | validation `@S04 @p1` | covered | — |
| Inspector # required | `validateFormValues` (`:205`) | client, pre-PUT | validation `@S04 @p1` | covered | — |
| Site Operator present required | `validateFormValues` (`:213`) | client, pre-PUT | validation `@S04 @p1` | covered | — |
| Inspection Date not future | `validateFormValues` (`:201`) + `InspectionValidator:114-121` | client blocks first | validation `@S05 @p1` | covered | — |
| Inspector must be a valid euser GUID | `validateFormValues` (`:207`) via `isInspectorGuid` | client, pre-PUT | validation `@S06 @p1` | covered | — |
| Follow-up Y-arm: Action / Due Date / Complete? all required | `validateFormValues` (`:230-243`) + `InspectionValidator.validateFollowUpFields` | client blocks first | validation `@S07 @p1` (all three messages) | covered | — |
| Follow-up N-arm: detail fields cleared **and disabled** | `handleQuestionFieldChange` (`:514-518`) + `followUpEnabled` (`Questions:184`) | UI disables → not user-reachable | validation `@S07 @p2` (asserts the disabling) | covered (re-ground) | Re-ground #1 |
| Answer required per question | `validateFormValues` (`:222`) | client, pre-PUT | validation `@S10 @p1` | covered | Coverage gap #1 (**closed**) |
| Malformed route id rejected before any read | `index.tsx:346-348` | page guard → "Inspection not available" | not-found `@S08 @p2` | covered | — |
| Well-formed but absent id → cannot be loaded | detail/edit GET 404 | "Could not load inspection" empty section | not-found `@S08 @p1` | covered | — |
| Server rejection surfaces the api banner ("Inspection update failed") | `updateMutation.onError` (`:426-434`) | `extractApiError` → `bannerMode="api"` | not-found `@S09 @p1` (record deleted out-of-band, then Save) | covered | — |
| Field-scoped server error mapped **inline** onto Inspection Date | `fieldErrors.ts` + `InspectionValidator:119-120` | `mapInspectionServerFieldErrors` → `scrollToError` | — | **not-applicable** (not UI-reachable) | Coverage gap #2 |
| Question coverage: all required questions must be submitted | `InspectionValidator` (`:108-111`) | backend only | — | **not-applicable** (not UI-reachable) | Coverage gap #3 |
| "Follow-up to Inspection #" / "Site Operator (if different from owner)" editable | `Details:148,173` (`isCreate ? editable : readOnly`) | create-only by design | — | not-applicable (create-only) | — |

**Symmetry check.** The relevant mirror matrices are both complete: **create × update** — every client
rule UC-INS-001 covers for create is covered here for update (required trio, future date, inspector
format, follow-up Y-arm), with the one create-only pair explicitly excluded above; and the per-question
**follow-up Y-arm / N-arm** — the Y-arm is asserted by its three messages, the N-arm by the app's actual
enforcement (clearing + disabling), so neither arm is left implicit. Every question row is answered by
ONE dynamic loop keyed off the rendered `inspectionQuestionId`s, so the suite survives a CCQ
question-library change; per-question read-back assertions are keyed **by id, never by question text**,
because the real library contains duplicate texts (two questions are both "Site Active?").

**Role / permission coverage: route-level automated elsewhere, control-level gap open.** The route is
gated by `ProtectedRoute permission={SCALE_SITE_INSPECTION_UPDATE}` and the backend handler by
`@RequiresPermission(SCALE_SITE_INSPECTION_UPDATE)`. **Route and endpoint** entitlement is proven per
role in [`features/security/`](../../security/) — the check-scaler suite probes the edit route and the
edit-init endpoint directly (`check-scaler-role/url-access.feature`, `…/api-access.feature`), and the
CE-technician suite asserts its read-only refusals of the same two
(`ce-technician-role/url-access.feature`, `…/api-access.feature`).

What is **not** covered anywhere is the **"Edit Record" button's own visibility**: the write-control
sweep in [`fixtures/security/role-columns.ts`](../../../fixtures/security/role-columns.ts) enumerates
controls on the **scaler** and **site** record tabs only, and that button lives on the inspection *view*
page, which no sweep visits (verified 2026-09-09). Logged as Coverage gap #4 — it belongs in a role
suite, not here. This suite runs as the mock administrator and asserts **behaviour**, not entitlement.

Note the mechanism now exists at all: this supersedes the "blocked by mock auth (grants only
`SCS_SYS_ADMIN`)" note still carried in the older UC-INS-001/002 ledgers, which predate `PermissionGate`
and the eleven-role roll-out.

**Coverage gaps (not app problems):**
- **#1 — CLOSED (2026-09-09), and worth recording why it was ever opened.** It was first logged as
  deferred on the reasoning that the edit form loads every row pre-answered and the Answer `<Select>`
  offers no blank option, so a blank answer would need a DOM-level force. **That reasoning was wrong:**
  the Select renders a blank `<SelectItem value="" text="Select" />` above the question's answer options
  (`ScaleSiteInspectionQuestions/index.tsx:248`), so clearing an answer is an ordinary user gesture.
  Now covered by `validation @S10 @p1`.
- **#2 (inline field-scoped server error)** — `fieldErrors.ts` maps a backend `FieldValidationException`
  on `inspectionDate` to an inline error on that field. Confirmed live that the backend does return it
  (`VALIDATION_ERROR` + `fieldErrors[inspectionDate]`), but the **client's own** future-date rule blocks
  the same input first, so the mapper's inline branch is not reachable through the UI. It is unit-tested
  (`fieldErrors.unit.test.ts`); only the generic api-banner branch is E2E-reachable, and that IS covered
  (`@S09`). Not a hole in the app.
- **#3 (question-coverage rule)** — the backend rejects a partial question set (verified: 400 *"Question
  responses must include all required inspection questions."*), but the form always submits every row it
  rendered, so a partial set cannot be produced by a user gesture. Backend-only; covered by
  `InspectionValidatorTest`.
- **#4 (Edit Record button visibility per role)** — see `defects.md` Coverage gap #1; the paragraph above
  explains why no existing sweep reaches it. Recorded so it is not silently dropped.

**Re-grounding note #1** — the legacy ERR-008 shape ("follow-up detail populated when it is not
required") has no reachable UI arm here, exactly as in create: choosing Follow-Up Required = N clears
**and disables** the three detail inputs. Rather than log it as an untested arm, `validation @S07 @p2`
asserts the disabling, which is the app's real enforcement of that rule.

**Status values:** `covered` · `covered (re-ground)` · `not-applicable` (create-only / not UI-reachable)
· `deferred` (see Coverage gaps). **No divergences and no `@discovered-*` reds** — every scenario is a
normal green assertion against the app's real behaviour.
