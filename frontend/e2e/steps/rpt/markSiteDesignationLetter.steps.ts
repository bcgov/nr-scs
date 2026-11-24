import { readFile } from 'node:fs/promises';

import { Given, When, Then, expect } from '../fixtures';
import { richViewMsdId } from '../../fixtures/msd/msd-test-data';
import { SIGNATORY_REG_DIST } from '../../fixtures/admin/maintenance/signature-block-test-data';

/**
 * UC-RPT-009 — Generate Timber Mark Site Designation Letter (letter options screen). Two groups of steps:
 *
 * 1. CLIENT-side email/preview validation (S05/S06) — runs in ReportPage.handleSend BEFORE any generate
 *    request, so each negative PROVES no letter request fired (letterMsdCalls === 0). These open the screen
 *    with a real letterless MSD id (richViewMsdId) purely to render the options form; nothing is
 *    generated or persisted, so they read a shared anchor safely.
 *
 * 2. Real letter GENERATION + view-existing (S01/S02) — authored 2026-09-10 (the Jasper blocker closed
 *    2026-08-11). Issuing a letter is a WRITE that PERSISTS a row and flips the record's letterExists, which
 *    would break the UC-MSD-003 scenarios that need it letterless — so, unlike group 1, these NEVER touch the
 *    shared anchor: each seeds its OWN disposable MSD + signatory block and tears them down. See the
 *    generation block comment below and the UC's defects.md Coverage gap #0.
 */

Given('I open the MSD letter options for the sample record', async ({ markSiteDesignationLetterPage }) => {
  await markSiteDesignationLetterPage.open(richViewMsdId);
});

// NOTE: named "letter email recipient" (not "report email recipient") to stay distinct from the
// same-shaped step for the nine Reports-tab screens in reportScreens.steps.ts — playwright-bdd errors on
// an ambiguous match. It also now matches its sibling steps' "letter options" vocabulary.
When('I set the letter email recipient to {string}', async ({ markSiteDesignationLetterPage }, email) => {
  await markSiteDesignationLetterPage.setEmail(email);
});

When('I set Preview Report to No', async ({ markSiteDesignationLetterPage }) => {
  await markSiteDesignationLetterPage.setPreviewNo();
});

When('I click Send \\/ View Report', async ({ markSiteDesignationLetterPage }) => {
  await markSiteDesignationLetterPage.clickSend();
});

Then('the letter options show the error {string}', async ({ markSiteDesignationLetterPage }, message) => {
  await expect(markSiteDesignationLetterPage.emailError).toHaveText(message, { timeout: 30000 });
});

Then('no letter generate request should be sent', async ({ letterMsdCalls }) => {
  expect(letterMsdCalls()).toBe(0);
});

// --- letter GENERATION (S01) + view-existing (S02) ----------------------------------------------
//
// These ARE authored now (the Jasper blocker closed 2026-08-11). Issuing a letter is a WRITE that inserts a
// HAULING_MARK_AUTH_LETTER row and flips letterExists, so every scenario seeds its OWN disposable MSD
// (`seedMarkSiteDesignation` → the createdMsdIds DB teardown deletes that child row with the parent) and its
// OWN signatory block (`seedSignatureBlock`, reused from UC-MNT-001, under the SAME reg/dist DCC so DCC's
// reg/dist-specific block list has a known block to pick — the picker is already non-empty from the initial
// full-list load, so the seed guarantees a block that BELONGS to DCC). NEVER driven against the shared
// richViewMsdId anchor the validation scenarios read — that broke three UC-MSD-003 scenarios once
// (defects.md CG #0).
//
// The MSD teardown (`createdMsdIds`) and the block teardown (`createdSignatureBlockIds`) need NO ordering
// relative to each other, because the letter row does not reference the block at all: HAULING_MARK_AUTH_LETTER
// is (HAULING_MARK_AUTHORIZATION_ID, LETTER_BLOB) — a single FK to HAULING_MARK_AUTHORIZATION, no
// signatory-block column anywhere. So deleting the block and deleting the MSD (+ its letter child) are
// independent; either order is clean. Do NOT read a "keep these Givens in order" rule into this — there is no
// cross-reference to protect, and a future cleanup failure will not be a step-ordering bug. (Incidentally the
// block does tear down FIRST: Playwright reverses SETUP order and playwright-bdd lists the used fixtures
// alphabetically — seedMarkSiteDesignation before seedSignatureBlock — so `createdMsdIds` tears down last.
// Nothing depends on that; step order does not drive fixture setup order.)

function req<T>(value: T | undefined | null, name: string): T {
  if (value === undefined || value === null) {
    throw new Error(`[rpt009] expected "${name}" in world — a prior step should have set it`);
  }
  return value;
}

/** A real PDF, by magic bytes + a size floor (a zero-byte or wrong-format download would still fire the
 *  download event, so `waitForEvent('download')` alone proves nothing). Reused by S01 and S02. */
async function expectRealPdfNamedForRecord(
  filename: string | undefined,
  path: string | undefined,
  msdId: string,
): Promise<void> {
  // The backend names the letter <msdId>.pdf via Content-Disposition (verified 2026-08-11); the view path
  // falls back to `mark-site-designation-letter-<id>.pdf` if the header is ever absent. Accept either — both
  // name the file for THIS record — while the bytes below are the real proof it rendered.
  expect(filename, 'downloaded letter filename').toMatch(
    new RegExp(`(^${msdId}\\.pdf$|letter-${msdId}\\.pdf$)`, 'i'),
  );
  expect(path, 'the letter download was not saved to disk').toBeTruthy();
  const contents = await readFile(path!);
  expect(
    contents.length,
    `the downloaded letter is only ${contents.length} bytes — expected a real PDF`,
  ).toBeGreaterThan(10_000);
  expect(contents.subarray(0, 5).toString('ascii'), 'the download is not a PDF (magic bytes)').toBe('%PDF-');
}

Given('I have a signatory block for the letter reg\\/dist', async ({ seedSignatureBlock, world }) => {
  const { id } = await seedSignatureBlock('rpt009');
  world.letterSignatoryBlockId = id;
});

Given('I have a disposable mark site designation', async ({ seedMarkSiteDesignation, world }) => {
  world.msdId = await seedMarkSiteDesignation('Y');
});

When(
  'I open the letter options for that mark site designation',
  async ({ markSiteDesignationLetterPage, world }) => {
    await markSiteDesignationLetterPage.open(req(world.msdId, 'msdId'));
  },
);

When(
  'I choose the letter reg\\/dist that has a signatory block',
  async ({ markSiteDesignationLetterPage, world }) => {
    // Pass the SEEDED block id so the page selects it explicitly (and asserts it is in the reloaded DCC list)
    // rather than trusting a non-empty gate the initial-load auto-select already satisfies — see the page
    // object's selectRegDistWithSignature doc.
    await markSiteDesignationLetterPage.selectRegDistWithSignature(
      SIGNATORY_REG_DIST.orgUnitCode,
      SIGNATORY_REG_DIST.orgUnitNo,
      req(world.letterSignatoryBlockId, 'letterSignatoryBlockId'),
    );
  },
);

When('I generate the letter and download it', async ({ markSiteDesignationLetterPage, world }) => {
  const download = await markSiteDesignationLetterPage.generateAndDownload(req(world.msdId, 'msdId'));
  world.reportDownloadFilename = download.filename;
  world.reportDownloadPath = download.path;
});

Then('one letter generate request should be sent', async ({ letterMsdCalls }) => {
  expect(letterMsdCalls(), 'exactly one POST should reach /mark-site-designations/{id}/letter').toBe(1);
});

Then(
  'the mark site designation record has a letter on file',
  async ({ readMsdLetterExists, world }) => {
    const id = req(world.msdId, 'msdId');
    // The letter POST commits before it responds, so by the time the download arrives the row is durable —
    // this poll isn't papering over a commit-after-response gap. It's just defensive hardening against
    // read-back flake (a separate-connection GET), and settles on the first read in practice.
    await expect
      .poll(() => readMsdLetterExists(id), {
        message: `letterExists never became true for MSD ${id} after generation`,
        timeout: 20_000,
      })
      .toBe(true);
  },
);

Then('the downloaded letter is a real PDF for that record', async ({ world }) => {
  await expectRealPdfNamedForRecord(
    world.reportDownloadFilename,
    world.reportDownloadPath,
    req(world.msdId, 'msdId'),
  );
});

Given(
  'the mark site designation already has a generated letter',
  async ({ issueMsdLetterViaApi, readMsdLetterExists, world }) => {
    const id = req(world.msdId, 'msdId');
    const blockId = req(world.letterSignatoryBlockId, 'letterSignatoryBlockId');
    const status = await issueMsdLetterViaApi(id, blockId, SIGNATORY_REG_DIST.orgUnitCode);
    expect([200, 201], `issuing a letter for MSD ${id} returned HTTP ${status}`).toContain(status);
    await expect
      .poll(() => readMsdLetterExists(id), {
        message: `the out-of-band letter did not persist for MSD ${id}`,
        timeout: 20_000,
      })
      .toBe(true);
  },
);

When(
  'I open the mark site designation view for that letter record',
  async ({ markSiteDesignationViewPage, world }) => {
    // reopenUntilLetterState hardens against the filed letterExists concurrency flake (UC-MSD-002 Bug #1)
    // WITHOUT masking it — it reopens with a fresh login until "View Letter" renders.
    await markSiteDesignationViewPage.reopenUntilLetterState(req(world.msdId, 'msdId'), 'view');
  },
);

Then('the record offers to view the existing letter', async ({ markSiteDesignationViewPage }) => {
  // NOTE: not load-bearing — the preceding When's reopenUntilLetterState(…, 'view') already returns only once
  // this button is visible (else it throws), so this assertion cannot independently fail. It stays as the
  // scenario's explicit spec statement (a Then that reads the "View Letter" affordance); the real gate is the
  // reopen loop in the When.
  await expect(markSiteDesignationViewPage.viewLetterButton).toBeVisible();
});

When('I download the existing letter', async ({ markSiteDesignationViewPage, world }) => {
  const download = await markSiteDesignationViewPage.downloadExistingLetter();
  world.reportDownloadFilename = download.filename;
  world.reportDownloadPath = download.path;
});
