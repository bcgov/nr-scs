# Coverage — UC-SST-008 Maintain Scale Site Assigned Scalers

> New to these files? See [`coverage-guide.md`](../../../coverage-guide.md) at the e2e root for the column + status-flag legend.

Sources reconciled: `authorized-scalers.feature` + `UC-SST-008-slices.md` (6 slices) +
`UC-SST-008-technical.md`, against the write path — of which there is **none** on this tab: the new app's
Authorized Scalers tab is READ-ONLY (`AuthorizedScalersTab` → GET /scale-sites/{id}/authorized-scalers)
plus a CLIENT-SIDE status filter (`useStatusFilter`). Assign/remove of authorizations lives in the SCA
domain (the "Add Authorization" button routes to /scaler-authorizations/create). Also covers
UC-SST-005 S09 (filter authorized scalers).

| Source item | Source citation | App enforcement point | Scenario (tags) | Status | Gap/defect |
|---|---|---|---|---|---|
| View authorized scalers list | S01 | `AuthorizedScalersTab` table (GET) | `@S01 @p0` | covered | — |
| Eight display columns (Authorization # … District Wide?) | Field Reference | table column headers + row | `@S01` (headers + row asserted) | covered | — |
| Filter by status (present → rows kept) | S02; UC-SST-005 S09 | `useStatusFilter` (client-side, exact status match) | `@S02 @p1` | covered | — |
| Filter by status with no matches → empty | S03 | `useStatusFilter` → "No authorized scalers found" | `@S03 @p1` | covered | — |
| BR-SST-008-01: data via authorized-scalers view | BR table | GET (both records / filtered-empty) | `@S01` + `@S03` | covered | — |
| Filter to a DIFFERENT populated status (Active/Cancelled non-empty) | S02 | `useStatusFilter` | — | not-applicable | data: the extract's scalers are ALL "Expired" (see note) |
| "Add Authorization" hidden without permission (S04) | S04 | permission gate | — | blocked | defects.md Coverage gap #1 |
| Validation on submitted list-filter data (S05) | S05 | legacy `ScaleSiteScalersVwValidator` | — | not-applicable | read-only tab: no submitted form (GET by route id) |
| Not authorized to access page (S06) | S06 | role/session gate | — | blocked | defects.md Coverage gap #1 |

**Role / permission coverage:** blocked by mock auth (grants only `SCS_SYS_ADMIN`). The "Add Authorization"
button-hidden (S04) and not-authorized (S06) slices are role-gated and not exercisable. The tab has no
write path of its own (authorizations are managed in the SCA domain).

**Symmetry check:** n/a — read-only list UC. The status filter is proven both ways: a present status keeps
rows (S02), an absent status empties the list (S03).

**Test-data note:** real site `520` used READ-ONLY (8 authorized scalers, all status "Expired"). Because the
whole extract's authorized scalers are "Expired", filtering to Active/Cancelled empties the list (S03) and
filtering to Expired keeps rows (S02) — which is what proves the filter; a cross-status *non-empty* filter
can't be shown until the data has other statuses. Pinned in `fixtures/sst/scale-site-test-data.ts`.

**Status values:** `covered` · `not-applicable` (legacy-only / data-limited) · `blocked` (env/auth).
