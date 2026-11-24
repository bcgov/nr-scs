# Coverage — `SCS_CE_TECHNICIAN` (`CET`) role scoping

**Spec:** `roles-permissions.md` **§3.1.3** — the client's written statement of 2026-09-02, which
overrides §3 for this column — as resolved in `RolePermissions.ceTechnician()`.

**Rows are matrix cells, not source items.**

> **Rewritten 2026-09-02, API level re-executed 2026-09-03.** This suite was green on 2026-08-27 against
> a column that held writes. The client's statement — *"For CE_TECH, in general they should only have read
> permissions. No where in the app should they be able to edit, delete or create something"* — withdrew
> every one of them, so roughly a third of the rows below flipped from a grant to a denial.
>
> **`api-access.feature`: 66/66 green** against the running backend (`BASE_URL=http://localhost:8080`,
> which bypasses the Vite proxy). That covers the reversal's sharpest evidence — the two inspection init
> GETs and both risk create-inits now answering 403, and the letter-view split proven against
> `SCS_CLERICAL`. **`gui-access` and `url-access` are still un-run**: both drive the SPA and need the Vite
> dev server on :3000, which was down. See CG-5.

## The shape: the read-only internal column, minus one thing, plus three

`CET` used to be read as a delta from the Check Scaler. Since the client's rule it is closer to the
read-only internal column (`CLE` / `SUP` / `RM`), and that is how it reads now:

| vs. the read-only internal column | Cell | Consequence |
|---|---|---|
| **− Work Bench** | §A `-` vs `R (ltd)` | still the only **internal** column with no Work Bench at all |
| **+ check-scale read** | §I read row `R` vs `-` | the check-scale record opens, and the "OR enter check scale #" lookup renders |
| **+ letter views** | §3.1.2 | the three `_LETTER_VIEW` verbs — **the only column that may view a letter without composing one** |
| **+ Maintain Questions** | §J `R` | the **only §J cell granted to any non-administrator** |

### What the client's rule withdrew

| Withdrawn | §3 cell that granted it | Visible consequence |
|---|---|---|
| Performance Remarks `CRD` | §C | `Add Performance Remark` no longer offered |
| Site Inspections `CR` + `RU` | §D, §H | `Add Inspection` gone; both init GETs now 403 |
| Check Scale `CR`/`RU` + summary check scales | §I | `Add Check Scale` ×2 gone; **the Create menu disappears entirely**, having held only those two leaves |
| Advisory letter | *(no row — the "owns the workflow" test)* | `/check-scales/…/advisory-letter` now refused |
| Risk assessment create/update | *(no row — the follows-the-record rule)* | both create forms refused; the reads stay |

## The most distinctive navigation in the matrix

`CET` holds no `WORKBENCH_QUERY` but does hold `MAINTAIN_QUESTIONS_QUERY`. So Administration renders
*without* Work Bench and *with* a Maintenance sub-group of exactly one leaf — the **exact inverse** of the
read-only internal column, which has the Work Bench and no Maintenance.

Since 2026-09-02 the same rule also drops the **Create** group for this column: it held two leaves, Check
Scale and Summary Check Scale, and both went with `CHECK_SCALE_CREATE`. So one rule — "a group with no
visible child is dropped" — produces all three outcomes here, and none of them is a special case in the
code. That is worth an executable assertion, which is why the leaf comparison is exhaustive rather than
sampled.

Create also renders, with two of seven leaves (Check Scale, Summary Check Scale) — the only `_CREATE`
verbs it holds.

## Coverage

### §A General & Navigation

| Cell | Spec | Permission | Where asserted | Verdict |
|---|---|---|---|---|
| SCS Home Page `R` | §A | `WELCOME_READ` | `url`: `/welcome`; `api` | ✅ |
| Work Bench `-` | §A | *(none)* | `gui`: leaf hidden; `url`: `/workbench` refused; `api`: **all three queues** refused | ✅ |

### §B / §C / §D — reads

| Cell | Spec | Permission | Where asserted | Verdict |
|---|---|---|---|---|
| Clients, Scalers, Scale Sites, MSD queries `R` | §B–§F | `*_QUERY` | `gui`: 4 of 6 Queries leaves; `url`; `api` | ✅ |
| Both records readable **whole**, Risk Rating included | §C, §D | 20+ `_READ`/`_QUERY` | `gui`: tab lists on both records | ✅ |
| Scaler / Scale Site – Create `-` | §C, §D | *(none)* | `gui`: Create leaves hidden; `url`: both refused | ✅ |
| Summary – Edit `-` on both records | §C, §D | *(none)* | `gui`: `Edit Record` withheld ×2 | ✅ |
| Risk assessment — **read only** | §3.1.1 — this column is not one of the four create roles | 6 `*_RISK_*` | `gui`: Risk Rating tab **offered**; `url`: 2 RSK searches reachable, both create forms refused; `api`: both searches + both risk-ratings allowed, both create-inits 403 | ✅ api · ⚠️ gui/url un-run |

### §C/§H/§I — no writes at all

Every row here used to be a grant. The GUI sweep now runs in one direction only — *no* control the suite
knows about may render — and its administrator pairing is what keeps that non-vacuous.

| Cell | Spec | Permission | Where asserted | Verdict |
|---|---|---|---|---|
| Performance Remarks — read only | §3.1.3 over §C's `CRD` | `SCALER_PERFORMANCE_REMARK_QUERY` only | `gui`: `Add Performance Remark` **withheld** | ⚠️ gui un-run |
| Licence cancel `-` | §4 (given to `DM`/`DSM`/`RSM`) | *(none)* | `gui`: `Save Record` on the same tab withheld | ✅ |
| Site Inspections — read only | §3.1.3 over §D/§H's `CR`/`RU` | `_QUERY`/`_READ` only | `gui`: `Add Inspection` withheld; `url`: create + edit refused; `api`: **both init GETs 403**, paired with an administrator | ✅ api · ⚠️ gui/url un-run |
| Check Scale — read only | §3.1.3 over §I's `CR`/`RU` | `CHECK_SCALE_QUERY` only | `gui`: `Add Check Scale` ×2 withheld; `url`: create/edit/advisory-letter refused; `api`: search still allowed | ✅ api · ⚠️ gui/url un-run |
| Summary check scales — none | §3.1.3 over §I | *(none)* | `url`: `/summary-check-scales/create` refused | ⚠️ url un-run |
| No delete anywhere | §3 | — | `api`: `DELETE /api/scalers/001B` refused **and read back** | ✅ |

### §E / §F — read-only, and the letter split

| Cell | Spec | Permission | Where asserted | Verdict |
|---|---|---|---|---|
| Authorizations `R`, no create/edit | §E | `*_READ`/`_QUERY` only | `url`: create and edit refused | ✅ |
| MSD `R`, no create/edit | §F | `MSD_QUERY`/`_READ` | `url`: create and edit refused | ✅ |
| **Letters — view, never compose** | §3.1.2 | 3 × `_LETTER_VIEW`; no `_LETTER_CREATE` | `api`: both stored-letter GETs pass authorization **and 403 for `SCS_CLERICAL`**; `url`: both composer routes refused | ✅ api · ⚠️ url un-run |

**The sharpest single contrast in this suite** used to be advisory-letter-reachable vs
designation-letter-refused, on the "owns the workflow end to end" test. That contrast is gone — this
column composes nothing now. It is replaced by a better one, and it is the reason the `_LETTER` verb was
split in two: **`GET /api/scaler-authorizations/147851/letter` passes authorization for `CET` and answers
403 for `SCS_CLERICAL`, while `/scaler-authorizations/147851/letter` — the composer route — is refused for
both.** Same letter, same role, opposite answers depending on whether the caller is reading one or writing
one.

No advisory-letter row in that assertion: SCS stores no advisory letter and exposes no GET for one, so
`CHECK_SCALE_ADVISORY_LETTER_CREATE` has no `_VIEW` counterpart and this column reaches no advisory letter
by any route.

### §J — the one cell

| Cell | Spec | Permission | Where asserted | Verdict |
|---|---|---|---|---|
| Maintain Questions `R` | §J | `MAINTAIN_QUESTIONS_QUERY`/`_READ` | `gui`: the only Maintenance leaf; `url`: `/maintenance/questions` reachable; `api`: allowed **and refused for `SCS_CLERICAL`** | ✅ |
| Every other §J row `-` | §J | *(none)* | `gui`: 8 leaves hidden; `url`: 8 routes refused; `api`: 7 endpoints refused | ✅ |
| Questions create/update/delete `-` | §J (`R` only) | *(none)* | `../maintenance-controls/`: Add / Edit / Delete all withheld on `/maintenance/questions` | ✅ |

### Reports

`REPORT_READ`, menu-level — all 8 leaves render, 2 report routes asserted reachable. The matrix has no
per-report rows.

## Symmetry check

| Denial | Its contrast |
|---|---|
| GUI: Work Bench leaf, the whole Create group, 8 Maintenance leaves | asserted alongside the leaves that DO render, in one whole-list comparison — a group that failed to render cannot pass |
| GUI: **all 14** write controls withheld | `An administrator is offered every control this column withholds`. This pairing now carries the whole weight: with no control granted, the "every control this column grants is offered" scenario would be vacuous, so it was removed rather than left to pass for the wrong reason |
| URL: ~32 refused routes | `<route> is reachable for a role that holds the permission` — sampled, one per section |
| API: refused reads, queues and write inits | `the same call should succeed for a system administrator` on every row |
| API: **allowed** reads | `the same call should be refused for a caller with no roles` — the roleless sentinel |
| API: the cells unique to this column, **letter views included** | `refused for SCS_CLERICAL` — same call, two enabled internal roles, opposite outcomes |
| API: `DELETE` refused | read-back, no admin contrast (it would delete a pinned anchor) |

## Open gaps

| Gap | What is not covered | Why |
|---|---|---|
| CG-1 | org-unit scoping | out of scope by instruction |
| ~~CG-2~~ | ~~Questions create/update/delete are withheld~~ — **CLOSED 2026-08-31** | the maintenance-page control sweep it called for now exists: `../maintenance-controls/maintenance-control-sweep.feature` › "A CE technician is offered no write control on the Questions screen". Anchored on the detail modal (so the absences are not vacuous) and paired with an administrator contrast on the same screen |
| ~~CG-3~~ | ~~the check-scale write **happy path**~~ — **MOOT 2026-09-02** | the column no longer holds a check-scale write, so there is no happy path to prove. The denial is covered instead, and body-free: `/check-scales/create` and `/check-scales/edit/…` are refused by route |
| CG-4 | multi-role users | a user holding `CET` plus another role gets the union; not covered, as for every suite |
| **CG-5** | **`gui-access` and `url-access` are un-run since the 2026-09-02 rewrite** | `api-access` was re-executed 2026-09-03 (66/66 green) and carries the reversal's strongest evidence. The other two levels drive the SPA through :3000, which was down; their expectations still come from `RolePermissions.ceTechnician()` / `permissions.ts` rather than from a run. Bring the Vite server up per `e2e/README.md` and re-run before trusting a ✅ on a row still marked ⚠️. <br>**Note the API run needed `BASE_URL=http://localhost:8080`** — the default :3000 is the Vite proxy, so every API-only scenario is blocked by a frontend that is merely not running. Worth knowing when the DB and backend are up but the SPA is not |
| **CG-6** | the letter-view assertion depends on the anchors having no stored letter | `GET …/147851/letter` and `…/1101/letter` are asserted as "not 403", which tolerates the 404 an anchor with no letter returns. If a future seed gives either anchor a letter the assertion still holds; if the route itself broke it would also hold, which is why the `SCS_CLERICAL` 403 half is required — that is what proves authorization ran |
