# Coverage — UC-SCA-011 Work Bench: Expiring Mark Site Designations

> New to these files? See [`coverage-guide.md`](../../../../coverage-guide.md) for the column + status legend.

**Outcome: authored** (`sca` domain). The Work Bench (`/workbench`) "Expiring Mark Site Designations"
section — list + Remove + Add (renew).

**Seeding / data:** each scenario seeds a disposable expiring MSD (mark `ES20R4`, **District Wide** so no
scale-site → no `hauling_mark_site` (mark,site) unique-key collision, expiry today+15) via
`POST /api/mark-site-designations`, and cleans up **at the DB** (`deleteMarkSiteDesignationsViaDb` —
HAULING_MARK_AUTHORIZATION has no DELETE endpoint), including the renewed clone. **Requires the
`msd-create-mark.sql` patch** applied (`scripts/apply-patches.sh`) so ES20R4 is creatable. Window recipe
confirmed against `scs_mark_site_des_wb_vw`. Shared global section → `@mode:serial`; stress at `workers=1`.

**Re-grounding:** "Add" = renew → navigates to `/mark-site-designations/view?haulingMarkAuthorizationId={newId}`;
Remove confirm text "Are you sure you want to remove this record from the list?".

| Source item (UC-SCA-011) | Source | App enforcement point | Scenario (tags) | Status |
|---|---|---|---|---|
| S01 — expiring MSD listed (Auth #, dates, Timber Mark, Remove + Add) | S01 | `GET /api/mark-site-designations/workbench` | "appears on the Work Bench" @S01 @p0 | covered |
| S01 — Add renews → navigates to the issued MSD | S01 | `POST /{id}/renew` → MSD view | "Renewing … via Add" @S01 @p0 (nav to new record + renewed expiry later than seed's) | covered |
| S02 — Remove after confirming → leaves the list | S02 | `POST /{id}/workbench/remove` | "Removing … after confirming" @S02 @p0 (UI + API read-back absent; MSD still exists — remove ≠ delete) | covered |
| S03 — Cancel at confirm → no change | S03 | confirm dismissed; no POST | "Cancelling the removal" @S03 @p2 | covered |
| S04 — empty section "Zero records found" | S04 | empty list | "shows no records when none are expiring" @S04 @p2 | covered (real data currently has 0 expiring MSDs) |
| S05 — Remove/Add hidden without `workbenchMSDAuthManagement` | S05 | permission gate | — | blocked — single-role mock auth (Coverage gap #1) |
| S06 — direct management-action call denied | S06 | permission gate | — | blocked — single-role mock auth (Coverage gap #1) |

**Role / permission coverage:** S05/S06 blocked (single-role mock auth). All scenarios run as `SCS_SYS_ADMIN`.

**Net:** list, Add/renew, Remove, Cancel, empty covered green. Uncovered: S05/S06 (blocked). No open
divergences.
