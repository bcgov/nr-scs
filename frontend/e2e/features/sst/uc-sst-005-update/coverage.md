# Coverage — UC-SST-005 Update Scale Site

> New to these files? See [`coverage-guide.md`](../../../coverage-guide.md) at the e2e root for the column + status-flag legend.

Sources reconciled: `update.feature` + `validation.feature` + `UC-SST-005-slices.md` (11 slices) +
`UC-SST-005-technical.md`, against the app's write path (`ScaleSiteEditModal` → `ScaleSiteForm.validateScaleSiteForm`
client-side, then `ScaleSiteService.updateScaleSite` / `validateForSave` + `PUT /api/scale-sites/{id}`).
The edit modal reuses the **identical** validator as create (UC-SST-004), so the full field/coordinate/
timber-brand matrix is exhaustively covered there; here we assert the update host WIRES it (one case per
rule class) plus the update-specific flows (persist, reset, close-without-save).

| Source item | Source citation | App enforcement point | Scenario (tags) | Status | Gap/defect |
|---|---|---|---|---|---|
| Happy-path update (name + site type) + persist | S01 | `ScaleSiteEditModal.handleSave` → `PUT /scale-sites/{id}` | `update.feature @S01 @p0` (API read-back) | covered | — |
| Tombstone/summary refresh after save | S01; BR (tombstone force-refresh) | `onSuccess` invalidates `scale-site-summary` query | `@S01` (read-back reflects new values) | covered | — |
| Required field blank (ERR-001..005) | S02 | `validateScaleSiteForm` (required) — asserted via Scale Site Name | `validation.feature @S02 @p1` | covered | — |
| Other required fields (owner/loc/regDist/siteLocation/primary) | S02 | same `validateScaleSiteForm` branch | — | covered (shared validator) | via UC-SST-004 `@S02` |
| Duplicate site types (ERR-006) | S03 | `validateScaleSiteForm` (`siteTypes`) | `@S03 @p1` | covered | — |
| At least 1 site type / primary required (ERR-007) | S03 | `validateScaleSiteForm` (`primarySiteType`) | — | covered (shared validator) | via UC-SST-004 `@S02` |
| Coordinate format/range (ERR-008 brand, ERR-009 incomplete, ERR-010 BC) | S04 | `validateCoordinate` — asserted via incomplete-latitude | `@S04 @p1` | covered | full matrix via UC-SST-004 `@S04`/`@S05`; BC-boundary deferred (SST-004 CG#2) |
| Negative-coordinate rule removed (legacy) | S04 | same validator as create | — | divergence | uc-sst-004-create/defects.md Divergence #1 (same code) |
| Reset restores original values | S05 | `ScaleSiteEditModal.handleReset` (re-seeds from summary) | `update.feature @S05 @p2` | covered | — |
| Back / close without saving discards edits | S06 | Carbon Modal close (`onRequestClose`); no PUT | `@S06 @p2` (no-PUT + read-back unchanged) | covered | — |
| Add a new site contact (STA-004/008) | S07 | Contacts tab (`ContactsCreate`) | — | deferred | covered under UC-SST-006 (in progress) |
| Edit an existing contact fails validation | S08 | Contacts tab (`ContactsEdit`) | — | deferred | covered under UC-SST-006 (in progress) |
| View authorized scalers with filter (STA-009) | S09 | Authorized Scalers tab | — | deferred | covered under UC-SST-008 (in progress) |
| Edit Record hidden — site outside district (STA-002, ERR-011) | S10 | district scoping (deferred in code — `// TODO OrgUnitUserValidator`) | — | blocked | defects.md Coverage gap #1 |
| Unauthorized access (ERR-012) | S11 | `@IsScsEditor` — single-role mock grants all | — | blocked | defects.md Coverage gap #2 |

**Role / permission coverage:** blocked by mock auth (grants only `SCS_SYS_ADMIN`, which always passes
`@IsScsEditor` and has full district access). District-scoping (S10) and no-permission (S11) are not
exercisable; the server-side org-unit access check is itself deferred in code (`// TODO: re-add
OrgUnitUserValidator … when the user-role model lands`). Revisit with the RBAC rework.

**Symmetry check:** create/update mirror — create is exhaustively covered in UC-SST-004; the update modal
shares the same `ScaleSiteForm`/`validateScaleSiteForm`, so one representative case per rule class here
proves the wiring without re-enumerating. Update-specific flows (persist, reset, close) are covered directly.

**Test-data note:** every scenario (happy path + validation) API-seeds + DB-cleans its OWN site (dedicated
mutable key, parallel-safe); the seed uses the create endpoint, so the `sst/integer-number-seed` patch
applies. Pinned in `fixtures/sst/scale-site-test-data.ts`.

**Status values:** `covered` · `covered (shared validator)` · `deferred` (covered under a sibling UC) · `blocked` (env/auth) · `divergence`.
