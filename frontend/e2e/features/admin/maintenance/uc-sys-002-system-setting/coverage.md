# Coverage — UC-SYS-002 Configure System Setting (Welcome Message)

> New to these files? See [`coverage-guide.md`](../../../../coverage-guide.md) at the e2e root for the column
> + status-flag legend.

**Outcome: authored — first suite in the new `sys` domain.** The built React "Maintain - System" page
(`/maintenance/system`) maintains ONE singleton setting: the `WMSG` "Current News" welcome message
(read + update only — no list / create / delete, and no enable/disable toggle). The suite is small and
**serial by nature** — every scenario shares that one row, so `system.feature` runs `@mode:serial` and a
`wmsgGuard` fixture snapshots + restores the original value on teardown. (The per-UC parallel stress is
run at `workers=1`: a singleton-mutation UC cannot be `repeat-each`'d across workers — concurrent copies
would race on the shared row. In a normal full-suite run, `@mode:serial` keeps the SYS scenarios off
concurrent access.)

**Re-grounding headlines** (full detail in `defects.md`):
- Save is **disabled until the text changes** (client `currentNews === initialNews`); there is no other
  client-side validation. Success shows a "System setting saved." banner and stays on the page.
- Legacy **S02 (disable the system)** and **MSG-001 (`scsDisabled.jsp`)** have **no equivalent** in the new
  app — there is no enable/disable toggle, only the welcome message. → not-applicable.
- Legacy **S05 (blank)** and **S06 (> 4000)** showed clean field messages. These WERE divergences (the new
  backend surfaced a generic HTTP 500) — now **FIXED** in nr-scs `SystemSettingService` (clean 400 +
  meaningful message), so both scenarios are green. See defects.md Divergences #1 and #2 (CLOSED).

| Source item (UC-SYS-002) | Source citation | App enforcement point | Scenario (tags) | Status |
|---|---|---|---|---|
| S01 / STA-001 — page pre-populated with the stored message | S01; technical.md STA-001 | `GET /system-settings/WMSG` → textarea; Save disabled until changed | `system.feature` @S01 @p0 (asserts Save disabled on load) | covered |
| S01 — edit the message and save | S01; slices.md §S01 | `PUT /system-settings/WMSG` → success banner + field shows saved text | `system.feature` @S01 @p0 | covered |
| S03 — Back without saving → welcome page, nothing saved | S03 | Back → `navigate('/welcome')`; no PUT | `system.feature` @S03 @p2 (returned to /welcome + zero update calls + stored value unchanged) | covered |
| S04 — Reset discards unsaved edits | S04 | `handleReset()` restores `initialNews` (client-side) | `system.feature` @S04 @p2 (field back to original + zero update calls) | covered |
| S05 / ERR-001 — blank Current News rejected with a required message | S05; technical.md ERR-001 | `SystemSettingService.validateValue` → clean 400 "Current News is required." | `system.feature` @S05 @p1 | covered (Divergence #1 fixed) |
| S06 / ERR-004 — Current News > 4000 chars rejected with a length message | S06; technical.md ERR-004 | `SystemSettingService.validateValue` → clean 400 "…4000 characters." | `system.feature` @S06 @p1 | covered (Divergence #2 fixed) |
| S02 / MSG-001 — disable the system; non-admins see `scsDisabled.jsp` | S02; technical.md MSG-001 | n/a — no enable/disable toggle in the new app | — | not-applicable — Coverage gap #1 (feature not built) |
| S07 — non-admin gets 403 on the system page | S07 | route gate (`ProtectedRoute`) + `@RequiresPermission` | — | **covered elsewhere** (gap #2 CLOSED 2026-09-04) |

**Role / permission coverage:** S07 (non-admin denied) is **covered, in the role suites** — updated
2026-09-04. The old note here said it was blocked because "the local stack issues only
`SCS_SYS_ADMIN`"; that has not been true since the role model shipped, and
`pages/security/RoleSessionPage` seeds any role before the app boots.

`/maintenance/system` is asserted refused at the URL level for **ten** of the eleven roles
(`features/security/*/url-access.feature`), and `GET /api/system-settings/WMSG` is asserted at the API
level in `features/security/scaling-manager-roles/api-access.feature`. Repeating either here would
duplicate a matrix cell that suite owns, so this ledger points at them instead. The scenarios in this
file still all run as the admin, which is correct: they are about the FORM, not about who may open it.

**Symmetry check:** the form's three abandon/commit arms — Save (S01), Back (S03), Reset (S04) — are all
covered; the two validation arms (blank, over-length) are both covered (as divergences). No unmirrored arm.

**Net:** every buildable slice is covered green — happy-path save, Back, Reset, and both validation
conditions (blank / over-length, now cleanly rejected after the nr-scs fix). Uncovered are only S02/MSG-001
(not built — no disable feature) and S07 (blocked by mock auth). No open divergences.
