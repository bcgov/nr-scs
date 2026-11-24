# Defects — the cross-cutting audit affordance (SEC-5 / UC-SYS-005)

Legends: [`../../../defects-guide.md`](../../../defects-guide.md),
[`../../../coverage-guide.md`](../../../coverage-guide.md).

Authored 2026-09-04 from source, probed against the running local stack, then executed: **9 scenarios,
all green.** Two divergences from the story's acceptance criteria were found; both are **paperwork**
rather than defects, for the reason set out under each. Nothing here is a `@discovered-divergence`.

---

## Divergences

### D1 — an absent revision count renders blank, where the AC says `0` — `OPEN (BA)`

**In plain words.** The audit popup has a "Revision Count" line. When a record has no revision count
recorded, the popup leaves that line **empty**. The requirement as written says it should show **`0`**.

**Why it is not filed as a defect.** The requirement itself asks for a decision rather than stating one.
UC-SYS-005-S02 is tagged `[LEGACY-BEHAVIOR-FLAG]` and the flag reads:

> Displaying `Revision Count: 0` when the field is null conflates "never modified" with "missing audit
> data". This may be intentional default behavior or a defect that hides missing-data conditions. **Dev
> to confirm** whether null should be displayed distinctly (e.g. `—` or `N/A`) before implementing.

Dev confirmed it — in the direction the flag invited. `components/core/WhoDidIt/index.tsx` says so
explicitly in its own javadoc ("no defaults are synthesized (an unset revision count shows blank, not
0)") and implements it as `audit?.revisionCount != null ? String(…) : ''`. So the app is not diverging
from a settled requirement; an open requirement was closed in code and the AC was never amended.

**What the suite does instead.** It pins the **other half** — a revision count that is genuinely `0`
must still render `0` (`who-did-it.feature` @S02). That is the assertion a well-meaning change would
break: replacing the `!= null` test with a truthiness check (`revisionCount ? … : ''`) would blank out
real zeros while every "absent renders blank" assertion stayed green. The absent case itself is asserted
at unit level, which is the right level for a pure rendering branch
(`WhoDidIt/index.browser.test.tsx` — "renders blank (not a default) for every absent field").

**Action.** BA to amend UC-SYS-005-S02 to record the confirmed behaviour (blank for absent, `0` for
zero), or reopen the decision. `Status: OPEN` — BA, paperwork only.

---

### D2 — timestamps are converted to Pacific time, where the AC says truncate to 19 characters — `OPEN (BA)`

**In plain words.** Audit timestamps are stored as absolute instants (UTC). The popup shows them in
**Vancouver local time**. The requirement as written says to show the **first 19 characters of the
stored value**, which would show the UTC clock instead.

**This is user-visible, not cosmetic.** For the record the suite pins — scaler `001B`, entry timestamp
`1992-09-02T18:36:37Z` — the two readings are:

| Behaviour | Rendered |
|---|---|
| Shipped (convert to Pacific) | `1992-09-02 11:36:37` |
| UC-SYS-005-S05 (truncate to 19 chars) | `1992-09-02T18:36:37` |

The **hour differs**, not just the punctuation. So no build can satisfy both readings, and a scenario
asserting one is a genuine discriminator rather than a formatting preference.

**Why it is not filed as a defect.** Same reason as D1 — UC-SYS-005-S05 is a `[LEGACY-BEHAVIOR-FLAG]`:

> Silent truncation drops timezone and fractional-seconds data without indication, which can mislead
> users in a multi-timezone deployment. **Dev to confirm** whether the new system should format
> timestamps explicitly (with timezone) or preserve the legacy truncation contract before implementing.

Dev confirmed the first option. The component's comment gives the reasoning ("Pacific (Vancouver) time
is what BC users expect to see, so we convert rather than showing the raw UTC clock"), and it is the
better answer for a single-province system — but the AC still says the other thing.

**One residual worth a BA eye, since the flag raised it.** The flag's concern was that truncation drops
the timezone *without indication*. The shipped format drops it too: `1992-09-02 11:36:37` carries no
marker that it is Pacific. That is fine for BC users reading BC records, and it matches legacy's shape,
but it is the half of the flag that converting did not resolve.

**Action.** BA to amend UC-SYS-005-S05 to the confirmed behaviour, and to rule on whether the rendered
value should name its zone. `Status: OPEN` — BA, paperwork plus one small product question.

---

## Bugs / Regressions

None.

---

## Coverage gaps

### CG-1 — the Check Scale host cannot be swept: its record read answers 500 — `blocked`

`GET /api/check-scales/145988` and `GET /api/check-scales/145849` both answer **HTTP 500 for every role,
including an administrator** (probed 2026-09-04 against the running stack; `GET
/api/summary-check-scales/145988` likewise). The view therefore cannot render, so a sweep row for it
would be red for a reason that is not the affordance.

Recorded rather than filed: these are the CHK suites' pinned anchors and their own ledgers report them
green, so this is either an environment condition in this DB image or a regression that belongs to
those suites. **Not adjudicated here** — flagged so whoever runs the CHK suites next sees it, and so
nobody reads this suite's missing row as "the check-scale view lost its audit popup".

Worth knowing for when it is unblocked: `CheckScaleApiModel extends AuditDetails`, so the type expects
the five fields; whether the response actually carries them is unverified. If it does not, that host
renders five blank rows — which is exactly the failure mode this suite's "the values are the record's
own" assertion exists to catch. **Status:** OPEN — `blocked` on the check-scale read.

### CG-2 — five modal / nested hosts are not swept — `deferred`

`WhoDidIt` is mounted at eleven sites (production files, excluding its own tests). **Five** are record
views reachable by URL and are swept; **one** is the Check Scale view, blocked by CG-1 above; the
remaining **five** are behind a modal or a nested tab — the Performance Remarks action row,
`MaintenanceFormModal`, `TemplatesModal`, the risk-assessment form, and the site record's Contacts
view. Each needs its host's own opening ritual, which is that suite's vocabulary. The component itself
is proven; only "this particular host still mounts it" is unproven. **Status:** OPEN — `deferred`.

### CG-3 — the IDIR-only record fetch is not proven to be skipped — `deferred`

`View/Scaler/.../SummaryTab.tsx` gates its audit query on `isIdir`, so a non-IDIR user should issue no
`GET /api/scalers/{licence}` detail read at all. This suite asserts the **outcome** (no affordance) but
not the **mechanism** (no request). Countable with the pattern `ChromeBoundaryPage` already uses for the
system-status probe, and worth adding: asserting the mechanism is what stops the gate degrading into
"fetch anyway, hide the button". **Status:** OPEN — `deferred`.

---

## Spec gaps

None. The two open items above are AC amendments, not missing scenarios.

---

## Verified — not a defect

### V1 — every role suite drives internal roles through an external IdP, so this component renders for nobody in them — permanent

`RoleSessionPage.signInAs` seeds `provider: 'BCEIDBUSINESS'` for every session, including
`SCS_SYS_ADMIN`, `SCS_CLERICAL` and the two scaling-manager roles — all of which arrive through IDIR in
reality. That is **harmless for what those suites assert**: the IdP is invisible to `RolePermissions`,
`permissions.ts` and `navigation.ts`, which read `roles` and never the provider. Their subject is
unaffected, which is why the default was left exactly as it was when the provider parameter was added.

It matters for one thing, and it is this component: `WhoDidIt` returns `null` unless
`user.idpProvider === 'IDIR'`, so **no role suite has ever seen the audit trigger**. Their record-view
control sweeps (`chkControlVerdicts`, `readOnlyControlVerdicts`, `roleColumnVerdicts`) were reading pages
with no audit affordance on them.

Recorded so that (a) nobody reads a green role suite as evidence about this component, and (b) nobody
"fixes" the default to `IDIR` — which would silently change the identity under test in eleven suites to
chase a property that has its own suite now.

### V2 — UC-CHK-003's "the popup is not rendered on the new view" is stale — permanent

[`uc-chk-003-view/defects.md`](../../chk/uc-chk-003-view/defects.md) gap #3 (found 2026-07-09) records
that the check-scale view rendered no audit popup, verdict "feature not present in the new app". It is
present now — `pages/View/CheckScale/index.tsx:354` renders `<WhoDidIt audit={data} />`. The entry's own
"Future action: revisit if an audit-popup affordance is added to the view" has come due.

Not edited from here — that ledger's author should make the call, and CG-1 above means the row cannot be
turned green yet anyway. Recorded because it is the clearest illustration of why this suite exists: a
cross-cutting component with no owner drifts out of every ledger that met it.

### V3 — the popup is portaled to `document.body`, so it cannot be scoped to its host — permanent

`WhoDidIt` renders its Carbon `Modal` through `createPortal(…, document.body)` — deliberately, so the
dialog centres on the viewport even when its trigger sits inside another modal whose transformed
container would otherwise re-base a nested `position: fixed`.

Consequence for anyone extending this suite: locators for the popup must be rooted at the **page**,
never at the record's tab panel. Scoping to the panel finds the trigger and misses the dialog, which
presents as "the popup never opened".

### V4 — Carbon renders two controls named "Close"; a role lookup matches both — permanent

The popup's dismiss control cost one red on the first run: `getByRole('button', { name: 'Close' })`
resolves to **two** elements — the modal header's icon-only X (accessible name from `aria-label`) and the
footer's primary button (name from its visible text) — and fails on strict mode.

Fixed in `WhoDidItPage` by selecting on the two things that separate them (visible text, and not
`cds--btn--icon-only`). Recorded because it is the same family as the nav-counting trap in
`../chrome-boundaries/defects.md` V2, with the opposite polarity: that one **passes** silently and this
one **fails** loudly. The loud one is the cheap one.
