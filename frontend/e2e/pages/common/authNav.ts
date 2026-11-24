import { type Page, type Locator, expect } from '@playwright/test';

/**
 * Cross-domain browser-interaction helpers — mock-auth login, client-side navigation, and Carbon
 * date entry. Promoted out of pages/chk/summaryCheckScaleShared.ts once a second domain (CCQ) needed
 * the same dance: these hold no domain vocabulary, so every page object across every domain reuses
 * them from here rather than re-inlining or keeping a domain-local copy "private".
 */

/**
 * Log in as the mock SCS_SYS_ADMIN via the Landing page's IDIR button. Mock auth (VITE_MOCK_USER=true)
 * is IN-MEMORY only: MockAuthProvider starts logged out and login() just sets React state (no
 * persistence). A later full page.goto() would reload the app and drop the session — callers must
 * navigate to protected routes CLIENT-SIDE after this.
 */
export async function loginAsMockScsUser(page: Page): Promise<void> {
  const idirButton = page.getByTestId('landing-button__idir');
  // The Vite dev server can be slow — or occasionally fail — to paint /welcome on a cold start under
  // heavy parallel load, flaking the login for ANY UC that logs in. Load and wait web-first (no fixed
  // sleep), and reload ONCE if the landing button never paints, so a single cold-start blip is absorbed
  // rather than turned into a spurious red. This is the ONE home for the login dance — every page object
  // reuses it, so hardening here hardens the whole suite.
  await page.goto('/welcome');
  try {
    await expect(idirButton).toBeVisible({ timeout: 20_000 });
  } catch {
    await page.reload();
    await expect(idirButton).toBeVisible({ timeout: 20_000 });
  }
  await idirButton.click();
  await expect(idirButton).toBeHidden();
}

/**
 * Client-side navigate to a protected route so the in-memory mock session survives — a full
 * `page.goto()` would reload the app and drop it (see loginAsMockScsUser). React Router reads
 * `location.state` from `history.state.usr`, so a non-empty `state` is seeded there. The
 * screen-specific readiness assertion (which heading/control proves the screen loaded) stays in the
 * calling page object. This is the ONE home for the mock-auth nav dance — every page object across
 * every domain reuses it rather than re-inlining `history.pushState`/`PopStateEvent`.
 */
export async function clientSideNavigate(
  page: Page,
  path: string,
  state: Record<string, unknown> = {},
): Promise<void> {
  await page.evaluate(
    ({ p, usr }) => {
      const hasState = Object.keys(usr).length > 0;
      window.history.pushState(hasState ? { usr } : {}, '', p);
      window.dispatchEvent(new PopStateEvent('popstate'));
    },
    { p: path, usr: state },
  );
}

/**
 * Commit a value into a Carbon DatePicker input: click, type, then Escape (dismiss the calendar
 * overlay) and blur (onBlur reads the typed value). Shared across every domain's date fields.
 */
export async function setDateField(page: Page, id: string, value: string): Promise<void> {
  const input = page.locator(id);
  await input.click();
  await input.fill(value);
  await page.keyboard.press('Escape');
  await input.blur();
}

/**
 * Commit a value into a Carbon DatePicker that lives INSIDE a Carbon Modal. Same click→fill as setDateField
 * but NEVER presses Escape — Carbon Modal captures Escape and closes the whole modal (a trap the exam and
 * appointment-type screens both hit). By default the value commits on blur; pass `dismiss` when an open
 * flatpickr calendar overlay would otherwise sit over the modal and intercept the next click (Save) — an
 * outside click on a stable neutral field both dismisses the overlay and blurs the input via onBlur.
 */
export async function setModalDateField(input: Locator, value: string, dismiss?: Locator): Promise<void> {
  await input.click();
  await input.fill(value);
  if (dismiss) {
    await dismiss.click();
  } else {
    await input.blur();
  }
}
