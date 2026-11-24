# Coverage — UC-CHK-001 Create Detail Check Scale

> New to these files? See [`coverage-guide.md`](../../../coverage-guide.md) at the e2e root for the column + status-flag legend.

Sources reconciled: `gherkin/UC-CHK-001-S01..S08.feature` + `UC-CHK-001-slices.md` (control/message
matrix) + `UC-CHK-001-technical.md` (ERR-001..014 catalog), against the new app's two-step, HBS-driven
write path: `pages/Create/CheckScale/index.tsx` (`validate` step 1 / `validateStep2` step 2),
`components/core/DdnDdvTable`, `components/Form/CheckScaleForm`, `services/checkScales.service.ts`
(POST `/check-scales/validate`, POST `/check-scales/create`, GET `/check-scales/search`), and the
backend `CheckScaleService.validate` / `createCheckScale`. Messages were ground-truthed against the
live `/validate` endpoint on 2026-07-08.

**Test data (real, 2026-07-15):** the two-step flow needs HBS log-tally documents, DISCOVERED from the
loaded `LOG_TALLY` table (120 rows) — all chosen docs are ACTIVE version 1 and unused. Happy path
`168D492V77Y90` (167Y) + `0172812I12E50` (012E), site 16W. Detail create does **not** enforce the timber
mark FK (it derives `timber_mark` from HBS), so — unlike the summary create — it needs **no** mark seed.
The loaded data has **zero** check scales linked to a log tally, so S03 "already a check" and S04
"original at max checks" have no natural state; those scenarios CREATE the prerequisite check scale(s)
at runtime via the API (self-contained, cleaned up at the DB), each on a UNIQUE check DDN so parallel
runs don't contend. `NOSUCHDDN01`/`NOSUCHORG01` are provably absent (COUNT(*)=0). See `fixtures/chk/chk-test-data.ts`.

| Source item | Source citation | App enforcement point | Scenario (tags) | Status | Gap/defect |
|---|---|---|---|---|---|
| Happy-path create (Log Tally) end-to-end | S01 | validate → create → `/view/{id}` + read-back | create `@S01 @p0` | covered | — |
| Form opens on DDN step, Log Tally default | S01 controls | `initialValues.returnType` (index.tsx:52) | navigation `@S01 @p2` | covered | — |
| Return Type radio (Log Tally / Sample Log Tally) | S01 / control | RadioButtonGroup (index.tsx:511-519) | navigation `@S01 @p2` (LT) | covered (LT) | SLT path identical — excluded by slices §Deliberately excluded |
| Check/Original DDN + DDV required (blank) | S02 / ERR-001/002/003 | client `validate()` required (index.tsx:214-217) | validation `@S02 @p1` (blank check DDN → no validate POST) | covered | — |
| Check/Original DDV numeric-format (ERR-003) | S02 / technical:108 | client `requireInteger()` (index.tsx:229-238) — non-numeric DDV is blocked before the validate POST | validation `@S02 @p1` outline (non-numeric DDV, both arms) | covered | defect #3 CLOSED 2026-09-21 |
| Step-1 DDN/DDV length cap (DDN 13, DDV 9) | legacy `createCheckScale1.jsp:41-79` (`maxlength` 13/9) | `maxLength` on all four `DdnDdvTable` inputs (`DdnDdvTable/index.tsx`) | validation `@S02 @p1` outline (typed char-by-char, all four fields) | covered | defect #4 CLOSED 2026-09-21 |
| Check/Original DDN not in HBS (ERR-007/008) | S02 | server `existsHbsRecord` (CheckScaleService:90-103) | validation `@S02 @p1` outline (check not in HBS) | covered | — |
| DDN uniqueness — check == original (ERR-004) | S03 | server `checkDdnsAreDistinct` | validation `@S02 @S03 @p1` outline | covered | — |
| Check DDN already a check (ERR-005) | S03 | server `checkNoExistingCheckScaleForCheckDdn` | validation `@S03 @p1` | covered | — |
| Original at max checks (ERR-006) | S04 | server `checkOriginalNotAtMaxChecks` | validation `@S04 @p1` | covered | — |
| Step-2 Check Scale Type required (ERR-009) | S05 | `validateStep2` (index.tsx:321) | validation `@S05 @p1` outline | covered | — |
| Step-2 Followed Good Practices required (ERR-010) | S05 | `validateStep2` (index.tsx:324) | validation `@S05 @p1` outline | covered | — |
| Step-2 Original within Standard required (ERR-011) | S05 | `validateStep2` (index.tsx:327) | validation `@S05 @p1` outline | covered | — |
| Step-2 Net Value required/format (original + check) | S05 slices / `-slices.md:278-279,297-298` | `validateNetValue` (index.tsx:330-337) | validation `@S05 @p1` outline (non-numeric both arms) | covered (+ spec-gap) | spec gap #1 |
| Same-scaler cross-validation (ERR-012) | S06 / `-technical.md:117` | **not applicable to detail** — legacy ran ERR-012 (`validateScalersNotSame`) only from `validateSummaryCheckScale`; the detail path never did, so `CheckScaleService.validate`/`create` correctly permits it | validation `@S06 @p1` (create succeeds, same scaler both sides) | not-applicable (legacy parity) | see defects.md "Verified — not a defect" |
| Permission-gated view controls hidden (STA-001/002) | S07 / technical:103-104 | **no control gating** — the CHK pages call no `hasPermission`, so every control renders for any role that reaches the screen | — (scenario REMOVED 2026-09-02; was a permanent `@skip`) | not-applicable | coverage gap #1 → the single open product question lives in `uc-chk-004-delete/defects.md` gap #3 |
| Unauthorized wrong-role → not authorized (ERR-014) | S08 / technical:119 | `ProtectedRoute` + `@RequiresPermission(CHECK_SCALE_CREATE)` | `sec/check-scaler-role/url-access` + `api-access` (and the same route rows in the other ten role suites) — `/check-scales/create` refused per role | covered elsewhere | coverage gap #2 CLOSED (scenario REMOVED 2026-09-02) |

**Symmetry check:** the check/original × DDN/DDV matrix is enforced by ONE shared code path — client
`validate()` (required) and server `existsHbsRecord` (HBS existence) run identically for both sides. The
check arm is materialized (blank check DDN, check not-in-HBS); the **original arm is the exact mirror
through the same functions**, so it is covered by parity rather than duplicated. The two rules added
2026-09-21 (DDV numeric, DDN/DDV length cap) are the exception: both arms ARE materialized, because the
QA report that prompted them named all four fields explicitly. Net Value original/check
both materialized (S05 outline). Sample-Log-Tally is the mirror of Log Tally on the same validate/create
path and is deliberately excluded by the slice catalog (identical outcome).

**Role / permission coverage (re-homed 2026-09-02).** Both S07 and S08 were permanent `@skip`
placeholders justified by "mock auth grants only SCS_SYS_ADMIN" — untrue since PR #240 landed the role
switcher. They have been REMOVED rather than repaired, for different reasons:

- **S08 (wrong-role denial) → `covered elsewhere`.** This is a role × level property, not a per-screen
  one: all eleven columns have suites, and the routes this scenario named are asserted per role in
  `sec/*/url-access.feature` plus the endpoint denials in `api-access.feature`. Re-asserting it inside
  each UC would restate one app-wide fact ~140 times.
- **S07 (control hiding) → `not-applicable`.** `sec`'s control sweep is *tab*-scoped
  (`{record, tab, control}` in `fixtures/sec/check-scaler-test-data.ts`), so it does not reach the
  check-scale detail screens — and there is nothing to assert anyway, because the app gates no controls
  there. If product decides controls should be gated, the right home is `sec`, with its sweep extended
  from tabs to detail screens; that is noted in `uc-chk-004-delete/defects.md` gap #3, which holds the
  question once for the whole domain.

**Status values:** `covered` · `covered (+ spec-gap)` · `not-applicable` (legacy-only / legacy parity /
not UI-reachable / no control gating on this screen) · `covered elsewhere` (asserted in the `sec` role suites) · `divergence` (see defects.md). **No `blocked` rows and no `@skip` scenarios remain.**
