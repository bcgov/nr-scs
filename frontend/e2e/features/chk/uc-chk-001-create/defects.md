# Defects — UC-CHK-001 Create Detail Check Scale

> How this log works (registers, tags, how to read an entry): [`defects-guide.md`](../../../defects-guide.md)

**Bug / Regression:** _none._

**Divergences:** _none._ (Former Divergence #1 — "the app lets you check-scale your own work" — was
**RETRACTED 2026-08-25** after a legacy re-check; it is legacy parity, not a defect. See "Verified — not
a defect" below.)

**Coverage gaps (not tested yet — no app problem):**

- **#1 — Can't test the permission-hidden buttons on the view screen (S07).**
  - **Why not:** the old system hid the Create Letter / Add Check Scale / Delete buttons from users who lacked those permissions.
  - **Re-scoped and re-homed (2026-09-02).** Two things had changed. The old reason ("the test login is
    always a full admin") stopped being true when PR #240 added the mock role switcher. But the real
    blocker is that **the app gates no controls on this screen** — the CHK pages call no
    `hasPermission` — so there is no hidden state to assert, which makes this `not-applicable` rather
    than blocked. `sec` does not cover it either: its control sweep is *tab*-scoped
    (`{record, tab, control}`), so it never reaches the check-scale detail screens. The permanent
    `@skip` placeholder was therefore **removed** — a skip implies "we could test this but the
    environment won't let us", which misdescribed the situation and made role coverage look absent when
    it is comprehensive one directory over.
  - **The open product question is recorded ONCE**, for the whole domain, in
    `uc-chk-004-delete/defects.md` Coverage gap #3: should a screen hide or disable a control the role
    cannot use? If the answer is yes, the work belongs in `sec` — extend its control sweep from record
    tabs to the detail screens — not back into this UC.
  - **Status:** OPEN (awaiting that product answer), but no longer carrying a skipped scenario.
  - **Future action:** revisit when per-element permissions are built.
  - **Test:** none — scenario removed; see the coverage row's `not-applicable` verdict.

- **#2 — Can't test the "wrong role is denied" case (S08).**
  - **Why not (historical):** the test login granted only the single admin role, so a user *without* the Check Scaler role could not be simulated.
  - **Re-homed, not lost (2026-09-02).** This is a role × level property, and it is asserted per role in
    the `sec` suites — `sec/*/url-access.feature` for the route and `sec/*/api-access.feature` for the
    endpoint, across all eleven role columns. Restating it inside each UC would repeat one app-wide fact
    ~140 times, so the placeholder scenario was **removed** and the coverage row now reads
    `covered elsewhere`. Nothing became untested.
  - **Status:** CLOSED (covered in `sec`). Closed 2026-09-02.
  - **Future action:** cover the route guard as a component (Vitest) test; revisit as true E2E once finer-grained roles exist.
  - **Test:** `sec/check-scaler-role/url-access.feature` + `api-access.feature` (and the ten sibling role suites).

- **#3 — The old "DDV must be a number" check has no new-app equivalent (S02).**
  - **What changed (original entry):** legacy validated the document *version* (DDV) as numeric. In the new app the field was free text — a non-numeric version wasn't blocked with a "must be a number" message; instead it was sent as empty and the create was stopped by the "document does not exist in HBS" check. Blank-DDV and not-in-HBS were already covered.
  - **Verdict at the time:** deliberate re-grounding, **not a defect** — logged so nobody re-hunted it.
  - **Resolved 2026-09-21.** The stated future action ("add a numeric check only if the DDV field is
    later constrained") came due: the DDV field IS now constrained. `requireInteger()`
    (`Create/CheckScale/index.tsx:229-238`, commit `3095152`) rejects a non-numeric DDV client-side with
    "Check Scale DDV must be a number." / "Original Scale DDV must be a number.", so the write never
    leaves the browser. Both arms are now materialized, not covered by parity.
  - **Status:** CLOSED (app now enforces it; E2E covers it). Closed 2026-09-21.
  - **Test:** `check-scale-validation.feature` — "Step 1 blocks a non-numeric <field> before any HBS lookup" (`@S02 @p1`).

- **#4 — Step-1 DDN/DDV accepted unlimited characters (QA report, 2026-09-21).**
  - **What was wrong:** the four step-1 inputs had no `maxLength`, so a user could keep typing past the
    legacy limits. The over-long value then reached `POST /check-scales/validate` and came back as a
    generic failure that never named the field length — QA's actual complaint was the unhelpful error as
    much as the missing cap.
  - **Legacy is explicit:** `createCheckScale1.jsp:41-79` sets `maxlength="13"` on `checkDDN`/`origDDN`
    and `maxlength="9"` on `checkDDV`/`origDDV`, so typing simply stops at the limit — no error at all.
  - **Fixed 2026-09-21** in commit `3095152`: `maxLength={13}` / `maxLength={9}` on all four
    `DdnDdvTable` inputs, matching legacy exactly. With the cap in place the generic backend error is
    unreachable from the UI, so no message change was needed.
  - **Status:** CLOSED. Closed 2026-09-21.
  - **Test:** `check-scale-validation.feature` — "Step 1 caps <field> at the legacy length" (`@S02 @p1`),
    typed character by character; `fill()` bypasses `maxlength` and would pass against the broken build.
    Also unit-level: `Create/CheckScale/index.unit.test.tsx` asserts the four `maxlength` attributes.

**Spec gaps (the Gherkin is missing scenarios its own docs list):**

- **#1 — The page-2 `.feature` left out the two Net Value validations.**
  - **What's missing:** the source docs (`UC-CHK-001-slices.md:278-279,297-298`, `-technical.md:165`) list the Original and Check *Net Value* fields as required/numeric, but `UC-CHK-001-S05.feature` only wrote scenarios for the three drop-lists.
  - **The app is correct:** it does validate both Net Values (`validateStep2` → `validateNetValue`); we covered them anyway. This is a paperwork mismatch, not a bug.
  - **Future action:** a BA regenerates `UC-CHK-001-S05.feature` to include the Net Value scenarios.
  - **Status:** OPEN. Found 2026-07-08.
  - **Test (covers it anyway):** `e2e/features/chk/uc-chk-001-create/check-scale-validation.feature` (S05 outline).

**Verified — not a defect:**

- **Same check-scaler and original-scaler is allowed on the DETAIL flow — legacy parity (retracted divergence, 2026-08-25).**
  Earlier logged as Divergence #1 (the detail create accepts check-scaler == original-scaler — e.g. two
  log-tally docs `222TS34E40F40` + `2232O32730F30`, both resolving to scaler `220F`). A legacy re-check
  shows this is **correct**, not a defect. The ERR-012 rule (`errors.orig.check.equal`, "Original Scaler
  Licence # must be different than the Check Scaler #") is `CheckScaleBo.validateScalersNotSame`, which
  legacy invoked **only** from `validateSummaryCheckScale` — the SUMMARY create/update path
  (`validateCreateSummaryCheckScale` / `validateUpdateSummaryCheckScale`). The DETAIL path
  (`validateCreateCheckScale` → `CheckScaleValidator.validateCreate`) never ran it, so legacy **permitted**
  a same-scaler detail check scale. The new app matches exactly: the detail flow
  (`CheckScaleService.validate` / `createCheckScale`) enforces distinct DDN only and creates the record,
  while the summary flow still blocks it (`SummaryCheckScaleService.validateHeader:280-284`). Since legacy
  is the spec and legacy permits it on the detail flow, enforcing it there would make the new app
  *stricter* than legacy. **No app change.** The S06 test was inverted from "rejected" to assert the
  legacy-matching positive (the record IS created, same scaler on both sides) and its
  `@discovered-divergence` tag removed. (Verified 2026-08-25.)
- **Error-message wording was re-grounded on purpose.** The new page-1 messages read differently from legacy (e.g. blank document → "Required." instead of "Check Scale DDN is required."; not-found now names the document). Deliberate; the assertions match the new text. (Verified 2026-07-08.)
- **The seed was extended for this flow (test-data, not an app defect).** The two-step create needs spare HBS documents to point at; the seed only had one and it was already used, so `10-chk-check-scales.sql` + `99-teardown.sql` got spare docs added. Recorded for traceability.
