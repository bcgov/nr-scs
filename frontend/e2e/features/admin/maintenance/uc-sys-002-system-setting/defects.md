# Defects — UC-SYS-002 Configure System Setting (Welcome Message)

> How this log works (registers, tags, how to read an entry): [`defects-guide.md`](../../../../defects-guide.md)

## Bug / Regression

### Bug #1 — saved Current News not shown on Home until a manual browser refresh (QA DEV)
- **What's wrong (plain):** After updating "Current News" here and clicking Save Record, navigating to
  Home / SCS Home still showed the **old** value. Only a manual browser refresh revealed the new one.
  The save itself was fine — the value was persisted, and this screen re-read it correctly.
- **Expected vs actual:**
  - *Expected:* Home shows the updated Current News immediately after the save.
  - *Actual:* Home served the pre-save value until the page was reloaded.
- **Why:** Home reads the same `WMSG` setting through its own React Query entry,
  `['welcome-summary']` (`GET /api/welcome`), and the save here invalidated only its own
  `['system-setting','WMSG']`. Nothing touched `['welcome-summary']`. Two things then compounded:
  the Landing page is unmounted while the admin is on this screen, so its query is **inactive** —
  and the app sets `refetchOnMount: false` globally, so even an *invalidated* entry would still be
  served when Landing remounts. A manual refresh worked because it discards the in-memory
  QueryClient entirely.
- **Not a backend cache:** `WelcomeService` reads `SystemSettingRepository.findSystemSettingValue`
  on every call, with no `@Cacheable` anywhere on that path. Purely a client-side staleness bug —
  unlike UC-MNT-004 Bug #2, whose dominant layer was the backend Caffeine LOV cache.
- **Fix:** the save now calls `queryClient.removeQueries({ queryKey: WELCOME_SUMMARY_QUERY_KEY })`.
  `removeQueries`, not `invalidateQueries`, for the `refetchOnMount: false` reason above. The key
  moved to `config/react-query/queryKeys.ts` — a leaf module — so reader and writer share one
  literal and importing it does not drag `services/APIs` into pages that mock the service layer.
- **ACTION:** Dev — fixed. **Status:** CLOSED.
- **Test:** two cases in `System/index.unit.test.tsx` — the cached welcome summary is gone after a
  successful save, and untouched when the save fails. Confirmed to fail against the unfixed code.
  **Not** automated end-to-end: the assertion is about React Query cache state across a client-side
  navigation, which the browser suite cannot observe directly; a feature-level version would only
  re-assert what the unit tests already pin. See Coverage gap #3.

## Divergence

### Divergence #1 — blank welcome message returns a generic 500, not a required-field message
- **What's wrong (plain):** Saving an empty "Current News" welcome message shows a generic server error
  instead of telling the administrator the field is required. The blank is correctly NOT saved (the stored
  value is unchanged), so the RULE holds — only the surfaced message is wrong.
- **Expected vs actual:**
  - *Expected* (legacy `ScaleCtlSystemSettingValidator` + ERR-001): a clear field error —
    *"Current News is required."* — and no save.
  - *Actual:* `PUT /api/system-settings/WMSG` with `{"systemSettingValue":""}` → **HTTP 500**; the app
    shows a generic error banner/toast ("The server encountered an error…"), and the stored value is
    unchanged. The backend `SystemSettingService.updateSystemSetting` performs no blank check, so the empty
    value reaches the DB, which rejects it.
- **How we caught it:** `validation.feature @S05 @discovered-divergence` asserts an error IS shown (passes)
  AND that a meaningful *required* message is shown (RED — only the generic error appears). Reproduced
  directly: `PUT …/WMSG {"systemSettingValue":""}` → 500, GET read-back still the original value.
- **Classification:** `suspected-defect` (H-3 class — sanitize/translate DB errors into a domain 400 +
  message). **Severity/priority:** @p2. **Environment:** local mock-auth stack, seeded Docker DB, 2026-07-28.
- **Status:** **CLOSED — FIXED** 2026-07-28 in nr-scs `SystemSettingService.updateSystemSetting`
  (`validateValue()` now throws `BadRequestException("Current News is required.")` on blank). Verified live:
  `PUT …/WMSG {"systemSettingValue":""}` → **HTTP 400** `{"code":"BAD_REQUEST","message":"Current News is
  required."}`, value unchanged. E2E `system.feature @S05` re-grounded green (no longer
  `@discovered-divergence`). Covered by unit test `SystemSettingServiceTest.update_blankValue_*`.

### Divergence #2 — over-length welcome message returns a generic 500, not a max-length message
- **What's wrong (plain):** Saving a welcome message longer than 4000 characters shows a generic server
  error instead of a clear "can not be greater than 4000 characters" message. The over-length value is
  correctly NOT saved — only the message is wrong.
- **Expected vs actual:**
  - *Expected* (legacy validator + ERR-004): *"Current News can not be greater than 4000 characters."* and
    no save.
  - *Actual:* `PUT …/WMSG` with a > 4000-char value → **HTTP 500** `{"code":"DATABASE_ERROR","message":
    "An error occurred while processing your request."}`; stored value unchanged. There is no `@Size` on the
    request model and no length check in the service, so the value reaches the DB column
    (`SCALE_CTL_SYSTEM_SETTING`, VARCHAR2(4000)) which raises ORA-12899.
- **How we caught it:** `validation.feature @S06 @discovered-divergence` asserts an error IS shown (passes)
  AND that a meaningful *4000 characters* message is shown (RED). Reproduced directly (see above).
- **Classification:** `suspected-defect` (H-3 class). **Severity/priority:** @p2. **Environment:** as above.
- **Status:** **CLOSED — FIXED** 2026-07-28 in nr-scs `SystemSettingService.updateSystemSetting`
  (`validateValue()` now throws `BadRequestException("Current News can not be greater than 4000
  characters.")` when length > 4000). Verified live: `PUT …/WMSG` with a > 4000-char value → **HTTP 400**
  with that message, value unchanged. E2E `system.feature @S06` re-grounded green. Covered by unit test
  `SystemSettingServiceTest.update_overLengthValue_*` (+ `update_valueAt4000_isAccepted` for the boundary).

## Coverage gap

### Coverage gap #1 — S02 disable-the-system + MSG-001 disabled page (not built)
- Legacy S02 lets an admin disable SCS (non-admins then see `scsDisabled.jsp` with "SCS has been
  temporarily disabled."). The new app has **no enable/disable toggle** — the System page maintains only
  the `WMSG` welcome message. There is nothing to exercise. Status: OPEN (`not-applicable` — feature not
  built). If a system-enable/disable setting is added later, author S02/MSG-001 then.

### Coverage gap #2 — S07 non-admin access denial (blocked by mock auth)
- Legacy S07: a non-admin hitting `/systemMaint.do` gets 403. **Blocked** — the local mock-auth stack
  grants only `SCS_SYS_ADMIN`, so a non-admin session can't be produced. Status: OPEN (`blocked`).

### Coverage gap #3 — Home reflects a saved welcome message (Bug #1) not automated end-to-end
- **What:** No e2e walks *save here → navigate Home → read the new Current News*.
- **Why:** The bug lives in client cache state across a client-side navigation, and the suite would
  have to mutate the shared `WMSG` setting to exercise it — not parallel-safe, and it would leave the
  seeded welcome message changed for every other spec. Pinned by unit tests instead (see Bug #1).
- **Status:** OPEN (`deliberate`). Revisit if the suite gains a way to restore `WMSG` per-worker.

## Spec gap (gherkin-incomplete-vs-source)
_None._

## Verified — not a defect
- **The System page is built and functional** (read + update of the WMSG welcome message) — this is the
  first `sys`-domain suite.
- **Required-input is gated by disabling Save until the text changes** (`currentNews === initialNews`); a
  no-op save is impossible. Valid re-grounding, not a defect.
- **The blank / over-length constraints ARE enforced** (nothing bad persists — verified by API read-back);
  only the *surfaced message* is the divergence (see #1/#2), not the rule.
