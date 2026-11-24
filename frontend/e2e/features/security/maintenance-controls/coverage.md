# Coverage — §J maintenance write controls (SEC-11)

**Spec:** `roles-permissions.md` §J (Reference-Data Maintenance & System Admin), as resolved in
`RolePermissions.scalingManagerColumn()` and `.ceTechnician()`.

**Rows are §J cells crossed with the three controls that express them.** The axis is one section of the
matrix swept across every role that can reach it — a slice the per-role suites each left open.

## The gap this closes

Three role suites deferred these controls and said so explicitly:

| Suite | Gap | What it said |
|---|---|---|
| `ce-technician-role` | CG-2 | Questions create/update/delete withheld — "needs a maintenance-page control sweep" |
| `scaling-manager-roles` | CG-3 | the withheld deletes — "not in `ALL_WRITE_CONTROLS`" |
| `scaling-manager-roles` | CG-4 | `MAINTAIN_SIGNATORIES_CREATE` withheld — "the sharpest untested cell in this column" |

All three are now covered. They were deferred for a structural reason rather than an oversight: the
existing sweeps walk a record's tabs, and these controls are not on a record. **Add** is on the list
page; **Edit** and **Delete** are inside a row's detail modal and need a record opened first.

## Why it is worth a suite rather than a footnote

Both gates are **opt-in props**, not a shared wrapper:

- `MaintenanceListPage` renders its Add button ungated when no `addPermission` is passed;
- `MaintenanceFormModal` does the same for Edit and Delete.

So a page that omits a prop shows the control to every role that can open the screen, and no other
test would see it. That is the failure mode this sweep exists to detect — not a hypothetical, since
eight screens each pass their own three props by hand.

## The matrix, as swept

`DSM` / `RSM` = `scalingManagerColumn()`; `ADM` = `ALL_PERMISSIONS`; `CET` reaches only Questions.

| Maintenance area | §J cells held by the scaling manager column | Add | Edit | Delete | Verdict |
|---|---|---|---|---|---|
| Templates | QUERY, READ, CREATE, UPDATE | ✅ offered | ✅ offered | ✅ withheld | ✅ |
| Conditions | QUERY, READ, CREATE, UPDATE | ✅ offered | ✅ offered | ✅ withheld | ✅ |
| Exam / Upgrades | QUERY, READ, CREATE, UPDATE | ✅ offered | ✅ offered | ✅ withheld | ✅ |
| Appointment Types | QUERY, CREATE, UPDATE | ✅ offered | ✅ offered | ✅ withheld | ✅ |
| Valid Licence Attributes | QUERY, READ, CREATE, UPDATE | ✅ offered | ✅ offered | ✅ withheld | ✅ |
| Authorization Clauses | QUERY, READ, CREATE, UPDATE | ✅ offered | ✅ offered | ✅ withheld | ✅ |
| **Signatories** | QUERY, READ, **UPDATE only** | ✅ **withheld** | ✅ offered | ✅ withheld | ✅ CG-4 |
| **Questions** | QUERY, READ **only** | ✅ withheld | ✅ withheld | ✅ withheld | ✅ |

Delete is withheld on **all eight** — the column holds no `_DELETE` anywhere in §J (CG-3).

| Role | Coverage | Verdict |
|---|---|---|
| `SCS_DIST_SCALING_MANAGER` | the full 8 × 3 matrix above | ✅ |
| `SCS_REGIONAL_SCALING_MANAGER` | the four sharpest cells — see below | ✅ |
| `SCS_CE_TECHNICIAN` | all three controls on Questions, its only reachable §J screen | ✅ CG-2 |
| `SCS_SYS_ADMIN` | all three controls on all eight screens — the contrast | ✅ |

**Why `RSM` takes a subset.** `RolePermissions` maps `DSM` and `RSM` to the *same* list, which
`RolePermissionsTest` pins in Java and the `scaling-manager-roles` suite pins at the route and API
levels. Repeating all 24 rows would re-prove that rather than test anything new, so `RSM` covers the two
areas where a divergence would matter most: the one with UPDATE-but-no-CREATE, and the read-only one.

## Symmetry check — where each denial's contrast lives

| Denial | Its contrast |
|---|---|
| Every withheld Add / Edit / Delete | `An administrator is offered Add on <page>` and `…Edit and Delete on <page>` — the same locators, same screens, all eight |
| Signatories Add withheld | Signatories **Edit offered**, same screen, same scenario for `RSM` — so the screen is demonstrably rendering its action row |
| Questions all three withheld | Questions Add / Edit / Delete **offered** to an administrator |

The Delete contrast matters most: no role but the administrator is offered Delete anywhere in §J, so
without those eight rows the entire Delete column could pass against a control that no longer exists.

## Traps (both fail in the reassuring direction)

1. **Two `.form-actions` rows.** The second belongs to the delete-confirmation modal and carries its own
   `cds--btn--danger`. A locator matching on kind alone finds it and reports Delete as offered to a role
   correctly never shown it. Both action controls are matched on `.action-btn`, which only the real ones
   carry — and that filter is load-bearing: without it the administrator rows hit a strict-mode
   violation rather than passing, which is how it was found.
2. **Absence needs an anchor.** A row click that silently failed also yields "no Edit button". Every
   absence assertion opens the detail modal and asserts its heading first, so "not offered" means
   "the detail view is open and the control is not in it".

## Open gaps

| Gap | What is not covered | Why |
|---|---|---|
| CG-1 | The API half of these cells — `POST`/`PUT`/`DELETE` on the maintenance endpoints | The role suites' `api-access.feature` files already assert the maintenance endpoints per column. This suite is the GUI half they were missing |
| CG-2 | `/maintenance/system` | No list and no row modal — it is a settings form, not a CRUD screen, so the three controls do not apply |
| CG-3 | What the controls DO once clicked | Deliberately out of scope: this asks whether an action is offered, not whether it works. The happy paths belong to the UC-level maintenance suites (`features/admin/`) |
| CG-4 | The other seven columns (`CHK`, `DM`, `CLE`/`SUP`/`RM`, `IND`, `OWN`) | All are refused at the route for every §J screen, which their own `url-access.feature` files already prove. There is no control to judge on a page they cannot open |
