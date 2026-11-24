# Coverage — `SCS_CHECK_SCALER` (`CHK`) role scoping

**Read this differently from a per-UC `coverage.md`.** The rows here are **cells of the permission
matrix**, not source items from a `-slices.md`, and the citation column names a
`roles-permissions.md` section rather than a legacy Gherkin line. The subject under test is one *column*
of the matrix cutting across every screen, not one screen.

- **Spec:** the roles & permissions matrix §3 column `CHK`, §4's plain-language
  summary, and the three judgement calls recorded in `RolePermissions.checkScaler()`.
- **Enforcers:** `RolePermissions.checkScaler()` + `@RequiresPermission` (server) ·
  `permissions.ts` `CHECK_SCALER_PERMISSIONS` + `navigation.ts` + `ProtectedRoute` (client).
- **Verdict legend:** ✅ covered and green · ⚠️ covered, divergence logged · ⛔ not covered (gap logged).
- **Status at 2026-09-01:** 150 scenarios, **150 green**, 0 divergences (was 148 at 2026-08-25; +2 for the
  check-scale delete-denial outline — the first probe in this suite to seed its own disposable target,
  because a DELETE whose refusal is the thing under test cannot safely be aimed at an anchor). Every status quoted below was
  measured against the seeded local stack, not inferred from the matrix.

---

## Why three levels (plus a fourth axis)

Each file buys something the others cannot. A suite that tests one level reports a security property it
never checked.

| File | Question it answers | What a gap here would mean | Enforcer |
|---|---|---|---|
| `gui-access.feature` | Does the app **offer** the action? | A user is walked into a 403, or shown a control that does nothing. | `permissions.ts`, `navigation.ts`, per-page `hasPermission` |
| `url-access.feature` | Can the route be entered by **address bar**? | A bookmark or emailed link reaches a screen the role must not see. Hiding the menu contained nothing. | `ProtectedRoute` |
| `api-access.feature` | Does the **server** refuse the call? | The permission model is decoration — anyone can issue the request by hand. | `@RequiresPermission` |
| `org-unit-scoping.feature` | **Whose rows** may it see? | Org-unit data scoping. | *(see SG-1)* |

Only `api-access.feature` carries security assertions. The other two are usability assertions that
happen to look similar.

## What makes this column different from `IND` and `OWN`

Two structural differences drove most of the design decisions in this suite:

1. **It is the first INTERNAL column.** `Roles.isClientScoped(SCS_CHECK_SCALER)` is false, so there is no
   forest client, the client-scoping layer is a no-op, and `signInAs([CHK], [])` is a *complete* identity
   — not the deliberately-crippled one that an empty client array produces for `IND`/`OWN`. Its scoping
   axis is the org unit instead (SG-1).
2. **It is the first column with WRITES.** So no blanket "every mutation is refused" assertion is
   available. Each write is either an allow that must be proven to have *passed* authorization, or a deny
   that must be proven to have been refused *by* authorization. That needed a third assertion shape —
   see the symmetry table below and `defects.md` V2.

---

## §A General & Navigation

| Matrix cell | Spec | Enforcement | Scenario | Verdict |
|---|---|---|---|---|
| SCS Home Page `R` | §3.A | `WELCOME_READ` | `url`: `/welcome` reachable; `api`: `GET /api/welcome` allowed | ✅ |
| Work Bench `CRU (ltd)` — the `R` | §3.A | `WORKBENCH_QUERY` | `gui`: Administration offers Work Bench; `url`: `/workbench`; `api`: all three queues | ✅ |
| Work Bench `CRU (ltd)` — the `C`/`U` (renew) | §3.A + judgement call (1) | `WORKBENCH_CREATE/UPDATE` | — | ⛔ CG-2 |
| Work Bench `(ltd)` = district scoping | §1, §3.A | *(none)* | `org-unit`: asserted **inert** | ⚠️ SG-1 |

## §B Client Queries

| Matrix cell | Spec | Enforcement | Scenario | Verdict |
|---|---|---|---|---|
| Queries – Clients `R` | §3.B | `CLIENT_QUERY` | `gui`: Queries offers Clients; `url`: `/client`; `api`: `/clients/search` | ✅ |
| Queries – Clients – Results `R` (**not** `R (ltd)`) | §3.B | `CLIENT_QUERY`, unscoped | `api`: "An internal role needs no forest client" | ✅ |

## §C Scaler – Search & Records

| Matrix cell | Spec | Enforcement | Scenario | Verdict |
|---|---|---|---|---|
| Queries – Scalers (+ Results) `R` | §3.C | `SCALER_QUERY` | `gui` nav; `url` `/scalers`, `/scalers/summary`; `api` `/scalers/search` | ✅ |
| Scaler – Create `-` | §3.C | `SCALER_CREATE` withheld | `gui`: Create menu omits "Scaler"; `url`: `/scalers/create` refused | ✅ |
| Scaler Record – Summary `R` | §3.C | `SCALER_READ` | `gui` Summary tab; `api` `/scalers/001B`, `/summary` | ✅ |
| Scaler Record – Summary – Edit `-` | §3.C | `SCALER_UPDATE` withheld | `gui`: "Edit Record" not offered (admin contrast) | ✅ |
| Scaler Record – Address `R` | §3.C | `SCALER_ADDRESS_READ` | `gui` Address tab; `api` `/scalers/001B/address` | ✅ |
| Scaler Record – Authorizations `R` | §3.C | `SCALER_AUTHORIZATION_QUERY` | `gui` tab; `api` `/scalers/001B/authorizations` | ✅ |
| — its create control `-` | §3.E | `SCALER_AUTHORIZATION_CREATE` withheld | `gui`: "Add Authorization" not offered | ✅ |
| Scaler Record – Check Scales `CR` | §3.C | `SCALER_CHECK_SCALE_QUERY` + `CHECK_SCALE_CREATE` | `gui`: tab + "Add Check Scale" offered; `api` `/check-scales` | ✅ |
| Scaler Record – Exams / Upgrades `R` | §3.C | `SCALER_EXAM_QUERY` | `gui` tab readable; `api` `/scalers/001B/exams` | ✅ |
| Scaler Exam / Upgrade – Create/Edit `-` | §3.C | `SCALER_EXAM_CREATE` withheld | `gui`: "Add Exam / Upgrade" not offered; `api`: `POST .../exams` → 403 | ✅ |
| Scaler Record – Appointments `R` | §3.C | `SCALER_APPOINTMENT_QUERY` | `gui` tab; `api` `/scalers/001B/appointments` | ✅ |
| Scaler Appointment – Create/Edit `-` | §3.C | `SCALER_APPOINTMENT_CREATE` withheld | `gui`: "Add Appointment" not offered; `api`: `POST .../appointments` → 403 | ✅ |
| Scaler Record – Performance Remarks `CRD` | §3.C | `SCALER_PERFORMANCE_REMARK_QUERY/CREATE` | `gui`: tab + "Add Performance Remark"; `api`: `POST` passes authz vs welcome-only 403 | ✅ |
| Scaler Performance Remark `RU` / Create-Edit `CRU` | §3.C | `..._UPDATE` | — | ⛔ CG-2 |
| Scaler Performance Remark — the `D` | §3.C | `..._DELETE` | — | ⛔ CG-3 |
| *(no matrix row)* licence suspend / cancel | §4 → DSM/RSM | `SCALER_LICENCE_CANCEL` withheld | `gui`: "Save Record" on Performance Remarks not offered (admin contrast) | ✅ |

## §D Scale Site – Search & Records

| Matrix cell | Spec | Enforcement | Scenario | Verdict |
|---|---|---|---|---|
| Queries – Scale Sites (+ Results) `R` | §3.D | `SCALE_SITE_QUERY` | `gui` nav; `url` `/scale-sites`; `api` `/scale-sites/search` | ✅ |
| Scale Site – Create `-` | §3.D | `SCALE_SITE_CREATE` withheld | `gui`: Create menu omits it; `url` refused; `api` `POST /api/scale-sites` → 403 | ✅ |
| Scale Site Record – Summary `R` | §3.D | `SCALE_SITE_READ`, `..._SUMMARY_READ` | `gui` tab; `api` `/scale-sites/520/summary` | ✅ |
| Scale Site Record – Summary – Edit `-` | §3.D | `SCALE_SITE_UPDATE` withheld | `gui`: "Edit Record" not offered (admin contrast) | ✅ |
| Scale Site Record – Contacts `R` | §3.D | `SCALE_SITE_CONTACT_QUERY/READ` | `gui` tab; `api` `/scale-sites/520/contacts` | ✅ |
| Scale Site Contact – Create / – Edit `-` | §3.D | `..._CONTACT_CREATE/UPDATE` withheld | `gui`: neither "Add Primary Contact" nor "Add Site Contact"; `api` `POST` → 403 | ✅ |
| Scale Site Record – Activity Summary `R` | §3.D | `SCALE_SITE_ACTIVITY_READ` | `gui` tab; `api` `/activity-summary` | ✅ |
| Scale Site Record – Site Authorizations `R` | §3.D | `SCALE_SITE_AUTHORIZATION_QUERY/READ` | `gui` tab; `api` `/scale-sites/520/authorizations` | ✅ |
| — its create control `-` | §3.E | `SCALE_SITE_AUTHORIZATION_CREATE` withheld | `gui`: "Add Authorization" not offered; `url` `/scale-site-authorizations/create` refused | ✅ |
| Scale Site Record – Authorized Scalers `R` | §3.D | `..._AUTHORIZED_SCALER_QUERY` | `gui` tab; `api` `/authorized-scalers` | ✅ |
| Scale Site Record – MSD `CR` | §3.D | `SCALE_SITE_MSD_QUERY` + `MSD_CREATE` | `gui`: tab + "Add Mark Site Designation" | ✅ |
| Scale Site Record – Inspections `CR` | §3.D/§H | `..._INSPECTION_QUERY/CREATE` | `gui`: tab + "Add Inspection"; `api`: create-init 200 vs welcome-only 403 | ✅ |
| Scale Site Record – Check Scales `CR` | §3.D | `..._CHECK_SCALE_QUERY` | `gui`: tab + "Add Check Scale" | ✅ |
| Scale Site Record – Software Use `R` | §3.D | `SCALE_SITE_SOFTWARE_QUERY` | `gui` tab; `api` `/software` | ✅ |
| Risk assessment — read AND author, both subjects | §3.1 (client, 2026-09-02) — **overrides §3.D's `-`**; this column is one of the four create roles it names | 10 `*_RISK_*` | `gui`: Risk Rating tab offered on BOTH records + Queries shows both risk screens; `url`: 3 routes reachable; `api`: 4 endpoints allowed | ✅ |

## §E Authorizations

| Matrix cell | Spec | Enforcement | Scenario | Verdict |
|---|---|---|---|---|
| Scaler Authorization `R` | §3.E | `SCALER_AUTHORIZATION_READ` | `url` `/scaler-authorizations/view/147851`; `api` `/scaler-authorizations/147851` | ✅ |
| Scale Site Authorization `R` | §3.E | `SCALE_SITE_AUTHORIZATION_READ` | `api` `/scale-sites/520/authorizations` | ✅ |
| Scaler Authorization – Create / Create-Edit `-` | §3.E | `..._CREATE/UPDATE/DELETE` withheld | `url`: create + edit refused; `gui`: control absent | ✅ |
| Scale Site Authorization – Create / Create-Edit `-` | §3.E | `..._CREATE/UPDATE/DELETE` withheld | `url`: create refused; `gui`: control absent | ✅ |
| *(no matrix row)* authorization letters | §3.1 (client, 2026-09-02) — **reverses judgement call (3)**, which withheld them on §3.E's `R` | `SCALER_AUTHORIZATION_LETTER_VIEW`/`_CREATE` granted | `api`: the **letter pair** — both now pass authorization; `url`: `/scaler-authorizations/147851/letter` reachable | ✅ |

## §F Mark / Site Designations

| Matrix cell | Spec | Enforcement | Scenario | Verdict |
|---|---|---|---|---|
| Query – MSD (+ Results `CR`) | §3.F | `MSD_QUERY` | `gui` nav; `url` `/mark-site-designations`; `api` search | ✅ |
| MSD – Create `CR` / Create-Edit `CRUD` | §3.F | `MSD_CREATE` | `gui`: Create menu + "Add Mark Site Designation"; `url` `/create`; `api`: `POST` passes authz vs welcome-only 403 | ✅ |
| Mark Site Designation `RU` — the `R` | §3.F | `MSD_READ` | `api` `/mark-site-designations/1101` | ✅ |
| Mark Site Designation `RU` — the `U` | §3.F | `MSD_UPDATE` | `url` `/edit/1101` reachable only | ⛔ CG-2 |
| *(no matrix row)* designation letter | §3.1 (was judgement call (3); same outcome) | `MSD_LETTER_VIEW`/`_CREATE` granted | `api`: the **letter pair**; `url` `/1101/letter` reachable | ✅ |
| Delete a designation | §3.F `ADM` only | no `MSD_DELETE` exists | *n/a — SCS exposes no delete endpoint* | ✅ |

## §H Site Inspections

| Matrix cell | Spec | Enforcement | Scenario | Verdict |
|---|---|---|---|---|
| Site Inspection – Create / Create-Edit `CR` | §3.H | `..._INSPECTION_CREATE` | `api`: create-init 200 vs welcome-only 403; `gui` "Add Inspection"; `url` `/inspections/create` | ✅ |
| Site Inspection `RU` — the `R` | §3.H | `..._INSPECTION_READ` | `api` `/scale-sites/inspection/322429`; `url` view route | ✅ |
| Site Inspection `RU` — the `U` | §3.H | `..._INSPECTION_UPDATE` | `api`: edit-init 200 vs welcome-only 403; `url` edit route | ✅ |
| No delete row for any column | §3.H | `..._INSPECTION_DELETE` withheld | `api`: `DELETE` → 403 **and the record is read back** | ✅ |

## §I Check Scales

| Matrix cell | Spec | Enforcement | Scenario | Verdict |
|---|---|---|---|---|
| Check Scale – Create (steps 1 & 2) `CR` | §3.I | `CHECK_SCALE_CREATE` | `gui`: Create menu + both "Add Check Scale" controls; `url` `/check-scales/create` | ✅ |
| Check Scale `RU` — the `R` (search) | §3.I | `CHECK_SCALE_QUERY` | `api` `/check-scales/search`; `url` view route | ✅ |
| Check Scale – Edit `RU` — the `U` | §3.I | `CHECK_SCALE_UPDATE` | `url` `/check-scales/edit/145988` reachable only | ⛔ CG-2 |
| *(no matrix row)* summary check scales | judgement call (2) | `SUMMARY_CHECK_SCALE_CREATE/UPDATE` | `gui`: Create menu offers "Summary Check Scale"; `url` `/summary-check-scales/create`; `api` scaler tab read | ⚠️ CG-2 (verbs not proven) |
| *(no matrix row)* advisory letter | §3.1 (was judgement call (3); same outcome) | `CHECK_SCALE_ADVISORY_LETTER_CREATE` granted — no `_VIEW` exists, SCS stores no advisory letter | `url` route reachable only | ⛔ CG-4 |
| Delete a check scale | `ADM` `RUD` only | `CHECK_SCALE_DELETE` / `SUMMARY_CHECK_SCALE_DELETE` withheld from every column | `api`: `DELETE` on a disposable detail **and** summary record → 403, **and each record is read back** | ✅ |

## §J Reference-Data Maintenance & System Admin

| Matrix cell | Spec | Enforcement | Scenario | Verdict |
|---|---|---|---|---|
| All 23 rows `-` | §3.J | every `MAINTAIN_*` withheld | `gui`: the whole **Maintenance sub-group** does not render (admin contrast); `url`: 9 routes refused; `api`: 8 endpoints 403 | ✅ |
| Maintain System `-` | §3.J | `MAINTAIN_SYSTEM_READ/UPDATE` withheld | `url` `/maintenance/system` refused | ✅ |

## Reports (§4 "View reports")

| Matrix cell | Spec | Enforcement | Scenario | Verdict |
|---|---|---|---|---|
| Reports menu — no per-report rows exist | §4 | `REPORT_READ`, menu-level | `gui`: all 8 report leaves offered; `url`: 2 sampled reachable | ✅ |

---

## Symmetry check — where each denial's contrast lives

A denial asserted alone also passes when the control was renamed, the page failed to load, the selector
was wrong, or the backend was down. Every deny assertion in this suite is paired:

| Deny assertion | Its contrast | Where |
|---|---|---|
| ~~Risk Rating tab hidden (both records)~~ | retired 2026-09-02: the tab is now **offered** to this column, so it needs no administrator contrast | `gui-access.feature` |
| 9 withheld write controls hidden | all 9 **visible** for `SCS_SYS_ADMIN`, same tabs, same loop | `gui-access.feature`, "An administrator is offered every control the check scaler is denied" |
| Maintenance sub-group absent | sub-group **present** for `SCS_SYS_ADMIN` | `gui-access.feature` |
| 18 routes refused | 5 sampled routes **reachable** for `SCS_SYS_ADMIN` | `url-access.feature` |
| 12 read endpoints 403 | 4 sampled endpoints **200** for `SCS_SYS_ADMIN` | `api-access.feature` |
| 4 write endpoints 403 | same body **reaches the service** (400/404/422) for `SCS_SYS_ADMIN` | `api-access.feature` |
| `DELETE` inspection 403 | administrator gets 404, **and the record is read back** | `api-access.feature` |
| authorization letter passes authorization | the same call for a **welcome-only** role, **403** | `api-access.feature` letter pair |
| **allow-side writes** ("not refused") | identical call + body **403 for a welcome-only role** | `api-access.feature`, 4 scenarios |

That last row is the one this suite had to invent: for a write, "not refused" is meaningless without a
caller who *is* refused, because binding and bean validation run before authorization and answer the same
status for everyone (`defects.md` V2).

## Open gaps

Tracked in full in `defects.md`. Summary:

| Gap | What is not covered | Why |
|---|---|---|
| CG-1 | org-unit scoping behaviour (`D`/`R`/`H` breadth, fail-closed) | see the private security findings log |
| CG-2 | **mostly CLOSED 2026-08-31** — `CHECK_SCALE_UPDATE`, `SUMMARY_CHECK_SCALE_UPDATE`/`_DELETE` and `WORKBENCH_CREATE`/`_UPDATE` are now proven in `../write-verb-boundaries/`. Still open: `MSD_UPDATE`, `PERFORMANCE_REMARK_UPDATE` | the premise was wrong on two counts: the Work Bench renew and remove endpoints take **no body at all**, so they always reached authorization; and a bindable body for both check-scale updates does exist (`write-verb-test-data.ts`). All probes target id `99999999` so none can mutate. The two remaining verbs need their own bodies — same pattern |
| CG-3 | `SCALER_PERFORMANCE_REMARK_DELETE` | its `DELETE` answers 500 for **every** role, so no assertion on it can distinguish a permission |
| CG-4 | `CHECK_SCALE_ADVISORY_LETTER` | same — 500 for every role, authorization never reached |
