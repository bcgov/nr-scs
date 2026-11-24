# Defects — cross-cutting write verbs (SEC-11)

> **⚠️ Re-ground 2026-09-03 for the client's 2026-09-02 spec, against the unmerged nr-scs branch
> `bugfix/updated-role-scoping-specs`.** The scenarios changed in that pass were derived from source on
> that branch — `RolePermissions`, the controller `@RequiresPermission` annotations and `routePaths.tsx`
> — and **no green run against a build of it is recorded here**. Any "all N green" note below predates
> the re-ground and does not cover the changed rows. Run the suite against a stack built from that branch
> before trusting them, and delete this note in the commit that does.
>
> Ordering: land the nr-scs branch first. Against a `main` build these scenarios fail — correctly, since
> `main` predates the spec change.

Legends: `../../../defects-guide.md`, `../../../coverage-guide.md`.

Authored 2026-08-31 from source, probed against the running local stack.

---

## Divergences

None. Every verb swept lands exactly where §A and §I put it, including the asymmetry that looked most
likely to be wrong on the way in — the Check Scaler holding create and update on a check scale while
being denied delete (see **V2**).

---

## Bugs / Regressions

None on this axis. One endpoint is broken for everyone and is recorded as a coverage gap rather than a
bug of this suite's — see `coverage.md` CG-1.

---

## Coverage gaps

Tracked in `coverage.md` (CG-1 … CG-4). CG-3 is the permanent scope line: a probe against a nonexistent
id proves authorization was granted, never that the write works.

---

## Spec gaps

None.

---

## Verified — not a defect

### V1 — the Work Bench verbs were never actually blocked — permanent

Three suites recorded the renew verbs as unprobeable because "no body-free gated endpoint" existed for
them (`read-only-internal-roles` CG-2, inherited by `dist-manager-role`, and the allow-side twin in
`scaling-manager-roles` CG-2).

The three renew endpoints and `workbench/remove` take **no request body at all** — only a path variable
(`WorkbenchController:39-58`; `paths/scaler-authorizations-renew.yaml` declares no `requestBody`). They
reach method security unaided, which is precisely the "body-free gated endpoint" those entries said did
not exist.

Recorded because the conclusion propagated across three suites without being re-checked, and the cost
was four unasserted permission cells. Worth remembering as a class: an inherited "cannot be tested" is
worth re-deriving once at the source before it is inherited a fourth time.

### V2 — the Check Scaler may create and update a check scale but not delete one — permanent

`DELETE /api/check-scales/99999999` answers **403** for `SCS_CHECK_SCALER`, which holds
`CHECK_SCALE_CREATE` and `CHECK_SCALE_UPDATE` on the same record, while `SCS_SYS_ADMIN` gets 404 (past
authorization). The same split holds for summary check scales.

Confirmed correct against the spec: §I's `D` appears **only** in `ADM`'s "Check Scale" `RUD` row, and
`RolePermissions.checkScaler()` records the reasoning in its javadoc —
`SUMMARY_CHECK_SCALE_DELETE` "is not [granted] — the `D` appears only in `ADM`'s Check Scale `RUD`".

Recorded because it reads like an omission at first glance: a role that can create and edit a record but
not delete it is unusual enough that the next author may "fix" it. It is deliberate.

### V3 — two body values that make a valid probe look like a missing one — permanent

Establishing the bindable body for `PUT /api/summary-check-scales/{id}` cost two probe runs, both
returning a status that pointed away from the real cause:

- **`returnType` takes the wire enum, not the legacy code.** `LT` (the `cksc_type` value that appears
  throughout the domain and the seeded data) fails deserialization, and the response is
  `{"code":"BAD_REQUEST","message":"Request body is required."}` — which reads as *no body sent*, not
  *bad enum value*. The wire values are `LOG_TALLY`, `SAMPLE_LOG_TALLY`, `SPECIAL_FOREST_PRODUCT`.
- **The two scaler licences must differ.** The service rejects a check scaler equal to the original
  scaler, at 400 — before authorization — so a body reusing one licence yields 400 for every role and
  the probe silently proves nothing.

Both are captured in `write-verb-test-data.ts`. Noted here because either one produces a uniform status
across all roles, which is exactly the shape of a vacuous pass.
