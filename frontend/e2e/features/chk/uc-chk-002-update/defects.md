# Defects — UC-CHK-002 Update Detail Check Scale

> How this log works (registers, tags, how to read an entry): [`defects-guide.md`](../../../defects-guide.md)

**Bug / Regression:** _none._

**Divergences:**

- **#1 — Editing a check scale that doesn't exist shows an endless spinner instead of an error.** — **CLOSED 2026-09-01.**
  - **Resolution:** fixed in the app. `Edit/CheckScale/index.tsx:177` now short-circuits to the error state
    (`isError || (!isLoading && !loadedData)`) before the loading guard, so a missing record renders "Could
    not retrieve check scale data." The scenario is green and kept as the regression guard for that fix;
    the `@discovered-divergence` tag is removed.
  - **What was wrong:** open the Edit screen for a check scale that isn't there (a bad link or a deleted record) and the page shows a loading spinner **forever** — it never tells you the record wasn't found. The old system showed a "check scale not found" message.
  - **Expected vs actual:** Expected a clear not-found error; actual — a permanent loading skeleton, no message, no form.
  - **How we caught it:** opened `/check-scales/edit/999999999`; 10+ seconds later still only the spinner (captured in the test trace).
  - **Why (technical):** the page checks "still loading?" *before* it checks "did it error?", and the loading flag never clears on a failed load — so the error message is unreachable (`Edit/CheckScale` index.tsx:174).
  - **Was it a defect?** Yes — a real UX bug, since fixed.
  - **Priority / env:** p2 · found on branch `iman/more-e2e-tests-creation`, commit `b4a096f0+`; fix
    confirmed on `test/cross-cutting-boundries`, commit `436cf92`+.
  - **Status:** CLOSED (fixed in the app). Found 2026-07-08, closed 2026-09-01.
  - **Test:** `check-scale-update-navigation.feature` (S07, `@ERR-007`, green — regression guard).

- **#2 — A LEGACY check scale is read-only in the browser only; the server accepts an update to it.**
  — **RETRACTED 2026-09-01, same day it was filed.** It is legacy parity, not a divergence. See
  "Verified — not a defect" below, which also carries the hardening question it legitimately raises.

**Coverage gaps (not tested yet — no app problem):**

- **#1 — Can't test the "wrong role is denied" case (S08) *here* — but it IS covered, one suite over.**
  - **Why not here:** rescoped 2026-09-01. The old reason ("the test login always grants the single admin
    role") no longer holds — the eleven-role permission layer shipped and `steps/sec/roleSession.steps.ts`
    can sign in as any column. The scenario was **removed** from this UC on 2026-09-02 rather than
    repaired, because duplicating it here would assert the same `ProtectedRoute` / `@RequiresPermission`
    pair the role suites already own, per role.
  - **Covered elsewhere:** `sec/read-only-internal-roles/url-access.feature` refuses
    `/check-scales/edit/145988` for the three read-only internal columns, and
    `sec/check-scaler-role/api-access.feature` proves the write side of the same permissions. A role
    reaching this screen without `CHECK_SCALE_UPDATE` is asserted there.
  - **Future action:** none — done. The placeholder is deleted and the coverage row cites the `sec` suites.
  - **Status:** CLOSED (covered in `sec`; placeholder removed). Rescoped 2026-09-01, closed 2026-09-02.
  - **Test:** `sec/read-only-internal-roles/url-access.feature` + `sec/check-scaler-role/api-access.feature`.

**Spec gaps (the Gherkin is missing scenarios its own docs list):** _none._

**Verified — not a defect:**

- **A LEGACY (LGCS) check scale can be updated through the API — legacy parity (retracted Divergence #2,
  2026-09-01).**
  Filed the same morning as a divergence on the reasoning that "a disabled button is not a rule": the view
  greys out **Edit Record** for a legacy record (S04), yet `PUT /api/check-scales/{legacyId}` returns
  **200 OK**. A legacy re-check shows the new app is **matching** legacy, not breaking it — so the entry was
  wrong, in the same way UC-CHK-001's same-scaler divergence was wrong, and is retracted on the same
  evidence standard.
  - **The legacy evidence.** The read-only rule existed in exactly one place: `viewCheckScale.jsp:20`
    computes `boolean isLegacy = CheckScaleBo.LEGACY_CKSC.equals(checkScale.getCkscType())`, and lines 303
    and 325 use it as the `disabled` attribute on Edit Record and Delete. **No legacy Java ever consulted
    `ckscType` before a write.** Every `getCkscType()` comparison in the legacy tree is a display label
    (`CheckScaleBo:145,147`), a length/blank check (`CheckScaleValidator:91,147`), a branch that *skips*
    summary-only field validation (`:164`), an SFP branch (`:195`), or an LT/SLT summary branch
    (`SummaryCheckScaleAction:110`). `validateUpdateCheckScale` runs `CheckScaleValidator.validateUpdate`
    plus a precision check — and nothing else. So legacy accepted this write too.
  - **What the new app does:** the same. Client-side `disabled={ckscType === 'LGCS'}`; no server guard.
    The record stays `LGCS` after the write (verified), so there is no silent type promotion either — which
    *would* have been a real divergence, and is now the assertion the re-grounded scenario protects.
  - **What the test does now:** S04's second scenario asserts the **actual** contract (the write is
    accepted, the record stays legacy) instead of a rule that never existed. Green, and it turns red if
    anyone changes the behaviour — which is the point of pinning it.
  - **Lesson (worth keeping).** A red `@discovered-divergence` claims *app ≠ legacy spec*. This one only
    ever showed *app ≠ what the test author assumed*. The tag must not be applied before the legacy source
    has actually been read; two findings in two days failed that check.

**Open question for BA/QA — not a defect, a hardening decision (raised 2026-09-01):**

- **Should the new app be STRICTER than legacy about writes to a legacy record?** Parity is established
  above, so this is a deliberate product choice rather than a bug report. What changed is not the rule but
  its *reach*: legacy was server-rendered Struts, where the JSP and the action were one tier with
  session-bound form beans and no published API, so the disabled button was in practice the whole story.
  The new app is an SPA over a documented OpenAPI contract, so `PUT /api/check-scales/{id}` (and its
  `DELETE` twin) are first-class, addressable operations — a bookmarked call, a script, or the browser's
  dev tools reaches them directly. Same absent guard, far larger surface.
  - **If BA/QA say yes:** a `ckscType` guard belongs in `CheckScaleService.updateCheckScale` /
    `deleteCheckScale`, and the two parity scenarios flip to assert the refusal.
  - **If they say no:** nothing changes; the parity scenarios already document the decision.
  - **Status:** OPEN (awaiting a product answer). Applies equally to UC-CHK-004's delete twin.

- **The ">4000-char Check-Scaler Comment" rule (ERR-008) is not user-reachable.** Legacy validated the comment length and raised ERR-008. The new app's Check Scaler Comment is a Carbon `TextArea` with `maxLength={4000}` (`components/Form/CheckScaleForm/index.tsx:295`), so the browser simply won't accept a 4001st character — there is no over-length state to submit and no error to assert. Re-grounding (same class as the CCQ flatpickr date and INS date-format cases), not a gap; logged in `coverage.md` as `not-applicable`. (Verified 2026-07-17.)
- **Reset now *reverts* the form instead of *clearing* it.** The old system's Reset blanked the fields; the new app's Reset reloads the record's saved values. Deliberate re-grounding; the test asserts the revert. (Verified 2026-07-08.)
- **Required-field messages drop the trailing "?".** e.g. "Followed Good Practices is required." (legacy had "Followed Good Practices? is required."). Same wording as UC-CHK-001. Deliberate. (Verified 2026-07-08.)
