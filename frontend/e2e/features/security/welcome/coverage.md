# Coverage — the welcome page (SEC-1 / UC-SYS-004)

> New to these files? See [`coverage-guide.md`](../../../coverage-guide.md) for the column + status-flag
> legend and [`defects-guide.md`](../../../defects-guide.md) for the registers.

**Spec:** `epics.md` Epic SEC story **SEC-1 (Welcome / Landing)** — UC-SYS-004 and UC-SEC-001-S02 — as
implemented by `pages/Landing/index.tsx` and backend `WelcomeService`.

**Rows are what the page renders.** Not matrix cells, not endpoints: the destination itself, for the one
page every authorized user lands on.

> **Executed and green 2026-09-04.** Authored from source, every value probed against the running local
> stack, then run: **15 scenarios, all green** (12 written — one is an outline over four payloads)
> (`npx playwright test --grep @welcome`). One divergence
> found, pinned green as today's behaviour — see `defects.md` D1.

## Why this page had no suite

Eleven role suites assert `/welcome` is **reachable** and stop at the URL. `../chrome-boundaries/`
asserts where a user who *cannot* reach it lands instead. Neither asks what the page renders once an
authorized user arrives — so SEC-1's own acceptance criteria, which are entirely about that, had no
home.

The menu half of SEC-1 (UC-SEC-003-S06, role-dependent menu visibility) **is** covered, cell by cell, by
the per-role suites, and is deliberately not repeated here. What was left is the summary grid — and that
is where both interesting things live.

## The two things worth a suite

### 1. Current News is stored HTML: one role writes it, every role renders it

`Current News` is the `WMSG` setting, maintained by `ADM` through `/maintenance/system`. That write is
covered by [`uc-sys-002-system-setting/`](../../admin/maintenance/uc-sys-002-system-setting/), which
proves the value can be saved and **stops there, because the value's other end is a different screen.**

This is the other end:

```
pages/Landing/index.tsx:114     dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(currentNews) }}
WelcomeService.java:59-60       stores and returns the value untouched — no server-side sanitizer
```

One client-side call is the entire defence on a path where one role's input becomes every role's
rendered markup. Nothing else in the suite exercises it.

**Every payload carries a benign marker that must survive.** "No script ran" is also true of a page that
rendered nothing and of a sanitizer that discarded the whole value — so without the marker this whole
file would stay green against a build that stopped rendering Current News altogether. That is the
failure mode a security test is most likely to hide.

**The witness was verified non-vacuous** (2026-09-04): armed via `addInitScript`, it reads `false`, and
reads `true` when an `onerror` payload is injected into the same page by hand. So DOMPurify is being
credited for stopping something the harness can actually see.

### 2. The Organization row has three outcomes, and only the set of them means anything

| Identity | Renders | Why |
|---|---|---|
| external, client resolves | `AINSWORTH LUMBER CO. LTD. - 00001009` | the acceptance criterion (UC-SEC-001-S02) |
| external, client unresolved | `00048273` | documented fallback — see `defects.md` V1 |
| internal | *(empty)* | `defects.md` **D1** |

The resolving case alone would pass on a build that echoed a name unconditionally; the fallback alone
would pass on a build that never resolved one. Asserted as a set, neither reading survives.

## Coverage rows

| Source item | Source citation | App enforcement / render point | Scenario (tags) | Status | Gap/defect |
|---|---|---|---|---|---|
| S01 — page renders the system details (version / environment / server) | UC-SYS-004-S01 | `WelcomeService` `@Value` config → grid | `welcome-summary` @S01 @p0 | covered | — |
| S01 — the grid reflects the signed-in identity's roles | UC-SYS-004-S01 | `user?.roles?.join(', ')` | `welcome-summary` @S01 @p0 | covered | — |
| UC-SEC-001-S02 — external user's Organization is `{companyName} - {clientNumber}` | SEC-1 / SEC-7 AC | `WelcomeService.resolveClientOrganization` → `scs_client_vw_pkg.search_recs` | `welcome-summary` @S02 @p0 | covered | — |
| Fallback when the client has no company name | `WelcomeService:84` | same method's `notBlank` branch | `welcome-summary` @S02 @p1 | covered | Verified V1 |
| S01 — internal user's **org unit** is displayed | UC-SYS-004 goal ("and user org-unit") | `resolveUserOrganization(orgUnitNo)` — never invoked by the frontend | `welcome-summary` @S01 @p1 (pins the empty cell) | **covered (divergence pinned)** | Divergence #1 |
| S04 — a failed summary read is reported, not shown as empty news | UC-SYS-004-S04/S05 | `welcomeQuery.isError` → `'Current news is unavailable.'` | `welcome-summary` @S04 @p1 | covered | — |
| S02 — the stored welcome message renders on the page | UC-SYS-004-S02 | `summary?.currentNews` → `.welcome-grid__news` | `current-news` (all) + `current-news-round-trip` | covered | — |
| Stored HTML is sanitized before rendering — script element | UC-SYS-004-S02; `pages/Landing:114` | `DOMPurify.sanitize` | `current-news` @S02 @p0 outline + @p1 | covered | — |
| … attribute-borne handler (`onerror`) | same | same | `current-news` @S02 @p0 outline + @p1 | covered | — |
| … attribute-borne handler (`onload` on SVG) | same | same | `current-news` @S02 @p0 outline + @p1 | covered | — |
| … embedded frame | same | same | `current-news` @S02 @p0 outline + @p1 | covered | — |
| Legitimate formatting is **not** stripped | non-vacuity of the four above | same | `current-news` @S02 @p1 | covered | — |
| Nothing on the **server** side strips the payload | `WelcomeService:59-60` | none — by design | `current-news-round-trip` @S02 @p0 | covered | Verified V2 |
| Roleless user is refused the welcome page | UC-SEC-001-S06 | `LandingPage` `hasWelcomeAccess` → `/unauthorized` | — | covered elsewhere | `../chrome-boundaries/` |
| Role-dependent menu after login | UC-SEC-003-S06 | `navigation.ts` + `permissions.ts` | — | covered elsewhere | the eleven per-role suites |
| 401 / session expiry from this page | — | `services/APIs.ts:67-95` | — | covered elsewhere | `../chrome-boundaries/error-containment.feature` |

## Symmetry check

| Assertion | Its contrast |
|---|---|
| An attack shape is removed | Ordinary `<p>/<strong>/<em>` formatting **survives** — so a strip-everything sanitizer fails |
| The company name resolves | A client that does not resolve falls back to its number |
| Internal Organization is empty | External Organization is populated on the same row of the same grid |
| The news renders | A failed read says so, rather than rendering an empty cell |

## Why the sanitizer scenarios are stubbed and one is not

`WMSG` is a **singleton row**. A scenario that wrote it would have to serialise against every other one
that does — including UC-SYS-002's suite, in a different file, which Playwright can schedule
concurrently whatever its mode tag says. So the sanitizer (a frontend property) is asserted against a
stubbed response and `current-news.feature` stays `fullyParallel`.

The one thing a stub structurally cannot show — that the **server** does not strip the payload either —
is paid for once in `current-news-round-trip.feature`, which is the suite's only WMSG mutation. Two
things make that safe rather than merely unlikely: `wmsgGuard` snapshots and restores the original value
even on failure, and the scenario asserts the marker from the payload **it** wrote, so a concurrent
overwrite makes it *fail* rather than pass on someone else's value. A flake in the safe direction, never
a false green. If it ever does flake, the fix is to move that scenario into UC-SYS-002's file so the two
share one serial group — not to weaken the assertion.

## Open gaps

| Gap | What is not covered | Why |
|---|---|---|
| CG-1 | The internal **org-unit** display, working | Nothing to assert: the frontend never passes an `orgUnitNo`, and it has no org unit to pass yet. The backend half is proven by probe (`/api/welcome?orgUnitNo=1` → `"RVA - OBSOLETE - Vancouver Forest Region (RCO)"`), so this is wiring, not capability. `defects.md` D1 |
| CG-2 | `DOMPurify`'s configuration surface | The scenarios assert four attack shapes against the **default** profile. They would not notice a future `ADD_TAGS`/`ALLOWED_ATTR` widening that admitted a fifth. A configuration-level unit test in `nr-scs` is the right place for that, not a browser scenario |
| CG-3 | Current News authored through the **UI** rather than the API | The round-trip writes via `PUT /api/system-settings/WMSG`, not by typing into `/maintenance/system`. That form is UC-SYS-002's subject and is covered there; going through it here would duplicate its suite and double the shared-row window |
| CG-4 | The unauthenticated landing view (the two login buttons) | Reached only with no session at all, which is a different fixture shape from every scenario here. Covered at unit level (`pages/Landing/index.browser.test.tsx` — "shows the login buttons and does not redirect when the user is logged out") |
| CG-5 | The `Introduction` block | Static prose in the JSX. Nothing to enforce |
