# Defects — UC-CCQ-003 Maintain Templates (Scale Authorization Templates)

> How this log works (registers, tags, how to read an entry): [`defects-guide.md`](../../../../defects-guide.md)

> **2026-07-28 correction.** The prior version of this file deferred UC-CCQ-003 as an "unbuilt RSK
> feature". That was wrong: the page IS built and routed (`/maintenance/templates`,
> `pages/Administration/Maintenance/Templates`). UC-CCQ-003 maintains **Scale Authorization Templates**
> (a Name + a Type = condition class + a Reg/Dist, with bound conditions) — NOT a risk questionnaire; the
> recovered legacy gherkin (`scaleAuthTemplateDto`, `scaleConditionClassCode`, "bind conditions",
> `MaintainTemplatesAction`) matches the built page exactly. A full suite is now authored. See coverage.md.

> **⚑ Merge reconciliation (2026-07-28, main ← this branch) — BA/QA please confirm.** A 2026-07-27
> main-branch re-scan filed UC-CCQ-003 as "no template-maintenance UI — templates are DB-managed"
> (deferred / possibly `not-applicable`). It was reasoning about a **different entity**: the RSK
> **risk-questionnaire-template** (bundles *questions*; `risk_questionnaire_template_id`;
> `RiskQuestionnaireService` consumes it read-only; the table was updated in Delivery via a DB script) —
> which genuinely has **no** maintenance screen. This suite covers the entity UC-CCQ-003's **gherkin**
> describes: the **Scale Authorization Templates** page (`/maintenance/templates`, binding *conditions*),
> which IS built — the suite runs green against it. Both facts are true about two different "templates";
> kept this branch's build-and-authored disposition. If UC-CCQ-003 was meant to be the DB-managed
> risk-questionnaire-template, its title/brief should be split from this suite.

## Bug / Regression
_None found._

## Divergence

### Divergence #1 — Template Name is capped at 100 characters, not the legacy/DB limit of 200
- **What's wrong (plain):** The new app rejects a Template Name longer than **100** characters. The legacy
  rule (ERR-004) and the database column (`SCALE_AUTH_TEMPLATE.SCALE_AUTH_TEMPLATE_NAME`) both allow **200**.
  So names of 101–200 characters that the legacy app and the DB would accept are refused by the new app.
- **Expected vs actual:**
  - *Expected* (legacy `ScaleAuthTemplateValidator` + DB column): up to 200 characters; a 201-char name is
    the over-length case.
  - *Actual:* `POST /api/scale-auth-templates` with a 101-char name → **HTTP 400** `VALIDATION_ERROR`,
    fieldError `{ scaleAuthTemplateName: "size must be between 0 and 100" }` (Jakarta `@Size(max=100)` on
    the generated request model). The rejection is clean (no 500) and nothing is persisted.
- **How we caught it:** reproduced directly — `POST /api/scale-auth-templates` with a 201-char name returns
  the 400 above (not a 500, and not accepted). `create.feature @S09` asserts the app's *real* boundary
  (a 101-char name is rejected + not persisted) and is GREEN; it does not assert the legacy 200.
- **Classification:** `suspected-intentional-change` (log-only — no red test). This is plausibly an
  OpenAPI-spec `maxLength: 100` that is stricter than the DB, or a deliberate tightening. Either way the
  app safely rejects over-length input, so there is no failing behaviour to represent as a red test.
- **Severity/priority:** @p2. **Environment:** local mock-auth stack, seeded Docker DB, 2026-07-28.
- **Re-verified 2026-09-08** (still live, unchanged). Reproduction, copy-paste:
  `POST /api/scale-auth-templates` with a 101-character name, `scaleConditionClassCode: "MSD"`,
  `orgUnitNo: 1826` returns **HTTP 400**
  `{"code":"VALIDATION_ERROR","message":"One or more fields are invalid.","fieldErrors":[{"field":"scaleAuthTemplateName","message":"size must be between 0 and 100"}]}`.
  Nothing is persisted.
- **Ready for a ticket. Suggested Jira summary:** *"Scale Auth Template name capped at 100 chars; DB column
  and legacy rule allow 200"*. **The decision BA/QA must make** is only this: is 100 deliberate? If yes,
  close this as intended and the legacy ERR-004 (200) is superseded — no code change, and `create.feature`
  @S09 already asserts the real boundary. If no, widen `@Size`/OpenAPI `maxLength` to 200 and the same
  scenario's boundary value moves with it.
- **Status:** OPEN. **ACTION: BA/QA to raise a Jira ticket** — confirm whether 100 is intended; if not,
  widen the API `@Size`/OpenAPI `maxLength` to 200 to match the DB and legacy rule.

### Divergence #2 — over-length save shows a generic error, not the backend's field message
- **What's wrong (plain):** When a save is rejected (e.g. the over-length name above), the Templates page
  shows a generic error banner rather than the backend's specific "size must be between 0 and 100"
  message. Other maintenance pages surface the backend `message` via `extractApiError`; the Templates
  page's `onError` uses the raw `e.message`.
- **Evidence:** `Templates/index.tsx` `saveMutation.onError` → `setBannerError(e.message ?? 'Save failed.')`
  (code-observed; the E2E asserts only that *an* error banner appears, not its exact text, to avoid
  brittleness). Backend correctly returns the specific field message (see Divergence #1).
- **Classification:** `suspected-defect` (minor UX). Low value to represent as a red test (the substantive
  behaviour — rejection + nothing persisted — is covered green in @S09).
- **Re-verified 2026-09-08, and it is broader than first logged:** the same raw-`e.message` pattern is on
  **both** mutations — `Templates/index.tsx:112` (save) and `:129` (delete) — so a refused delete is just
  as generic as a refused save. Other maintenance pages (e.g. `System/index.tsx:96,99`) route errors
  through `extractApiError`, which surfaces the backend's specific message. The backend does return one:
  see the `fieldErrors` payload in Divergence #1.
- **Ready for a ticket. Suggested Jira summary:** *"Templates page shows a generic save/delete error
  instead of the backend's field message"*. **Scope for the dev:** two one-line changes to use
  `extractApiError`, matching the other maintenance pages. **Why it stays @p3:** the substantive
  behaviour — the write is refused and nothing is persisted — is already covered green by @S09; only the
  message text is degraded. The E2E deliberately asserts only that *an* error banner appears, so tightening
  the message will not turn this suite red.
- **Severity/priority:** @p3. **Status:** OPEN. **ACTION: BA/QA** — optionally align Templates on
  `extractApiError` for consistent, specific error messages.

## Coverage gap

### Coverage gap #1 — S10 Delete disabled when permission is denied — CLOSED 2026-09-08
- **Why it was open:** the local stack granted only `SCS_SYS_ADMIN`, so no permission-denied session could
  be produced to check that a user without `maintainTemplatesDelete` is refused the Delete control.
- **What changed:** the eleven-role permission roll-out; the mock picker can now sign in as any `SCS_` role.
- **How it is covered now:** `features/security/maintenance-controls/maintenance-control-sweep.feature`
  asserts Delete **withheld** on `/maintenance/templates` for the scaling-manager column and **offered**
  for `SCS_SYS_ADMIN` — the administrator contrast matters here, since without it the withheld assertion
  would also pass against a control that no longer renders for anyone.
- **Status:** CLOSED (covered elsewhere). Closed 2026-09-08.

### Coverage gap #2 — S04 "no templates match the filter → empty list" — OPEN, reclassified `blocked` 2026-09-08
- The filter-narrows-the-list behaviour IS covered (`filter.feature`: filtering to SIA hides an MSD
  template, filtering to MSD shows it). The legacy "no rows match" empty-state variant is not automated.
- **Reclassified from `deferred` to `blocked`.** This is not a low-priority choice — it is unreachable in
  this environment, which is a different disposition and belongs on the other side of the coverage
  denominator. The app renders the empty state fine; the test env cannot produce it.
- **Evidence (2026-09-08, re-verify after any DB re-extract):**
  `GET /api/static-lov?tableKey=SCALE_CONDITION_CLASS_CODE` returns exactly three codes — MSD, SIA, SCA —
  and the Filter control offers only those plus "All". Row counts via
  `GET /api/scale-auth-templates?scaleConditionClassCode=<code>`: MSD 13, SIA 16, SCA 11. Every selectable
  value is non-empty, so no filter choice yields an empty list.
- **Future action:** either a 4th condition class with no templates appears in a future extract, or the
  scenario is authored against a stubbed empty response — which would diverge from this suite's
  live-stack rule, so it needs a deliberate call rather than a quiet exception. @p2.
- **Status:** OPEN (`blocked`).

### Coverage gap #3 — S05 edit-mode Reset / S06 edit-mode Back — CLOSED 2026-09-08
- **Why it was open:** the create-mode arms were automated and the edit-mode arms were judged to add
  little, being the same client handlers (`resetForm()` / `setModalMode(null)`).
- **Why that reasoning was thin:** the handlers are shared but the *assertions* invert. Create-mode Reset
  empties the form; edit-mode Reset must **restore the loaded record** — a Reset that simply blanked the
  fields would pass the create-mode scenario and fail a user. Same for Back: create-mode proves nothing
  was created, edit-mode must prove nothing was **changed**.
- **How it is covered now:** `navigation.feature` @S05/@S06 (edit-mode). Reset asserts the Name field is
  restored to the seeded value; Back asserts the modal closed, the update spy counted zero PUTs, and an
  API read-back still shows the seeded name.
- **Status:** CLOSED. Closed 2026-09-08.

## Spec gap (gherkin-incomplete-vs-source)

### Spec gap #1 — ERR-005 (Type > 4 chars) and ERR-006 (Reg/Dist not a valid Long) are unreachable in the new UI
- **What:** Legacy `ScaleAuthTemplateValidator` raises ERR-005 (Type code > 4) and ERR-006 (Org Unit not a
  Long). In the new app **Type and Reg/Dist are `<Select>` dropdowns** (LOV-bound), so a user cannot enter
  an over-length Type or a non-numeric Reg/Dist — neither error is reproducible through the UI.
- **Status:** OPEN — informational; the suite intentionally omits ERR-005/ERR-006 client scenarios. Their
  required-field counterparts (Type blank / Reg-Dist blank) ARE covered via the S08 Save-disabled gating.

## Verified — not a defect
- **`Templates/index.tsx` passes `addPermission` but no `editPermission`/`deletePermission` — this is not
  the opt-in-prop hole it resembles.** Every other maintenance page hands all three gates to the shared
  `MaintenanceListPage`/`MaintenanceFormModal`, and a page that omits one shows the control to every role
  that can open the screen — the exact failure the §J control sweep exists to catch. Templates is
  different because it renders its **own** `TemplatesModal`, which gates Edit and Delete inline with
  `PermissionGate` (`TemplatesModal.tsx:355` and `:360`). The sweep's green Templates rows are therefore
  honest. Recorded so the asymmetry isn't re-investigated. (Verified 2026-09-08.)
- **The Templates (Scale Authorization Templates) page is built and fully functional**
  (create/edit/view/delete/filter/condition-binding), contradicting the prior "unbuilt RSK" disposition
  (see the correction note at the top).
- **The RSK risk-questionnaire-template has no maintenance UI (data-managed).** Confirmed by the 2026-07-27
  main re-scan: RSK assessments *consume* templates read-only; the table is populated by DB script. This is
  a DIFFERENT entity from the Scale Authorization Templates page this suite covers (see the merge
  reconciliation note at the top) — recorded so the distinction isn't re-litigated.
- **Required-field enforcement is client-side gating, not post-submit messages.** The app disables Save
  until Name + Type + Reg/Dist are set (`isFormValid`); `formErrors` is never populated. This is a valid
  re-grounding of legacy S08 (ERR-001/002/003), not a defect — covered green by the S08 outline.
- **On save the app forwards to the read-only view** (not back to the list) — consistent with every other
  SCS maintenance page; asserted by the create/update happy paths.
