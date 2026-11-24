# Defects — SEC-8 / `SCS_INDUSTRY_SCALER` role scoping

> **⚠️ Re-ground 2026-09-03 for the client's 2026-09-02 spec, against the unmerged nr-scs branch
> `bugfix/updated-role-scoping-specs`.** The scenarios changed in that pass were derived from source on
> that branch — `RolePermissions`, the controller `@RequiresPermission` annotations and `routePaths.tsx`
> — and **no green run against a build of it is recorded here**. Any "all N green" note below predates
> the re-ground and does not cover the changed rows. Run the suite against a stack built from that branch
> before trusting them, and delete this note in the commit that does.
>
> Ordering: land the nr-scs branch first. Against a `main` build these scenarios fail — correctly, since
> `main` predates the spec change.

Findings from building the three-level role-scoping suite (GUI · URL · API) plus client scoping.
How to read this file: [`defects-guide.md`](../../../defects-guide.md).

**Headline:** the permission model itself is **correct in substance** — every cell the matrix grants is
reachable and every cell it withholds is refused, on all three levels, including the client-scoping
axis. One systemic finding — refusals came back as **HTTP 500 instead of 403** — is now **FIXED**.

---

## Divergences

### Divergence #1 — a permission denial answered HTTP 500, not 403 — **FIXED 2026-08-17**

- **What's wrong.** When this role calls an endpoint it does not hold the permission for, the API
  refuses it — correctly — but reports the refusal as `500 INTERNAL_SERVER_ERROR` with the generic
  *"An unexpected error occurred. Please try again later."* body. An authorization decision is being
  presented as a server fault.
- **Expected vs actual.** Expected `403` with the standard `{ code, message }` shape, as the
  client-scope guard already returns. Actual `500` with `{"code":"INTERNAL_SERVER_ERROR", …}`.
- **How we caught it.** Every denied endpoint in the API matrix. Reproduced directly:

  ```
  curl -s -o /dev/null -w '%{http_code}' \
    -H 'X-Mock-Roles: SCS_INDUSTRY_SCALER' -H 'X-Mock-Client: 00048273' \
    http://localhost:8080/api/scale-sites/search?scaleSiteIdNmbr=520
  # -> 500   (expected 403)
  ```

  It is **not** specific to this role: `SCS_CLERICAL` behaves identically on any endpoint it lacks, and
  the same call as `SCS_SYS_ADMIN` returns 200 — so the endpoint is healthy and the 500 is purely the
  denial being mishandled.
- **Why (technical).** `@RequiresPermission` is `@PreAuthorize`, so a denial throws Spring Security's
  `AuthorizationDeniedException` (an `AccessDeniedException`) from inside the dispatch.
  `GlobalApiExceptionHandler` had no `@ExceptionHandler` for it, so the catch-all
  `@ExceptionHandler(Exception.class)` claimed it and mapped it to 500. Client-scope denials avoid this
  only because they throw the project's own `ForbiddenException`, which **is** mapped.

  `SecurityConfig:222` *does* register an `accessDeniedHandler` returning 403 — but on the **security
  filter chain**, which only sees an `AccessDeniedException` that escapes the `DispatcherServlet`.
  Method security runs *inside* the dispatch, so the `@ControllerAdvice` caught it first and the
  filter-chain handler never ran. That is why the two denial paths disagreed: a URL-rule denial
  (`X-Mock-Roles: none` against the `/api/**` rule) correctly returned 403, while a method-level
  `@RequiresPermission` denial returned 500.
- **Blast radius.** Three consequences, all following from the one root cause:
  1. the frontend's `isForbiddenError` access-denied card can never fire for a *permission* denial (it
     only sees 403), so the user gets a generic error instead of "you do not have access";
  2. monitoring and logs count every authorization refusal as a server fault — the `handleFallback`
     handler logs each one at `error` with a stack trace;
  3. a caller cannot distinguish "not allowed" from "broken".
- **The fix (2026-08-17).** `GlobalApiExceptionHandler.handleAccessDenied` — an
  `@ExceptionHandler(AccessDeniedException.class)` returning 403 with the standard `{code, message}`.
  It must live in the `@ControllerAdvice`; the filter-chain handler cannot be made to see this. Three
  details worth keeping:
  - it catches the **parent** `AccessDeniedException`, not just `AuthorizationDeniedException`, so any
    other in-dispatch authorization failure maps the same way;
  - the message is **fixed**, not `ex.getMessage()` — Spring's text names the failed expression and
    therefore the permission (`hasAuthority('SCALE_SITE_QUERY')`), which would tell an unauthorized
    caller exactly what to acquire. Pinned by a test;
  - it logs at `warn`, matching the filter-chain handler, so routine refusals stop producing `error`
    entries with stack traces.
- **Action / Status / Test.** `Status: FIXED` — verified by `GlobalApiExceptionHandlerTest` (14/14) and
  the security suite (56/56: `RequiresPermissionTest`, `SecurityConfigAuthorizationTest`,
  `ControllerAuthorizationConventionTest`, `ClientScopeInterceptorTest`, `MockRequestFilterTest`).
  `Test:` `api-access.feature` → *"A permission denial answers 403 rather than a server error"* — the
  `@discovered-divergence` tag has been removed; it is now an ordinary green scenario guarding the
  status contract. Confirmed green end-to-end 2026-08-18 after the backend redeploy (the running Tomcat
  serves an exploded WAR from the IDE's artifact output, so `mvn test` passing is not enough on its own).

---

## Coverage gaps

### Coverage gap #1 — the Scale Site record's two readable tabs are not asserted individually

- The matrix grants `IND` two scale-site tabs (`Check Scales` `R`, `Software Use` `R`), and both
  endpoints were confirmed reachable by hand during authoring. The suite asserts the *record opens* for
  an entitled site but does not walk those two tabs.
- Why it is parked rather than done: the entitled-site anchor is self-seeded per scenario, so tab
  assertions would need the seed to be extended into the tab-level suites, which belongs with those
  screens' own UCs rather than here.
- `Status: OPEN` — test author.

### Coverage gap #2 — Mark Site Designation single-record read is not asserted

- `MSD_READ` is granted (`R` in §3.F) and the search screen is covered, but opening one designation is
  not. MSD is not client-scoped, so this is pure role coverage and cheap to add once a stable read-only
  MSD anchor is pinned for this suite.
- `Status: OPEN` — test author.

### Coverage gap #3 — the multi-client external user is not covered

- `ActiveClientResolver` narrows a multi-client token to exactly one active client per request (default:
  lowest-numbered) and refuses an `X-Active-Client` naming a client the token does not grant. This suite
  only exercises a single-client user.
- Worth noting because the behaviour **changed** since SEC-7, which refused a multi-client token with
  403 outright; the switcher now supports it. A scenario should cover: default client selection,
  switching, and the not-entitled refusal.
- `Status: CLOSED 2026-09-04` — covered, but **not here**. It went to
  [`../cross-cutting-record-scope/active-client.feature`](../cross-cutting-record-scope/active-client.feature)
  because `ActiveClientResolver` never looks at a role: the same four rules hold for this role and for
  `SCS_OWNER`, so a copy in each suite would assert one property twice and drift. All three cases this
  entry asked for are there (default = lowest-numbered, an entitled switch, and the not-entitled
  **403** paired against an entitled selection in the same scenario), plus two this entry did not ask
  for: that an internal user's header is ignored in both directions, and a regression guard for the
  single-client case every other external scenario depends on.

### Coverage gap #4 — other UCs' `blocked` role rows are now testable and should be revisited

- Every other `coverage.md` in this suite carries rows marked `blocked` with the reason *"mock auth
  grants only `SCS_SYS_ADMIN`, so wrong-role denial cannot be produced"*, and `README.md` repeats it in
  *Notes*. **That constraint is gone.** The role model shipped, and `pages/security/RoleSessionPage` seeds any
  role + forest client before the app boots.
- **Re-triaged 2026-09-04. All three items this entry named are resolved, and none of them the way it
  expected — worth reading, because the entry was wrong about two of them:**

  | Named item | Actual status |
  |---|---|
  | UC-CHK-004's `@skip` S07 | **No `@skip` remains in that folder.** Its S07 rows are covered (`check-scale-delete @S07 @p1`, both the disabled-button half and the server half). Whatever the skip was, it went before this entry was re-read; only **two** `@skip` tags remain in the whole suite |
  | UC-CHK-003's STA-006 "Create Letter hidden when report permission denied" | **Never blocked by mock auth.** Its ledger records the reason as an app fact — "Create Letter always renders" — so it is `not-applicable` against the new app and a role session would not change it. It belongs to that UC's Coverage gap #1, not here |
  | `Given('I am authenticated without the Check Scaler role')` as `skipped(...)` | **Gone.** No `skipped(` call remains anywhere in `steps/` |

- **What DOES remain, quantified so it stops being a vague pointer:** 59 `coverage.md` files still cite
  the superseded limitation in prose, and 77 rows across the suite are still marked `blocked`. Not all
  77 are mock-auth rows — that count is every `blocked` row, whatever its cause — so the real backlog is
  a subset that has to be read row by row.

  **Deliberately NOT swept from here.** Editing 59 per-UC ledgers in one change is exactly what
  the suite's conventions avoid: those files are per-folder so that parallel e2e work rarely
  conflicts, and a 59-file touch would collide with every branch in flight. The superseding statement
  already exists where it governs all of them — the e2e `README.md` says role scoping is testable now
  and that several `coverage.md` files still cite the old limitation. Each domain's next author should
  re-triage their own rows against `features/security/`.

- `Status: OPEN (reduced)` — the three named items are closed; the row-by-row sweep is per-domain work,
  owned by each domain's author rather than by this suite.

---

## Spec gaps

### Spec gap #1 — §4 lists "apply for exams / authorizations / appointments", which the role cannot do

- The role summary in `roles-permissions.md` §4 says an Industry Scaler can *"apply for exams"* and
  *"apply for authorizations / appointments"*. The §3 matrix gives the role `R` in every one of those
  cells — no `C` anywhere — so the two halves of the same document disagree.
- Resolved (correctly, we think) in `RolePermissions.industryScaler()`: legacy implemented "apply" as
  **printed application forms** (the Reports menu's `notBuilt.do` placeholders), never as SCS writes. So
  §3 is right and §4's wording is describing a paper process.
- Logged so nobody reads §4 later and files the absence of a create path as a bug.
- `Status: OPEN` — BA to reword §4, or annotate it.

### Spec gap #2 — the Client Queries filter is now locked, contradicting SEC-7's recorded deviation

- SEC-7 AC 3 and AC 7 both carry an explicit *"Deviation (2026-07-27, legacy parity)"*: the
  **Client** Queries page is **not** seeded/locked, because legacy locked only `scalerSearch.jsp` and
  `scaleSiteSearch.jsp`, never `clientSearch.jsp`.
- The app no longer matches that note. As of `nr-scs` commit `4041715` ("fix: PR comments"),
  `pages/Queries/Client/index.tsx` seeds and locks `clientNumber` for a client-restricted user
  (`clientReadOnly={isClientRestricted}`). Confirmed in the browser: the field renders read-only at
  `00048273`.
- **Not filed as a divergence**, because it looks like a deliberate later decision, and it is arguably
  the better reading of §3's `R (ltd)` on *Queries – Clients – Results*. Note the server side is
  unchanged — `ClientService.searchClients` still applies no override, so the API remains unrestricted
  and only the UI narrows. That asymmetry is what makes it worth a decision rather than an assumption.
- Needs a one-line ruling before a scenario pins either behaviour — hence coverage row *"Client search
  NOT scoped server-side, but filter locked in UI"* is `deferred`.
- `Status: OPEN` — BA/QA to confirm intent, then update SEC-7's deviation note (and this suite gains a
  scenario).

---

## Verified — not a defect

### V1 — the scaler record shows Save Record / Confirm Delete markup to this role

- On first inspection the Scaler Record appeared to render `Save Record` and `Confirm Delete` buttons
  for the industry scaler, which would have been a serious mismatch with the read-only matrix column.
- **It is correct.** Those controls belong to Carbon modals, which mount their contents into the DOM
  while hidden; none is visible. Confirmed by measuring bounding boxes and computed visibility — every
  write control on every tab is `hidden` for this role and `visible` for `SCS_SYS_ADMIN`.
- Recorded because the naive check (`toBeAttached`, `allInnerTexts`, a text search of the page) reports
  the opposite, and would send the next person down the same path. **Every assertion in
  `gui-access.feature` asserts visibility, never presence, for this reason.**

### V2 — `403`-before-`404` for a restricted caller is intentional

- A client-restricted caller asking for an id that does not exist gets `403`, not `404`, because
  `ClientScopeInterceptor` runs before the handler. Documented in that class: an external user has no
  business distinguishing "another client's record" from "no such record", and collapsing the two removes
  an existence oracle over the whole scaler/site keyspace. Internal users still get `404`.
- Relevant to anyone extending this suite: a "record not found" scenario written against a restricted
  role will see 403 and is not evidence of a bug.

### V4 — this suite's scaler anchor must not be shared with another suite

- The client-scoping scenarios seed an **in-force** authorization on the mock client's scaler, so while one
  runs, that scaler has an extra *Active* authorization. The suite originally used `00001110` / `001A` —
  which the SCA tab suite pins as "exactly one, long-expired authorization" and asserts that the *Active*
  status filter empties the list. Under `fullyParallel` that is an intermittent cross-suite failure: SCA
  sees a row that only exists because a SEC scenario is mid-flight.
- Caught by reading the other suite's fixtures rather than by a red test — it never fired in the runs to
  date, which is exactly what makes this class of bug expensive later.
- Moved to `00048273` / `001B` / authorization `147851` on 2026-08-18: same shape (one owned scaler, one
  long-expired authorization) but referenced nowhere else in the suite. **Anyone re-pinning this anchor
  must re-check that** — `grep -rn "<licence>" fixtures/ features/ steps/` before adopting one.
- The general rule this is an instance of: a **read-only** anchor can be shared freely; an anchor a suite
  **mutates** cannot, even when it cleans up after itself, because parallel workers overlap.

### V5 — a write is body-checked BEFORE it is permission-checked, so a body-less write probe is vacuous

- `@RequiresPermission` is meta-annotated `@PreAuthorize`, i.e. Spring **method** security — an AOP
  interceptor around the handler. Argument resolution (message conversion of `@RequestBody`, then bean
  validation) is performed by the handler adapter *before* the method is invoked, so it runs first. The
  coarse `/api/**` filter-chain rule only requires *any* recognised role, which `SCS_INDUSTRY_SCALER`
  has, so nothing refuses the request earlier.
- Measured on the real `SecurityConfig` + `MethodSecurityConfig` chain (MockMvc, a guarded `POST`
  handler, `@WithMockUser` holding the wrong permission):

  | body | caller lacks the permission | caller holds it |
  |---|---|---|
  | none, no content type | **400** | 400 |
  | none, `application/json` | **400** | 400 |
  | binds but fails `@Valid` | **400** | 400 |
  | binds and passes `@Valid` | **403** | (handler runs) |

- **Consequence for this suite.** The write rows originally probed with no body and asserted only
  `>= 400`. Every one of them was passing on the binder's 400 — the same 400 an administrator gets —
  so they were green for a reason unrelated to the role and would have stayed green if the role were
  wrongly granted `SCALER_CREATE`/`SCALER_UPDATE`/`SCALER_AUTHORIZATION_CREATE`. Found by review, not
  by a red test, which is what makes this class of gap expensive: the rows *looked* like the strongest
  assertions in the file.
- **Fix.** `buildWriteProbeBody` supplies, per endpoint, a body that satisfies every schema-`required`
  field (so it reaches authorization) and then violates a business rule enforced service-side (so it
  cannot mutate anything after authorization). The write scenarios pin **403**, and an administrator
  contrast asserts **400** on the same body — together: the endpoint is live, the body is acceptable,
  and the only difference is the role.
- `DELETE` is unaffected — no body to bind, so it reaches the permission check unaided. Its scenario
  keeps the read-back, which covers the outcome a status code cannot see.

### V3 — the seeded site entitlement must be *in force*, and must be seeded

- `ClientScopeGuard.assertScaleSiteInScope` admits a site the client does not own only when one of the
  client's scalers holds a **currently in-force** authorization there (`isInForce`: not cancelled, past
  its effective date, before its expiry). Every real authorization for the pinned anchor client expired
  years ago, so the entitlement cannot be pinned from the extract at all — it is today-relative state a
  static snapshot cannot hold. Hence the per-scenario seed + teardown.
- Also relevant: the guard deliberately reads a repository method that sees **every** authorization row,
  not the site's `authorized-scalers` display view — that view drops rows, and a dropped row would be
  indistinguishable from "not authorized". Do not substitute the display view when extending this.
