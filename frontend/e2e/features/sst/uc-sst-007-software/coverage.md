# Coverage — UC-SST-007 Scale Site Software Inventory

> New to these files? See [`coverage-guide.md`](../../../coverage-guide.md) at the e2e root for the column + status-flag legend.

Sources reconciled: `software.feature` + `UC-SST-007-slices.md` (5 slices) + `UC-SST-007-technical.md`,
against the write path — of which there is **none**: the new app's Software tab is READ-ONLY
(`SoftwareTab` → GET /scale-sites/{id}/software; `ScaleSiteSoftwareController` has no create/update/delete).
So the legacy "maintain" is a display-only list, with no user-input fields, validators, or mutations.

| Source item | Source citation | App enforcement point | Scenario (tags) | Status | Gap/defect |
|---|---|---|---|---|---|
| View software inventory — site has records | S01 | `SoftwareTab` table (GET /software) | `software.feature @S01 @p0` | covered | — |
| Six display columns (Scaling Program, Version, Revision, Return Type, Return Count, Last Used Date) | Field Reference | `SoftwareTab` column headers + row | `@S01` (headers + row asserted) | covered | — |
| Software list empty for the site | S02 | `SoftwareTab` "No software found" empty state | `@S02 @p1` | covered | — |
| BR-SST-007-01: data via software view | BR table | GET /software (both records / none) | `@S01` + `@S02` | covered | — |
| District-Scaling-Manager side menu contents (S03) | S03 | legacy role menu | — | blocked | defects.md Coverage gap #1 |
| Search button hidden without `scalerSiteSearch` (S04) | S04 | permission gate | — | blocked | defects.md Coverage gap #1 |
| Session tombstone null → empty list (S05) | S05 | legacy `ResourceCache` session tombstone | — | not-applicable | no new-app equivalent (empty case = S02) |

**Role / permission coverage:** blocked by mock auth (grants only `SCS_SYS_ADMIN`). The menu-contents (S03)
and search-button-permission (S04) slices are role-gated and not exercisable. No write path exists, so
there is no editor/viewer distinction to test beyond that.

**Symmetry check:** n/a — read-only UC (no create/update mirror). Both sides of the one business rule
(records exist / no records) are covered (S01 / S02).

**Test-data note:** real sites used READ-ONLY — `520` has >=1 software row (pinned `lastUsedDate`
2016-04-15), `14N` has none. No seed/cleanup; parallel-safe. Pinned in `fixtures/sst/scale-site-test-data.ts`.

**Status values:** `covered` · `not-applicable` (legacy-only) · `blocked` (env/auth).
