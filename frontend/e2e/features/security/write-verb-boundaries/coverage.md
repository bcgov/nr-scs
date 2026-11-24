# Coverage — cross-cutting write verbs (SEC-11)

**Spec:** `roles-permissions.md` §A (Work Bench) and §I (Check Scale), as resolved in
`RolePermissions.checkScaler()`, `.scalingManagerColumn()`, `.ceTechnician()` and
`.readOnlyInternalColumn()`.

**Rows are verbs swept across columns** — the transpose of a role suite, which sweeps one column across
verbs. That transpose is the point: these particular verbs were unprobeable from inside any single role
suite, so each one logged them as a gap and moved on.

## The gap this closes

| Suite | Gap | What it said |
|---|---|---|
| `check-scaler-role` | CG-2 | `CHECK_SCALE_UPDATE`, `SUMMARY_CHECK_SCALE_*`, `WORKBENCH_CREATE`/`_UPDATE` — "no body-free probe exists and no bindable body has been verified" |
| `read-only-internal-roles` | CG-2 | Work Bench renew verbs "absent rather than refused" |
| `dist-manager-role` | CG-2 | the same, inherited |
| `scaling-manager-roles` | CG-2 | `WORKBENCH_CREATE`/`_UPDATE` "held here but unproven" |

## Why they were blocked, and what unblocked them

`@RequiresPermission` is method security — an AOP interceptor around the handler — so body binding and
bean validation run **before** it. A body-less or malformed write is rejected by the binder at 400
without authorization being consulted, so "refused" is true for every role including one that holds the
permission. Asserting that would have been a vacuous pass, and the suites were right to refuse it.

Two things unblocked them, and neither needed new machinery:

1. **The Work Bench renew and remove endpoints take no request body at all** — only a path variable
   (`WorkbenchController:39-58`, `scaler-authorizations-renew.yaml`). They reach authorization unaided
   and always did; the recorded reason ("no body-free gated endpoint") was mistaken.
2. **A bindable body for the two check-scale updates exists.** It has to satisfy bean validation
   completely — the two values that make it work, and why each is easy to get wrong, are in
   `write-verb-test-data.ts`.

## Why no probe can mutate

Every probe targets id **99999999**, which exists in no table. Authorization is the only thing that can
succeed; the handler then fails to find the row. This is the same discipline the `dist-manager-role`
suite used for licence-cancel, and it is what allows a write permission to be asserted at all against a
shared seed DB.

**That premise is checked, not assumed.** `preflight/anchors.setup.ts` → *"SEC-11 nonexistent-id anchors
are still absent"* fails the run if any of those ids ever resolves. This is the one failure in the suite
family that could modify data: were a reseed to issue `99999999`, the `PUT`s and `DELETE`s here would
stop being inert and start addressing a real record. The check-scale id is verified through
`/api/check-scales/search`, because the read-by-id answers 500 for every caller and every id in this
build and so cannot distinguish present from absent (`defects.md` V2).

Statuses separate cleanly:

| Status | Meaning |
|---|---|
| `403` | refused at authorization — the column lacks the permission |
| `404` | past authorization, row not found — the column holds it |
| `500` | past authorization, the stored procedure threw on the missing row (the renew endpoints) |

The allow side asserts **not 403** rather than pinning a status, because which of 404 / 500 a missing
row produces is the handler's business, not the permission layer's. The deny side pins 403 exactly —
these are all authorization outcomes, and `GlobalApiExceptionHandler.handleAccessDenied` maps them.

## Coverage rows

| Verb | Permission | Endpoint probed | Holds → passes | Lacks → 403 | Verdict |
|---|---|---|---|---|---|
| Work Bench renew | `WORKBENCH_CREATE` | `POST /scaler-authorizations/{id}/renew` | `ADM`, `CHK`, `DSM`, `RSM` | `CLE`, `SUP`, `RM`, `DM`, `CET` | ✅ |
| Work Bench renew (designation) | `WORKBENCH_CREATE` | `POST /mark-site-designations/{id}/renew` | `ADM`, `DSM` | `CLE`, `CET` | ✅ |
| Work Bench remove | `WORKBENCH_UPDATE` | `POST /scaler-authorizations/{id}/workbench/remove` | `ADM`, `CHK`, `DSM` | `CLE` | ✅ |
| Check scale update | `CHECK_SCALE_UPDATE` | `PUT /check-scales/{id}` | `ADM`, `CHK`, `DSM`, `CET` | `CLE`, `SUP`, `RM`, `DM` | ✅ |
| Summary check scale update | `SUMMARY_CHECK_SCALE_UPDATE` | `PUT /summary-check-scales/{id}` | `ADM`, `CHK`, `DSM` | `CLE` | ✅ |
| Check scale delete | `CHECK_SCALE_DELETE` | `DELETE /check-scales/{id}` | `ADM` **only** | `CHK`, `DSM`, `CET`, `CLE` | ✅ |
| Summary check scale delete | `SUMMARY_CHECK_SCALE_DELETE` | `DELETE /summary-check-scales/{id}` | `ADM` **only** | `CHK`, `DSM`, `CLE` | ✅ |

**The delete rows are the sharpest.** §I's `D` appears only in `ADM`'s "Check Scale" `RUD`, so the Check
Scaler — which holds create *and* update on the very same record — is denied delete. A permission model
that treated "can write" as one thing would fail exactly here, and nothing else in the suite asks.

## Symmetry check

Every deny row's contrast is the same verb, same endpoint, same body, run as a column that holds the
permission — in the outline directly above or below it. No deny row in this file stands alone, which
matters more here than usual: a 403 from a broken endpoint and a 403 from the permission layer are
indistinguishable, and the whole file is 403s.

The designation-renew rows were the exception until review: they were deny-only, on the reasoning that
the scaler renew above them already proved the permission. That reasoning is wrong — a contrast proves
the *endpoint* answers, not the permission, and an unmapped `/mark-site-designations/{id}/renew` would
have satisfied both rows silently. An allow pair was added (`ADM`, `DSM`).

## Open gaps

| Gap | What is not covered | Why |
|---|---|---|
| CG-1 | `SUMMARY_CHECK_SCALE_CREATE` | `POST /summary-check-scales` answers **500 for every role including an administrator**, so no assertion on it can distinguish a permission. Unlike the update endpoints, a working probe would also be the one call here capable of creating a real row |
| CG-2 | `MSD_UPDATE`, `PERFORMANCE_REMARK_UPDATE` | Named in the `check-scaler-role` CG-2 alongside the verbs closed here. Each needs its own bindable body; the pattern in `write-verb-test-data.ts` extends to them, but neither body is verified yet |
| CG-3 | The write **happy paths** | Deliberate and permanent for this axis. A probe against id 99999999 proves authorization was granted, never that the write works. That belongs to the UC-level suites, with their own seeded records |
| CG-4 | `CHECK_SCALE_ADVISORY_LETTER`, `SCALER_PERFORMANCE_REMARK_DELETE` | The `check-scaler-role` suite recorded both as answering 500 for **every** role, so authorization is never reached and no assertion can distinguish a permission. Not re-checked here |
