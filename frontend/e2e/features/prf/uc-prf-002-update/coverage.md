# Coverage — UC-PRF-002 Update Scaler Performance Remark

> New to these files? See [`coverage-guide.md`](../../../coverage-guide.md) at the e2e root for the column
> + status-flag legend.

Sources reconciled: `gherkin/UC-PRF-002-S01..S11.feature` + `UC-PRF-002-slices.md` + `UC-PRF-002-technical.md`,
against the same write path as UC-PRF-001 (the create and edit forms share `PerformanceRemarksForm` +
`validatePerformanceRemarkForm`; edit calls `PUT /scalers/{lic}/performance-remarks/{id}`). Ground-truthed
2026-08-17 (seed via POST → PUT edit → GET read-back). The shared re-grounding (in-tab swap not routes;
licence in URL not tombstone; single Issue-Type Select; re-grounded message text) is documented in
UC-PRF-001's coverage.md / defects.md and applies here identically — this file records only the update-specific
reconciliation.

**Test data:** every scenario **seeds its own remark via API** on anchor scaler **5828** (a fresh id it owns
+ DB-cleans through the DELETE endpoint), so it is parallel-safe and independent of any real record surviving
a re-extract. Negative (client-blocked) cases prove the negative by an **id-scoped read-back that the seeded
Description is unchanged**.

| Source item | Source citation | App enforcement point | Scenario (tags) | Status | Gap/defect |
|---|---|---|---|---|---|
| Update a remark's Description end-to-end (persisted) | S01 / BR-PRF-002-01 | Edit → PUT `/…/{id}`; GET read-back asserts new Description | update `@S01 @p0` | covered | — |
| Reach the edit form via the read-only detail view (Edit Record) | S04 | Issue # button → detail panel → "Edit Record" → edit form | update `@S04 @p1` | covered | — |
| Back from the edit form discards changes | S03 | Back → list; nothing PUT | update `@S03 @p2` (read-back unchanged) | covered | — |
| Reset restores original values before saving | S02 | `PerformanceRemarksAction` reset → save persists originals | update `@S02 @p2` (read-back unchanged) | covered | — |
| Description required on edit (ERR-005) | S05 | shared `validate` rule 6 → "Description is required." | validation `@S05 @p1` (outline) | covered | — |
| Date of Incident not future on edit (ERR-001) | S06 | shared `validate` rule 3 → "Date of Incident cannot be in the future." | validation `@S06 @p1` (outline) | covered | — |
| Exactly one of Action/Outcome on edit (ERR-002) | S07/S08 | single Issue-Type Select; missing code → "Action is required." / "Outcome is required." | validation `@S08 @p1` (outline: both arms) | covered (re-ground) | UC-PRF-001 verified-not-defect #2 |
| Suspension start ≤ end on edit (ERR-003) | S09 | shared `validate` rule 9 → "Suspension start date must be on or before the suspension end date." | validation `@S09 @p1` (outline) | covered (re-ground) | UC-PRF-001 verified-not-defect #1 |
| Associated Check Scale # must exist on edit (server, ERR-004) | S10 | backend 400 on PUT → inline "A check scale could not be found for 1146996." | validation `@S10 @p1` (outline: not-exist) | covered | — |
| "Both Action and Outcome selected" (ERR-002 both-arm) | S07 | structurally impossible (single Issue-Type Select) | — | not-applicable (re-ground) | UC-PRF-001 verified-not-defect #2 |
| URL-tamper / permission absent → notAuthorized (ERR-009) | S11 | no per-element permission gate; mock auth grants only `SCS_SYS_ADMIN` | — | blocked | Coverage gap #1 |

**Symmetry check:** create↔update is the primary mirror for this domain — the validator, field ids and
message strings are shared, so the update validation outline mirrors the create one (UC-PRF-001) arm-for-arm
(description, date-future, action-required, outcome-required, suspension-order, check-scale server-reject).
The two entry paths to edit — summary-row "Edit" and detail-view "Edit Record" — are both covered (S01, S04).
The negative proof differs by direction: create uses the POST spy (count 0); update uses an id-scoped
read-back that the persisted Description is unchanged.

**Role / permission coverage:** blocked by single-role mock auth + no frontend element-permission mechanism —
S11 (URL-tamper) is not reproducible; logged in Coverage gap #1. No `@skip` scenarios authored.

**Status values:** `covered` · `covered (re-ground)` · `not-applicable` · `blocked` · `divergence`.
**No divergences** — update enforces the shared rules correctly.
