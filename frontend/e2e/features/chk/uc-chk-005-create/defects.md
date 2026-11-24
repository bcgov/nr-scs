# Defects — UC-CHK-005 Create Summary Check Scale

> How this log works (registers, tags, how to read an entry): [`defects-guide.md`](../../../defects-guide.md)

**Bug / Regression:** _none._

**Divergences:**

- **#1 — A real timber mark can be refused as "does not exist" (found by code review, not by a test).** — **FIXED 2026-10-01**
  - **What's wrong:** saving a summary check scale first checks the timber mark exists. The check looks in a
    narrower place than legacy did, so a valid mark that legacy (and the database itself) accepts can be
    refused.
  - **Expected vs actual:** legacy accepts any mark with a hauling authority; the new app accepts only marks
    that also have a hauling-mark authorization (the record a mark-site designation creates). Example mark:
    `AB6633` — in `HAULING_AUTHORITY`, no `HAULING_MARK_AUTHORIZATION` row. Not yet reproduced end-to-end.
  - **How we caught it (2026-09-30):** while diagnosing the same fault on the report screens (UC-RPT-012 #4,
    UC-RPT-005 #3). Legacy `MarkSiteBo.validateTimberMark` searches `HaulingAuthorityDb` →
    `scs_hauling_authority_pkg` (`HAULING_AUTHORITY`). The new `CheckScaleReferenceValidator` (called from
    `SummaryCheckScaleService.validateReferences`, on create and update) calls
    `HaulMarkAuthorizationService.timberMarkExists()`, which searches `scs_haul_mark_auth_srch_vw_pkg` — despite
    its javadoc saying it mirrors legacy's hauling-authority search. The DB agrees with legacy:
    `CHECK_SCALE.TIMBER_MARK`'s FK `CKSC_HAA_FK` references `HAULING_AUTHORITY`, so such a mark would insert
    fine. (`fixtures/chk/chk-test-data.ts` already notes the create needs a mark passing "BOTH gates".)
  - **Recommended fix:** step 2 of the plan on UC-RPT-012 #4 — repoint `timberMarkExists()` at a
    `SCS_HAULING_AUTHORITY_PKG.SEARCH_RECS` lookup. Documented, not implemented (2026-09-30).
  - **Fixed by the shared change** made for UC-RPT-012 #4: the rule moved to `TimberMarkService.timberMarkExists`, which
    reads `HAULING_AUTHORITY` (`scs_hauling_authority_pkg`), which `CheckScaleReferenceValidator` calls — the same
    table the `CKSC_HAA_FK` foreign key references, so the friendly check and the DB constraint now agree.
    Unit-tested (`TimberMarkServiceTest`, `CheckScaleReferenceValidatorTest`); not yet exercised end-to-end (see the gap below).
  - **Status:** FIXED (pending BA/QA close-out).
  - **Test:** none yet — see the coverage gap below.

**Coverage gaps (not tested yet — no app problem):**

- **Divergence #1 has no reproducing test.** Add a create scenario with a hauling-authority-only mark
  (e.g. `AB6633`) expecting a successful save; it stays RED as `@discovered-divergence` until the fix lands.
  - **Status:** OPEN. Found 2026-09-30.

- **S07 — Can't test the "wrong role is denied" case.**
  - **Why not (historical):** the test login granted only the single admin role, so a role-less session could not be produced. The adjacent "not logged in → redirect to `/welcome`" branch *is* testable and remains covered.
  - **Re-homed, not lost (2026-09-02).** This is a role × level property, and it is asserted per role in
    the `sec` suites — `sec/*/url-access.feature` for the route and `sec/*/api-access.feature` for the
    endpoint, across all eleven role columns. Restating it inside each UC would repeat one app-wide fact
    ~140 times, so the placeholder scenario was **removed** and the coverage row now reads
    `covered elsewhere`. Nothing became untested.
  - **Status:** CLOSED (covered in `sec`). Closed 2026-09-02.
  - **Future action:** cover the guard as a component (Vitest) test; revisit as true E2E once finer-grained roles exist.
  - **Test:** `sec/*/url-access.feature` (`/summary-check-scales/create` refused per role) + `api-access.feature`.

- **S01 (scenario 1) — no "list → create" navigation to test.**
  - **Why not:** the old app had a summary-check-scale *list* screen you navigated from; the new app has no list route (you go straight to the create form, which *is* covered). Deliberate re-grounding, **not a defect**.
  - **Future action:** add a list→create test if a list screen is ever built.
  - **Status:** OPEN.

- **S01 (scenario 2) — no auto-fill of the scaler licence from the session.**
  - **Why not:** the old app pre-filled the original scaler licence from the logged-in scaler's profile; the new app's test user has no such profile, and the field is a plain input the user types. **Not a defect.**
  - **Future action:** revisit if a scaler-context entry point is added.
  - **Status:** OPEN.

**Spec gaps (the Gherkin is missing scenarios its own docs list):**

- **S03 — the `.feature` left out the "Check Scale Net Volume" numeric check (and both Net Value ones).**
  - **What's missing:** the source matrix lists four numeric fields (`UC-CHK-005-slices.md:190-202`) but the `.feature` wrote only three, breaking the original/check × pieces/volume symmetry; the technical catalog also lists two Net *Value* checks (`-technical.md:101-104`) absent from both.
  - **The app is correct:** it validates all six (`summaryCheckScaleViewModel.validateSpgRow`); we covered them anyway. Paperwork mismatch, not a bug.
  - **Future action:** a BA regenerates `UC-CHK-005-S03.feature`.
  - **Status:** OPEN. Found 2026-07-03.
  - **Test (covers it):** `e2e/features/chk/uc-chk-005-create/summary-check-scale-validation.feature` (S03 outline).

**Verified — not a defect:**

- **Log Tally / Sample Log Tally `partialInd`.** The frontend sends `null` for these return types, which *looked* like a divergence — but a ground-truth API create reads back `partialInd='Y'` because the backend forces it. **Matches legacy.** (Verified 2026-07-03.)
- **Product-field enable timing.** The new app enables the SPG Product field once a species is chosen (legacy enabled it on picking the return type). Benign UI refinement; the saved result is unchanged.
