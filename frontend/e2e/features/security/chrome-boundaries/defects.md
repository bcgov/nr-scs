# Defects — cross-cutting chrome boundaries (SEC-11)

Legends: `../../../defects-guide.md`, `../../../coverage-guide.md`.

Authored 2026-08-31 from source, probed against the running local stack. 11 scenarios, all green —
**D1 was found red and fixed the same day.**

---

## Divergences

### D1 — the Not Authorized page's way out loops for the user it was written for — `CLOSED 2026-08-31`

**What happens:** a user with no recognised role lands on `/unauthorized` and clicks **Go to home page**.
`/welcome` is a `ProtectedRoute` requiring `WELCOME_READ`, which they do not hold, so the guard redirects
them straight back to `/unauthorized`. The click appears to do nothing, and nothing explains why.

**Why it is a divergence rather than correct fail-closed behaviour:** the redirect itself is right — that
user must not reach `/welcome`. What diverges is the page against its own documented intent.
`pages/RoleError/index.tsx` states it plainly:

> The Back button matters more here than on an ordinary error page: this page is a dead end reached by
> navigation, and it carries no chrome a user can navigate from when their role has no side-nav entries
> at all (an unrecognised role, or one whose permissions are not enabled yet).

That is precisely this user, and the controls put there for them do not work for them.

**Who hits it:** not a hypothetical. A client-scoped role provisioned without a forest client resolves to
"no recognised role" — the documented fail-closed state for a misprovisioned BCeID account. Such a user
reaches the refusal page on any link they follow and has no in-app way out.

**Also observed (not separately filed):** for the same user **Back** (`navigate(-1)`) leaves the
application entirely — `about:blank` when the refusal page is the first entry in history. That is
arguably the documented behaviour ("the only way out is the browser's own back button"), so it is
recorded here for context rather than as its own entry.

**Repro:**
1. Seed `localStorage['scs.mock.state'] = {"provider":"BCEIDBUSINESS","roles":[]}`.
2. Open `/unauthorized`.
3. Click **Go to home page**.
4. Observe the URL is still `/unauthorized`, with no message.

Contrast: the identical click as `SCS_INDUSTRY_SCALER` + client `00048273` reaches `/welcome`.

**Why the test was written fix-agnostic:** the defect was clear but the remedy was a product decision —
not offering a control that cannot work, routing somewhere reachable, or explaining the refusal would
all have resolved it. The scenario passes on any of them, and is **kept** that way now the fix has
shipped: it guards the property (no silent loop) rather than the shape of one particular remedy.

**The fix (2026-08-31).** `pages/RoleError/index.tsx` now branches on `hasWelcomeAccess(user)` — the
same predicate `ProtectedRoute` gates on, so "can reach home" here means exactly what it means to the
guard that would bounce them back:

- **has welcome access** — refused this page only; Back and Go to home page both work, and are unchanged;
- **no welcome access** — every route refuses them, so both controls are replaced by **Log out**: the
  only action that can change their situation, since signing in as someone else is the whole remedy.
  The description changes with it, because "permissions to view this page" is misleading when the real
  answer is the whole application.

**Tests:** three scenarios in `refusal-destination.feature` — the original (now green), plus "A user
with no home is offered a logout instead of the two dead controls" and "A role refused only this page
keeps the ordinary controls". The last is what stops the fix over-reaching: without it, swapping *every*
user onto a logout button would still pass the other two.

Unit coverage: `nr-scs/frontend/src/pages/RoleError/index.browser.test.tsx` (9 tests) — both branches,
the misprovisioned client-scoped account, the no-user case, and that the button calls `logout` rather
than navigating. Verified non-vacuous by forcing the branch: 5 of the 9 fail.

---

### D2 — the Global Error page cannot render, by either route in — `OPEN` · `@discovered-divergence`

**In plain words.** Epic SEC story **SEC-4 (System Errors / Global Error)** specifies a page that shows
a user a clean message when something goes badly wrong. That page exists in the code and is wired to a
route, and it **never displays**. A user who reaches `/error` sees the app's generic crash fallback
instead.

**Two independent reasons, both structural.**

1. **Nothing sends a failure there.** `routePaths.tsx` declares `errorElement` as a route option and no
   route sets one. Even if a route did, it would be inert: `errorElement` is a **data-router** feature
   (`createBrowserRouter`), and `App.tsx` composes plain `<Routes>` / `<Route>`. So a route-level throw
   is caught by the app-level `ErrorBoundary` in `main.tsx`, never by this page.
2. **Opening its URL crashes it.** `pages/GlobalError` calls `useRouteError()`, which in a non-data
   router throws:

   > `Unhandled UI error: Error: useRouteError must be used within a data router.`

**Measured** 2026-09-04 against the running stack. `GET /error` as an administrator renders
`<h1>Something went wrong</h1>` — the `ErrorBoundary` fallback — with **zero** `<pre>` elements. The
Global Error page's own title never appears.

**Severity: low impact, but it is dead code on a live route.** Nothing in the app links to `/error`, so
users arrive only by typing it or following a stale link, and when they do the crash is contained (that
containment is asserted green in the same feature file). What is lost is the story's actual intent: a
*specific* error message. Every failure now presents as the same generic fallback.

**A latent disclosure rides on the fix.** `pages/GlobalError` prints `error.stack` into a `<pre>` when
handed an `Error`. That branch is unreachable today for the reasons above — so the disclosure is **not
live** — but it becomes live the moment someone makes this page work by moving the app to a data router
and wiring an `errorElement`. Whoever fixes the route should remove the `<pre>` in the same change.

**Repro:**
1. Sign in (any role).
2. Open `/error`.
3. Observe `Something went wrong` (the crash fallback), not the Global Error page.
4. Console: `useRouteError must be used within a data router.`

**Test: none — this divergence is documented, not asserted.** Two green scenarios in
`error-containment.feature` cover what *ships* (the crash is contained for an administrator and for a
roleless user, and the roleless one is offered no navigation), but nothing asserts the spec.

**That is a deliberate departure from this suite's own rule, and it has a price.** The README says
*"Never force green: a suspected-defect divergence / confirmed bug is a genuinely-failing tagged test,
never masked with `@skip`, xfail, or a weakened assertion"* — and 72 files across the suite follow it. A
`@discovered-divergence` scenario asserting the spec was written and then **removed on request
(2026-09-04) so the branch runs clean.** Three consequences, none hypothetical:

1. **Nothing flips green when this is fixed.** The signal that would have told you the work landed is
   gone; someone has to re-read this entry instead.
2. **Nothing guards the disclosure.** If the fix wires an `errorElement` while leaving
   `<pre>{error.stack}</pre>` in `pages/GlobalError`, a stack trace starts reaching users and no test
   objects. That combination is the actual risk in this entry.
3. **A future reader cannot tell "unasserted" from "asserted and passing".** Hence this paragraph.

**Restoring it is a copy-paste.** Both halves, verbatim as they were:

```gherkin
# features/security/chrome-boundaries/error-containment.feature
  @p1 @discovered-divergence
  Scenario: The global error page renders when its route is opened
    Given I am signed in as a system administrator for the chrome pages
    When I open the chrome route "/error"
    Then the global error page should render its generic message
```

```ts
// steps/security/chromeBoundaries.steps.ts
Then('the global error page should render its generic message', async ({ chromeBoundary }) => {
  await expect(
    chromeBoundary.globalErrorTitle,
    'Epic SEC story SEC-4 specifies a Global Error page at /error. It never renders: ' +
      '`pages/GlobalError` calls `useRouteError()`, which throws "must be used within a data router" ' +
      'because App.tsx composes plain <Routes>/<Route>. So visiting /error crashes into the ' +
      'ErrorBoundary. DELIBERATELY RED — see defects.md D2',
  ).toBeVisible({ timeout: 15_000 });
});

// pages/security/ChromeBoundaryPage.ts — locator, removed with the step
readonly globalErrorTitle: Locator;   // in the field block
this.globalErrorTitle = page.getByText('Global Error', { exact: true });   // in the constructor
```

**And the assertion worth adding at the same time**, which never existed and would close consequence 2 —
that the page prints no stack trace:

```ts
// pages/security/ChromeBoundaryPage.ts
readonly globalErrorStack: Locator;                 // field
this.globalErrorStack = page.locator('pre');        // constructor

// a Then that pins the absence
await expect(chromeBoundary.globalErrorStack, 'the global error page must not print a stack trace to
the user').toHaveCount(0);
```

`Status: OPEN` — BA/QA to triage. Either wire the page properly (data router + `errorElement`, and drop
the `<pre>`) or retire it and let `ErrorBoundary` be the single failure surface — in which case SEC-4's
acceptance criteria should say so.

---

### D3 — the Test Messages diagnostic screen was intentionally not reimplemented — `OPEN (BA: update the spec)`

**In plain words.** Legacy SCS carried an administrator-only diagnostic page at `/testMessages.do` that
deliberately provoked messages and errors so someone could check the application's message wiring. The
new app does not have it, and **that is the intended design** — this entry exists to record the decision,
not to question it.

**Filed as a divergence rather than as "not applicable", which is what it was first recorded as.** The
registers matter here: `defects-guide.md` defines a Divergence as the app behaving differently from the
legacy-derived spec, *"might be a real bug or a deliberate change — BA/QA decide"*, resolved by dev **or
by updating the spec if intended**. This is the second of those. Calling it not-applicable would file it
as a paperwork non-event and lose the fact that a real legacy capability was consciously dropped —
exactly the kind of decision a reverse-engineered spec exists to capture.

**What is gone.** `epics.md` story **SEC-6** and UC-SYS-003, covering eight slices:

| Legacy action | What it did |
|---|---|
| `?method=messages` / `errors` / `fieldErrors` (S02–S04) | rendered known strings from `ApplicationResources*.properties` |
| `?method=role` (S05) | threw `SCSRoleException` to exercise the inline error surface |
| `?method=sql` (S06) | threw `SQLException` |
| `?method=webade` (S07) | threw `WebADEException` |
| `?method=throwable` (S08) | threw a `RuntimeException` to exercise the system-error surface |

**Why dropping it is coherent, in the terms the story itself used.** Recorded so nobody re-opens the
decision without this context:

- **Its stated purpose is served directly now.** Half its slices exist, in the story's own words, to
  "verify global error wiring in the new system". The new app asserts that wiring against the real
  paths instead of a page that fakes them — `error-containment.feature` covers crash containment, 5xx
  reporting and the 401 sign-out, and `GlobalApiExceptionHandlerTest` covers the sanitized server side.
  A screen whose job is to *provoke* errors is redundant once the error paths themselves are asserted.
- **Two of its four exception types no longer exist.** `SCSRoleException` and `WebADEException` are
  Struts/WebADE artifacts with no counterpart in the new stack, so S05 and S07 have nothing to throw.
- **Its inline-vs-system error distinction is gone by design.** The new app has one failure surface
  (`ErrorBoundary`) plus a global toast, not two JSP forwards — so the very thing S08 was written to
  tell apart from S05–S07 no longer has two sides.

**Verified absent** 2026-09-04: no `testMessages` route, page, service, controller or endpoint anywhere
in `nr-scs` (frontend and backend searched). Both legacy URLs fall through to the SPA's not-found
catch-all.

**Test:** `refusal-destination.feature` → "The removed diagnostic screen is not served, even to an
administrator" (outline over `/testMessages` and `/testMessages.do`). **Green, not red** — the same
treatment as the two intentional divergences in `../audit-affordance/defects.md`: where the app is right
and the spec is stale, the scenario pins the app's behaviour and the paperwork item goes to BA. Filing
it red would put a permanent failure in the suite for a decision that has already been made correctly.

Asserted as an **administrator** on purpose. The diagnostic was administrator-only in legacy, so a
roleless user meeting Not Found would prove nothing about it; the removal only means something if it
holds for the one role that used to have it.

**Action.** BA to mark SEC-6 descoped in `epics.md` (it currently reads `Status: To Do`, which implies
outstanding work that nobody intends to do) and note that its error-wiring intent is covered by SEC-4's
suite. `Status: OPEN` — BA, spec update only. Not a defect, and not scheduled work.

---

## Bugs / Regressions

None.

---

## Coverage gaps

**Three of the five closed 2026-09-04 — and two of them were closed by finding the lever, not by
waiting for the app to change.** Worth reading as a caution about how a gap gets worded: each of these
was recorded as "not drivable", and in two cases what was actually missing was an idea.

| Was | Why it turned out to be drivable |
|---|---|
| CG-2 `/error` | Drivable by URL all along. What it revealed is that the page never renders at all — now `defects.md` **D2** rather than a gap |
| CG-3 `ErrorBoundary` | "Needs a fault-injection hook the app does not have." A malformed **response** is a hook: a well-formed 200 whose body has the wrong shape makes the page throw. And `/error` (D2) is an even simpler lever, needing no stub at all. Known debt **F5** now has its first test at any level |
| CG-4 the 401 path | "Mock auth never expires, so the path cannot be entered." The interceptor branches on the **response**, not on a clock — a stubbed 401 on an authenticated call enters the same branch. The gap's description of the behaviour was also wrong: a 401 does not show a banner, it signs out and redirects (`services/APIs.ts:67-95`); the banner is the *5xx* path |

The two that remain are tracked in `coverage.md` (CG-1, CG-5). **CG-1** is the one worth reading here: the backend half of the
system disable is not merely awkward to test, it is **not drivable at all**. `SystemStatusService` takes
`@Value("${scs.app.enabled:true}")` into a `final` field at construction — there is no setting, no
endpoint, and no runtime toggle. Exercising `SystemStatusFilter`'s 503 requires a backend started with
the property set, which is a run profile rather than a scenario.

This is why the interstitial scenarios stub the status response the `Layout` guard reads instead. The
stub is stated plainly in the feature header and in `ChromeBoundaryPage.stubSystemDisabled` so nobody
mistakes the frontend guard for end-to-end enforcement.

---

## Spec gaps

None.

---

## Verified — not a defect

### V1 — the chrome pages are not permission-gated, and must not be — permanent

`/unauthorized`, `/error` and the `*` catch-all carry no `ProtectedRoute`, so any signed-in user reaches
them. This looks like a gap in the route table and is not:

- gating the refusal destination would make a refusal forward to a route that refuses, and loop;
- gating the 404 catch-all would leak which URLs exist, since a user could tell "no such route" from
  "not for you" by whether they were bounced.

What actually contains them is the nav tree, and that is what the scenarios assert: a roleless user is
offered **0** navigation affordances on both pages, while the same pages offer 31 to an administrator
and 3 to an industry scaler. Recorded so the next reader does not "fix" the route table.

### V2 — nav assertions must count, not name — permanent

The side nav renders each entry as an icon plus a label in a nested span, so `nav a` yields elements
whose `innerText` is `''`. A name-based assertion (`getByRole('link', { name: 'Scalers' })`) therefore
matches nothing **and passes** on a page that is showing the full menu.

Cost the first probe run a false "no navigation leaked" reading for the administrator contrast. The page
object counts affordances instead. Same family of trap as the visibility-vs-presence rule in
`role-scoping-mechanics.md`, and worth the same caution: it fails silently in the reassuring direction.
