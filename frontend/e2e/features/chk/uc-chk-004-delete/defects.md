# Defects — UC-CHK-004 Delete Detail Check Scale

> How this log works (registers, tags, how to read an entry): [`defects-guide.md`](../../../defects-guide.md)

**Bug / Regression:** _none._

**Divergences:**

- **#1 — The Delete button on a check scale does nothing (delete is not built yet).** — **CLOSED 2026-09-01.**
  - **Resolution:** delete is **built**. `DELETE /api/check-scales/{checkScaleId}` now exists
    (`CheckScaleController:91`, `@RequiresPermission(CHECK_SCALE_DELETE)`), and the view screen's confirm
    handler is a real mutation that drops the cached tab lists, navigates back, and surfaces a "Delete
    failed" banner if the call is refused (`View/CheckScale/index.tsx:157-178`). The stub alert is gone.
  - **The red that outlived the fix was the test's, not the app's.** After the feature landed S01 kept
    failing, which read like "delete still doesn't work". It wasn't: `confirmDelete()` returned as soon as
    it had *clicked*, so the read-back fired ~40 ms later while the DELETE was still in flight — the trace
    timestamp that looked like the DELETE's completion was its *start*. Driven straight at the API the
    same delete is visible in ~30 ms (DELETE -> 204, next search -> `[]`). Fixed on the test side:
    `confirmDelete()` now awaits the DELETE response and returns its status, and the read-back polls.
  - **Lesson worth keeping:** a single-shot GET after a UI-triggered write can impersonate a product
    defect convincingly enough to be written up as one. Poll, per the suite's read-back rule.
  - **Status:** CLOSED (feature built + test corrected). Opened 2026-07-13, closed 2026-09-01.
  - **Test:** `check-scale-delete.feature` (S01, now `@p0`, green).

- **#2 — A LEGACY check scale is read-only in the browser only; the server deletes it on request.**
  — **RETRACTED 2026-09-01, same day it was filed.** Legacy parity, not a divergence: legacy deleted it
  too. `CheckScaleAction.delete` (legacy) built a `CheckScaleBo` carrying **only the check scale id** and
  called `delegate.deleteCheckScale(bo)` -> `db.delete(bo)` — it never loaded the record, never ran a
  validator, and never looked at `ckscType`. Legacy's delete path was *less* guarded than its update path,
  where at least `validateUpdateCheckScale` ran (and still checked nothing about legacy). The only
  enforcement anywhere was `viewCheckScale.jsp:325` rendering the Delete button `disabled`.
  The S07 scenario now pins that contract (the delete is accepted and the record is gone) instead of
  asserting a refusal that never existed. Full write-up, and the open hardening question this legitimately
  raises, live in **UC-CHK-002's `defects.md`** — one finding, recorded once, cross-referenced here.

**Coverage gaps (not tested yet — no app problem):**

- **#1 — "Child records block the delete" (S03, ERR-001) has no new-app behaviour to assert.**
  - **Why not:** rescoped 2026-09-01. The original reason ("delete isn't built") is gone. The real reason
    is that the new app **cascades instead of blocking**: `scs_check_scale_pkg.delete_rec` removes the
    child rows and then the header (`CheckScaleRepository:268-277`), and nothing in the service looks for
    dependants first. There is no "associated records exist" refusal to assert — the legacy rule was
    replaced, not deferred.
  - **Future action:** BA/QA to confirm cascade-on-delete is intended. If it is, this row becomes
    `not-applicable` permanently; if the block was meant to survive, it is a divergence and earns its own
    genuinely-failing test.
  - **Status:** OPEN (awaiting a product answer). Found 2026-07-13, rescoped 2026-09-01.

- **#2 — "An advisory letter blocks the delete" (S04, ERR-002) can't be set up in this environment.**
  - **Why not:** rescoped 2026-09-01. "Create Letter is a no-op" is no longer true — the button navigates
    to `/check-scales/{id}/advisory-letter` and the endpoint exists (`CHECK_SCALE_ADVISORY_LETTER`). But
    that endpoint answers **500 for every caller** on this stack (the Jasper environment blocker also
    recorded in `sec/check-scaler-role/defects.md` CG-3/CG-4), so no advisory letter can be generated to
    become the dependency that would block a delete.
  - **Future action:** cover once letter generation works locally — subject to the same open product
    question as #1, since the new delete cascades.
  - **Status:** OPEN. Found 2026-07-13, rescoped 2026-09-01.

- **#3 — "User lacks delete permission → Delete hidden" (S06, STA-001): the button is offered anyway, and
  the refusal is asserted one level down.**
  - **Why not (as written):** rescoped 2026-09-01 — the premise changed twice over. The app now HAS a
    permission layer (eleven roles, `@RequiresPermission` on every handler), and `CHECK_SCALE_DELETE` is
    held by **no role column at all** — only `ADM`, through `ALL_PERMISSIONS`. But the CHK pages call no
    `hasPermission`, so Delete renders enabled for every role that can read the record. The legacy
    *hidden* state still cannot be produced — no longer for want of roles, but because this screen does not
    gate its controls.
  - **What IS covered now:** the endpoint-level denial, in
    `features/sec/check-scaler-role/api-access.feature` — `DELETE /api/check-scales/{id}` and
    `DELETE /api/summary-check-scales/{id}` are refused with 403 for the Check Scaler and the records
    survive. The security property is asserted; only the *usability* half (don't offer a control that
    cannot work) is unasserted, because the app does not implement it.
  - **Future action:** BA/QA to decide whether the view should hide or disable Delete for a role without
    `CHECK_SCALE_DELETE`. If yes, that is a divergence to file and a GUI scenario to write; if no, this row
    is `not-applicable` and the 403 is the whole story.
  - **Status:** OPEN (awaiting a product answer). Found 2026-07-13, rescoped 2026-09-01.

- **#4 — "User lacks view permission → list links not rendered" (S08, STA-003).**
  - **Why not:** same shape as #3 — no per-element gating on the list row link. The read-side denial IS
    covered: `sec/read-only-internal-roles` asserts the whole check-scale record is closed to the roles
    that hold no `CHECK_SCALE_QUERY` (view / edit / advisory-letter routes refused, search refused).
  - **Future action:** revisit with #3, as one product question about control gating.
  - **Status:** OPEN. Found 2026-07-13, rescoped 2026-09-01.

**Spec gaps (the Gherkin is missing scenarios its own docs list):** _none._ The `.feature` set (S01–S08)
matches the slice catalog and technical message table; no control/message the source enumerates was
dropped by the Gherkin.

**Verified — not a defect:**

- **Record-not-found (S05) is already covered — and works.** The legacy ERR-004 "check scale not found" is
  re-grounded to the View screen's "Could not retrieve check scale data." error, which **UC-CHK-003 S06**
  already asserts on the same screen/route. No duplicate scenario authored here. (Verified 2026-07-13; the
  edit screen's endless-spinner twin, UC-CHK-002 Divergence #1, is now fixed too.)
- **Legacy (LGCS) records disable Delete — matches the spec (S07).** `disabled={ckscType==='LGCS'}` on the
  Delete button (`View/CheckScale/index.tsx:288-294`); asserted green. The mirror arm (Edit disabled for
  legacy) is UC-CHK-002 S04. What the *server* does with the same record is legacy parity — it accepts the
  delete, exactly as legacy's own `CheckScaleAction.delete` did — pinned by S07's second scenario and
  written up in UC-CHK-002's `defects.md` (retracted Divergence #2). (Verified 2026-07-13; server arm
  verified against the legacy source 2026-09-01.)
- **The confirmation is a Carbon `<Modal>`, not a JS `window.confirm` (S01/S02).** Same heading text as
  legacy; "Confirm Delete" / "Cancel". The cancel path closes the modal and deletes nothing (S02, green).
  Deliberate re-grounding. (Verified 2026-07-13.)
- **A refused delete is reported, not swallowed.** Removing the open record out-of-band and then confirming
  the delete produces a real server refusal: the modal closes, a "Delete failed" banner appears carrying
  the server's message, and the user stays on the view. Asserted green — this is the error surface that did
  not exist while delete was a stub. (Verified 2026-09-01.)
- **"The deleted row disappears from the originating Check Scales tab" is NOT assertable for a seeded
  record — deliberately not authored.** The tab reads a display view
  (`scs_check_scale_summry_vw_pkg.search_recs`), and a freshly API-created HBCS row does not appear in it
  at all: seeding a record and calling `GET /api/scalers/220F/check-scales?filter=All` and `?filter=Check`
  returns neither. A "row is gone after delete" scenario would therefore pass on a record that was never
  listed — a false green. The post-delete navigation contract is asserted instead ("I should be taken off
  the check scale view page"). Same lossy-display-view caveat as elsewhere in the suite; not a delete
  defect. (Verified 2026-09-01.)
