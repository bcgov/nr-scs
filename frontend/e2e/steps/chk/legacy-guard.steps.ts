import { Given, Then, When, expect } from '../fixtures';

/**
 * Read-only-LEGACY server behaviour — shared by UC-CHK-002 (update) and UC-CHK-004 (delete).
 *
 * The UI treats a LEGACY (`cksc_type = 'LGCS'`) check scale as read-only: Edit Record and Delete both
 * render disabled (UC-CHK-002 S04 / UC-CHK-003 S04 / UC-CHK-004 S07 assert exactly that). These steps ask
 * what the SERVER does with the same write — and the answer, verified against the legacy source, is that
 * it accepts it, **exactly as legacy did**:
 *
 *   - the rule lived only in `viewCheckScale.jsp:20,303,325` (an `isLegacy` -> `disabled` attribute);
 *   - no legacy Java consulted `ckscType` before a write — every `getCkscType()` comparison in the legacy
 *     tree is a display label, a length/blank check, or a summary-only branch;
 *   - `CheckScaleAction.delete` built a BO holding only the id and called `db.delete(bo)` — no load, no
 *     validation at all.
 *
 * So these scenarios pin PARITY, not a violated rule. They were briefly authored as
 * `@discovered-divergence` tests asserting a refusal; that was wrong, for the same reason UC-CHK-001's
 * same-scaler divergence was wrong — the legacy source had not been read before the tag was applied.
 * Whether the new app *should* be stricter (its PUT/DELETE are addressable REST operations, where
 * legacy's were a JSP button) is an open product question recorded in UC-CHK-002's `defects.md`, not
 * something these tests should presume.
 *
 * Both run against a DISPOSABLE legacy record (seedLegacyDetailCheckScale), never the pinned real one:
 * the writes genuinely go through, so the target is mutated or destroyed, and that must not be an anchor
 * three other scenarios assert against. See markCheckScaleLegacyViaDb.
 */

/** Minimal shape of the search read model these probes echo back. */
interface CheckScaleReadModel {
  checkScaleId: number;
  ckscType: string;
  checkScaleTypeCode: string;
  followedGoodPracticeInd: string;
  originalWithinStandardInd: string;
  chkScalerCommentTxt: string | null;
  originalScaleNetValue: number;
  checkScaleNetValue: number;
}

async function readLegacyRecord(
  request: { get: (url: string) => Promise<{ ok: () => boolean; json: () => Promise<unknown> }> },
  id: string,
): Promise<CheckScaleReadModel> {
  const res = await request.get(`/api/check-scales/search?checkScaleId=${id}`);
  expect(res.ok(), `could not read back legacy check scale ${id}`).toBeTruthy();
  const rows = (await res.json()) as CheckScaleReadModel[];
  expect(rows, `legacy check scale ${id} should exist`).toHaveLength(1);
  return rows[0];
}

Given('I have created a fresh legacy check scale', async ({ seedLegacyDetailCheckScale, request, world }) => {
  const id = await seedLegacyDetailCheckScale();
  world.legacyDetailCheckScaleId = id;
  // Prove the fixture actually took: a probe against a record the app would not call legacy proves nothing.
  const record = await readLegacyRecord(request, id);
  expect(record.ckscType, `seeded record ${id} should read back as legacy`).toBe('LGCS');
});

/**
 * Echo the record's OWN stored values back through the update endpoint. Nothing about the payload asks
 * for a change, so the only thing that can make this call succeed is the absence of a legacy guard — and
 * if it does succeed, the record is left materially as it was (only the audit columns move).
 */
When('I submit an unchanged update for that legacy check scale through the API', async ({ request, world }) => {
  const id = world.legacyDetailCheckScaleId;
  expect(id, 'no legacy check scale id captured').toBeTruthy();
  const record = await readLegacyRecord(request, id as string);
  const res = await request.put(`/api/check-scales/${id}`, {
    data: {
      checkScaleTypeCode: record.checkScaleTypeCode,
      followedGoodPracticeInd: record.followedGoodPracticeInd,
      originalWithinStandardInd: record.originalWithinStandardInd,
      chkScalerCommentTxt: record.chkScalerCommentTxt,
      originalScaleNetValue: record.originalScaleNetValue,
      checkScaleNetValue: record.checkScaleNetValue,
    },
  });
  world.legacyGuardStatus = res.status();
});

When('I request deletion of that legacy check scale through the API', async ({ request, world }) => {
  const id = world.legacyDetailCheckScaleId;
  expect(id, 'no legacy check scale id captured').toBeTruthy();
  const res = await request.delete(`/api/check-scales/${id}`);
  world.legacyGuardStatus = res.status();
});

/**
 * Legacy parity: the server ACCEPTS the write. Not the behaviour anyone would design, but it is the
 * behaviour legacy had — `viewCheckScale.jsp` disabled the two buttons and no legacy Java consulted
 * `ckscType` before an update or a delete. Asserting a refusal here would assert a rule that never
 * existed (the mistake that produced, and was corrected in, UC-CHK-001 S06). This pins the real contract
 * so a future change to it is a deliberate decision that turns this test red, not a silent drift.
 */
Then('the API should accept the write, matching legacy', async ({ world }) => {
  expect(
    world.legacyGuardStatus,
    'legacy permitted this write (no server-side ckscType guard anywhere in the legacy tree), so the new ' +
      'app matching it is parity. A 4xx here means the app has become STRICTER than legacy — which may be ' +
      'the right call, but it is a product decision to record, not a silent change',
  ).toBeLessThan(300);
});

Then('that legacy check scale should still exist', async ({ request, world }) => {
  const record = await readLegacyRecord(request, world.legacyDetailCheckScaleId as string);
  // Still LGCS afterwards: the update endpoint preserves cksc_type (its schema says the persisted row
  // stays HBCS for the detail flow), so an accepted write must not silently promote a legacy record out
  // of legacy — that WOULD be a divergence, and this is the assertion that would catch it.
  expect(record.ckscType, 'the write must not have changed the record type').toBe('LGCS');
});

/** The delete arm's parity read-back: legacy deleted the record, so the new app removing it is correct. */
Then('that legacy check scale should be gone', async ({ request, world }) => {
  const id = world.legacyDetailCheckScaleId;
  const res = await request.get(`/api/check-scales/search?checkScaleId=${id}`);
  expect(res.ok(), `read-back of legacy check scale ${id} failed`).toBeTruthy();
  expect(
    (await res.json()) as unknown[],
    `legacy check scale ${id} should have been deleted — legacy's CheckScaleAction.delete removed it too`,
  ).toHaveLength(0);
});
