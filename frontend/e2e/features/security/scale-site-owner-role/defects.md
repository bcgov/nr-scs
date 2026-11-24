# Defects — SEC-9 / `SCS_OWNER` role scoping

> **⚠️ Re-ground 2026-09-03 for the client's 2026-09-02 spec, against the unmerged nr-scs branch
> `bugfix/updated-role-scoping-specs`.** The scenarios changed in that pass were derived from source on
> that branch — `RolePermissions`, the controller `@RequiresPermission` annotations and `routePaths.tsx`
> — and **no green run against a build of it is recorded here**. Any "all N green" note below predates
> the re-ground and does not cover the changed rows. Run the suite against a stack built from that branch
> before trusting them, and delete this note in the commit that does.
>
> Ordering: land the nr-scs branch first. Against a `main` build these scenarios fail — correctly, since
> `main` predates the spec change.

Findings from building the three-level role-scoping suite (GUI · URL · API) plus client scoping for the
Scale Site Owner. How to read this file: [`defects-guide.md`](../../../defects-guide.md).

**Headline:** the permission model is **correct in substance** for this role — all 21 permissions the
matrix grants are reachable, everything it withholds is refused, on all three levels including the
client-scoping axis. No `@discovered-divergence` scenarios remain open; run `npm test -- --grep "@OWN"`
for the current count rather than trusting a number written here.

**Amended 2026-08-20 after PR review**, which replaced both client-scoping rules this suite pins: site
scope became "the sites my client owns" and scaler scope became "the scalers authorized at those sites"
— association with the caller's client no longer grants anything (Spec gap #3, rewritten). Building the
coverage for the new scaler rule surfaced Divergence #2, a real 403 in the branch.

One finding worth the whole exercise, and it is about the *suite* rather than the app: **a write endpoint
carrying a `@RequestBody` cannot be used to demonstrate an authorization denial at all**, because the
request dies before method security runs. Three rows in the industry-scaler suite do exactly that and pass
for the wrong reason (Divergence #1 below).

---

## Divergences

### Divergence #1 — a bodyless write probe never reaches `@RequiresPermission`, so three industry-scaler rows are vacuous

- **What's wrong.** Not in `nr-scs` — in the *test approach* the sibling suite established and this one
  was about to copy. `api-access.feature` for `SCS_INDUSTRY_SCALER` asserts three write denials:

  ```
  | POST   | /api/scalers               |
  | PUT    | /api/scalers/001B          |
  | POST   | /api/scaler-authorizations |
  ```

  with `Then the API should refuse it` (status `>= 400`). They pass. They would also pass for
  `SCS_SYS_ADMIN`, which holds every write permission — so they prove nothing about the role.

- **Measured, 2026-08-19.** Same endpoints, same two identities, three body shapes:

  | Request | `SCS_OWNER` | `SCS_SYS_ADMIN` | What ran |
  |---|---|---|---|
  | `POST /api/scale-sites` (no body) | **500** | **500** | Jackson deserialization failed |
  | `POST /api/scale-sites` (body `{}`) | **400** | **400** | bean validation failed |
  | `DELETE /api/scale-sites/019V/contacts/999999` | **403** | **404** | method security ran |

  The administrator column is the tell: identical status for a role holding every permission means
  authorization was never consulted.

- **Why (technical).** `@RequiresPermission` is `@PreAuthorize`, enforced by an AOP proxy *around the
  controller method*. Spring resolves `@RequestBody` arguments and runs `@Valid` **before** invoking that
  method, so a missing or invalid payload throws `HttpMessageNotReadableException` /
  `MethodArgumentNotValidException` from argument resolution and the proxy is never entered. A bodyless
  mutation has no argument to resolve, so it reaches the proxy and is refused with 403.

- **Blast radius.** Low severity, but it is a hole in the *evidence* rather than in the app: a role
  wrongly granted `SCALE_SITE_CREATE` would not be caught by a probe of this shape. The app itself is
  fine — `ControllerAuthorizationConventionTest` proves every handler is annotated, and the GUI/URL levels
  independently prove no create route or Add control is offered.

- **What this suite does instead.** All six write-deny rows use **bodyless mutations** (four DELETEs and a
  workbench-remove), each asserting `403` for the owner *and* that the administrator is **not** refused
  (404/400 — the handler ran). Nonexistent child ids are used so nothing is destroyed if authorization
  were broken; the one probe against a real record (`DELETE /api/scalers/4313`) reads the record back.

- **Action / Status / Test.** `Status: CLOSED 2026-09-04` — the industry-scaler suite **has** been
  re-shaped, and to the stronger of the two available patterns rather than this one. Verified in
  `../industry-scaler-role/api-access.feature`: its three write rows now send a body that binds and
  passes bean validation (`buildWriteProbeBody`), pin `403` for the role, and pair each probe with the
  SAME body as an administrator asserted to *pass authorization* (dying at 400 in service validation
  instead). So the refusal is attributed to `@RequiresPermission` from both directions. That suite's V5
  records the ordering fact independently.

  Worth noting which pattern won, since this entry recommended the other one: **bodied-and-paired**
  beats **bodyless**. A bodyless probe reaches authorization but cannot show that the endpoint would
  otherwise have worked, so it proves a deny without proving the deny was the *permission*. The suite
  README now states the preference ("prefer the current one"). This suite's own six write-deny rows
  remain bodyless and remain sound — they pair against an administrator who is *not* refused — but if
  they are ever revisited, the bodied shape is the one to move to.
  `Test:` `api-access.feature` → *"<method> <endpoint> is refused, and reaches the handler for an
  administrator"* is the corrected shape, green.

---

### Divergence #2 — the owner's scaler bridge was admitted by the interceptor and then refused by the service

- **Found** 2026-08-20, adding the coverage for §4's first bullet after PR review — by probing the live
  stack, not by any test. Fixed the same day, so no scenario carries a `@discovered-divergence` tag.
- **What happened.** `ClientScopeGuard.assertScalerInScope` gained the owner bridge (a scaler authorized
  at a site the caller's client owns) and `ClientScopeInterceptor` duly admitted the request. But
  `ScalerService.getScaler` and `getScalerSummary` then called
  `SecurityContextUtils.assertClientAccess(record.clientNumber())` — SEC-7's defence-in-depth guard, which
  compares the record's forest client to the caller's and knows nothing about roles or bridges. So the
  detail and Summary reads answered **403** while the bridge was live and in force.
- **Why nothing caught it.** The unit tests drove the *interceptor*, where the bridge worked. And the
  bridge worked on every scaler endpoint that has no service-level guard of its own — `/address` and
  `/exams`, the two tabs §4 actually names — so a probe that happened to pick a tab would have shown
  green. Only the two guarded endpoints were broken, and they are the ones the record opens on.
  Ground-truthed on the live stack: with the authorization seeded, `/scalers/001A/address` → 200 and
  `/scalers/001A` → 403 in the same breath.
- **Fix.** Those two call sites now use `ClientScopeGuard.assertScalerRecordInScope(licence, client)` — a
  record-in-hand form of the same rule, so defence in depth re-checks the *same* rule instead of a stricter
  one. `SecurityContextUtils.assertClientAccess` has no production callers left and now carries a javadoc
  warning against using it for a scaler or a site.
- **Action / Status / Test.** `Status: RESOLVED`.
  `Test:` `client-scoping.feature` → *"The API serves a scaler authorized at a site I own only while that
  authorization exists"* asserts the **detail** read specifically, and then the two tabs — so the layers
  are pinned agreeing rather than just one of them working. Unit side:
  `ScalerServiceTest.ClientAccessGuard` →
  *"a differing client is NOT refused on employer equality alone"* (both methods).

---

### Divergence #3 — the two bridge scenarios share a scaler anchor and collide under `fullyParallel`

**A flaky test, in the dangerous direction.** `client-scoping.feature:86` (*"The API serves a scaler
authorized at a site I own only while that authorization exists"*) fails roughly **one run in two** —
verified 2026-08-26 running this suite alone: run 1 green (168), run 2 red (167 + 1). It passes in
isolation, which is why it has been easy to miss.

**Both scenarios are affected, not just `:86` (observed 2026-09-01).** A wide `@chk|@sec` run surfaced the
*other* side of the same collision: `client-scoping.feature:50` (the URL twin, *"A scaler authorized at a
site I own is readable **only while** that authorization exists"*) went red on its post-delete assertion —
`getByText('You do not have access to this record.')` never appeared, after 33.9 s. Re-run alone it passes
in 4.6 s. Same mechanism, opposite loser: `:50` reached its assertion while `:86`'s seed on `001A` was
live. So the fix below must treat the pair, not the one scenario the table happens to name — and a red on
EITHER line is this entry, not a new finding.

**Mechanism.** Two scenarios each assert *refused before the seed, admitted after* on the same subject:

| Scenario | Seeds | Site anchor |
|---|---|---|
| `client-scoping.feature:50` (URL) | `seedOwnerScalerBridge(bridgedScalerLicenceNo, bridgeSeedScaleSiteId)` | `313` |
| `client-scoping.feature:86` (API) | `seedOwnerScalerBridge(bridgedScalerLicenceNo, apiBridgeSeedScaleSiteId)` | `601` |

The **site** anchors were separated on purpose — `scale-site-owner-test-data.ts:174` reads *"separate
anchor, same `fullyParallel` reason"*. But both seed onto the **same scaler**,
`bridgedScalerLicenceNo = '001A'`, and the admission predicate is **scaler**-keyed: "this scaler holds an
in-force authorization at a site this client owns". Either seed makes `001A` readable no matter which site
it names, so separating the sites isolates nothing. Whichever scenario reaches its pre-seed assertion
while the other's seed is live sees a readable record and fails.

This is V2's trap ("splitting a seeded entitlement into two scenarios is a parallelism trap") recurring
between two *whole* scenarios rather than within one — the seed is correctly scoped inside each scenario,
but the anchor it mutates is shared.

**Recommended fix:** give the API scenario its own scaler anchor, exactly as `bridgedScalerLicenceNo` is
already kept distinct from `otherScalerLicenceNo` for the same reason (`:189`). Needs a DB-grounded second
scaler this owner's client does not employ. The `:174` comment should also be corrected — separating the
site anchors is not sufficient, and it currently reads as though it were.

**Found from outside this suite:** surfaced while running the full `features/security/` tree after the
read-only internal column suite was added. That suite touches none of these anchors (scaler `001B`, site
`520`); it only changed worker scheduling, which made an existing race land more often. Cross-referenced
as V7 in `../read-only-internal-roles/defects.md`.

## Coverage gaps

### Coverage gap #1 — the multi-client owner is not covered — `CLOSED 2026-09-04`

> Closed by [`../cross-cutting-record-scope/active-client.feature`](../cross-cutting-record-scope/active-client.feature),
> not by a scenario here — `ActiveClientResolver` is role-blind, so the property is one seam rather than
> two role rows. The owner's own client (`00001009`) is the *lowest-numbered* anchor in that suite, so
> this role is the one driving its default-selection scenario. Original entry below, unchanged.

- `ActiveClientResolver` narrows a multi-client token to exactly one active client per request (default:
  lowest-numbered) and refuses an `X-Active-Client` naming a client the token does not grant. This suite
  exercises a single-client owner only.
- Worth more here than for the industry scaler: an owner-operator holding several forest clients is a
  plausible real account shape (a contractor operating sites for more than one company), so the switcher
  is likelier to be exercised in production by this role than by that one.
- Should cover: default client selection, switching changes which sites are listed, and an unentitled
  `X-Active-Client` refused.
- `Status: OPEN` — test author. Same gap as the industry-scaler suite's Coverage gap #3; worth doing once,
  for both.

### Coverage gap #2 — legacy blanked the Inspections and MSD tabs for a non-owned site; we do not

- Legacy `ScaleSiteInspectionsAction:62` and `ScaleSiteMSDAction:43` add an **owner-client** filter to
  those two tab queries for a client-restricted user. Since the tab is already scoped to one site, the
  effect is: open a site you do **not** own and those two tabs come back **empty**.
- The modern app queries by site only, so for a site reached through the authorization branch of
  `assertScaleSiteInScope` (not owned, but authorized) the owner sees the real Inspections and MSD rows
  where legacy showed none.
- **Not filed as a divergence.** It is a display narrowing, not an access decision, and the modern
  behaviour is arguably the intended one — §3.D grants both tabs `R (ltd)` without qualifying them by
  ownership, and `ClientScopeInterceptor` already refuses sites outside scope entirely, which is stricter
  than legacy (legacy let you open any site and just blanked the tabs).
- Cheap to cover once ruled on: the seeded-entitlement scenario already reaches such a site, so the
  assertion would be two more steps on it.
- `Status: OPEN` — BA/QA to rule on intent first. Recorded here because it is the kind of difference that
  surfaces months later as "legacy showed nothing here".

---

## Spec gaps

### Spec gap #1 — §3 and §4 contradict each other on the owner's access to a scaler's Address and Exams

- §3.C is `-` for `OWN` on **"Scaler Record – Address"** and **"– Exams / Upgrades"**. §4's OWN summary
  says the owner may *"view select information on scalers authorized to scale at their sites (**e.g.
  addresses, exam and upgrade history**)"*. Both halves of the same document, flatly disagreeing.
- Resolved in favour of **§4 for those two rows only** — `SCALER_ADDRESS_READ` and `SCALER_EXAM_QUERY` are
  granted, the other six scaler tabs stay denied. *(Decision: Jonah, 2026-08-18, recorded in
  `RolePermissions.scaleSiteOwner()`.)*
- Side effect worth knowing: `SCALER_ADDRESS_READ` was split out of `SCALER_READ` **because** §3 denies it
  to `OWN`, and `OWN` is the only column where either row is `-`. Granting it means neither permission
  currently distinguishes any enabled role. Both were kept rather than folded back in so that reverting to
  §3 stays a one-line change.
- Pinned **both ways** so the decision cannot drift silently: `gui-access.feature` asserts the three
  readable scaler tabs *and* the six withheld ones, and `RolePermissionsTest` does the same on the backend.
- `Status: OPEN` — BA to reconcile §3 and §4 (either add the two cells to §3 or reword §4). The suite
  currently asserts §4's reading; if §3 wins, three assertions change.

### Spec gap #2 — §4 lists "apply for scaler / scale site authorizations", which the role cannot do

- §4's OWN summary ends with *"Apply for scaler authorizations"* and *"Apply for scale site
  authorizations"*. §3 gives the role `R` in every authorization cell — no `C` anywhere — so the two
  disagree, exactly as they do for the industry scaler.
- Same resolution and same reasoning: legacy implemented "apply" as **printed application forms** (the
  Reports menu's `notBuilt.do` placeholders), never as SCS writes. §3 is right; §4 describes a paper
  process.
- Logged so nobody reads §4 later and files the absence of a create path as a bug.
- `Status: OPEN` — BA to reword §4, or annotate it. Duplicate of the industry-scaler suite's Spec gap #1;
  one edit fixes both.

### Spec gap #3 — §1's legend and §4 describe a rule legacy never built; it is now built, and legacy's own version was internally broken

**Rewritten twice on 2026-08-20** (PR review, then a follow-up decision). Superseded twice because the
first two versions recorded the legend as aspirational; it is now implemented.

- §1 explains the owner's `(ltd)` as *"an owner sees only scalers authorized at their own site"*, and §4's
  first bullet names the same population. **That is now the rule**, for records
  (`ClientScopeGuard.assertScalerInScope`) and for the search
  (`ClientScopeGuard.scalerLicencesAtOwnedSites`, applied by `ScalerService.searchScalers`) alike.
- **What legacy did, read first-hand rather than inferred.** `SecurityUtils.hasScalerAccess` compared
  `SCALER.CLIENT_NUMBER` to the caller's client and nothing else, gated on
  `isOwner() || isIndustryScaler()` at `ResourceCache.setScalerTombstone`; the search was bound the same
  way at `QueriesScalersSearchAction:103`. There is no authorization-based scoping anywhere in the legacy
  source. So the legend was never implemented — but legacy was **also inconsistent with itself**:
  `scaleSiteScalersList.jsp:61` linked every licence on the Authorized Scalers tab, and clicking a row for
  another company's scaler produced `RuntimeException("The Logged on user does not have access to Client
  Number: …")`. The dead link the PR review flagged is a legacy behaviour, not a regression.
- **Why association was dropped rather than kept alongside.** `SCALER.CLIENT_NUMBER` is documented in the
  database only as *"Reference to CLIENT"* — it records an association, not a current engagement, which is
  thin ground for reading a person's address and exam history. *(Decision: Jonah, 2026-08-20.)*
- **Consequences, asserted rather than hidden.** An owner whose client is registered against a scaler that
  holds no in-force authorization at any of its sites cannot read that scaler — which is `IB60` and this
  suite's anchor client, so the role-gating suites moved to a seeded anchor (see
  `permissionProbeScalerLicenceNo`). And because the results span clients, the Scalers query page's client
  field is not locked for this role, unlike every other client-restricted screen.
- `Status: RESOLVED` — the legend and §4 now describe the implementation. §4's parenthetical is still
  worth a BA note: *"addresses, exam and upgrade history"* was true of no legacy screen, whose tab showed
  only licence, name, status, appointment type, dates and the district-wide flag.
---

## Verified — not a defect

### V1 — the Contacts tab renders **two** tables with the same accessible name

- The first version of `ScaleSiteContactsTabPage` located the contacts table by
  `getByRole('table', { name: 'Scale site contacts' })` and failed with *"strict mode violation: resolved
  to 2 elements"* — for the owner **and** for the administrator, which is what showed it was a selector
  problem rather than a role finding.
- `ContactsTab` renders *Primary Site Contact* and *Additional Site Contacts* as two separate `<Table>`s
  sharing one `aria-label`. Anchor site `019V` has one contact of each kind, so both render.
- Every locator in that page object now aggregates across both and is asserted with `toHaveCount`, never
  `toBeVisible` on a bare match. Recorded because the error message reads like a broken selector and the
  obvious "fix" — `.first()` — would silently stop checking the Additional section, which is precisely
  where a leaked Edit button would sit.

### V2 — splitting a seeded entitlement into two scenarios is a parallelism trap

- The site-entitlement pair was first written as two scenarios: *"a site I am authorized at opens"* (which
  seeds) and *"that same site is refused without the authorization"* (which does not). The refusal half
  **failed**, seeing 200 where it expected 403.
- Cause: `fullyParallel` runs both concurrently, so the seed from the first is live during the second's
  window. Nothing was wrong with the app.
- Fixed in two steps, and the first was not enough on its own:
  1. assert **both directions in one scenario** — refused → seed → admitted — which removes the timing
     dependency *within* a scenario;
  2. give each seeding scenario **its own site** (`121` for the URL level, `12U` for the API level).
  Step 1 alone still left two scenarios mutating one anchor, so the race simply moved from
  between-scenarios-in-a-pair to between-the-URL-and-API-scenarios. Caught in review rather than by a red
  test — it had passed on timing. **The rule is the anchor, not the scenario shape:** no two scenarios may
  seed the same record, however each is structured.
- Worth keeping in mind generally: the industry-scaler suite avoids the same collision by using *two
  different sites*, which works but weakens the claim (the two sites might differ for some other reason).
  The single-scenario shape is strictly stronger and is what the next role should copy.

### V3 — `/scale-sites/{id}/risk-assessments` answers 500 for an administrator too, so it cannot be a deny row

- While probing the risk endpoints, `GET /api/scale-sites/019V/risk-assessments` returned **500 for
  `SCS_OWNER` and 500 for `SCS_SYS_ADMIN`**. It was excluded from the deny matrix.
- The reason it must be excluded is the point: a deny row whose contrast also fails is a row that would
  pass against a broken endpoint. The risk deny coverage uses `/risk-ratings` and the two
  `risk-assessments/search` endpoints instead, all of which return 200 for an administrator.
- Not filed as a divergence for this role (the owner holds no risk permission either way, so the endpoint's
  health is out of scope here), but flagged for whoever enables `SCS_DIST_SCALING_MANAGER` — that role has
  `CR` on the risk row and will need this endpoint working.

### V4 — 403-before-404 for a restricted caller is intentional

- A client-restricted owner asking for a scale site id that does not exist gets **403, not 404**, because
  `ClientScopeInterceptor` resolves the record before the handler runs. Collapsing the two removes an
  existence oracle over the whole site keyspace. Internal users still get 404.
- Asserted **as a pair** here (`client-scoping.feature`, two `@p1` scenarios): the owner gets 403, an
  administrator gets 404 on the same id. Recorded in the industry-scaler suite too (its V2), but asserted
  there without the administrator half — the pair is what distinguishes "the guard collapsed the two" from
  "the endpoint is broken".

### V5 — this suite's anchor client must not be shared, and could not be an arbitrary one

- Two constraints stacked. **Mutation:** the client-scoping scenarios seed an in-force authorization on
  this client's scaler, so — exactly as the industry-scaler suite's V4 records — the anchor cannot be
  shared with any suite that asserts that scaler's authorization list. `00001009` / `IB60` / sites
  `000, 019V, 313, 601, 619` are referenced nowhere else (`grep`-checked before adopting).
- **Ownership + employment:** the client had to own scale sites *and* employ a scaler, because of Spec gap
  #3 — an owner whose client employs no scaler has an empty scaler search and the `SCALER_READ` cells
  cannot be asserted against anything. Of 241 owner clients in the extract, only a handful qualify. Two
  candidates were rejected on collisions (`00047212`/`9710` — RSK suite; site `13A` — CHK suite), and site
  `313` was rejected for having no child data on any tab.
- The general rule: a **read-only** anchor can be shared freely; an anchor a suite **mutates** cannot, even
  when it cleans up, because parallel workers overlap.
