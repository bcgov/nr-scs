import { When, Then, expect } from '../fixtures';

/**
 * URL level — what the role reaches by ADDRESS BAR, ignoring what the navigation offers.
 *
 * This is the level that matters when someone follows a bookmark, an emailed link, or simply types a
 * path they remember. Hiding a menu entry does nothing here; only `ProtectedRoute`'s permission check
 * does, and that check is what these steps exercise.
 *
 * The assertion is on the landed path rather than on page content, because a denied route REDIRECTS
 * (`/unauthorized`, the port of the legacy `notAuthorized` forward) — so the URL is the primary
 * evidence, and it stays true no matter how that page is later restyled.
 */

When('I browse directly to {string}', async ({ roleSession }, path) => {
  await roleSession.visit(path);
});

Then('I should land on {string}', async ({ roleSession }, expected) => {
  expect(
    roleSession.landedPath(),
    `expected the route to resolve to ${expected}`,
  ).toBe(expected);
});

Then('I should be refused with the unauthorized page', async ({ roleSession }) => {
  await roleSession.expectRefused();
});

/**
 * Proving a route was NOT refused is a negative, so the route guard must be given the chance to fire
 * before the URL is read — otherwise this passes on any machine fast enough to assert before the
 * redirect. `waitForRouteDecision` is what makes the "allowed" half of the matrix meaningful.
 */
Then('I should stay on {string}', async ({ roleSession }, path) => {
  await roleSession.waitForRouteDecision();
  expect(
    roleSession.landedPath(),
    `a route the role holds the permission for must not redirect away from ${path}`,
  ).toBe(path);
});
