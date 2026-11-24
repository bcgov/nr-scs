import { Given, When, Then, expect } from '../fixtures';

import {
  INDUSTRY_SCALER_ROLE,
  SCALE_SITE_OWNER_ROLE,
  WMSG_KEY,
  benignNewsPayload,
  expectedFallbackOrganization,
  expectedInternalOrganization,
  expectedOwnerOrganization,
  newsPayloadFor,
  ownerClientNumber,
  roundTripNewsPayload,
  unresolvableClientNumber,
} from '../../fixtures/security/welcome-test-data';

/**
 * SEC-1 / UC-SYS-004 — the welcome page, asserted as a page rather than as a destination.
 *
 * **The gap this closes.** Eleven role suites assert `/welcome` is REACHABLE and stop at the URL; the
 * chrome-boundaries suite asserts where a user who cannot reach it lands instead. Nothing asked what
 * the page renders once an authorized user arrives — and one of the things it renders is
 * administrator-authored HTML, injected with `dangerouslySetInnerHTML`.
 *
 * **Why that is a security concern and not a formatting one.** `Current News` is written by one role
 * (`ADM`, through `/maintenance/system` — UC-SYS-002) and read by EVERY role on the one page they all
 * land on. `WelcomeService` stores and returns the value untouched, so a single `DOMPurify.sanitize()`
 * call in `pages/Landing/index.tsx` is the entire defence on a stored-HTML path. That call is what
 * these scenarios exercise, both stubbed (several attack shapes, no shared state) and end-to-end (one
 * payload through the real setting row, which is the only way to show the server does not strip it).
 */

// ---------------------------------------------------------------- identities
//
// `I am signed in through IDIR` (audit-affordance steps) and `I am signed in as an industry scaler
// with a forest client` (chrome-boundaries steps) are reused rather than restated — a near-duplicate
// phrase for the same seeded session is how two suites end up asserting different users while reading
// as though they assert the same one.

Given('I am signed in as an owner whose client resolves to a company name', async ({ roleSession }) => {
  await roleSession.signInAs([SCALE_SITE_OWNER_ROLE], [ownerClientNumber]);
});

Given('I am signed in as an external user whose client has no company name', async ({ roleSession }) => {
  await roleSession.signInAs([INDUSTRY_SCALER_ROLE], [unresolvableClientNumber]);
});

// ---------------------------------------------------------------- arranging Current News

/**
 * Serve a chosen Current News value WITHOUT touching the shared setting row.
 *
 * Stubbing is what lets the payload matrix run under `fullyParallel`: `WMSG` is a singleton, so every
 * scenario that wrote it would have to serialise against every other one — including UC-SYS-002's own
 * suite, in a different file, which Playwright can schedule concurrently regardless of `@mode:serial`.
 * The end-to-end scenario below pays that cost once, deliberately, because it is the only way to prove
 * the SERVER side; everything about the sanitizer itself is a frontend property and is asserted here.
 */
Given('the stored welcome message carries {string}', async ({ welcome }, attack: string) => {
  const payload = newsPayloadFor(attack);
  await welcome.armXssWitness();
  await welcome.stubCurrentNews(payload.stored);
});

Given('the stored welcome message uses ordinary formatting', async ({ welcome }) => {
  await welcome.armXssWitness();
  await welcome.stubCurrentNews(benignNewsPayload.stored);
});

Given('the welcome summary cannot be read', async ({ welcome }) => {
  await welcome.stubWelcomeError();
});

/**
 * The end-to-end arrangement: an administrator writes a scripted payload to the REAL setting row.
 *
 * `wmsgGuard` snapshots the original value and restores it on teardown, so the shared row is left as
 * found. The scenario asserts the marker from the value IT wrote, so a concurrent overwrite by
 * UC-SYS-002's suite fails this scenario loudly rather than passing on someone else's value — a flake
 * in the safe direction, and the reason the payload is unique to this scenario.
 */
Given(
  'an administrator has stored a welcome message containing a script',
  async ({ request, wmsgGuard, welcome, world }) => {
    expect(
      wmsgGuard.original,
      '[sec] the WMSG guard must have captured an original value to restore — without it this ' +
        'scenario would leave a scripted payload in the shared welcome message',
    ).toBeDefined();
    await welcome.armXssWitness();
    const response = await request.put(`/api/system-settings/${WMSG_KEY}`, {
      data: { systemSettingValue: roundTripNewsPayload.stored },
    });
    expect(
      response.ok(),
      `[sec] could not store the end-to-end payload: HTTP ${response.status()} — ${await response.text()}`,
    ).toBeTruthy();
    world.newsWritten = roundTripNewsPayload.stored;
  },
);

// ---------------------------------------------------------------- acting

When('I open the welcome page', async ({ roleSession, welcome }) => {
  await roleSession.visit('/welcome');
  await roleSession.waitForRouteDecision();
  await welcome.waitForSummary();
});

/**
 * Read what the API hands the page, so "the server does not sanitize" is asserted at the wire rather
 * than inferred from the fact that the page had something to sanitize.
 */
When('I read the welcome summary from the API', async ({ request, world }) => {
  const response = await request.get('/api/welcome');
  expect(response.ok(), `[sec] GET /api/welcome answered HTTP ${response.status()}`).toBeTruthy();
  const summary = (await response.json()) as { currentNews?: string | null };
  world.newsFromApi = summary.currentNews ?? '';
});

// ---------------------------------------------------------------- the welcome grid

Then('the Organization should name the company and its client number', async ({ welcome }) => {
  expect(
    await welcome.fieldValue('Organization:'),
    'an external user\'s Organization is `{companyName} - {clientNumber}` (SEC-1 / UC-SEC-001-S02). ' +
      'This is the resolving half of the pair — its partner asserts the fallback, and without both ' +
      'either one passes on a build that always, or never, resolves a name',
  ).toBe(expectedOwnerOrganization);
});

Then('the Organization should fall back to the bare client number', async ({ welcome }) => {
  expect(
    await welcome.fieldValue('Organization:'),
    'when the client is absent from the supported client view, `resolveClientOrganization` falls back ' +
      'to the number. Not a defect — SCS display views are lossy, and this client genuinely is not in ' +
      'SCS_CLIENT_VW (1550 rows, none of them this one)',
  ).toBe(expectedFallbackOrganization);
});

/**
 * defects.md D1 — pinned as today's behaviour, expected to go red when it is fixed.
 *
 * UC-SYS-004's goal is "view the current system message AND user org-unit". The backend resolves an
 * internal user's org unit from an `orgUnitNo` request parameter that the frontend never sends, so the
 * cell renders empty for every internal user. The capability exists — `/api/welcome?orgUnitNo=1`
 * answers a real org unit — it is simply never invoked.
 */
Then('the Organization should be empty', async ({ welcome }) => {
  expect(
    await welcome.fieldValue('Organization:'),
    'an internal user\'s org unit is never displayed: the frontend calls getWelcomeSummary(token) ' +
      'with no orgUnitNo, so the backend resolves nothing. UC-SYS-004 names the org unit as part of ' +
      'the page. Pinned so this reddens the day the frontend has an org unit to pass',
  ).toBe(expectedInternalOrganization);
});

Then('the Roles should name the signed-in role', async ({ welcome }) => {
  const roles = await welcome.fieldValue('Roles:');
  expect(
    roles,
    'the grid reads the roles straight off the session, so this is the page\'s own evidence that it ' +
      'rendered for the identity the scenario seeded rather than a cached earlier one',
  ).not.toBe('');
});

Then('the environment details should be shown', async ({ welcome }) => {
  for (const label of ['Version:', 'Environment:', 'Server:']) {
    expect(
      await welcome.fieldValue(label),
      `"${label}" comes from the backend's own configuration; an empty cell means the welcome summary ` +
        'resolved but carried nothing',
    ).not.toBe('');
  }
});

// ---------------------------------------------------------------- Current News

Then('the news should still show its text', async ({ welcome }) => {
  const text = await welcome.newsText();
  expect(
    text,
    'the sanitizer must remove the attack and KEEP the message. Without this assertion every ' +
      'scenario here would also pass on a page that rendered no news at all, or on a sanitizer that ' +
      'discarded the whole value',
  ).not.toBe('');
});

Then('the news should show {string}', async ({ welcome }, marker: string) => {
  expect(
    await welcome.newsText(),
    `the surviving message must contain "${marker}" — the marker is what distinguishes "the attack ` +
      'was stripped" from "nothing was rendered"',
  ).toContain(marker);
});

Then('nothing should have executed', async ({ welcome }) => {
  expect(
    await welcome.xssFired(),
    'a payload stored in the welcome message must not run in any reader\'s browser. Current News is ' +
      'authored by one role and rendered to every role, through dangerouslySetInnerHTML, with no ' +
      'server-side sanitizer anywhere on the path',
  ).toBe(false);
});

Then('the news should carry no {string} element', async ({ welcome }, tag: string) => {
  expect(
    await welcome.newsTagNames(),
    `<${tag}> must not survive sanitization`,
  ).not.toContain(tag.toLowerCase());
});

Then('the news should carry no {string} attribute', async ({ welcome }, attribute: string) => {
  expect(
    await welcome.newsAttributeNames(),
    `the "${attribute}" handler must not survive sanitization — an attribute-borne payload is the ` +
      'one a naive tag-stripper misses',
  ).not.toContain(attribute.toLowerCase());
});

Then('ordinary formatting should survive', async ({ welcome }) => {
  const tags = await welcome.newsTagNames();
  for (const tag of benignNewsPayload.survivingTags) {
    expect(
      tags,
      `<${tag}> is legitimate formatting an administrator may use, and must NOT be stripped — a ` +
        'sanitizer that removed everything would satisfy every other scenario in this file',
    ).toContain(tag);
  }
});

Then('the news should be reported unavailable', async ({ welcome }) => {
  await welcome.assertWelcomeStubServed();
  await expect(
    welcome.newsUnavailable,
    'when the welcome read fails the page must say so rather than render an empty Current News, ' +
      'which is indistinguishable from "there is no news"',
  ).toBeVisible();
});

/**
 * The half no stub can assert: the server hands the page the payload exactly as stored.
 *
 * Worth stating plainly because it decides where a future fix belongs — the sanitization is entirely
 * client-side, so anything else that ever reads `GET /api/welcome` (another client, a report, a
 * migration) receives the raw value.
 */
Then('the API should have returned the message unsanitized', async ({ world }) => {
  expect(
    world.newsFromApi,
    'GET /api/welcome must be shown to return the stored value verbatim. It does — WelcomeService ' +
      'passes it through untouched — so the page\'s DOMPurify call is the only sanitization on this ' +
      'path, and any other consumer of this endpoint gets the payload as authored',
  ).toBe(world.newsWritten);
});

Then('the page should render it inert', async ({ welcome }) => {
  expect(await welcome.xssFired(), 'the end-to-end payload must not execute').toBe(false);
  expect(
    await welcome.newsTagNames(),
    'the script element must not survive the round trip',
  ).not.toContain('script');
  expect(
    await welcome.newsText(),
    'and the message itself must survive, or this proves only that the page rendered nothing',
  ).toContain(roundTripNewsPayload.marker);
});
