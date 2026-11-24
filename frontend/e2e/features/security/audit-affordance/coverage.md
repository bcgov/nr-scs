# Coverage — the cross-cutting audit affordance (SEC-5 / UC-SYS-005)

> New to these files? See [`coverage-guide.md`](../../../coverage-guide.md) for the column + status-flag
> legend and [`defects-guide.md`](../../../defects-guide.md) for the registers.

**Spec:** `epics.md` Epic SEC story **SEC-5 (Who Did It — Audit Popup)** and UC-SYS-005 slices S01, S02,
S05, as implemented by `components/core/WhoDidIt/index.tsx`.

**Rows are the affordance's properties and its host screens — not screens and not matrix cells.** The
subject under test is one *component*, mounted on eleven pages. That is the third axis this suite family
uses (after role columns and enforcement seams) and it exists for the same reason they do: the property
belongs to no single screen.

> **Executed and green 2026-09-04.** Authored from source, probed against the running local stack, then
> run: **9 scenarios, all green** (`npx playwright test --grep @audit`). Two divergences from the
> story's acceptance criteria were found and are **pinned green as today's behaviour** rather than left
> as red — see `defects.md` D1/D2 and "Why the divergences are pinned, not red" below.

## Why this suite exists at all

Every per-UC ledger that met this component wrote down the same decision and moved on:

> The view renders a `<WhoDidIt>` audit popup (entry/update user + timestamp). This is a cross-cutting
> component shared by many screens; **defer to a single dedicated audit-affordance pass** rather than
> re-litigating it per host screen.
> — [`uc-msd-003-view/defects.md`](../../mark-site-designation/uc-msd-003-view/defects.md) Coverage gap #4

UC-CHK-003 recorded the same thing from the other side (its gap #3, 2026-07-09: "not rendered on the new
view … nothing to assert"). **That is now stale** — `pages/View/CheckScale/index.tsx:354` renders
`<WhoDidIt audit={data} />` today. Nobody re-checked, because no suite owned the component.

This is that pass. The deferral was right; leaving it deferred was the gap.

## The three questions, and why none of them is a screen's

| Question | Why no host screen can answer it | File |
|---|---|---|
| **Who may see it?** | The popup lists the IDIR user ids of everyone who touched a record. The component withholds it from non-IDIR sessions before rendering anything — a disclosure boundary decided by the **IdP**, not by any permission, so no role suite can see it either | `who-did-it.feature` |
| **Whose values are these?** | The five fields are whatever the host handed the component. A host wired to an endpoint carrying no audit fields renders five blank rows and looks fine | `who-did-it.feature` |
| **Is it actually there?** | The component can be perfect and a host can drop it. SEC-5's own note for dev makes "many record views" the contract | `host-screens.feature` |

## The variable is isolated — and that is the suite's main design decision

The two identities are `SCS_SYS_ADMIN` **through IDIR** and `SCS_SYS_ADMIN` **through BCeID**. Same role,
same permissions, same navigation, same records — the only difference is `user.idpProvider`. So when the
affordance appears for one and not the other, nothing else can explain it. A permission-shaped contrast
(administrator vs. a narrower role) could not make that claim, because the narrower role would also
differ in what it may read.

**This required a harness change, and it has a finding attached.** `RoleSessionPage.signInAs` now takes
an IdP provider, defaulting to `BCEIDBUSINESS` so no existing scenario's subject changes (the IdP is
invisible to `RolePermissions`, `permissions.ts` and `navigation.ts` — they read `roles`). The finding is
what that default means: **every role suite written before this one drives internal roles through an
external IdP**, so this component renders for nobody in any of them. Their record-view control sweeps
were reading pages with no audit trigger on them. Not a fault in those suites — the affordance was not
their subject — but see `defects.md` V1 before assuming a role suite has looked at it.

## Coverage rows

| Source item | Source citation | App enforcement / render point | Scenario (tags) | Status | Gap/defect |
|---|---|---|---|---|---|
| S01 — the five audit fields render with their labels | UC-SYS-005-S01 | `WhoDidIt` `rows[]` → `.who-did-it__label` / `__value` | `who-did-it` @S01 @p0 | covered | — |
| S01 — the values are **the record's**, not plausible strings | UC-SYS-005-S01 | host passes `audit={…}`; compared against `GET /api/scale-sites/019V/summary` in-scenario | `who-did-it` @S01 @p0 | covered | — |
| S01 — Close button at the bottom dismisses the popup | UC-SYS-005-S01; component javadoc | Carbon `Modal` `primaryButtonText="Close"` | `who-did-it` @S01 @p2 | covered | — |
| S05 — timestamp rendering | UC-SYS-005-S05 `[LEGACY-BEHAVIOR-FLAG]` | `formatDateTime` → `America/Vancouver`, `sv-SE` shape | `who-did-it` @S05 @p1 | **covered (divergence pinned)** | Divergence #2 |
| S02 — revision count when **present and zero** | UC-SYS-005-S02 (inverse) | `revisionCount != null ? String(…) : ''` | `who-did-it` @S02 @p1 | covered | — |
| S02 — revision count when **absent** | UC-SYS-005-S02 `[LEGACY-BEHAVIOR-FLAG]` | same line — renders `''`, not `0` | — (asserted at unit level; see below) | **not-applicable (divergence recorded)** | Divergence #1 |
| Withheld from a non-IDIR session | component javadoc; legacy `<scs:whoDidIt userType="IDIR"/>` | `user?.idpProvider !== 'IDIR'` → `return null` | `who-did-it` @S01 @p0 (BCeID) + @p1 (external owner) | covered | — |
| Offered to the same role through IDIR (the contrast) | — (non-vacuity) | same line | `who-did-it` @S01 @p0 | covered | — |
| Mounted on the Scaler record | SEC-5 Notes for dev | `View/Scaler/.../SummaryTab.tsx:46` | `host-screens` @S01 @p0 | covered | — |
| Mounted on the Scale Site record | SEC-5 Notes for dev | `View/ScaleSite/.../SummaryTab.tsx:69` | `host-screens` @S01 @p0 | covered | — |
| Mounted on the Mark / Site Designation view | SEC-5 Notes for dev | `View/MarkSiteDesignation/index.tsx` | `host-screens` @S01 @p0 | covered | — |
| Mounted on the Scaler Authorization view | SEC-5 Notes for dev | `View/ScalerAuthorization/index.tsx` | `host-screens` @S01 @p0 | covered | — |
| Mounted on the Scale Site Authorization view | SEC-5 Notes for dev | `View/ScaleSiteAuthorization/index.tsx` | `host-screens` @S01 @p0 | covered | — |
| Mounted on the Check Scale view | SEC-5 Notes for dev | `View/CheckScale/index.tsx:354` | — | **blocked** | Coverage gap #1 |
| Mounted on the five modal / nested hosts | SEC-5 Notes for dev | see CG-2 | — | deferred | Coverage gap #2 |
| IDIR-only record fetch is skipped for non-IDIR | `View/Scaler/.../SummaryTab.tsx:29-36` | `enabled: … && isIdir` | — | deferred | Coverage gap #3 |

## Why the divergences are pinned, not red

The suite's convention is that a divergence which looks like a defect stays a genuinely-failing
`@discovered-divergence`. **Neither of these two qualifies**, and the reason is the same for both: the
acceptance criteria they diverge from are themselves `[LEGACY-BEHAVIOR-FLAG]`s — the story text asks dev
to *decide*, and records the legacy behaviour only as the starting point:

> **Flag:** Displaying `Revision Count: 0` when the field is null conflates "never modified" with
> "missing audit data". … **Dev to confirm** whether null should be displayed distinctly.
> **Flag:** Silent truncation drops timezone and fractional-seconds data without indication. … **Dev to
> confirm** whether the new system should format timestamps explicitly (with timezone) or preserve the
> legacy truncation contract.

Both were confirmed — in the direction the flags invited, and away from the AC's literal text. So the
app is not diverging from a settled requirement; the requirement was open and has been closed in code
without the AC being updated. The scenarios therefore pin **today's** behaviour green and `defects.md`
carries the paperwork item: BA to amend the two ACs. Filing them red would put two permanent reds in the
suite for decisions that have already been made correctly.

## Symmetry check — where each denial's contrast lives

| Assertion | Its contrast |
|---|---|
| No affordance for a BCeID session | The **same screen, same role** through IDIR offers it |
| No affordance for an external owner on its own site | Same — and the site is one its client owns, so the refusal cannot be mistaken for a record it could not read |
| An absent field renders blank | A **present zero** renders `0` — the component's `!= null` test, asserted from both sides |
| Timestamp converted, not truncated | The pinned value differs in the HOUR (11 vs 18), so no build satisfies both readings |

## Open gaps

| Gap | What is not covered | Why |
|---|---|---|
| CG-1 | The **Check Scale** view host | `GET /api/check-scales/145988` and `/145849` answer **500 for every role including an administrator** in this environment (probed 2026-09-04), so the host screen cannot render. Not attributable here — the endpoint belongs to the CHK suites. Its `CheckScaleApiModel extends AuditDetails`, so the wiring is right in source; whether the response actually carries the five fields is unverified. See `defects.md` CG-1 |
| CG-2 | The five **modal / nested** hosts — Performance Remarks' action row, `MaintenanceFormModal`, `TemplatesModal`, the risk-assessment form, and the site's Contacts view | Each needs its host's own opening ritual (open the record, reach the tab, open the modal), which is that suite's vocabulary rather than this one's. The component is proven; what is unproven is only that these particular hosts still mount it. The cheap close is to add a `RecordTabsPage`-driven row per host once the tab-opening steps are shared |
| CG-3 | That the IDIR-only **record fetch** is skipped for a non-IDIR user | `SummaryTab` gates its audit query on `isIdir`, so a BCeID user should issue no `GET /api/scalers/{licence}` at all. Provable by counting requests (the pattern `ChromeBoundaryPage.assertSystemStatusNeverProbed` uses), and worth it — it is the mechanism, not just the outcome. Not done here because the outcome assertion is already unambiguous and this is a performance property riding on a security one |
| CG-4 | Absent-field rendering at the E2E level | Every seeded record carries all five fields, and the suite does not write records to create a partial one. Covered at unit level (`WhoDidIt/index.browser.test.tsx` — "renders blank (not a default) for every absent field"), which is the right level for it: it is a pure rendering branch |
| CG-5 | Multi-role and multi-IdP users | A session has one `idpProvider`, so there is no union case to test here |
