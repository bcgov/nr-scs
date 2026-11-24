# Coverage — UC-SCA-009 Work Bench: Expiring Scaler Authorizations

> New to these files? See [`coverage-guide.md`](../../../../coverage-guide.md) for the column + status legend.

**Outcome: authored — first suite in the new `sca` domain.** The built React Work Bench (`/workbench`) has
a "Expiring Scaler Authorizations" section (one of three); this UC covers its list + Remove + Add (renew).

**Seeding / data:** the list is real-data + today-relative (a record shows iff
`expiry_notification_ind='N'` and `expiry_date ∈ (today, today+30]`), so every scenario seeds a disposable
expiring scaler authorization (licence 8437 / org 15, District Wide, expiry today+15) via
`POST /api/scaler-authorizations` and cleans it up via `DELETE /api/scaler-authorizations/{id}` (renewed
clones too). Recipe + provenance in `fixtures/admin/workbench/workbench-test-data.ts`. The section is shared global
state → the feature runs `@mode:serial`; the per-UC stress runs at `workers=1`.

**Re-grounding:** "Add" = renew (clones with extended dates → navigates to the new record's view); the
Remove `window.confirm` text is **"Are you sure you want to remove this record from the list?"** (legacy
S02/S03 said "delete this record").

| Source item (UC-SCA-009) | Source | App enforcement point | Scenario (tags) | Status |
|---|---|---|---|---|
| S01 — expiring scaler auth listed (Auth #, dates, licence, name, Remove + Add) | S01 | `GET /api/scaler-authorizations/workbench` | `workbench.feature` "appears on the Work Bench" @S01 @p0 | covered |
| S01 — Add renews → navigates to the issued authorization | S01 | `POST /{id}/renew` → `/scaler-authorizations/view/{newId}` | `workbench.feature` "Renewing … via Add" @S01 @p0 (asserts nav to the new record + the renewed expiry is **later** than the seed's — legacy "authority is extended") | covered |
| S02 — Remove after confirming → leaves the list | S02 | `window.confirm` → `POST /{id}/workbench/remove` (sets `expiry_notification_ind='Y'`) | `workbench.feature` "Removing … after confirming" @S02 @p0 (UI + API read-back absent; **and the authorization still exists** — legacy remove sets the notification flag, it is NOT a delete) | covered |
| S03 — Cancel at the confirm dialog → no change | S03 | confirm dismissed; no POST | `workbench.feature` "Cancelling the removal" @S03 @p2 (confirm text + row present + zero remove calls) | covered |
| S04 — empty section shows "Zero records found" | S04 | empty list | `workbench.feature` "shows no records when none are expiring" @S04 @p2 | covered (real data currently has 0 expiring scaler auths) |
| S05 — Remove/Add hidden without `workbenchScalerAuthManagement` | S05 | permission gate | — | blocked — mock auth grants only `SCS_SYS_ADMIN` (Coverage gap #1) |
| S06 — direct management-action call denied (403 / notAuthorized) | S06 | permission gate | — | blocked — single-role mock auth (Coverage gap #1) |
| S07 — District Scaling Manager menu access | S07 | menu/role | — | not-applicable — menu/role concern, not a Work Bench action (out of scope for this suite) |

**Role / permission coverage:** S05/S06 (the only permission items) are **blocked** by single-role mock
auth. All scenarios run as `SCS_SYS_ADMIN`.

**Symmetry check:** the two row actions (Remove, Add) and both remove arms (confirm, cancel) are covered.

**Net:** every actionable slice (list, Add/renew, Remove, Cancel, empty) is covered green. Uncovered:
S05/S06 (blocked — mock auth), S07 (not-applicable). No open divergences.
