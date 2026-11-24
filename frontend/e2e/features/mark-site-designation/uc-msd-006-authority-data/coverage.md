# Coverage — UC-MSD-006 Pull Hauling/Harvesting Authority Data

> New to these files? See [`coverage-guide.md`](../../../coverage-guide.md) at the e2e root for the column + status-flag legend.

Sources reconciled: `gherkin/UC-MSD-006-S01..S06.feature` + `UC-MSD-006-slices.md` + `UC-MSD-006-technical.md`,
against the new app's backend/frontend.

**Scope note — this is a backend DAO / integration UC, not a UI screen.** Every legacy slice is explicitly
"_no dedicated Tiles screen — called from a BO/delegate_": it describes SCS querying the forestry source
systems' `HaulingAuthority` / `HarvestingAuthority` DAOs (Oracle packages `scs_hauling_authority_pkg` /
`scs_harvesting_authority_pkg`) for reference data. A **browser E2E suite tests the app through the UI/API,
not DAOs in isolation**, so there is no standalone screen or endpoint here to drive. Confirmed 2026-07-22:
neither `HaulingAuthority` nor `HarvestingAuthority` exists as a class/endpoint anywhere in `nr-scs`
(backend or frontend) — the legacy DAOs are not reproduced as a distinct new-app surface. Its only
user-observable behavior (a timber mark resolving, or not, during MSD create) is folded into the MSD
timber-mark lookup and is **already covered by UC-MSD-001**. The HarvestingAuthority half serves
**UC-TCR-001 (Timber Cruise Plan), which is DESCOPED** ("do not build HND / TCR / Waste RSK / Cruise RSK").
**No new E2E tests are authored for this UC** (same disposition as UC-CCQ-003 and UC-INS-003).

| Source item | Source citation | App enforcement point | Scenario (tags) | Status | Gap/defect |
|---|---|---|---|---|---|
| Hauling Authority search returns matching records → timber mark valid (S01) | slices.md S01; technical.md:48-85 | new app: the MSD create timber-mark lookup resolves the holder view (`GET /api/mark-site-designations?timberMark=`) | covered elsewhere — UC-MSD-001 `create.feature @S01`/`@S02` (mark `ES20R4` resolves → create HTTP 201) | covered | via UC-MSD-001 |
| Hauling Authority search returns no rows → "Timber Mark could not be found" (S03 · ERR-001) | slices.md S03; technical.md:130-166 | timber-mark lookup returns HTTP 404 → not-found error; no MSD saved | covered elsewhere — UC-MSD-001 `mark-not-found.feature @S03` (server-reject 404 + record absent) | covered | via UC-MSD-001 (re-grounded wording logged as UC-MSD-001 "Verified — V1") |
| Harvesting Authority search returns matching records (S02) | slices.md S02; technical.md:88-127 | (none — serves UC-TCR-001; no HarvestingAuthority surface in the new app) | — | not-applicable | Coverage gap #1 (descoped TCR) |
| Harvesting Authority cutting-permit not found (S04 · ERR-002) | slices.md S04; technical.md:170-206 | (none — TCR) | — | not-applicable | Coverage gap #1 |
| Harvesting Authority read by HVA Skey returns null (S05) | slices.md S05; technical.md:210-246 | (none — TCR) | — | not-applicable | Coverage gap #1 |
| Harvesting Authority read returns multiple rows → SQLException (S06 · ERR-003) | slices.md S06; technical.md:250-286 | (none — TCR; a legacy DAO-internal uniqueness guard, no UI) | — | not-applicable | Coverage gap #1 |

**Symmetry check:** the Hauling (found / not-found) pair is covered via UC-MSD-001 (both arms). The
Harvesting (found / not-found / null / multi-row) set is uniformly descoped (TCR) — no arm is authorable,
and the omission is logged once as Coverage gap #1, not silently dropped.

**Role / permission coverage:** not applicable — this UC has no UI and no per-role behavior; access to the
calling screens is governed by the host UCs (UC-MSD-001 for hauling; the descoped UC-TCR-001 for harvesting).

**Status values:** `covered` (here: covered *elsewhere* by a named UC-MSD-001 scenario) · `not-applicable` (legacy-only / descoped / no new-app surface) · `blocked` (env/auth) · `divergence` (see this UC's `defects.md`).
