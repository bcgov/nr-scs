# Defects & Findings — UC-QRY-005 Search Mark Site Designations

> How this log works (registers, statuses, glossary): [`defects-guide.md`](../../../defects-guide.md) at the e2e root.

Environment: frontend `:3000` + backend `:8080` (mock auth `SCS_SYS_ADMIN`) + seeded Docker DB
`THE/…@localhost:1525/DBDOCK_01`. Data pinned in `fixtures/qry/qry-mark-site-designation-test-data.ts`
(real read-only search marks `GE5412` / `ZZZQ999`). Ground-truthed 2026-08-04 (findings are
commit-independent; re-verify pinned marks on any DB re-extract). No `@discovered-*` red tests — every
difference from the legacy spec is a plausibly-intentional re-grounding the built app already satisfies.

---

## Divergence

_None kept as a red test._ The single-page layout (no Back button), the "No results" empty state, the
client-side field validation with re-grounded wording, and the always-rendered MSD # link / Create MSD
button are all plausibly-intentional redesigns consistent with the sibling QRY search screens (UC-QRY-001/003/004)
— logged as re-groundings in `coverage.md`, not as suspected defects. If a BA later rules any of them a
regression from intended behaviour, promote it to a Divergence with a `@discovered-divergence` red then.

---

## Coverage gaps

### Coverage gap #1 — S03/S04 role-gated hiding of the MSD # link + Create MSD button — `not-applicable` / `blocked`

- Legacy hid the MSD # links without the `markSiteView` WebADE permission (S03, plain text instead of a
  link) and hid the "Create MSD" button without `markSiteCreate` (S04). The new app renders **both
  unconditionally** — there is no per-element permission gate; authorization is centralised at the route
  (`ProtectedRoute` `SCS_SYS_ADMIN`) and endpoint layer. So the per-element hide has **no new-app
  equivalent** (`not-applicable`), and any role assertion is unreachable under single-role mock auth
  (`blocked`). **Status:** OPEN — revisit if the harness gains multi-role auth. Same disposition as
  UC-QRY-004 Coverage gap #2 and UC-MSD-003 Coverage gaps #2/#3.

### Coverage gap #2 — persistent-state restore of the last search — `deferred`

- The page remembers the last valid searched mark (`usePersistentState('markSiteDesignationQuery.timberMark')`)
  and, on returning to `/mark-site-designations` with no URL param, restores it and re-runs the search — so
  the result list survives a round-trip to an MSD detail page. This is a **built-app behaviour with no legacy
  UC-QRY-005 slice** (a UI nicety, `@p2`), and it is localStorage-backed (cross-navigation state). Not
  authored in this pass. **Status:** OPEN — `deferred`.

### Coverage gap #3 — server-error render ("Search failed" notification) — `deferred`

- On a search-query error the page renders an `InlineNotification kind="error"` titled "Search failed" with
  the backend message. The search endpoint returns HTTP 200 + `[]` even for absent marks, so this branch is
  **not reachable against the live stack without fault injection** (forcing a 500 via `page.route`). Deferred
  rather than mocked in this first pass to keep every UC-QRY-005 scenario live-grounded; if prioritised, add
  a single `@p2` scenario that fulfils the search GET with a 500 and asserts the banner. **Status:** OPEN —
  `deferred`.

---

## Spec gap (gherkin-incomplete-vs-source)

_None identified._ The authored `.feature` scenarios cover every S01/S02/S05/S06/S07 control + message the
`-slices.md` catalog enumerates; S03/S04 are role-gating with no new-app equivalent (Coverage gap #1).

---

## Verified — not a defect

### V1 — the validation message wording differs from legacy, and that is correct

- Legacy ERR-001 "Timber Mark is required." / ERR-002·003 "Wildcards are not allowable in this search." The
  new app enforces the same rules **client-side** with re-grounded wording: "Timber Mark is required." and
  "Timber Mark can’t contain the % / _ character." (curly ’ U+2019). Asserted directly (pinned in the
  fixture). Recorded so it is not re-investigated. The validation also correctly moved off the server onto
  the client and dispatches **no** search request (proven by `searchMsdCalls === 0`).

### V2 — the wildcard guard also protects a hand-crafted URL

- Arriving at `/mark-site-designations?timberMark=AB%25` (a literal `%`) surfaces the wildcard error and
  dispatches **no** search — so a crafted `%`/`_` cannot reach the LIKE-capable backend from the URL, not
  just the form. Asserted green (`validation.feature` crafted-URL scenario). Correct; recorded so it is not
  re-investigated.

### V3 — empty search result is a valid success state (no error)

- A search matching nothing (`ZZZQ999` → `[]`) renders the "No results" empty state with no error banner,
  matching legacy S02's "empty is a valid success". Asserted green (`zero-results.feature`). Correct.
