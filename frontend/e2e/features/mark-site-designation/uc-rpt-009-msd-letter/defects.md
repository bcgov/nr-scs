# Defects & Findings — UC-RPT-009 Generate Timber Mark Site Designation Letter

> How this log works (registers, statuses, glossary): [`defects-guide.md`](../../../defects-guide.md) at the e2e root.

Environment: frontend `:3000` + backend `:8080` (mock auth `SCS_SYS_ADMIN`, deployed WAR
`applicationVersion 0.0.0`) + seeded Docker DB `THE/…@localhost:1525/DBDOCK_01`. Ground-truthed 2026-08-04; report/letter generation re-probed and un-blocked 2026-08-11.
Data pinned in `fixtures/msd/msd-test-data.ts` (real letterless MSD `richViewMsdId`).

---

## Bug / Regression

### Bug #1 — Jasper report/letter generation returned HTTP 500 across the board — **CLOSED 2026-08-11**
- **What was wrong (plain):** generating any letter or report failed. The MSD letter generate
  (`POST /api/mark-site-designations/{id}/letter`) and **every** report endpoint returned HTTP 500 with the
  sanitized body `{"code":"INTERNAL_SERVER_ERROR",...}`. Originally probed 2026-08-04; assessed as an
  environment/report-engine cause rather than a source defect.
- **Resolution (re-probed 2026-08-11):** the local report engine now works.
  - All **nine** `/api/reports/*` endpoints return 200 with a real document — `application/pdf` (`%PDF-1.5`,
    ~47-149KB) or `application/vnd.ms-excel` (OLE2, ~7.6KB), named `<uuid>.<ext>`. These are now covered
    end-to-end by `features/rpt/*/generation.feature`, which asserts the downloaded bytes.
  - The **MSD letter** also renders: `POST /api/mark-site-designations/2681/letter` with
    `{regDist:"DCC", scaleSignatoryBlockId:1114, outputFormat:"PDF", preview:true}` → **200 ·
    application/pdf · ~51KB**, named `<msdId>.pdf` (the MSD id, not a UUID).
  - The earlier 2026-08-04 letter probe used `regDist:1831` / block `744`; note the request needs a
    signatory block that belongs to the chosen reg/dist, and `regDist` is the org-unit **code** (`"DCC"`),
    not the numeric org-unit no.
- **Status: CLOSED** (environment; no ticket needed).

---

## Coverage gaps

### Coverage gap #0 — S01/S02 letter generation — CLOSED 2026-09-11 (`generation.feature`); green end-to-end
- **What landed.** `generation.feature` now covers S01 (generate + persist) and S02 (view an existing
  letter). S01 seeds a disposable MSD (`seedMarkSiteDesignation`) + a signatory block under reg/dist DCC
  (`seedSignatureBlock`, reused from UC-MNT-001), opens the Letter Options screen, selects the reg/dist (the
  form auto-selects its first block), submits, and asserts the downloaded file is a real PDF (magic bytes +
  size floor) AND — the persistence proof — reads `letterExists` back as `true`. S02 issues a letter
  out-of-band (`issueMsdLetterViaApi`) and downloads it from the MSD view's "View Letter" action.
- **Never against the shared anchor.** Issuing a letter is a **WRITE** (`POST /{id}/letter` inserts into
  `HAULING_MARK_AUTH_LETTER` and flips `letterExists`), so both scenarios use a DISPOSABLE seeded record. The
  `createdMsdIds` DB teardown deletes `hauling_mark_auth_letter` before the parent, so the letter row is
  removed automatically; the seeded signatory block is deleted independently via `createdSignatureBlockIds`.
  The two teardowns need **no ordering** relative to each other, because the letter row never references the
  block: `HAULING_MARK_AUTH_LETTER` is `(HAULING_MARK_AUTHORIZATION_ID, LETTER_BLOB)` — a single FK to
  `HAULING_MARK_AUTHORIZATION`, no signatory-block column at all — so deleting the block and deleting the MSD
  (+ its letter child) can run in either order cleanly. (Incidentally the block tears down first: Playwright
  reverses setup order and playwright-bdd lists the used fixtures alphabetically, `seedMarkSiteDesignation`
  before `seedSignatureBlock` — but nothing depends on it, so don't read this as a "keep these Givens in
  order" rule; there is no cross-reference to protect.) Verified clean: after the run the DB held **0**
  `ES20R4` MSD rows and **0** `ES20R4` letters, and the shared anchor 2681 was left letterless.
- **Learned the hard way (worth keeping).** Generating against the pinned `richViewMsdId` (**2681**) once
  broke three UC-MSD-003 scenarios that rely on it being **letterless**, until the row was removed
  (`delete from HAULING_MARK_AUTH_LETTER where HAULING_MARK_AUTHORIZATION_ID=2681; commit;`) and
  `letterExists` returned to false. **Never generate a letter against a shared read-only anchor.**
- **Green end-to-end (2026-09-11).** `LetterService` renders via `JasperServerClient.fetchReport` (external
  JasperServer / JCRS), which is intermittently down locally (uc-rpt-010 defects.md #3): on 2026-09-10 it
  returned **HTTP 500 for every letter POST**, including record 2681 with the *identical* payload that had
  returned a 200 PDF on 2026-08-11 — an environment/engine flake, not a request-shape or data problem. With
  JCRS back up, **both S01 and S02 passed on 2026-09-11** — real PDF asserted (magic bytes + size floor), and
  for S01 `letterExists` read back `true`. A future 500 from that engine is a known environmental flake to
  re-run, not a coverage regression — the rows stay `covered`.
- **Status: CLOSED · `covered`** — green end-to-end 2026-09-11. History: `blocked (env)` (before 2026-08-11)
  → authored 2026-09-10 → green 2026-09-11.

### Coverage gap #1 — S03 (org-unit signature reload) / S04 (Back) / signature-block-required — `deferred`
- These are client-side slices that don't depend on generation: S03 (selecting a reg/dist reloads the
  signature-block list), S04 (Back returns to the MSD view), and the "Signature block is required."
  validation (fires only when the chosen reg/dist actually has blocks). Modest value and each needs a
  reg/dist ↔ signature-block data anchor (most districts have no blocks; block 744 is org unit 70, a branch
  not a district). Not authored in this first RPT pass. **Status:** OPEN — `deferred`.

### Coverage gap #2 — S07 not-authorized (no `timberMarkSiteDesignationLetterReport`) — `blocked` by mock auth
- The denied branch needs a user *without* the letter permission; mock auth grants only `SCS_SYS_ADMIN` and
  the new app gates at the route level. **Status:** OPEN — `blocked`. Revisit with multi-role auth.

---

## Verified — not a defect

### The client-side email validations are re-grounded, and correct
- S05 legacy "The Email Recipient is not in a valid format." → new app "Email Recipient must be a valid
  email address." (asserted). S06 "If Preview Report has been set to No then the Email Recipient is
  required." matches legacy verbatim. Both fire in `ReportPage.handleSend` before any generate request
  (proven by `letterMsdCalls === 0`). Recorded so they are not re-investigated.
