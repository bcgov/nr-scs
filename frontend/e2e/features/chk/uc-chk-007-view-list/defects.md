# Defects — UC-CHK-007 View Scaler Check-Scale List

> How this log works (registers, tags, how to read an entry): [`defects-guide.md`](../../../defects-guide.md)

Read-only UC. All scenarios open **permanent** records read-only via the Scaler view's Check Scales tab —
900Z (primary original on 905001), 901Z (check on 905001), and 902Z (an existing scaler with no check
scales). Nothing mutates, so they need no cleanup and are parallel-safe. 6 scenarios (incl. a 4-row filter
outline), all green; no divergences, no bugs.

**Bug / Regression:** _none._

**Divergences:** _none._ The list, statistics, 14-column table, filter, and empty state all match the
re-grounded Gherkin.

**Coverage gaps (not tested yet — no app problem):**

- **#1 — Can't test the permission-hidden Add button / plain-text Check Scale # (S04).**
  - **What's missing:** legacy hid the "Add Check Scale" button when `checkScaleCreate` was denied and
    rendered the Check Scale # as plain text (not a link) when `checkScaleView` was denied (STA-001/002).
    The new app has **no per-element permission mechanism** — the Add button and the Check Scale # link
    always render — and the test login is always a full admin, so the "hidden" states can't be produced.
  - **What we did instead:** asserted the re-grounded positive (Add button present, Check Scale # is a
    link) in S01.
  - **Future action:** revisit when per-element permissions are built.
  - **Status:** OPEN. Found 2026-07-13.
  - **Test (covers the re-grounded behavior):** `e2e/features/chk/uc-chk-007-view-list/check-scale-list.feature` (S01 `@p1`).

- **#2 — No equivalent of the legacy "scaler tombstone missing" case (S05).**
  - **What's missing:** legacy `.scalerCheckScales` read the scaler licence from a **session tombstone**;
    arriving without it returned an input-forward with no data (STA-003). The new app has no session
    tombstone — the scaler licence is a path segment in the tab URL
    (`/scalers/view/{lic}?tab=check-scales`) — so there is no "missing tombstone" state to reproduce. (The
    tab does render a "No scaler licence number is available" empty state if the licence is blank, but
    that isn't reachable through normal navigation.)
  - **Verdict:** legacy-only session mechanic, **not a defect**. No scenario authored.
  - **Future action:** none unless a session-context entry point is introduced.
  - **Status:** OPEN. Found 2026-07-13.

- **#3 — Can't test the "wrong role is denied" case (S06).**
  - **Why not:** mock auth (MockAuthProvider + backend MockRequestFilter) always grants the single admin
    role `SCS_SYS_ADMIN`, so a session lacking the Check Scaler role can't be produced (same limit as
    every other CHK UC).
  - **Future action:** cover the route guard as a component (Vitest) test; revisit as true E2E once
    finer-grained roles exist.
  - **Status:** OPEN. Found 2026-07-13.

**Spec gaps (the Gherkin is missing scenarios its own docs list):** _none._ The S01 `.feature` displays a
subset of the 14 summary columns and the six statistics cells the technical Control Reference lists, but
they are all `bean:write` display-only fields (no validation); asserting the statistics section, a
representative column subset, and the Check Scale # link + Add button is sufficient list coverage, so no
spec gap is raised.

**Verified — not a defect:**

- **The legacy standalone list is re-grounded to a tab.** Legacy `.scalerCheckScales` (P012) is a
  standalone Struts screen; the new app renders the same list + statistics as the **Check Scales tab**
  inside the Scaler view (`/scalers/view/{lic}?tab=check-scales`). Deliberate re-grounding; the tests
  navigate via the tab. (Verified 2026-07-13.)
- **The Refresh button is gone — the filter auto-refreshes.** Legacy required selecting a filter then
  clicking **Refresh** (a form submit); the new app's filter `Select` re-queries immediately (React Query
  re-keys on the filter value). The re-grounded scenarios select the filter and assert the re-rendered
  list, with no Refresh click. Deliberate. (Verified 2026-07-13.)
- **Statistics are null (rendered "—") until the list has rows.** The endpoint computes stats only when
  the filtered list is non-empty (documented legacy behavior); the S01 assertions check the statistics
  *section renders*, not specific numbers. (Verified 2026-07-13.)
- **Shared login hardened (test-infra, not an app defect).** During the parallel stress run the shared
  `loginAsMockScsUser` occasionally timed out because the Vite **dev** server was slow/failed to paint
  `/welcome` on a cold start under load. Fixed by making the helper web-first (explicit visibility wait)
  with a single reload-retry — no app change, benefits every UC. Recorded for traceability.
