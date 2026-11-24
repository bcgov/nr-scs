# Coverage — UC-PRF-003 Delete Scaler Performance Remark

> New to these files? See [`coverage-guide.md`](../../../coverage-guide.md) at the e2e root for the column
> + status-flag legend.

Sources reconciled: `gherkin/UC-PRF-003-S01..S05.feature` + `UC-PRF-003-slices.md` + `UC-PRF-003-technical.md`,
against `PerformanceRemarksTab` (row Delete → Carbon confirm `Modal` → `DELETE /scalers/{lic}/performance-remarks/{id}`).
Ground-truthed 2026-08-17 (seed via POST → DELETE → list empty; DELETE returns 204).

**Re-grounding.** Legacy delete used a browser `confirm()` then a `window.location` GET to
`/scalerPerformanceRemarkDelete.do`; the new app uses a Carbon confirm **Modal** — heading
"Are you sure you want to delete this record?" (CNF-001 text preserved), primary "Confirm Delete", secondary
"Cancel" — and a REST `DELETE`. The shared re-grounding (licence in URL not tombstone; single-role auth) is
documented in UC-PRF-001.

**Test data:** each scenario **seeds its own remark via API** on anchor scaler **5828** (a fresh id it owns),
so it is parallel-safe; the happy-delete scenario removes it (cleanup then sees 404 = already gone), the
cancel scenario leaves it (cleanup DELETEs it).

| Source item | Source citation | App enforcement point | Scenario (tags) | Status | Gap/defect |
|---|---|---|---|---|---|
| Delete a remark after confirming (removed from DB + list) | S01 / BR-PRF-003-01 | row Delete → Modal "Confirm Delete" → DELETE; UI row gone + GET read-back absent | delete `@S01 @p0` | covered | — |
| Confirm dialog text (CNF-001) | S01 / CNF-001 | Carbon Modal heading "Are you sure you want to delete this record?" | delete `@S01` (modal asserted visible) | covered (re-ground) | verified-not-defect #1 |
| Cancel at the confirmation keeps the remark | S02 | Modal "Cancel" → `deleteCandidate=null`, no DELETE | delete `@S02 @p1` (still listed + read-back present) | covered | — |
| Session tombstone lost → "LicenceNo not found" (ERR-001) | S03 | re-ground: stateless — scaler licence is a URL path param, no tombstone | — | not-applicable | Coverage gap #1 |
| URL-tamper delete without permission → notAuthorized | S04 | no per-element permission gate; mock auth grants only `SCS_SYS_ADMIN` | — | blocked | Coverage gap #2 |
| Delete controls hidden for unpermissioned user (STA-001..003) | S05 | no per-element permission gate | — | blocked | Coverage gap #2 |

**Symmetry check:** the confirm↔cancel mirror is fully covered — S01 confirms (row + DB gone), S02 cancels
(row + DB intact). Both directions of the delete read-back are asserted (absent / present).

**Role / permission coverage:** blocked by single-role mock auth + no frontend element-permission mechanism —
S04 (URL-tamper) and S05 (hidden controls) are not reproducible; logged in Coverage gap #2. No `@skip`
scenarios authored.

**Status values:** `covered` · `covered (re-ground)` · `not-applicable` · `blocked` · `divergence`.
**No divergences** — delete + confirm/cancel behave correctly.
