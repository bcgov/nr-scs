# Coverage — UC-PRF-001 Record Scaler Performance Remark

> New to these files? See [`coverage-guide.md`](../../../coverage-guide.md) at the e2e root for the column
> + status-flag legend.

Sources reconciled: `gherkin/UC-PRF-001-S01..S11.feature` + `UC-PRF-001-slices.md` (control/message/field
matrix) + `UC-PRF-001-technical.md` (ERR-001..010 / STA-001..004 catalog), against the new app's write path:
`pages/View/Scaler/components/tabs/PerformanceRemarks/*` (`PerformanceRemarksTab` state machine,
`PerformanceRemarksAction` save guard, `PerformanceRemarksForm` fields, `performanceRemarkFormUtils`
`validatePerformanceRemarkForm`), `services/scalerPerformanceRemarks.service.ts`, and the backend
`PerformanceRemarkController` / `PerformanceRemarkService` (+ `checkScaleService.existsById` FK check).
Endpoints + write path ground-truthed by hand on 2026-08-17 (POST create → GET list read-back → DELETE →
empty; valid checkScaleId 145988 → 201; absent 1146996 → 400 fieldError).

**Re-grounding (new app ≠ legacy Struts).** Create/edit/detail are an in-tab state swap on the Scaler view
(`?tab=performance-remarks`), not routes/JSPs; the scaler **licence is a URL path param**, not a session
tombstone. "Issue Type" is a single `Select` (ACTION *or* OUTCOME), so the legacy "both selected" case is
structurally impossible and the exactly-one-of rule is enforced by UI shape. Validation is client-side with
**different message text** than the legacy validator (see defects.md → Verified-not-defect #1).

**Test data (real, 2026-08-17, see `fixtures/prf/performance-remark-test-data.ts`):** create anchor scaler
**5828** (0 pre-existing remarks; id-scoped assertions keep it parallel-safe). Empty-state read anchor
**7443** (never written to). Valid check scale **145988**; absent check scale **1146996**. Action codes
DGS/NAC/RSS, Outcome codes RS/RW (LOV-verified). Dates are today-relative (`daysAgo`/`daysAhead`).

| Source item | Source citation | App enforcement point | Scenario (tags) | Status | Gap/defect |
|---|---|---|---|---|---|
| Create with an Action, end-to-end (persisted) | S01 / BR-PRF-001-02 | Add → POST `/scalers/{lic}/performance-remarks` → list; GET read-back (code+date+desc) | create `@S01 @p0` | covered | — |
| Create with an Outcome instead of an Action (mirror arm) | S02 | same write path, Outcome code; read-back asserts outcm set / actn null | create `@S02 @p1` | covered | — |
| Add Performance Remark button rendered on the tab (STA-001) | S01 controls / STA-001 | `PerformanceRemarksTab` create trigger | create `@S01` (tab open + Add hop) | covered | — |
| Issue # shown on the created row; new row listed | S01 controls | list `TableResource`, Issue # button cell | create `@S01 @p0` (id-scoped row) | covered | — |
| Associated Check Scale # accepted when it exists (FK positive) | S10 (mirror) / BR-PRF-001-01 | `checkScaleService.existsById`; read-back asserts `checkScaleId` | create `@S01 @p1` (link 145988) | covered | — |
| Reset clears the create form | S03 | `PerformanceRemarksAction` reset | navigation `@S03 @p2` (fields blank) | covered | — |
| Abandon create via Back — nothing created | S04 | Back → list; nothing POSTed until Save | navigation `@S04 @p2` (Back + spy=0) | covered | — |
| Empty-list state for a scaler with no remarks | S01 screens | "No performance remarks found for this scaler." | navigation `@p2` (anchor 7443) | covered | — |
| Date of Incident required (ERR-004) | S06 | `validate` rule 1 → "Date of Incident is required." | validation `@S06 @p1` (outline: date blank) | covered (re-ground) | verified-not-defect #1 |
| Date of Incident not future (ERR-002) | S06 | `validate` rule 3 → "Date of Incident cannot be in the future." | validation `@S06 @p1` (outline: date future) | covered | — |
| Description required (ERR-003) | S07 | `validate` rule 6 → "Description is required." | validation `@S07 @p1` (outline: description blank) | covered | — |
| Exactly one of Action/Outcome (ERR-001) | S08 | single Issue-Type Select; missing code → "Action is required." / "Outcome is required." | validation `@S08 @p1` (outline: action + outcome arms) | covered (re-ground) | verified-not-defect #2 |
| Suspension start ≤ end (ERR-005) | S09 | `validate` rule 9 → "Suspension start date must be on or before the suspension end date." | validation `@S09 @p1` (outline: reversed period) | covered (re-ground) | verified-not-defect #1 |
| Associated Check Scale # must be a positive number (client) | S10 | `validate` rule 10 → "Associated Check Scale # must be a positive number." | validation `@S10 @p1` (outline: non-numeric) | covered | — |
| Associated Check Scale # must exist (server, ERR-006) | S10 | backend 400 `VALIDATION_ERROR` → inline "A check scale could not be found for 1146996." | validation `@S10 @p1` (server reject + nothing persisted) | covered | — |
| Description max 4000 (ERR-007) | S07 | `TextArea maxLength=4000` hard input cap (not browser-reachable as an error) | — | not-applicable (re-ground) | Coverage gap #3 |
| Date invalid-format (ERR-008) / suspension invalid-format | S06 | Carbon DatePicker constrains input to a valid `YYYY-MM-DD`; malformed strings not enterable | — | not-applicable (re-ground) | Coverage gap #4 |
| Permission gates (create button / edit / delete hidden; ERR-010 notAuthorized) | S05 / STA-001..004 | no per-element permission gate in the new app; mock auth grants only `SCS_SYS_ADMIN` | — | blocked | Coverage gap #1 |
| Session tombstone lost → "LicenceNo not found" (ERR-009) | S11 | re-ground: stateless — scaler licence is a URL path param, no session tombstone | — | not-applicable | Coverage gap #2 |

**Symmetry check:** the Action↔Outcome Issue-Type mirror is covered on both arms (create S01/S02 happy;
validation S08 both required-arms). The check-scale mirror is complete: valid FK accepted (create), client
non-numeric rejected, server non-existent rejected (validation). Create-vs-update symmetry is carried by the
sibling UC-PRF-002 (same validator, same messages). Suspension: the order rule is covered; the individual
invalid-format arms are constrained by the date picker (Coverage gap #4).

**Role / permission coverage:** blocked by mock auth (single `SCS_SYS_ADMIN` role) + no frontend
element-permission mechanism — S05 gating (hidden Add/Edit/Delete, notAuthorized) is not reproducible; logged
in Coverage gap #1. No `@skip` scenarios authored (the denied-user state cannot be produced at all).

**Status values:** `covered` · `covered (re-ground)` · `not-applicable` · `blocked` · `divergence`.
**No divergences** — every rule the new app enforces behaves correctly; the only re-grounding notes are the
message-text differences and the structurally-impossible "both selected" case (both verified-not-defect).
