# Defects & Findings — UC-RPT-007 Scaler Authorization Letter

> How this log works (registers, statuses, glossary): [`defects-guide.md`](../../../defects-guide.md) at the e2e root.

Environment: frontend `:3000` + backend `:8080` (mock auth `SCS_SYS_ADMIN`) + seeded Docker DB. Data pinned in
`fixtures/sca/sca-test-data.ts` (`scalerAuthSampleId=3071`, `letterMessages`). Ground-truthed 2026-08-05. No
`@discovered-*` red tests — the three client validations behave as the re-grounded expectations.

---

## Divergence

_None._ The email-required-when-Preview-No, invalid-email, and signature-block-required guards all fire
before the generate POST with the exact re-grounded messages, and no letter request is sent.

---

## Coverage gaps

### Coverage gap #1 — letter GENERATION env-blocked — `deferred`
- The happy path (valid options → POST `/scaler-authorizations/{id}/letter` → Jasper `SCS_REP003.rpt` → PDF
  download / email) cannot run here: Jasper report generation is env-blocked on the deployed WAR (the same
  blocker as the MSD letter UC-RPT-009 and every RPT report screen — the local stack 500s on generation).
  Because generation is unreachable, the **payload pass-through** items (CC text, Org-Unit signature block,
  the "Show Scaler Authorization Signature" toggle → `showSignatureBlockInd`) are only observable end-to-end
  through the generated letter, so they ride on this same block. The form wiring is present
  (`LetterOptionsPage.tsx:163-172`). **Status:** OPEN — `deferred` (revisit when a report-capable env exists).

### Coverage gap #2 — view stored letter — `deferred` (no letterExists=true record)
- Viewing a previously-generated letter (GET `/scaler-authorizations/{id}/letter`) needs an authorization the
  API reports `letterExists=true` for, which is not obtainable: historical `SCALER_AUTHORIZATION_LETTER` rows
  resolve to `letterExists:false` (the stored blob isn't present), and letter creation is env-blocked (#1).
  This is the **same data blocker** shared with the CRUD UCs (see UC-SCA-002 Coverage gap #1 / UC-SCA-003
  defects.md). **Status:** OPEN — `deferred`.

### Coverage gap #3 — district-scope / role gating — `not-applicable` / `blocked`
- Legacy out-of-district hiding of the Create-Letter action has no new-app equivalent (org-unit scoping
  deferred → `not-applicable`); any "lacks letter permission" branch is unreachable under single-role mock
  auth (every user satisfies `@IsScsEditor` → `blocked`). **Status:** OPEN — revisit with multi-role auth.

---

## Verified — not a defect

### The three guards short-circuit before the network (prove-negative is meaningful)
- `ReportPage.handleSend` validates email/preview and `return`s before calling `outputOptions.onSend`;
  `LetterOptionsPage.handleSend` checks the signature block and `return`s before `createLetter`. Each scenario
  asserts `scalerAuthLetterCalls() === 0`, so the "no letter request sent" claim is a real observation of the
  spy, not a vacuous pass. Recorded so the ordering isn't re-investigated.

### Signature-block guard is no longer data-dependent (updated 2026-09-24)
- The guard used to be `signatureBlockRequired = signatureBlocks.length > 0`, so an empty picker skipped it and
  sent `scaleSignatoryBlockId: 0` — which is how a Check Scaler (403 on the old `GET /api/signature-blocks`,
  swallowed) issued letters with no signatory (nr-scs #286 follow-up). It is now `!allowEmptySignatory`: a
  signatory is required on this letter whether or not any blocks loaded, a failed lookup shows an error and
  disables Send, and the backend rejects `scaleSignatoryBlockId <= 0`. The picker now loads from
  `GET /api/letter-signature-blocks` (`LETTER_SIGNATORY_QUERY`). On the seeded extract the unfiltered lookup
  still returns 17 rows and auto-selects the first; clearing the select to `''` triggers the error regardless.
