# Defects & Findings — UC-MSD-004 Delete Mark Site Designation

> How this log works (registers, statuses, glossary): [`defects-guide.md`](../../../defects-guide.md) at the e2e root.

Environment for all entries below: branch `iman/e2e-tests-for-MSD-domain`, frontend `:3000` + backend `:8080`
(mock auth `SCS_SYS_ADMIN`) + seeded Docker DB `THE/default@localhost:1525/DBDOCK_01` (`msd/msd-create-mark.sql`
applied). Data fixtures pinned in `fixtures/msd/msd-test-data.ts`. Ground-truthed 2026-07-22 (findings are
commit-independent; re-verify on any DB re-extract).

---

## Divergence

### Divergence #1 — "Delete" is a soft workbench-remove, not the legacy hard cascade-delete (S01, S03, S04, S05)

- **What's wrong (plain):** In the legacy app, "Delete" on the MSD view **permanently removed** the
  designation and all its children (conditions, species, exemptions, scale-site links), and it was
  *blocked* with a specific message when the MSD had scale sites (advisory) or an issued letter (advisory +
  a hard server-side guard). In the new app, "Delete" pops the same confirm dialog but then performs a
  **workbench-remove** — it flips an expiry-notification flag and navigates to the welcome page. The MSD
  record is **not** deleted (a `GET` still returns it), and there is **no** scale-site, letter, or role
  gating: any MSD can be "deleted" regardless of sites or letters.
- **Expected vs actual (per legacy):** Expected — confirming Delete removes the MSD + children; and Delete
  is refused when scale sites (S03) or a letter (S04 client advisory, S05 server guard) are present. Actual
  — confirming Delete calls `POST /api/mark-site-designations/{id}/workbench/remove` (sets
  `expiry_notification_ind='Y'`), navigates to `/welcome`, and leaves the record in place; none of the
  three blocking rules exist.
- **How we caught it:** `View/MarkSiteDesignation/index.tsx:195-214` (`handleDelete`) →
  `removeMarkSiteDesignationFromWorkbench` with a single unconditional `globalThis.confirm`, no
  scale-site/letter checks. Backend: `MarkSiteDesignationService.removeMarkSiteDesignationFromWorkbench` →
  `repository.setExpiryNotificationInd(authorizationId,'Y')` (no letter guard); the service exposes **no**
  hard-delete method at all. The `@S01` test confirms the record still exists (HTTP 200) after "delete".
- **Classification:** **suspected-intentional change.** Strong evidence it is by design: the method is named
  *removeFromWorkbench*, it sets a notification indicator rather than deleting, and the legacy
  `UC-MSD-004-slices.md` itself defers real deletion to "UC-MSD-004 or equivalent". Logged **log-only** (no
  `@discovered-divergence` red) — a red asserting "the record must be hard-deleted / Delete must be blocked
  by letter" would assert legacy semantics that are plausibly *correct-to-drop* in the redesign. This UC
  **owns** the deferral flagged in [UC-MSD-003 defects.md Divergence #1](../uc-msd-003-view/defects.md).
- **Severity/priority:** `@p2`. **Status:** OPEN. **ACTION: BA/QA to raise a Jira ticket** — confirm that
  (a) workbench-remove intentionally replaces hard delete, and (b) the legacy scale-site (STA-004),
  client-side letter (STA-005), and server-side letter-guard (ERR-001) blocking rules are intentionally
  dropped. If any is required, it is currently unenforced. Log-only (no test).

---

## Coverage gaps

### Coverage gap #1 — Not authorized to delete (S06 · ERR-003) — `blocked` by mock auth

- Legacy forwarded a user lacking the `markSiteDelete` WebADE permission to a Not-Authorized page. The new
  app does not gate the Delete button by role in the frontend (it renders for any authenticated user); the
  backend enforces `@IsScsEditor` on the workbench-remove endpoint. Mock auth grants only `SCS_SYS_ADMIN`
  (an editor), so the denied branch is unreachable from the browser. **Status:** OPEN — `blocked`. Revisit
  if the harness gains multi-role auth.

---

## Verified — not a defect

### Confirm dialog text matches legacy CNF-001 verbatim

- The new `window.confirm` message is exactly `Are you sure you want to delete this record?` — identical to
  legacy CNF-001. Asserted green by `delete.feature` `@S01`/`@S02`. Kept here so it is not re-investigated.

### Cancel path sends nothing (S02) — correctly implemented

- Dismissing the confirm dialog early-returns from `handleDelete`: no `workbench/remove` POST fires and the
  user stays on the MSD view. Asserted green by `delete.feature` `@S02` (workbench-remove spy = 0). Correct.
