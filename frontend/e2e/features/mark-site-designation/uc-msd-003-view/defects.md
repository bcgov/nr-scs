# Defects & Findings — UC-MSD-003 View Mark Site Designation

> How this log works (registers, statuses, glossary): [`defects-guide.md`](../../../defects-guide.md) at the e2e root.

Environment for all entries below unless noted: branch `iman/e2e-tests-for-MSD-domain`, frontend `:3000`
+ backend `:8080` (mock auth `SCS_SYS_ADMIN`) + seeded Docker DB `THE/default@localhost:1525/DBDOCK_01`.
Data fixtures pinned in `fixtures/msd/msd-test-data.ts` (read-only real records `2681` / `1390`, absent id
`99999999`). Ground-truthed 2026-07-21 (findings are commit-independent — re-verify on any DB re-extract).

---

## Divergence

### Divergence #1 — "Delete" is a workbench-remove with no blocking alerts (legacy STA-004/005/006 absent)

- **What's wrong (plain):** The legacy view screen had a three-way Delete: a confirm dialog when the
  designation was deletable, and two *blocking* alerts that refused deletion — one when scale sites were
  attached ("…has been associated to a Scale Site. Please set an expiry date…"), one when a letter existed
  ("…has a Mark Site Designation Letter associated to it and cannot be deleted…"). The new view screen has a
  single "Delete" button that pops a generic `window.confirm("Are you sure you want to delete this
  record?")` and then calls **workbench-remove** (`POST /api/mark-site-designations/{id}/workbench/remove`),
  navigating to `/welcome`. None of the three legacy state-specific behaviours exist.
- **Expected vs actual:** Per legacy, deletion is *blocked* (with a specific message) when sites or a letter
  are attached. Actual: one unconditional confirm→workbench-remove, regardless of sites/letter.
- **How we caught it:** `View/MarkSiteDesignation/index.tsx:195-214` (`handleDelete`) — single
  `globalThis.confirm` then `removeMarkSiteDesignationFromWorkbench`; no scale-site or letter gating. The
  backend endpoint is `…/workbench/remove` (sets the expiry-notification indicator), **not** a hard delete.
- **Supporting detail:** This looks like a deliberate redesign (workbench-remove replaces hard delete, and
  actual deletion/expiry-dating is its own concern — legacy `slices.md` itself defers Delete to
  "UC-MSD-004 or equivalent"). Logged as a **suspected-intentional change**, so no `@discovered-divergence`
  red — the *view* UC only needs the button present (asserted green in S01). The delete/workbench-remove
  behaviour itself belongs to the delete UC.
- **Severity/priority:** `@p2`. **Status:** OPEN. **ACTION: BA/QA to raise a Jira ticket** (confirm the
  workbench-remove redesign is intended and the legacy blocking-alert semantics are genuinely dropped).
  Log-only (no test).

### Divergence #2 — Scale Sites Site # is plain text, not a hyperlink to the scale-site view (STA-001 / S04) — **FIXED 2026-08-13**

- **What was wrong (plain):** In the legacy view, each Site # in the Scale Sites table was a hyperlink that
  navigated to that Scale Site's read-only view (`scaleSiteView.do`). The new app rendered the Site # as
  plain text — no link, no way to navigate to the scale site from the MSD view.
- **Expected vs actual:** Per legacy S04, Site # should be a clickable link (when the user may view scale
  sites). Actual (until 2026-08-13): plain text cell; no navigation.
- **How we caught it:** `View/MarkSiteDesignation/index.tsx:44-47,318-325` — the Scale Sites `TableResource`
  columns (`Site #`, `Site Name`) had no `renderAs` link. Asserted as current behaviour (green) by
  `view.feature @S01`, so the divergence stayed visible and regression-guarded without pretending a link
  existed.
- **Resolution (nr-scs `81a4a62`, 2026-08-13 — "full implementation of industry scaler role").** The cell
  now renders `<ScaleSiteLink>`, so the legacy cross-navigation is back:
  `<a class="scs__tab-view__table-link" href="/scale-sites/view/561">561</a>` (confirmed in the browser
  2026-08-18). It also honours the **condition** in legacy S04's own wording — "when the user may view scale
  sites": `ScaleSiteLink` wraps `PermissionLink` gated on `SCALE_SITE_READ`, so a role without that
  permission still gets plain text. So this closed as legacy specified, not merely as "a link was added".
- **How it surfaced.** As a **failing test** — the `@S01` assertion pinned the divergent behaviour, so
  fixing the app turned it red on the next full run. That is the mechanism working as intended, not a
  regression: a green-guarded divergence must invert when it is resolved. Re-grounded 2026-08-18 to
  `the Scale Sites Site # "561" links to its scale-site view`.
- **Severity/priority:** `@p2`. **Status:** CLOSED — resolved in code; no Jira ticket was needed (the
  product call the ACTION asked for was effectively made by implementing it). BA/QA: if a ticket was
  already raised, close it as done rather than re-investigating.
- **Residual:** the plain-text half of the rule is untested — see Coverage gap #5.

---

## Coverage gaps

### Coverage gap #1 — Exemptions section (STA-009, S01) — `resolved` (was `not-applicable`)

- The legacy view had an Exemptions section (exempt scaling methods, LOV `EXEMPT_MARK_METHOD_CODE`, shown
  only when non-empty). This was previously `not-applicable`: the new app had **no exemptions** anywhere in
  the MSD stack.
- **Updated 2026-09-02.** No longer true. The Exceptions/Exemptions feature was wired through end-to-end
  (paired with UC-MSD-001 Divergence #4, now RESOLVED): `MarkSiteDesignationDetail` now carries an
  `exceptions` field and the view page renders an Exemptions section (`pages/View/MarkSiteDesignation`,
  code-mapped via `exemptionLabelByCode.get(code) ?? code`). So a new-app equivalent now exists and this
  is **coverable** — a `@S01` assertion over a record with exempt methods can pin it. **Status:** OPEN —
  test author (was documented-permanent; now a writable gap).

### Coverage gap #2 — Edit Record hidden without `markSiteUpdate` (S05 · STA-003) — `blocked`

- Legacy hid the "Edit Record" button for a user lacking `markSiteUpdate`.
- **Premise corrected 2026-08-18.** This said the new app "does not gate the view buttons by role at all"
  and that "mock auth grants only the single `SCS_SYS_ADMIN` role". **Both are now out of date:** the role
  model shipped (`MSD_UPDATE` exists and gates the control), and `pages/security/RoleSessionPage` can drive any
  role (see `features/security/`). So this is no longer blocked by the harness.
- What it now needs is a role holding `MSD_READ` **without** `MSD_UPDATE`. `SCS_INDUSTRY_SCALER` is exactly
  that, so this gap is **writable today** — the equivalent assertion already exists for the Scaler record in
  `features/security/industry-scaler-role/gui-access.feature`. **Status:** OPEN — test author.

### Coverage gap #3 — Not-authorized access (S07 · ERR-002) — `blocked`

- Legacy forwarded a user without the required WebADE permission to a Not-Authorized page.
- **Premise corrected 2026-08-18.** This said `ProtectedRoute` requires `SCS_SYS_ADMIN` and "mock auth always
  grants it". Neither holds now: the route requires `MSD_READ`, and any role can be driven via
  `pages/security/RoleSessionPage`. The denied branch is reachable and already asserted generically —
  `features/security/industry-scaler-role/url-access.feature` proves a role lacking the permission lands on
  `/unauthorized`.
- Remaining for THIS UC: a role that reaches the MSD view route but not this record, if that state exists at
  all. **Status:** OPEN — test author (may resolve as `covered elsewhere`).

### Coverage gap #5 — Site # renders plain text without `SCALE_SITE_READ` (S04, second half) — `blocked`

- Divergence #2's fix is conditional: `ScaleSiteLink` → `PermissionLink` links the Site # only for a role
  holding `SCALE_SITE_READ`, and renders plain text otherwise. `view.feature @S01` covers the link half; the
  plain-text half needs a role holding **`MSD_READ` without `SCALE_SITE_READ`**, and no enabled role does —
  `SCS_INDUSTRY_SCALER` holds both, and the other nine are still welcome-only.
- Not blocked by the harness any more, unlike gaps #2/#3 below: `pages/security/RoleSessionPage` can drive any
  role (see `features/security/`). It is blocked purely on the permission matrix, so it becomes testable the
  moment a role with that combination is enabled. **Status:** OPEN — `blocked` on role roll-out.

### Coverage gap #4 — "Who Did It" audit affordance — `deferred`

- The view renders a `<WhoDidIt>` audit popup (entry/update user + timestamp). This is a cross-cutting
  component shared by many screens; defer to a single dedicated audit-affordance pass rather than
  re-litigating it per host screen. **Status:** OPEN — `deferred`.

---

## Verified — not a defect

### `letterExists` letter-button toggle (S01/S03 · STA-007/008) — correctly implemented

- The letter button correctly reads "Create Letter" when no letter exists (id `2681`) and "View Letter" when
  one does (real letter record `1390`), and the two are mutually exclusive. Asserted green by
  `view.feature @S01` / `@S03`. Kept here so the toggle is not re-investigated.

### `letterExists` concurrency false-positive on the view path — already filed (UC-MSD-002 Bug #1)

- The same `GET /api/mark-site-designations/{id}` false-positive that wrongly locks the *edit* screen (see
  [UC-MSD-002 defects.md Bug #1](../uc-msd-002-update/defects.md)) also affects this read path: under load it
  could flip the letter button Create↔View. This is **not a new bug** — it is the same open backend
  concurrency defect. The view scenarios harden around it with a fresh-login re-open
  (`MarkSiteDesignationViewPage.reopenUntilLetterState`), mirroring the edit page's workaround; the bug stays
  tracked (and red-repro'd) under UC-MSD-002 Bug #1, not re-filed here. No new action — the existing Jira
  action on Bug #1 covers it.
