# Coverage — UC-SST-004 Create Scale Site

> New to these files? See [`coverage-guide.md`](../../../coverage-guide.md) at the e2e root for the column + status-flag legend.

Sources reconciled: `create.feature` + `validation.feature` + `UC-SST-004-slices.md` (control/message
matrix) + `UC-SST-004-technical.md` (ERR/FLD/STA catalog), against the app's write path
(`components/Form/ScaleSiteForm.validateScaleSiteForm` client-side, then `ScaleSiteService.validateForSave`
+ the `SCALE_SITE` insert trigger server-side). The new app validates required / duplicate / timber-brand /
coordinate rules **client-side** (blocks the POST); owner-existence and the BC-boundary are **server-side**.

| Source item | Source citation | App enforcement point | Scenario (tags) | Status | Gap/defect |
|---|---|---|---|---|---|
| Happy-path create + persist | S01; detailed BasicFlow steps 14–17 | `ScaleSiteController.createScaleSite` → `ScaleSiteService.createScaleSite`; PK via `SCS_SCST_BR_IU_TRG` | `create.feature @S01 @p0` | covered | — |
| Read-back incl. site-type rows | S01; Data Field Ref | `GET /scale-sites/{id}/summary` (`siteTypes[]`) | `@S01` (poll read-back) | covered | — |
| Required: Scale Site Name (FLD-001) | S02; technical FLD-001 | `validateScaleSiteForm` (`scaleSiteName`) | `validation.feature @S02 @p1` | covered | — |
| Required: Owner Client (FLD-002) | S02; FLD-002 | `validateScaleSiteForm` (`ownerClient`) | `@S02` | covered | — |
| Required: Owner Client Location (FLD-003) | S02; FLD-003 | `validateScaleSiteForm` (`ownerLoc`) — loc default `00` cleared to exercise it | `@S02` | covered | — |
| Required: Reg / Dist (FLD-004) | S02; FLD-004 | `validateScaleSiteForm` (`regDist`) | `@S02` | covered | — |
| Required: Description of Site Location (FLD-005) | S02; FLD-005 | `validateScaleSiteForm` (`siteLocation`) | `@S02` | covered | — |
| At least 1 Site Type / Primary required (ERR-002) | S02; ERR-002 | `validateScaleSiteForm` (`primarySiteType`) — new text "Primary site type is required." | `@S02` | covered | — |
| Duplicate site types (ERR-001) | S03; ERR-001 | `validateScaleSiteForm` (`siteTypes`) — new text "Site type codes must be distinct." | `@S03 @p1` | covered | — |
| Timber brand format (ERR-003) | S05; ERR-003 | `validateScaleSiteForm` (`timberBrand`) | `@S05 @p1` | covered | — |
| Incomplete coordinate (ERR-005) | S04; ERR-005 | `validateCoordinate` (completeness) | `@S04` "latitude degrees only" | covered | — |
| Latitude degrees range (ERR-004) | S04; ERR-004 | `validateCoordinate` (deg range ±90) | `@S04` "latitude degrees out of range" | covered | — |
| Longitude degrees range (ERR-006) | S04; ERR-006 | `validateCoordinate` (deg range ±180) | `@S04` "longitude degrees out of range" | covered | — |
| Minutes range (ERR-007) | S04; ERR-007 | `validateCoordinate` (min 0–59) | `@S04` "latitude minutes out of range" | covered | — |
| Seconds range (ERR-008) | S04; ERR-008 | `validateCoordinate` (sec 0–59) | `@S04` (same `isBetween`/`parseInt10` branch as minutes) | covered (shared branch) | CG#4 |
| Lat/long both-or-none (ERR-010) | S04; ERR-010 | `validateScaleSiteForm` (both-or-none) | `@S04` "latitude without longitude" | covered | — |
| Negative coordinate rejected (ERR-009, legacy) | S04; ERR-009 | none — new validator ACCEPTS negatives (`-maxDegrees..maxDegrees`) | — | divergence | defects.md Divergence #1 |
| Coordinates within BC (ERR-011) | S04; ERR-011 | `BritishColumbiaCoordinateValidator` (server-only) | — | deferred | defects.md Coverage gap #2 |
| Owner client not found (ERR-012) | S06; ERR-012 | `ScaleSiteService.validateForSave` → HTTP 422 | `@S06 @p1` (server reject, prove-negative) | covered | — |
| No `scaleSiteCreate` permission (ERR-013) | S08; ERR-013 | `@IsScsEditor` — single-role mock grants all | — | blocked | defects.md Coverage gap #1 |
| Entry via search-results "Create Scale Site" (STA-002) | S07; STA-002 | `pages/Queries/ScaleSites` button → `/scale-sites/create` | `create.feature @S07 @p2` | covered | — |
| Field max-lengths (name 40 / loc 200 / owner 8/2) | Field Ref | Carbon `maxLength` (input-capped) + `requireString` server guard | — | not-applicable | CG#3 (input attr caps entry; low value) |

**Role / permission coverage:** blocked by mock auth (grants only `SCS_SYS_ADMIN`). The legacy actor
(District Scaling Manager) and the `scaleSiteCreate` permission branch (S08) are not exercisable under the
single-role model — see Coverage gap #1. No client-restriction applies to this actor, so nothing else is role-gated.

**Symmetry check:** latitude covered for incomplete / degrees-range / minutes-range / both-or-none;
longitude covered for degrees-range + both-or-none; seconds-range is the identical `requireCoordinateRange`
branch (logged CG#4, not separately asserted). Create-only UC (no update mirror here — that is UC-SST-005).

**Test-data note (not a defect):** the create write path was blocked because the one-hop extract left
`THE.INTEGER_NUMBER` (the scale-site PK generator's source) EMPTY. Resolved with the minimal, reversible
seed `scs-real-test-data-patches/sst/integer-number-seed.sql` — a test-env data gap, not an app bug.

**Status values:** `covered` · `covered (shared branch)` · `not-applicable` · `deferred` (see Coverage gaps) · `blocked` (env/auth) · `divergence`.
