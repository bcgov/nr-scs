# Coverage — cross-cutting chrome boundaries (SEC-11)

> **Merge-order note, resolved.** Two scenarios here — "The way out does not loop for a user with no
> home to go to" and "A user with no home is offered a logout instead of the two dead controls" — assert
> the fix for `defects.md` **D1**, which was authored on the nr-scs branch
> `bugfix/unauthorized-user-buttons`. **That fix is now in nr-scs `main`** (verified 2026-09-04:
> `hasWelcomeAccess` is present in `pages/RoleError/index.tsx` on `main`), so the ordering caveat this
> block used to carry no longer applies. Kept as a record of why those two scenarios exist, and as the
> check to re-run if they ever redden against an older build: they fail correctly there — that failure
> *is* the defect, reproduced.

**Spec:** `epics.md` Epic SEC — SEC-2 (Not Authorized), SEC-3 (SCS Disabled Interstitial), SEC-4
(System Errors / Global Error) and SEC-6 (Test Messages — intentionally not reimplemented, `defects.md`
D3) — plus `ProtectedRoute`, `routePaths.tsx` and the `Layout` guard as the enforcers. (This header previously cited SEC-4/SEC-5 for the last two; the numbering was off by one
against `epics.md`, where SEC-5 is the Who Did It popup — now covered by `../audit-affordance/`.)

**Rows are failure DESTINATIONS, not matrix cells and not screens.** Most are chrome pages; three are not
pages at all — the `ErrorBoundary` that wraps the app, and the two Axios interceptor paths (401 and 5xx).
They belong on the same axis because the question is the same for each: "where does a refused, lost,
shut-out or failing user end up, and is that place safe and usable".

## Why this is not covered by the eleven role suites

Each role suite proves that the routes its column withholds are refused, and stops there — the assertion
is `landedPath() === '/unauthorized'`. None of them asks anything about the page that renders once they
arrive. But `/unauthorized` is one page reached from ~73 use-case slices across every domain
(`epics.md` SEC-2), so a fault in it is a fault everywhere simultaneously, and eleven green suites would
not see it.

The chrome pages also **cannot be permission-gated** — a refusal that forwarded to a gated route would
loop — so the only thing standing between them and showing a user the whole application is the nav tree.
That makes "what does the chrome offer" a real question rather than a formality.

## The identity that matters

A user with **no recognised role**. Not contrived: a client-scoped role provisioned without a forest
client resolves to exactly this, which is the documented fail-closed behaviour for a misprovisioned
BCeID account. It is also the population the `RoleError` javadoc names when it explains why the page
carries its own buttons.

## What each file asserts

| File | Question | What a gap here means |
|---|---|---|
| `refusal-destination.feature` | Does the refusal / not-found destination leak, and can the user leave? | A dead-end page that shows a user navigation they cannot use, or traps them |
| `system-disabled.feature` | Is the shut-out asymmetric in the right direction? | Either the app stays reachable while disabled, or administrators are locked out of re-enabling it |
| `error-containment.feature` | Does a failure get contained, reported, and disclose nothing? | A render crash blanks the app, a 5xx is swallowed, an expiry traps the user, or a stack trace reaches them |

## Coverage rows

| Chrome page | Route | Gated? | Asserted | Verdict |
|---|---|---|---|---|
| Not Authorized (`RoleError`) | `/unauthorized` | No — by necessity | Renders for a roleless user; offers **0** nav affordances; offers nav to `ADM` (31) and `IND` (3) on the same page | ✅ |
| Not Authorized — the way out | `/unauthorized` | — | Branches on `hasWelcomeAccess`: Back + Go to home page for a role that has a home; **Log out** for one that does not, with the two dead controls withheld | ✅ (D1 fixed 2026-08-31) |
| Not Found | `*` | No — a gated 404 would leak which URLs exist | Renders for a roleless user on an unmatched URL; offers 0 nav; offers nav to `ADM` | ✅ |
| System Disabled | *(no route — replaces the shell)* | n/a | Shown to a non-administrator; app shell **not** mounted; administrator unaffected **and provably never consults the status** (see below); same user reaches the app when enabled | ✅ (frontend only — CG-1) |
| Global Error (`GlobalError`) | `/error` | No | **Never renders.** `useRouteError()` throws outside a data router, so the route crashes; the ErrorBoundary fallback is what a user sees | ⚠️ **D2** — divergence *documented, not asserted* (red scenario removed 2026-09-04); containment ✅ |
| Crash containment (`ErrorBoundary`) | *(no route — wraps the app)* | n/a | A malformed 200 makes the page throw; the fallback renders and the document is **not** blank | ✅ (CG-3 closed 2026-09-04 — debt **F5**) |
| Session expiry / 401 | *(interceptor, not a page)* | n/a | An authenticated 401 returns the user to `/welcome`; a 401 raised **by** `/welcome` does not loop | ✅ (CG-4 closed 2026-09-04) |
| Server error reporting / 5xx | *(interceptor, not a page)* | n/a | A 5xx surfaces through the global handler rather than per-page | ✅ (debt **F6**) |
| Test Messages diagnostic (SEC-6) | `/testMessages`, `/testMessages.do` | No — it does not exist | Both legacy URLs fall through to Not Found **for an administrator**, the one role legacy granted it to | ✅ intentional divergence — **D3** |

Nav is **counted, not enumerated**: the side nav renders labels into nested spans, so a name-based
assertion matches nothing and passes silently. Counts are asserted as `0` versus `> 0` rather than
pinned, since the exact tree is another suite's business.

**The administrator exemption is asserted at its mechanism, not its outcome.** `Layout` gates the status
query on `!isSystemAdministrator(user)`, so an administrator never issues the probe — the "disabled" stub
cannot reach that path, and "an administrator reaches the app while the system is disabled" would read
identically with the system ENABLED. The scenario therefore also asserts the probe never fired
(`assertSystemStatusNeverProbed`); the non-administrator scenario asserts the mirror image, that the stub
*was* served, so a drifted endpoint path fails with that message rather than an unrelated one.

## Symmetry check — where each denial's contrast lives

| Assertion | Its contrast |
|---|---|
| Roleless user offered no navigation on `/unauthorized` | The **same page** offers navigation to an administrator, and a smaller set to an industry scaler |
| Roleless user offered no navigation on Not Found | The same unmatched URL offers navigation to an administrator |
| Non-administrator diverted to the interstitial | An administrator on the same stub reaches the app |
| Interstitial shown when disabled | The **same non-administrator** reaches the app with no stub |

## Open gaps

| Gap | What is not covered | Why |
|---|---|---|
| CG-1 | `SystemStatusFilter`'s **503** — the backend half of the disable | Not drivable, and this one really is not. `SystemStatusService` reads `@Value("${scs.app.enabled:true}")` into a `final` field at construction, so the flag is a startup property with no runtime toggle and no endpoint. Closing it needs a backend started with the property set — a run profile, not a scenario |
| ~~CG-2~~ | ~~The `/error` global error page~~ — **CLOSED 2026-09-04, as a DEFECT** | Not a testing limitation. The page cannot render by either route in: `errorElement` is declared as a route option and no route sets one (and it is inert regardless — a data-router feature, and `App.tsx` composes plain `<Routes>`), while navigating to `/error` throws `useRouteError must be used within a data router`. Filed as `defects.md` **D2** |
| CG-7 | The **spec** for `/error` — that SEC-4's page renders at all | Reopened by choice, not by difficulty. A `@discovered-divergence` scenario asserting it was written and removed on request so the branch runs clean, which means nothing flips green when D2 is fixed and nothing guards the `<pre>{error.stack}</pre>` disclosure if the fix leaves it in. D2 carries the scenario and step verbatim for restoration |
| ~~CG-3~~ | ~~`ErrorBoundary` (component-level crash containment)~~ — **CLOSED 2026-09-04** | The app has no deliberate fault-injection hook, but a malformed response is one: the scaler read is stubbed with a well-formed 200 whose `licenceTypes` is a string, which `formatLicenceTypes` passes through a length check and then calls `.map` on. Known debt **F5** now has its first test at any level. The injection is implementation-coupled by necessity — if that path is hardened the scenario fails, saying so |
| ~~CG-4~~ | ~~The 401 / session-expiry path~~ — **CLOSED 2026-09-04** | Two things were wrong here. The behaviour: `services/APIs.ts:67-95` does **not** merely show a banner — it signs out and redirects to `/welcome` on any 401 that carried an `Authorization` header (the banner is the *5xx* path). And the blocker: the interceptor branches on the RESPONSE, not on a clock, so mock auth never expiring is irrelevant — a stubbed 401 on an authenticated call enters the same branch. Both the redirect and its loop-prevention guard are asserted |
| CG-5 | `UnderConstruction` | A placeholder page, not a boundary |
| CG-6 | The **Who Did It** audit popup | Not this suite's — it now has its own, `../audit-affordance/` (Epic SEC story SEC-5). Noted here because this file's header used to cite "SEC-5 (global error)", which was a numbering slip: SEC-4 is the global error, SEC-5 is the audit popup |
