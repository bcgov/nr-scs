# Defects — UC-INS-001 Create Site Inspection

> How this log works (registers, tags, how to read an entry): [`defects-guide.md`](../../../defects-guide.md)

**Bug / Regression:** _none._

**Divergences:**

- **#1 — The "Site Type is required." validation message is invisible to sighted users.**
  - **What's wrong:** on the create screen's parameters step, clicking **Next** without picking a Site
    Type correctly blocks you and (per the legacy spec) should show "Site Type is required." — but that
    message never appears on screen. The Inspection Type required error right beside it *does* show, so
    the two behave inconsistently.
  - **Expected vs actual:** Expected — a visible "Site Type is required." message (like the Inspection
    Type one). Actual — no visible message; the block still happens, but the user isn't told why the
    Site Type field is the problem.
  - **How we caught it:** the `@discovered-divergence` scenario asserts the message is visible; it fails
    with the element resolved but `hidden` (trace/screenshot under `test-results/…parameters-step…`).
  - **Why (technical):** the app renders the error as a standalone `<p class="… cds--form-requirement">`
    (`Create/ScaleSiteInspection/index.tsx:1017-1024`). Carbon's base
    `.cds--form-requirement { display:none; max-block-size:0 }` (`@carbon/styles …/form/_form.scss:218`)
    hides it — that class is only revealed when it directly follows an *invalid Carbon field wrapper*,
    which a bare `<p>` is not. The page's own `&__stage-one-error` SCSS only sets margins, so `display:none`
    stands. The text IS in the DOM and wired via `aria-describedby` (screen-reader accessible). The
    Inspection Type error shows because it uses the Carbon `<Select>`'s built-in `invalidText`.
  - **Is it a defect?** Yes — a real (minor) UX/a11y defect (a required-field message a sighted user
    can't see), now fixed.
  - **Resolution:** FIXED in nr-scs — `Create/ScaleSiteInspection/index.scss` reveals the standalone
    `.cds--form-requirement` (`display:block`) and applies the Carbon error colour/size, so the message
    is visible and matches the Inspection Type error. The `@discovered-divergence` tag was removed; the
    scenario is now a normal green assertion.
  - **Status:** RESOLVED 2026-08-14 (nr-scs `fix/inspector-idir-guid-claim`, commit `823f3ef1`). Found 2026-07-16.
  - **Test:** `e2e/features/ins/uc-ins-001-create/validation.feature` (`@S05`, asserts the message is visible).

**Coverage gaps (not tested yet — no app problem):**

- **#1 — Can't test the permission-hidden "Add Inspection" button (S08).**
  - **Why not:** the legacy app hid Add Inspection from users without the `scaleSiteInspectionCreate`
    permission. The new app has no per-element permission mechanism, and the mock login is always a full
    `SCS_SYS_ADMIN`, so the "hidden" state cannot be produced.
  - **Future action:** revisit when per-element permissions exist; meanwhile cover as a component test.
  - **Status:** OPEN. Found 2026-07-15. (No scenario authored — the state is not reproducible.)

- **#2 — Can't test the wrong-role / unauthorized direct-URL case (S09).**
  - **Why not:** mock auth grants the single `SCS_SYS_ADMIN` role, so a user *without* the create
    permission can't be simulated (same limit as every other domain). The logged-out redirect to
    `/welcome` is a different (auth, not role) behaviour and is not what S09 specifies.
  - **Future action:** cover the role guard as a component (Vitest) test; revisit as true E2E once
    finer-grained roles exist.
  - **Status:** OPEN. Found 2026-07-15. (No scenario authored — the state is not reproducible.)

- **#3 — Compliance/enforcement issue capture (BR-INS-001-02 / AF1) has no new-app equivalent.**
  - **Why not:** the legacy "record a compliance/enforcement issue on an inspected method" was folded
    into per-question **follow-up** fields (Required? / Action / Due Date / Complete?) — there is no
    separate compliance-issue or enforcement-issue entity, endpoint, validator, or table in the new
    backend (confirmed by a full source search). The follow-up "required when Y" path IS covered (S07).
  - **Future action:** none for INS-001; the standalone legacy UC is logged in full under UC-INS-003.
  - **Status:** OPEN (tracked under UC-INS-003 coverage). Found 2026-07-15.

- **#4 — "Follow-up to Inspection #" positive-integer rule not yet tested (app-only).**
  - **Why not:** the create form rejects a non-positive "Follow-up to Inspection #" ("Follow-up to
    Inspection # must be a positive whole number.", index.tsx:302-308). This is an app-only client rule —
    the legacy slices do not list it — and low value (a `type=number min=1` input). Deferred, not dropped.
  - **Future action:** add a p2 scenario if the field's validation gains importance.
  - **Status:** OPEN. Found 2026-07-16.

**Spec gaps (the Gherkin is missing scenarios its own docs list):** _none._ The S01–S10 `.feature` set,
its `-slices.md` control/message/field matrix, and the `-technical.md` ERR catalog were reconciled
against the app's write path; every enforced control/field/message maps to a scenario or a logged
re-grounding note (see `coverage.md`). No source-enumerated item was silently dropped.

**Verified — not a defect (looked wrong, confirmed correct / re-grounding):**

- **#1 — "Inspector #" — SUPERSEDED: logged here as "not a defect", but it was two real defects, now
  fixed in nr-scs (`fix/inspector-idir-guid-claim`, commit `823f3ef1`, 2026-08-14).** Legacy treats
  Inspector # as the euser GUID of whoever *performed* the inspection (typed, honoured), not the logged-in
  user. The new app (a) **overrode** the submitted inspector with the current user — a divergence from
  legacy — and (b) resolved the current user's GUID from the Cognito `sub` instead of the IDIR
  `custom:idp_user_id`, mis-attributing inspections in dev/prod. After the fix the submitted GUID is
  honoured on create + update, a non-GUID gives "A valid inspector user GUID is required.", and the
  create-init default is the current user's correct IDIR GUID. The happy path types the seeded inspector's GUID
  and it is now stored as the inspector. Verified live 2026-08-14.
- **#2 — Inspection Date "wrong format" (ERR-006) is not user-reachable.** The field is a Carbon
  flatpickr bound to `dateFormat Y-m-d`, so a free-format string can't be submitted; only the future-date
  arm (ERR-005 → S06) is testable. Re-grounding, not a gap.
- **#3 — Follow-up "populated when NOT required" (ERR-008) is not user-reachable.** Selecting Follow-Up
  Required = N clears and DISABLES the Action / Due Date / Complete inputs, so they can't be populated
  while N. Only the "missing when required" arm (ERR-009 → S07) is testable. Re-grounding, not a gap.
- **#4 — A create can 404/500 for a DATA reason, not an app bug.** The post-create read-back
  (`get_inspection_report`) INNER JOINs `forest_client` on the site owner and `scs_user_info_vw` on the
  inspector; a site whose owner wasn't extracted (FK-one-hop gap) or a GUID absent from the user view
  makes the read-back return nothing → 404, and since create is `@Transactional` the whole create rolls
  back. Fixtures pin a site (520) + GUID that both resolve. Verified 2026-07-15; documented in
  `fixtures/ins/ins-test-data.ts`.
