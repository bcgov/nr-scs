# Coverage — UC-SCA-010 Work Bench: Expiring Scale Site Authorizations

> New to these files? See [`coverage-guide.md`](../../../../coverage-guide.md) for the column + status legend.

**Outcome: authored** (`sca` domain). The Work Bench (`/workbench`) "Expiring Scale Site Authorizations"
section — list + Remove + Add (renew).

**Seeding / data:** each scenario seeds a disposable expiring scale-site authorization (site `000`, expiry
today+15) via `POST /api/scale-site-authorizations` and cleans up via `DELETE /api/scale-site-authorizations/{id}`
(renewed clones too). Window recipe (`expiry_notification_ind='N'`, `expiry_date ∈ (today, today+30]`,
uncancelled) confirmed against `scs_scale_site_auth_wb_vw`. Shared global section → `@mode:serial`; stress
at `workers=1`.

**Re-grounding:** "Add" = renew → navigates to `/scale-site-authorizations/view/{newId}`; Remove confirm
text "Are you sure you want to remove this record from the list?".

| Source item (UC-SCA-010) | Source | App enforcement point | Scenario (tags) | Status |
|---|---|---|---|---|
| S01 — expiring scale-site auth listed (Auth #, dates, Site #, name, Remove + Add) | S01 | `GET /api/scale-site-authorizations/workbench` | "appears on the Work Bench" @S01 @p0 | covered |
| S01 — Add renews → navigates to the issued authorization | S01 | `POST /{id}/renew` → view | "Renewing … via Add" @S01 @p0 (nav to new record + renewed expiry later than seed's) | covered |
| S02 — Remove after confirming → leaves the list | S02 | `POST /{id}/workbench/remove` | "Removing … after confirming" @S02 @p0 (UI + API read-back absent; authorization still exists — remove ≠ delete) | covered |
| S03 — Cancel at confirm → no change | S03 | confirm dismissed; no POST | "Cancelling the removal" @S03 @p2 | covered |
| S04 — empty section "Zero records found" | S04 | empty list | — | not-applicable — the real extract always has ≥1 expiring scale-site auth (e.g. 239291), so the section is never reliably empty (Coverage gap #2) |
| S05 — Remove/Add hidden without `workbenchScaleSiteAuthManagement` | S05 | permission gate | — | blocked — single-role mock auth (Coverage gap #1) |
| S06 — direct management-action call denied | S06 | permission gate | — | blocked — single-role mock auth (Coverage gap #1) |

**Role / permission coverage:** S05/S06 blocked (single-role mock auth). All scenarios run as `SCS_SYS_ADMIN`.

**Net:** list, Add/renew, Remove, Cancel covered green. Uncovered: S04 empty (not-applicable — real data),
S05/S06 (blocked). No open divergences.
