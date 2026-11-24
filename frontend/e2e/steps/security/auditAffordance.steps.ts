import { Given, When, Then, expect } from '../fixtures';

import {
  AUDIT_HOSTS,
  AUDIT_ROLE,
  EXTERNAL_ROLE,
  auditHostFor,
  expectedEntryTimestamp,
  expectedEntryUserid,
  expectedRevisionCount,
  externalClientNumber,
} from '../../fixtures/security/audit-affordance-test-data';
import { AUDIT_LABELS, type AuditFieldKey } from '../../pages/security/WhoDidItPage';

/**
 * SEC-5 / UC-SYS-005 — the "Who Did It" audit affordance, swept once across its host screens.
 *
 * **Why a suite of its own.** `WhoDidIt` is a component on eleven screens, and the two things that most
 * matter about it belong to none of them: it renders only for IDIR users, and its five values are
 * whatever the host handed it. Every per-UC ledger that met it said the same thing and moved on — see
 * `features/mark-site-designation/uc-msd-003-view/defects.md` gap #4, "defer to a single dedicated
 * audit-affordance pass rather than re-litigating it per host screen". This is that pass.
 *
 * **The variable is the IdP, and it is isolated.** Both identities below hold `SCS_SYS_ADMIN`, so
 * permissions, navigation and every route decision are identical and cannot explain any difference in
 * what the page offers. Only `user.idpProvider` differs. That is the cleanest contrast available for
 * this property, and it is only available because `RoleSessionPage.signInAs` now takes a provider —
 * every earlier role suite seeds `BCEIDBUSINESS`, in which this component renders for nobody.
 */

Given('I am signed in through IDIR', async ({ roleSession }) => {
  await roleSession.signInAs([AUDIT_ROLE], [], 'IDIR');
});

/**
 * The contrast. Same role, same permissions, same records — only the IdP is different, so a difference
 * in the affordance can be attributed to nothing else.
 */
Given('I am signed in through BCeID with the same role', async ({ roleSession }) => {
  await roleSession.signInAs([AUDIT_ROLE], [], 'BCEIDBUSINESS');
});

/** And the realistic non-IDIR case: an actual external role on a record its client owns. */
Given('I am signed in as an external scale site owner', async ({ roleSession }) => {
  await roleSession.signInAs([EXTERNAL_ROLE], [externalClientNumber], 'BCEIDBUSINESS');
});

/**
 * `settle: false` throughout this suite. The record views here are the heaviest in the app — several
 * queries per screen — and every assertion that follows waits on a specific element (the trigger, or
 * the popup's drained skeletons). Waiting for `networkidle` first only adds a way to time out under a
 * full-suite run without adding any evidence.
 */
When('I open the {string} record', async ({ roleSession, world }, record: string) => {
  const host = auditHostFor(record);
  await roleSession.visit(host.path, { settle: false });
  await roleSession.waitForRouteDecision();
  world.auditTriggerCount = undefined;
  // Remembered so the comparison step reads back THE RECORD THIS SCENARIO OPENED. Reading a fixed path
  // instead would compare one host's popup against another host's audit the moment the step is reused.
  world.apiAudit = undefined;
  world.auditHostPath = host.auditApiPath;
});

When('I open the audit popup', async ({ whoDidIt }) => {
  await whoDidIt.open();
});

/**
 * Read the record's audit fields straight from the API, in the same scenario, so the popup is compared
 * against the record rather than against a pinned expectation.
 *
 * Values are normalised to what the component must DISPLAY, not to what the API returned: absent
 * becomes `''` (the component synthesises no defaults) and `revisionCount` becomes its decimal string.
 * Timestamps are deliberately left out — their formatting is the format contract and is asserted
 * separately against arithmetic that is spelled out, not against the raw instant.
 */
When('I read the same record\'s audit fields from the API', async ({ request, world }) => {
  const path = world.auditHostPath;
  expect(path, '[sec] a record must be opened before its audit can be read back').toBeDefined();
  const response = await request.get(path!);
  expect(
    response.ok(),
    `[sec] could not read ${path} to compare the popup against the record: HTTP ${response.status()}`,
  ).toBeTruthy();
  const record = (await response.json()) as Record<string, unknown>;
  const asDisplayed = (value: unknown): string =>
    value === null || value === undefined ? '' : String(value);
  world.apiAudit = {
    entryUserid: asDisplayed(record.entryUserid),
    updateUserid: asDisplayed(record.updateUserid),
    revisionCount: asDisplayed(record.revisionCount),
  };
});

/**
 * Walk every host record view and count the affordance on each.
 *
 * Collected rather than asserted per host so one failure message names EVERY host that lost the
 * trigger. A sweep that stops at the first red tells you the least useful thing it knows.
 */
When('I visit every record view that hosts the audit affordance', async ({ roleSession, whoDidIt, world }) => {
  const verdicts: { record: string; auditApiPath: string; triggers: number }[] = [];
  for (const host of AUDIT_HOSTS) {
    await roleSession.visit(host.path, { settle: false });
    await roleSession.waitForRouteDecision();
    // Poll rather than read once: each host fetches its record before the trigger can render, so a
    // single early read would report a present affordance as missing — a false FINDING, which is the
    // direction that wastes a reviewer's time. The poll failing is not an error here: it means the host
    // genuinely offered none within the budget, which is exactly what the sweep is collecting.
    let triggers = 0;
    try {
      await expect
        .poll(async () => (triggers = await whoDidIt.triggerCount()), { timeout: 20_000 })
        .toBeGreaterThan(0);
    } catch {
      /* triggers holds the last count read — 0 is the finding, reported by the Then with its host */
    }
    verdicts.push({ record: host.record, auditApiPath: host.auditApiPath, triggers });
  }
  world.auditHostVerdicts = verdicts;
});

When('I note whether the audit affordance is offered', async ({ whoDidIt, world }) => {
  world.auditTriggerCount = await whoDidIt.settledTriggerCount();
});

Then('the audit popup should show all five audit fields', async ({ whoDidIt }) => {
  expect(
    await whoDidIt.renderedLabels(),
    'the five labelled audit fields are the UC-SYS-005 contract and are user-visible text',
  ).toEqual(Object.values(AUDIT_LABELS));
});

Then('every audit field should match the record', async ({ whoDidIt, world }) => {
  const api = world.apiAudit;
  expect(api, 'the API read must run before the comparison').toBeDefined();
  // Non-vacuity guard. Every compared value is normalised to a string, so a record whose audit fields
  // were all absent would make this step compare '' against '' five times and pass without looking at
  // anything. The anchor is chosen to be live data precisely so that cannot happen — this asserts the
  // choice still holds after a re-extract, rather than trusting it.
  expect(
    Object.values(api!).filter((value) => value !== '').length,
    `the anchor record must actually carry audit values, or this comparison is vacuous. Read back: ` +
      `${JSON.stringify(api)} from ${world.auditHostPath} — re-ground the anchor on a record that has ` +
      `been created and updated by a real user`,
  ).toBeGreaterThan(0);
  const rendered = await whoDidIt.renderedAudit();
  for (const key of Object.keys(api!) as AuditFieldKey[]) {
    expect(
      rendered[key],
      `the popup's "${AUDIT_LABELS[key]}" must be the record's own value — showing five ` +
        `plausible-looking strings that belong to no record is the failure mode a pinned expectation ` +
        `cannot detect`,
    ).toBe(api![key]);
  }
});

/**
 * The format contract, and the one assertion that distinguishes the shipped behaviour from the
 * acceptance criterion it was written against.
 *
 * UC-SYS-005-S05 carries a `[LEGACY-BEHAVIOR-FLAG]`: timestamps truncated to their first 19 characters.
 * For this record that would render `1992-09-02T18:36:37` — the UTC clock, with the `T`. What ships
 * converts the instant to Pacific time, so the same value reads `1992-09-02 11:36:37`. The hour digits
 * differ, so no build can satisfy both. Recorded as `defects.md` D2.
 */
Then('the created timestamp should be shown in Pacific time', async ({ whoDidIt }) => {
  expect(
    await whoDidIt.fieldValue('entryTimestamp'),
    'the audit popup must render the stored instant as Vancouver local time in ' +
      '`YYYY-MM-DD hh:mm:ss` — a 19-character truncation of the same value would keep the UTC hour ' +
      'and the `T` separator, which is what UC-SYS-005-S05 specifies and NOT what ships',
  ).toBe(expectedEntryTimestamp);
});

Then('the created user should be shown unchanged', async ({ whoDidIt }) => {
  expect(
    await whoDidIt.fieldValue('entryUserid'),
    'user ids are passed through verbatim — they are the audit trail',
  ).toBe(expectedEntryUserid);
});

/**
 * A real zero must still render `0`.
 *
 * The mirror of D1: an ABSENT revision count renders blank (against UC-SYS-005-S02, which specifies
 * `0`). This is what stops a "fix" in either direction from passing — the component distinguishes the
 * two with `revisionCount != null`, and a regression to a truthiness test would blank this record out
 * while every absent-field assertion stayed green.
 */
Then('a zero revision count should still be shown as zero', async ({ whoDidIt }) => {
  expect(
    await whoDidIt.fieldValue('revisionCount'),
    'a revision count of 0 is a value, not an absence — blanking it would lose the distinction the ' +
      'component is careful to keep',
  ).toBe(expectedRevisionCount);
});

Then('the audit affordance should not be offered', async ({ world }) => {
  expect(
    world.auditTriggerCount,
    'the audit popup carries the IDIR user ids of everyone who touched the record. It is withheld ' +
      'from non-IDIR sessions by design (legacy parity: the taglib only emitted the trigger for ' +
      'government users), and this identity differs from the one that IS offered it only by its IdP',
  ).toBe(0);
});

Then('the audit affordance should be offered', async ({ world }) => {
  expect(
    world.auditTriggerCount,
    'the same role through IDIR must be offered the affordance — otherwise the withholding assertion ' +
      'proves only that this screen shows it to nobody',
  ).toBeGreaterThan(0);
});

Then('every host record view should offer the audit affordance', async ({ world }) => {
  const verdicts = world.auditHostVerdicts ?? [];
  expect(verdicts.length, 'the host sweep must have run').toBeGreaterThan(0);
  const missing = verdicts.filter((v) => v.triggers === 0);
  expect(
    missing,
    'every record view that mounts WhoDidIt must offer its trigger to an IDIR user. Hosts missing ' +
      `it: ${missing.map((m) => `${m.record} (audit read: GET ${m.auditApiPath})`).join('; ')} — check ` +
      'that read first: a host whose record fetch fails renders the screen without the affordance, ' +
      'which is a broken endpoint rather than a broken component',
  ).toEqual([]);
});

Then('closing the popup should dismiss it', async ({ whoDidIt }) => {
  await whoDidIt.close();
});
