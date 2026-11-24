import { randomUUID } from 'node:crypto';

/**
 * Known-good test data for Configure System Setting (UC-SYS-002 — the "Current News" / Welcome Message)
 * at /maintenance/system. Pinned from the seeded local Docker Oracle DB + the running app on 2026-07-28.
 *
 * The System page maintains a SINGLE real setting row: key `WMSG`
 * (`SCALE_CTL_SYSTEM_SETTING`), a free-text welcome message shown on the SCS home page. There is no list,
 * no create, and no delete — only read + update of this one singleton. So tests do NOT seed their own
 * record; instead the happy path edits the singleton and a guard fixture restores its original value on
 * teardown (see `wmsgGuard` in steps/fixtures.ts). SYS scenarios run `@mode:serial` so concurrent repeats
 * can't collide on the shared row.
 *
 * Provenance:
 *  - `GET /api/system-settings/WMSG` → { settingKey:"WMSG", description:"Current News - Welcome Message …",
 *      systemSettingValue:"…" }. `PUT /api/system-settings/WMSG` { systemSettingValue } updates it.
 *  - Backend `SystemSettingService.updateSystemSetting` does NOT validate blank or length; the DB column
 *      rejects both (blank → 500, > 4000 chars → 500 DATABASE_ERROR / ORA-12899) — i.e. the constraint
 *      holds but surfaces as a generic 500 instead of the legacy clean messages (ERR-001 / ERR-004). See
 *      defects.md Divergences #1 and #2.
 */

export const WMSG_KEY = 'WMSG';

/** The DB column length for the welcome message (legacy MAXLENGTH_SYSTEM_SETTING_VALUE). */
export const NEWS_MAX_LENGTH = 4000;

/** A globally-unique, valid welcome-message value (so the happy-path read-back is unambiguous). */
export function buildWelcomeMessage(label = 'update'): string {
  return `E2E SYS002 ${label} ${randomUUID().slice(0, 8)} — welcome to SCS`;
}

/** A value longer than the 4000-char limit (for the over-length rejection scenario). */
export function buildOverLengthMessage(): string {
  return `E2E SYS002 overlength ${randomUUID().slice(0, 8)} ` + 'X'.repeat(NEWS_MAX_LENGTH + 1);
}
