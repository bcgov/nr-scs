# Defects & Findings — UC-MSD-005 Maintain Scale Site MSD Tab

> How this log works (registers, statuses, glossary): [`defects-guide.md`](../../../defects-guide.md) at the e2e root.

Environment for all entries below: branch `iman/e2e-tests-for-MSD-domain`, frontend `:3000` + backend `:8080`
(mock auth `SCS_SYS_ADMIN`) + seeded Docker DB `THE/default@localhost:1525/DBDOCK_01`. Data anchors pinned in
`fixtures/msd/msd-test-data.ts` (read-only real sites `28E` / `201`). Ground-truthed 2026-07-22 (findings are
commit-independent; re-verify on any DB re-extract).

---

## Divergence

### Divergence #1 — the MSD tab's links + Add button are never role-gated (legacy S05 has no equivalent)

- **What's wrong (plain):** In the legacy app the MSD tab hid the timber-mark hyperlinks unless the user
  had `markSiteView`, and hid the "Add Mark Site Designation" button unless they had `markSiteCreate`
  (rendering marks as plain text / omitting the button). The new app renders **both the links and the Add
  button for every authenticated user** — there is no per-element permission gate on the tab.
- **Expected vs actual (per legacy):** Expected — links/Add appear only with the matching WebADE
  permission. Actual — they always render; access control is enforced elsewhere (route-level
  `ProtectedRoute` for the page; `@IsScsEditor` on the downstream create/update endpoints), not by hiding
  tab controls.
- **How we caught it:** `MsdTab.tsx` renders the `RouterLink`s and the Add `Button` unconditionally (no
  permission check). Same design as the MSD view screen (see [UC-MSD-003 defects.md](../uc-msd-003-view/defects.md)
  role-coverage note) and consistent across the new app.
- **Classification:** **suspected-intentional change** — the new app centralises authorization at the route
  + endpoint layer rather than per-element JSP gates; single-role mock auth can't exercise the difference
  anyway. Logged **log-only** (no `@discovered-divergence` red) — a red asserting "links hidden without
  permission" would assert a legacy mechanic the redesign deliberately dropped.
- **Severity/priority:** `@p2`. **Status:** OPEN. **ACTION: BA/QA to raise a Jira ticket** (confirm the
  per-element permission gates are intentionally replaced by route/endpoint-level authorization).

---

## Coverage gaps

### Coverage gap #1 — Not authorized accessing the MSD tab (S06 · ERR-001) — `blocked` by mock auth

- Legacy forwarded a user without the required WebADE permission to a Not-Authorized page on direct
  `/scaleSiteMSD.do` access. The new app gates the Scale Site view at the route level (`ProtectedRoute`
  requires `SCS_SYS_ADMIN`); mock auth always grants it, so the denied branch is unreachable from the
  browser. **Status:** OPEN — `blocked`. Revisit if the harness gains multi-role auth.

### Coverage gap #2 — MsdTab error + no-scale-site-number branches — `deferred` (fault-injection only)

- `MsdTab.tsx` has two states beyond list/empty that the authored scenarios don't reach: the query-error
  state (`msdQuery.isError` → "Could not load mark site designations" EmptySection) and the
  no-scale-site-number guard (`normalizedScaleSiteIdNmbr.length === 0` → "No scale site number is
  available", with the Add button hidden). Neither is reachable against the live stack with real data — the
  error state needs a forced 500 (route fault-injection) and the no-id state needs an unreachable empty
  route param. Deferred to keep the tab scenarios live-grounded; if prioritised, add a `@p2` scenario that
  fulfils `GET /api/scale-sites/{id}/mark-site-designations` with a 500 and asserts the error EmptySection.
  **Status:** OPEN — `deferred`.

---

## Verified — not a defect

### Empty-grid state renders correctly (S02)

- A scale site with no designated marks (per `SCS_MSD_VW`) renders the "MSD - Timber Marks" heading, the
  `EmptySection` ("This scale site does not have any mark site designations."), and still shows the Add
  button. Asserted green by `scale-site-msd-tab.feature` `@S02` against real site `201`. Kept here so the
  empty state is not re-investigated.

### Both navigation entry points work (S03/S04)

- The timber-mark link navigates to `/mark-site-designations?timberMark={mark}` (S03) and the Add button to
  `/mark-site-designations/create` (S04) — asserted green. These are the UC's whole purpose (entry points
  to the sibling create/list UCs); recorded so they are not re-investigated.
