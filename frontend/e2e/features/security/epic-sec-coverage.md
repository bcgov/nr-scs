# Epic SEC — story → suite map

**What this is.** One row per story in `epics.md` **Epic SEC: Security / Cross-Cutting Chrome**
(the epics list), naming the suite that covers it. It answers one
question — *is Epic SEC covered?* — which no per-UC ledger can, because the epic's stories cut across
screens rather than sitting on them.

**Why this file is safe to keep, when suite-wide tallies are otherwise avoided.** That
warning is about per-UC status lists and divergence counts: they change on every UC touched, so they
force every e2e dev onto one line. This has **seven rows and they are the epic's stories** — it changes
only when `epics.md` gains or loses a story. It carries no per-UC status, no scenario counts and no
divergence tally; for those, run the commands below. Nothing here needs editing when a scenario is
added.

```bash
cd e2e && npm test                     # green/red for everything
npx playwright test --grep @sec        # this epic's suites only
grep -rl @discovered- e2e/features     # open divergences, suite-wide
```

## The map

| Story | What it specifies | Covered by | Status |
|---|---|---|---|
| **SEC-1** Welcome / Landing | The page every authorized user lands on: system message, organization, role-dependent menu | `welcome/` (grid + Current News sanitization) · the eleven per-role suites (the menu, cell by cell) | ✅ covered; 1 divergence pinned (**D1**, internal org unit never shown) |
| **SEC-2** Not Authorized / Role Error | The destination ~73 permission-denied slices forward to | `chrome-boundaries/refusal-destination.feature` | ✅ |
| **SEC-3** SCS Disabled Interstitial | Non-administrators shut out while the system is disabled; administrators not | `chrome-boundaries/system-disabled.feature` | ✅ frontend; backend 503 not drivable (CG-1) |
| **SEC-4** System Errors / Global Error | A global error page, plus crash containment and error reporting | `chrome-boundaries/error-containment.feature` | ⚠️ **the page never renders** — divergence **D2**, documented but *not asserted* (red scenario removed on request). Containment, 5xx reporting and session expiry all ✅ |
| **SEC-5** Who Did It (Audit Popup) | The five audit fields, on every record view | `audit-affordance/` | ✅ covered; 2 AC amendments open (**D1**/**D2** — both `[LEGACY-BEHAVIOR-FLAG]`s resolved in code) |
| **SEC-6** Test Messages (Diagnostic) | An admin-only diagnostic exercising message resources | `chrome-boundaries/refusal-destination.feature` (its removal) | ✅ **intentional divergence** — documented as **D3**; spec update pending |
| **SEC-7** External (BCeID) Auth & Client-Restriction | External identity + forest-client scoping | `industry-scaler-role/` · `scale-site-owner-role/` · `cross-cutting-record-scope/` (incl. `active-client.feature`) | ✅ role gating, client scoping, and which client a request acts as |

### Tracker reconciliation (2026-09-04)

Writing this map surfaced that both trackers were stale on **three** of the seven stories. All three were
verified against `nr-scs` source, not inferred from the test work:

| Story | Was tracked | Evidence it is built |
|---|---|---|
| SEC-3 Disabled Interstitial | `backlog` / `To Do` | `pages/SystemDisabled/` + `SystemStatusController` / `Filter` / `Service` + `Layout`'s `isSystemAdministrator` gate |
| SEC-5 Who Did It | `backlog` / `To Do` | `components/core/WhoDidIt/` with its own browser test, mounted in 11 production files |
| SEC-7 External BCeID | `review` / `To Do` | `ActiveClientResolver`, `ClientScopeInterceptor` / `Guard` present on `main` |

`epics.md` and `sprint-status.yaml` are both updated, and `epic-sec` is now `done` (6 done, 1 descoped).
**Note the direction of the lesson:** a green suite is not evidence a story is built — a suite can pass
against a feature nobody recorded. What caught this was reading the source per story while writing the
map, which is the one activity that compares the tracker against the app.

### And the axes the epic does not name, but which belong to it

| Axis | Covered by |
|---|---|
| Each of the eleven role columns, at three levels (GUI / URL / API) | `*-role/`, `*-roles/` |
| The client-scoping enforcement seam | `cross-cutting-record-scope/` |
| §J maintenance Add / Edit / Delete controls | `maintenance-controls/` |
| Write verbs no single-role suite could probe | `write-verb-boundaries/` |

## SEC-6 is an intentional divergence, not a gap

The story describes an administrator-only diagnostic page (`/testMessages.do`) that provoked messages
and errors so someone could check the application's message wiring. **The new app deliberately does not
reimplement it.** That is a product decision, and the full reasoning — plus what exactly was dropped and
why the story's own purpose is served without it — is recorded as `chrome-boundaries/defects.md` **D3**.

Two things about how it is filed, because the first attempt got both wrong:

- **It is a Divergence, not a "not applicable" row.** `defects-guide.md` reserves the Divergence
  register for the app behaving differently from the legacy-derived spec, *"might be a real bug or a
  deliberate change — BA/QA decide"*, resolved by dev **or by updating the spec if intended**. This is
  the second of those. Filing it as not-applicable would record a consciously-dropped legacy capability
  as a paperwork non-event, which is the opposite of what a reverse-engineered spec is for.
- **It has a test, and the test is green.** The removal is asserted rather than described: both legacy
  URLs fall through to the not-found catch-all, checked as an **administrator** — the one role legacy
  granted the screen to, so the assertion means something. Green rather than red, the same treatment as
  the two intentional divergences in `audit-affordance/defects.md`: where the app is right and the spec
  is stale, the scenario pins the app and the paperwork goes to BA.

**Recorded in the trackers 2026-09-04.** `epics.md` now carries `**Status:** Descoped (2026-09-04)` on
SEC-6 with the rationale inline (AC/DoD kept below it for history, matching how RPT-14..18 were
descoped), and `sprint-status.yaml` has `sec-6-test-messages-diagnostic: descoped`. `descoped` was
already an established value in both files — seven prior stories use it — so this followed the existing
convention rather than inventing one. It was, however, missing from `sprint-status.yaml`'s own STATUS
DEFINITIONS block; that is now documented, with the distinction that matters: `descoped` means decided
against, `backlog` means still intended.

## What is genuinely still open across the epic

Everything below is recorded in the owning suite's `defects.md`; this list exists so nobody has to open
eight folders to find out whether anything is left.

| Item | Where | Kind |
|---|---|---|
| SEC-4's Global Error page never renders (`useRouteError` outside a data router) | `chrome-boundaries/defects.md` D2 | **divergence** — BA/QA to triage. **No test guards it:** the red scenario was removed on request, so nothing signals the fix landing, and nothing catches the `<pre>{error.stack}</pre>` disclosure if the fix ships with it. D2 has the restoration recipe |
| Internal users are never shown their org unit | `welcome/defects.md` D1 | divergence, pinned |
| Two UC-SYS-005 acceptance criteria contradict the shipped popup | `audit-affordance/defects.md` D1, D2 | AC amendment (BA paperwork) |
| Current News sanitization | `welcome/defects.md` V2 | see the private security findings log |
| The backend half of the system disable (`SystemStatusFilter`'s 503) | `chrome-boundaries/coverage.md` CG-1 | needs a run profile, not a scenario |
| Org-unit (district/region) scoping | every role suite's CG-1 | see the private security findings log |
| The Check Scale record read answers 500 for every role | `audit-affordance/defects.md` CG-1 | environment or CHK regression — not adjudicated here |
| 77 `blocked` rows across 59 per-UC ledgers still cite the superseded single-role mock auth | `industry-scaler-role/defects.md` gap #4 | per-domain re-triage; deliberately not swept (F10) |
