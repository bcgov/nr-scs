# Coverage — UC-RPT-009 Generate Timber Mark Site Designation Letter

> New to these files? See [`coverage-guide.md`](../../../coverage-guide.md) at the e2e root for the column + status-flag legend.

Sources reconciled: `gherkin/UC-RPT-009-S01..S07.feature` + `UC-RPT-009-slices.md` (control/message/field
catalog), against the new app's MSD Letter Options screen (route `/mark-site-designations/{id}/letter` →
`pages/Letters/MarkSiteDesignationLetter` → shared `LetterOptionsPage` / `ReportPage` / `ReportOutputOptions`;
generate = `POST /api/mark-site-designations/{id}/letter` → Jasper).

**Environment note — the Jasper blocker is RESOLVED (2026-08-11), but letter generation is a WRITE.**
The generation slices were previously `blocked` because every Jasper endpoint returned **HTTP 500**. That is no
longer true. Re-probed 2026-08-11: `POST /api/mark-site-designations/{id}/letter` with
`{regDist, scaleSignatoryBlockId, outputFormat, preview}` returns **200 · application/pdf · ~51KB**, named
`<msdId>.pdf` (note: the MSD **id**, unlike the reports' `<uuid>.<ext>`). The nine Reports-tab screens are now
covered end-to-end — see `features/rpt/*/generation.feature`.

**S01/S02 are now authored (2026-09-10) — see `generation.feature`.** Unlike a report, issuing a letter
**persists**: `LetterService.createMarkSiteDesignationLetter` inserts a row in `HAULING_MARK_AUTH_LETTER`
and flips the record's `letterExists` to true — permanently changing the MSD view from "Create Letter" to
"View Letter". Confirmed the hard way while probing: issuing a letter against the pinned `richViewMsdId`
(2681) broke three UC-MSD-003 scenarios that assert the letterless state, until the row was deleted. So the
generation suite **never touches a shared anchor**: each scenario seeds its OWN disposable MSD
(`seedMarkSiteDesignation` — its DB teardown deletes the `hauling_mark_auth_letter` child row with the
parent) plus its OWN signatory block (`seedSignatureBlock`, reused from UC-MNT-001, under reg/dist DCC so
that after DCC is selected its reg/dist-specific block list contains a known block to pick — the picker is
already non-empty from the initial full-list load, so the seed guarantees a block belonging to DCC, not that
the list is non-empty). S01 asserts a real PDF (magic bytes + size floor) AND
reads `letterExists` back to prove the WRITE persisted; S02 issues a letter out-of-band and downloads it
from the view's "View Letter" action.

**Green end-to-end (2026-09-11).** `LetterService` renders via `JasperServerClient.fetchReport` (external
JasperServer / JCRS). That engine is intermittently down in the local environment (uc-rpt-010 defects.md #3),
and on 2026-09-10 `POST /{id}/letter` returned HTTP 500 for every record; but with JCRS back up **both S01 and
S02 passed on 2026-09-11**, asserting a real PDF (magic bytes + size floor) and, for S01, reading
`letterExists` back as `true`. Status is `covered`; the JCRS dependency is a known environmental flake, not a
resting gate — see defects.md #1.

Also covered is the screen's **client-side** validation (S05/S06), which runs in `ReportPage.handleSend`
BEFORE any generate request — green, each proving `letterMsdCalls === 0`.

**Re-groundings:** legacy ERR-001 "The Email Recipient is not in a valid format." → the new app's
"Email Recipient must be a valid email address."; ERR-002 matches the legacy text verbatim. The screen is
opened with a real letterless MSD id (`richViewMsdId`, pinned in `fixtures/msd/msd-test-data.ts`) only to
render the options form — nothing is generated or persisted → read-only, parallel-safe, no cleanup.

| Source item | Source citation | App enforcement point | Scenario (tags) | Status | Gap/defect |
|---|---|---|---|---|---|
| S05 + ERR-001 invalid email format | S05; slices.md:246 | `ReportPage.handleSend` client email regex → inline error; **no** POST | `validation.feature` `@S05 @p1` (invalid → error + 0 calls) | covered (re-grounded) | — |
| S06 + ERR-002 email blank when Preview=No | S06; slices.md:289 | `ReportPage.handleSend` client preview/email rule → inline error; **no** POST | `validation.feature` `@S06 @p1` (blank+Preview No → error + 0 calls) | covered | — |
| S01 happy-path generate letter (Jasper `SCS_REP011`) | S01; slices.md:50 | `LetterOptionsPage.handleSend` → `POST /{id}/letter` → JasperServer PDF | `generation.feature @S01 @p0` (seeds a disposable MSD + DCC signatory block; asserts real-PDF bytes + `letterExists` flips true) | covered | — (green 2026-09-11; JCRS flake noted in defects.md #1) |
| S02 letter already exists → view existing | S02; slices.md:101 | `GET /{id}/letter` (letterExists) → stored PDF via the MSD view's "View Letter" | `generation.feature @S02 @p1` (issues a letter out-of-band, then downloads it from the view) | covered | — (green 2026-09-11; JCRS flake noted in defects.md #1) |
| S03 change org unit reloads signatures | S03; slices.md:142 | reg/dist `onChange` → `searchLetterSignatureBlocks` reload | — | deferred | Coverage gap #1 (client-side, modest; not authored) |
| S04 Back from letter options | S04; slices.md:183 | `onBack` → navigate back to MSD view | — | deferred | Coverage gap #1 |
| S07 no `timberMarkSiteDesignationLetterReport` permission | S07; slices.md:328 | route-level `ProtectedRoute` (single mock role) | — | blocked | Coverage gap #2 (mock auth) |
| Signature-block required (`signatureBlockRequired = !allowEmptySignatory`, so whether or not blocks exist for the reg/dist) | slices.md controls | `LetterOptionsPage.handleSend` "Signature block is required." | — | deferred | Coverage gap #1 (needs a reg/dist known to have blocks) |

**Symmetry check:** the two email-validation arms are both covered — invalid-format (S05) and
required-when-Preview-No (S06), each with the prove-the-negative (0 letter calls) — and the two generate arms
are covered green (2026-09-11): S01 (generate + persist) and S02 (view existing), each seeding its own
disposable MSD + signatory block (defects.md #1). The permission arm (S07) remains blocked by mock auth.

**Role / permission coverage:** **blocked by single-role mock auth** (S07 needs a user *without*
`timberMarkSiteDesignationLetterReport`); the new app gates at the route level and mock auth grants only
`SCS_SYS_ADMIN`.

**Coverage gate (over coverage-eligible items, excluding `blocked`):** S05 + S06 + S01 + S02 — all covered
(S01/S02 self-cleaning, green end-to-end 2026-09-11). **P0 100%** (S01 green) **· P1 100%** of the authored
items. S07 remains `blocked` (mock auth).

**Status values:** `covered` · `covered (re-grounded)` · `deferred` (see Coverage gaps) · `blocked` (auth:
mock role). No divergence red. (S01/S02 depend on the external JasperServer/JCRS engine, which is
intermittently down locally — uc-rpt-010 defects.md #3; a 500 there is an environment flake, not a coverage
regression, so it does not demote these rows from `covered`.)
