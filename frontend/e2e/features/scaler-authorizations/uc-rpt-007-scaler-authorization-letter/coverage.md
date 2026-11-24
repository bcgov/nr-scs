# Coverage — UC-RPT-007 Scaler Authorization Letter

> New to these files? See [`coverage-guide.md`](../../../coverage-guide.md) at the e2e root for the column + status-flag legend.

Sources reconciled: `gherkin/UC-RPT-007-S01..*.feature` + `UC-RPT-007-slices.md`/`-technical.md`, against the new
letter write path — the shared **LetterOptionsPage** (`pages/Letters/components/LetterOptionsPage.tsx`) rendered
by `pages/Letters/ScalerAuthorizationLetter` (title "Scaler Authorization Letter Options",
`showSignatureBlockToggle=true`, `signatureLabel="Show Scaler Authorization Signature"`), which composes
`components/core/ReportPage` + `ReportOutputOptions`. Route `/scaler-authorizations/{id}/letter`.

The screen runs **three client-side guards before any generate request**, in this order:
1. `ReportPage.handleSend` — Preview=No + blank email → ERR "email required" (`ReportPage/index.tsx:117-121`);
2. `ReportPage.handleSend` — email present but not `/\S+@\S+\.\S+/` → ERR "invalid email" (`:125-128`);
3. `LetterOptionsPage.handleSend` — `signatureBlockRequired && !selectedBlockId` → "Signature block is required."
   (`LetterOptionsPage.tsx:210-213`), where `signatureBlockRequired = !allowEmptySignatory` — required on this
   letter whether or not any blocks loaded (blocks come from `searchLetterSignatureBlocks`).

All three `return` before `createLetter(...)`, so each scenario also asserts **no** POST
`/scaler-authorizations/{id}/letter` was sent (`scalerAuthLetterCalls` spy). Driven against the READ-ONLY
sample record **3071** (pinned `scalerAuthSampleId` in `fixtures/sca/sca-test-data.ts`) — no seed/cleanup,
since a blocked submit mutates nothing.

| Source item | Source citation | App enforcement point | Scenario (tags) | Status | Gap/defect |
|---|---|---|---|---|---|
| Invalid email recipient rejected | ERR-002 (re-grounded text) | `ReportPage.handleSend` :125-128 | validation.feature `@S01 @p1 @ERR-002` (invalid email → error + no POST) | covered | — |
| Preview=No requires email recipient | ERR-001 | `ReportPage.handleSend` :117-121 | validation.feature `@S02 @p1 @ERR-001` (Preview No + blank → error + no POST) | covered | — |
| Signature block required when blocks exist | slices (signature-block toggle) | `LetterOptionsPage.handleSend` :180-183 | validation.feature `@S03 @p1` (clear select → error + no POST) | covered | — |
| Generate letter (Preview=Yes → PDF download; email path) | S01 happy | POST `/{id}/letter` → Jasper `SCS_REP003.rpt` | — | deferred | defects.md #1 (Jasper env-blocked) |
| View a previously-stored letter | S02 view | GET `/{id}/letter` (needs `letterExists=true`) | — | deferred | defects.md #2 (no letterExists=true record) |
| CC text / Org-Unit signature / show-signature toggle pass-through | slices | payload build (`LetterOptionsPage` :163-172) | — | deferred | defects.md #1 (only asserted end-to-end via generation, which is env-blocked) |
| District-scope / role gating (out-of-district hides Create-Letter; lacks permission) | S0x | (none — org-unit scoping deferred) / `@IsScsEditor` single mock role | — | not-applicable / blocked | defects.md #3 |

**Symmetry check:** the letter form is shared across MSD (UC-RPT-009), Scaler Auth (this UC), Scale-Site Auth,
and Check-Scale Advisory. The email/preview guards live in `ReportPage` and are identical to the MSD letter's
(UC-RPT-009 `@S01/@S02`); the **signature-block** guard is the arm the MSD letter can't exercise
(`showSignatureBlockToggle=false` there) and is covered here — the two letter UCs together exercise all three
guards without duplicating the shared ones.

**Coverage gate (excluding deferred/not-applicable/blocked):** the three pre-submit validations — all covered.
**P1 100%** (this UC is validation-only; no P0/P2 items — generation is the P0 path and is env-blocked).

**Role / permission coverage:** no role branch is automatable under single-role mock auth; Create-Letter
district hiding has no new-app equivalent (org-unit scoping deferred). See defects.md #3.

**Status values:** `covered` · `deferred` (env/data-blocked) · `not-applicable` · `blocked`. No divergence red.
