# Defects — cross-cutting client-scope seam (SEC-11)

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

Authored 2026-08-31 from source, probed against the running local stack (backend `:8080`, seeded Docker
DB `DBDOCK_01`). All 24 scenarios green.

---

## Divergences

None. Every hand-called `ClientScopeGuard` invocation the source claims is present and enforcing:
out-of-client records are refused with 403 on all three by-other-id endpoints, in-scope records are
served, and each refusal is paired with an unrestricted-administrator read of the same id.

---

## Bugs / Regressions

None found on this axis. One adjacent breakage was observed and is **not** this suite's to own — see
**V2**.

---

## Coverage gaps

Tracked in `coverage.md` (CG-1 … CG-4). The two worth flagging to a reader here:

- **CG-2** cannot be closed from the extract: `SCALE_SITE_CONTACT` holds exactly **2 rows**, both on site
  `019V`, so there is no second site's contact to attempt a cross-parent read with. Closing it needs a
  seed patch that inserts a `CLIENT_CONTACT` parent plus a contact on a second site.
- **CG-4** is an endpoint breakage, not a scoping question — the risk-assessment *list* reads 500 for
  everyone including an administrator.

---

## Spec gaps

### SG-1 — moved to the team's private security findings log

## Verified — not a defect

### V1 — risk-assessment reads were unscoped — CLOSED 2026-09-02

**What was wrong:** a client-restricted caller was refused `/api/scale-sites/614/tombstone` (site `614`
is owned by `00055821`) but was served `/api/scale-site-risk-assessments/1822` — and assessment `1822`
carries `scaleSiteIdNmbr 614`. The same site's data, refused by one route and served by another.

**Why:** the two routes are addressed differently. The first carries `scaleSiteIdNmbr`, which
`ClientScopeInterceptor` understands; the second carries `riskQuestionnaireId`, which nothing understood.
`RolePermissions.industryScaler()` and `.scaleSiteOwner()` withheld risk assessment **for exactly this
reason**, so nothing scoped could reach the second route and it stayed a precondition rather than a hole.

**How it was closed:** the client's 2026-09-02 spec grants both external roles read-with-limitations on
the record each lives on, which turned the precondition into work that had to happen first. Both services
now guard the read-by-id — `ScaleSiteRiskAssessmentService.getScaleSiteRiskAssessment` resolves the
assessment's owning site and calls `ClientScopeGuard.assertRecordSiteInScope` **before** its own
not-found check, so the id is not an existence oracle either;
`ScalerRiskAssessmentService.getScalerRiskAssessment` does the same on the scaler side. Both searches
override the caller's client criterion with their own, as `ScalerService.searchScalers` already did. All
four endpoints are listed in `ClientScopeInterceptorTest`'s `GUARDED_IN_SERVICE` /
`SCOPED_BY_SEARCH_OVERRIDE`, and that test fails the build if a guard is removed.

**Repro:**
```bash
BE=http://localhost:8080/api; H=(-H "X-Mock-Roles: SCS_SYS_ADMIN" -H "X-Mock-Client: 00001009")
curl -s -o /dev/null -w '%{http_code}\n' "${H[@]}" "$BE/scale-sites/614/tombstone"          # 403
curl -s -o /dev/null -w '%{http_code}\n' "${H[@]}" "$BE/scale-site-risk-assessments/1822"   # 200
```

**Why an administrator carrying a client header:** it is the only identity that is scoped without being
permission-limited, so a 200 here can only mean "not scoped" — an external role would be refused by the
permission gate first and the probe would prove nothing.

**Re-executed 2026-09-03** against the running backend: `record-id-boundary.feature` green, both halves
of the pair included. **The repro above is stale by design:** the second `curl` now answers 403, not 200. That flip is what
closed this entry — the scenario was inverted to expect it rather than deleted, so a regression that
re-opens the seam turns the suite red instead of silently passing.

**Test:** `record-id-boundary.feature` › "The site behind the assessment is refused when addressed by its
site id" + "The same site's risk assessment is refused when addressed by questionnaire id".

### V2 — two endpoints answer 500 for every caller — permanent (for this suite)

`GET /api/scale-sites/{id}` (the bare record read) and the risk-assessment **list** reads
(`/api/scalers/{id}/risk-assessments`, `/api/scale-sites/{id}/risk-assessments`) return 500 for an
unrestricted administrator, so the failure is not role- or scope-related.

Recorded so the next author does not re-investigate: the suite uses `/scale-sites/{id}/tombstone` for
site-level scope probes, exactly as `clientScoping.steps.ts` already does. `GlobalApiExceptionHandler`
sanitises the body correctly (`{"code":"INTERNAL_SERVER_ERROR"}`, no Oracle detail), so H-3 is holding.

Not this suite's to file — it is a screen-level breakage and belongs with whichever UC suite owns those
reads.

### V3 — permission denials return 403, not 500 — permanent

`references/role-scoping-mechanics.md` still documents a denial answering 500 because
`GlobalApiExceptionHandler` had no `AuthorizationDeniedException` handler. That handler now exists
(`GlobalApiExceptionHandler:233`, `handleAccessDenied`) and denials answer 403 — the industry-scaler
suite's Divergence #1, since fixed.

Recorded here because the **skill reference is stale**, not the suite: an author reading it will expect
500s and may weaken an assertion to accommodate them. The existing `>= 400` deny assertions remain
correct and are deliberately kept loose for the reason their own headers give.
