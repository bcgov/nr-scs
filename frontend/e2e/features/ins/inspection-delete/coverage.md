# Coverage — Delete Site Inspection (app-only, no legacy slice)

> New to these files? See [`coverage-guide.md`](../../../coverage-guide.md) at the e2e root for the column + status-flag legend.

**No legacy slice drives an inspection delete.** UC-INS-002's `-slices.md` S04 control matrix *names* a
permission-gated "Delete" control, but no legacy scenario exercises it, and UC-INS-002's own
[`coverage.md`](../uc-ins-002-view/coverage.md) records it only as a control that "always renders". So
this suite is **app-only**: the inventory is built from the new app's own delete path rather than from a
message/control matrix.

Sources reconciled: `pages/View/ScaleSiteInspection/index.tsx` (the danger `Button` + its Carbon
`<Modal danger>` and the `deleteMutation` success/error arms),
`services/scaleSiteInspections.service.ts` (`deleteScaleSiteInspection`),
`pages/View/ScaleSite/components/tabs/InspectionsTab.tsx` (the list the delete returns to), and backend
`ScaleSiteInspectionController.deleteScaleSiteInspection` /
`ScaleSiteInspectionService`. **Ground-truthed by hand on 2026-09-09** against nr-scs `main` @ `53221c5`:
DELETE returns **204**, a follow-up detail GET returns **404**, and a second DELETE of the same id
returns **404 NOT_FOUND**.

**Test data:** every scenario seeds its own disposable inspection (`seedInspection`) on site **520** —
values pinned in [`fixtures/ins/ins-test-data.ts`](../../../fixtures/ins/ins-test-data.ts), not repeated
here. The shared real anchor the security suites read is **never** deleted. The cleanup registry
tolerates the 404 a successfully-deleted record returns, so a passing delete leaves no residue and no
false teardown failure.

| Source item | Source citation (app) | App enforcement / render point | Scenario (tags) | Status | Gap/defect |
|---|---|---|---|---|---|
| Delete control rendered on the inspection view | `View/…/index.tsx:287-292` | `PermissionGate` + danger `Button` | covered elsewhere — UC-INS-002 `view @S01 @p0` ("offers Back, Edit Record and Delete actions") | covered elsewhere | — |
| Confirmation prompt shown before any deletion | `View/…/index.tsx:295-305` | Carbon `<Modal danger>`, heading "Are you sure you want to delete this record?" | delete `@S01 @p0`, `@S02 @p1` | covered | — |
| Danger button alone does **not** delete | same (button only sets `deleteConfirmOpen`) | prompt-opener, not a deleter | delete `@S02 @p1` ("Opening the confirmation prompt…") — spy=0 **and** record still readable | covered | — |
| Confirmed delete removes the record | `deleteMutation` + DELETE endpoint | `onSuccess` → `navigate(returnToScaleSitePath)` | delete `@S01 @p0` (polled detail read-back → 404) | covered | — |
| Confirmed delete returns to the site's Inspections tab | `View/…/index.tsx:76` | `navigate('/scale-sites/view/{id}?tab=inspections')` | delete `@S01 @p0` | covered | — |
| Deleted inspection no longer listed on the tab | `InspectionsTab` list refetch | row keyed by inspection id absent | delete `@S01 @p0` | covered | — |
| Cancel keeps the record | `onSecondarySubmit` (`:298`) | closes the prompt, no mutation | delete `@S02 @p1` — spy=0 **and** record still readable | covered | — |
| Delete failure is reported to the user | `deleteMutation.onError` (`:78-81`) | `extractApiError` → "Delete failed" inline error | not-found `@S03 @p1` (record removed out-of-band, then confirm) | covered | — |
| Delete refused for a role that lacks the permission | `@RequiresPermission(SCALE_SITE_INSPECTION_DELETE)` | backend 403 + record survives | covered elsewhere — `features/security/check-scaler-role/api-access.feature` ("Deleting a site inspection is refused and the record survives") | covered elsewhere | — |
| Delete control hidden for a role that lacks the permission | `PermissionGate` (`:287`) | element not rendered | — | **deferred** | Coverage gap #1 |

**Symmetry check.** The delete gesture's two arms are both covered and, importantly, **separated**:
confirm → removed (`@S01`), cancel → kept (`@S02`), plus the third state that a single combined step
would have hidden — opening the prompt and doing nothing (`@S02`). The failure arm mirrors the success
arm (`@S03` vs `@S01`). Both negative arms prove the negative twice: the endpoint spy counted **zero**
DELETEs *and* the record is still readable — a closed modal alone is not evidence.

**Why the gesture is modelled as two steps.** A scenario that clicked the danger button and then
declared success would pass for the wrong reason, and would keep passing if the button ever began
deleting directly and skipped its own confirmation. This is the same "hidden danger button" trap the
role-probe suites hit, so "I click Delete" and "I confirm the inspection deletion" stay distinct steps
and the no-op state is asserted on its own.

**Role / permission coverage: partly automated elsewhere, one gap open.** The API refusal **is** proven
in [`features/security/check-scaler-role/api-access.feature`](../../security/check-scaler-role/api-access.feature)
("Deleting a site inspection is refused and the record survives"), and the route itself is probed per
role in the `url-access.feature` files. But the **Delete button's own visibility** is not asserted for
any role: the write-control sweep in
[`fixtures/security/role-columns.ts`](../../../fixtures/security/role-columns.ts) enumerates controls on
the **scaler** and **site** record tabs only, and this button lives on the inspection *view* page, which
no sweep visits (verified 2026-09-09 — see Coverage gap #1). This suite runs as the mock administrator
and asserts the **delete behaviour**, not entitlement.

Note the mechanism now exists at all: this supersedes the "no per-element permission mechanism in the
new app — these controls always render" note still carried in UC-INS-002's ledger, which predates
`PermissionGate` and the eleven-role roll-out.

**Coverage gaps:**
- **#1 (Delete-button visibility per role)** — see `defects.md` Coverage gap #1. Belongs in a role suite,
  not here; recorded so it is not silently dropped.

**Status values:** `covered` · `covered elsewhere` (asserted by a named scenario in another suite) ·
`deferred` (see Coverage gaps).
**No divergences and no `@discovered-*` reds** — every scenario is a normal green assertion.
