import { readFile } from 'node:fs/promises';

import { type DataTable } from 'playwright-bdd';

import { Given, When, Then, expect } from '../fixtures';
import { REPORT_SCREENS } from '../../pages/rpt/ReportScreenPage';
import {
  complianceInspectionId,
  invalidComplianceInspectionId,
} from '../../fixtures/rpt/report-test-data';

/**
 * Steps for the nine REPORT PARAMETER screens under the Reports tab (UC-RPT-004/005/006/010/011/012/013/
 * 014/015). One generic step vocabulary over one shared page object, because all nine screens are the same
 * `components/core/ReportPage` tree with different parameter children — each UC keeps its own
 * feature/coverage/defects files, but the mechanics are stated once here.
 *
 * WHAT THESE STEPS ASSERT: the screen renders; the CLIENT-side validation blocks the request (proving 0
 * calls); the PAYLOAD the screen builds (captured in flight); and REAL generation — submit, let JasperServer
 * render, and assert the downloaded file's bytes. Report generation was environment-blocked (every
 * `POST /api/reports/*` returned HTTP 500) until 2026-08-11 and now works locally, so the generation steps
 * are real rather than stubbed. The stub/fault-injection Givens now cover only what real generation cannot
 * reach: the `useReportDownload` fallback filename, and a forced failure for the error branch.
 *
 * Steps here are deliberately parameterised by report NAME (the REPORT_SCREENS registry key) so a feature
 * reads as its own UC while sharing the implementation.
 */

// ------------------------------------------------------------------------------------ open / navigation

Given('I open the {string} report', async ({ reportScreenPage }, name: string) => {
  await reportScreenPage.open(name);
});

Given('I open the Scale Site Compliance report for the sample inspection', async ({ reportScreenPage }) => {
  await reportScreenPage.open('Scale Site Compliance', `/${complianceInspectionId}`);
});

Given(
  'I open the Scale Site Compliance report with a non-numeric inspection id',
  async ({ reportScreenPage }) => {
    await reportScreenPage.openExpectingNoForm(
      'Scale Site Compliance',
      `/${invalidComplianceInspectionId}`,
    );
  },
);

Then('the {string} report screen is displayed', async ({ reportScreenPage }, name: string) => {
  expect(reportScreenPage.spec.heading).toBe(REPORT_SCREENS[name].heading);
  await reportScreenPage.expectLoaded();
});

Then('the report output options are displayed', async ({ reportScreenPage }) => {
  await expect(reportScreenPage.fileFormatSelect).toBeVisible();
  await expect(reportScreenPage.emailInput).toBeVisible();
  await expect(reportScreenPage.previewYesRadioLabel).toBeVisible();
  await expect(reportScreenPage.previewNoRadioLabel).toBeVisible();
});

Then('the report sort order options are displayed', async ({ reportScreenPage }) => {
  await expect(reportScreenPage.primarySortSelect).toBeVisible();
  await expect(reportScreenPage.secondarySortSelect).toBeVisible();
});

Then('the report parameter {string} is displayed', async ({ reportScreenPage }, controlId: string) => {
  await expect(reportScreenPage.page.locator(`#${controlId}`)).toBeVisible();
});

Then(
  'the report field {string} is labelled {string}',
  async ({ reportScreenPage }, controlId: string, label: string) => {
    await expect(reportScreenPage.multiValueLabel(controlId)).toHaveText(label, { timeout: 30000 });
  },
);

/** MultiValueInput enforces its cap by disabling its own input once `maxItems` pills are committed. */
Then('the report field {string} accepts no more values', async ({ reportScreenPage }, controlId: string) => {
  await expect(reportScreenPage.page.locator(`#${controlId}`)).toBeDisabled({ timeout: 30000 });
});

Then('no report parameter form is displayed', async ({ reportScreenPage }) => {
  await expect(reportScreenPage.emailInput).toHaveCount(0);
  await expect(reportScreenPage.sendButton).toHaveCount(0);
});

// --------------------------------------------------------------------------------- parameter entry (When)

When('I select the report Reg \\/ Dist {string}', async ({ reportScreenPage }, orgUnitCode: string) => {
  await reportScreenPage.setRegDist(orgUnitCode);
});

/** For screens with more than one Reg / Dist control (Designated Marks Exception: mark- and site-). */
When(
  'I select the report Reg \\/ Dist {string} in {string}',
  async ({ reportScreenPage }, orgUnitCode: string, controlId: string) => {
    await reportScreenPage.setRegDistById(controlId, orgUnitCode);
  },
);

When(
  'I set the report parameter {string} to {string}',
  async ({ reportScreenPage }, controlId: string, value: string) => {
    await reportScreenPage.setSelectByValue(controlId, value);
  },
);

When(
  'I choose the report parameter {string} option {string}',
  async ({ reportScreenPage }, controlId: string, label: string) => {
    await reportScreenPage.setSelectByLabel(controlId, label);
  },
);

When(
  'I type {string} into the report parameter {string}',
  async ({ reportScreenPage }, value: string, controlId: string) => {
    await reportScreenPage.setTextField(controlId, value);
  },
);

/**
 * Typed keystroke by keystroke, NOT filled — the distinction is the whole point when the assertion is a
 * `maxlength` cap, which `fill()` bypasses.
 */
When(
  'I type {string} character by character into the report parameter {string}',
  async ({ reportScreenPage }, value: string, controlId: string) => {
    await reportScreenPage.typeTextField(controlId, value);
  },
);

When(
  'I set the report date {string} to {string}',
  async ({ reportScreenPage }, controlId: string, value: string) => {
    await reportScreenPage.setDate(controlId, value);
  },
);

When(
  'I add the report values {string} to {string}',
  async ({ reportScreenPage }, csv: string, controlId: string) => {
    await reportScreenPage.addMultiValues(
      controlId,
      csv.split(',').map((v) => v.trim()).filter(Boolean),
    );
  },
);

When(
  'I remove the report value {string} from {string}',
  async ({ reportScreenPage }, value: string, controlId: string) => {
    await reportScreenPage.removeMultiValue(controlId, value);
  },
);

When('I set the report primary sort to {string}', async ({ reportScreenPage }, label: string) => {
  await reportScreenPage.setPrimarySort(label);
});

When('I set the report secondary sort to {string}', async ({ reportScreenPage }, label: string) => {
  await reportScreenPage.setSecondarySort(label);
});

When('I set the report file format to {string}', async ({ reportScreenPage }, label: string) => {
  await reportScreenPage.setFileFormat(label);
});

When('I set the report email recipient to {string}', async ({ reportScreenPage }, email: string) => {
  await reportScreenPage.setEmail(email);
});

When('I set the report Preview Report to No', async ({ reportScreenPage }) => {
  await reportScreenPage.setPreviewNo();
});

When('I set the report Preview Report to Yes', async ({ reportScreenPage }) => {
  await reportScreenPage.setPreviewYes();
});

When('I submit the report', async ({ reportScreenPage }) => {
  await reportScreenPage.clickSend();
});

When('I reset the report parameters', async ({ reportScreenPage }) => {
  await reportScreenPage.clickReset();
});

// ------------------------------------------------------------------- REAL generation (no stub at all)

/**
 * Real end-to-end generation: submit, let the request reach JasperServer, and capture the file the browser
 * actually downloads. No stubbing anywhere — this is the arm that was environment-blocked until the local
 * report engine started working (2026-08-11), and it is the only coverage that proves a given report's
 * Jasper template still renders.
 *
 * The download is saved and its BYTES are asserted below, because `waitForEvent('download')` firing only
 * proves the app asked the browser to save something — a zero-byte or wrong-format file would still fire it.
 */
When(
  'I submit the report and download the generated file',
  async ({ reportScreenPage, reportRequests, world }) => {
    // Report requests are STUBBED by default (see steps/fixtures/rpt.ts) so the ~41 payload-assertion
    // scenarios do not each trigger a real render. This step is what opts into the genuine engine, so no
    // feature file has to say so explicitly — using this step IS the declaration that a real report renders.
    reportRequests.useRealEngine();

    // Both armed BEFORE the click: the render can finish quickly and a late listener would miss the event.
    //
    // The response is watched alongside the download so a FAILED report fails FAST and says why. Without it,
    // any non-2xx (the engine down → 500, or all three render slots busy → 503) simply means no download ever
    // arrives, and the scenario sits for the full 150s and then reports "Timeout exceeded while waiting for
    // event download" — which says nothing about the cause. Both failure modes look identical that way, and
    // one was misdiagnosed as the other during this suite's development. Now the status is reported directly.
    const page = reportScreenPage.page;
    const downloadPromise = page.waitForEvent('download', { timeout: 150_000 });
    const responsePromise = page
      .waitForResponse(
        (r) => r.request().method() === 'POST' && r.url().includes('/api/reports/'),
        { timeout: 150_000 },
      )
      .catch(() => null);

    await reportScreenPage.clickSend();

    const response = await responsePromise;
    if (response && !response.ok()) {
      const hint = response.status() === 503
        ? 'the report engine is at capacity (all render slots busy) — see uc-rpt-010 defects.md #4'
        : 'the report engine failed to render — check that JasperServer is up';
      throw new Error(
        `Report generation returned HTTP ${response.status()} for ${new URL(response.url()).pathname}: ${hint}.`,
      );
    }

    const download = await downloadPromise;

    const failure = await download.failure();
    expect(failure, `the report download failed: ${failure}`).toBeNull();

    world.reportDownloadFilename = download.suggestedFilename();
    world.reportDownloadPath = (await download.path()) ?? undefined;
  },
);

/**
 * The generated filename contract. `ReportService.buildFetchResponse` names the file from the
 * `ReportEmailService.buildFilename(requestId, mediaType)` pair, and the requestId is a UUID — so a real
 * report arrives as `<uuid>.pdf` / `<uuid>.xls`, NOT a friendly report name. Verified against the running
 * stack 2026-08-11 (e.g. `inline; filename="e0beac07-32f7-4835-855b-199796bb6c6e.pdf"`). Asserting the
 * shape rather than a literal is what makes this stable while still pinning both halves: a UUID stem
 * (proving the per-request id reached the header) and the extension the chosen format implies.
 */
Then(
  'the downloaded report is named with the request id and the extension {string}',
  async ({ world }, extension: string) => {
    const pattern = new RegExp(
      `^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\\.${extension}$`,
      'i',
    );
    expect(world.reportDownloadFilename, 'downloaded report filename').toMatch(pattern);
  },
);

/**
 * Assert the downloaded file really is the format its extension claims, by its magic bytes:
 *   PDF → the ASCII header `%PDF-`
 *   XLS → the OLE2 / MS compound-file signature D0 CF 11 E0 A1 B1 1A E1 (what JasperServer emits for
 *         `application/vnd.ms-excel`, confirmed by probing the stack 2026-08-11)
 * This is the assertion that would catch the genuinely confusing bug: a response whose Content-Type or
 * filename says one format while the bytes are the other — the file downloads "successfully" and then
 * fails to open.
 *
 * The size floor is deliberately loose. The smallest real report observed was ~47KB, and even a render over
 * an EMPTY result set came back ~50KB (Jasper still lays out the headings), so 10KB cannot fail on a data
 * change — it only catches a truncated or empty body. XLS gets a lower floor because its smallest real
 * output was ~7.6KB.
 */
const MAGIC: Record<string, { bytes: Buffer; minBytes: number; label: string }> = {
  pdf: { bytes: Buffer.from('%PDF-', 'ascii'), minBytes: 10_000, label: 'a PDF' },
  xls: {
    bytes: Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]),
    minBytes: 3_000,
    label: 'an OLE2 Excel workbook',
  },
};

Then('the downloaded report is a real {string} file', async ({ world }, format: string) => {
  const expected = MAGIC[format];
  expect(expected, `unknown report format "${format}" — known: ${Object.keys(MAGIC).join(', ')}`)
    .toBeDefined();

  expect(world.reportDownloadPath, 'the download was not saved to disk').toBeTruthy();

  const contents = await readFile(world.reportDownloadPath!);

  expect(
    contents.length,
    `the downloaded report is only ${contents.length} bytes — expected a real ${format.toUpperCase()} report`,
  ).toBeGreaterThan(expected.minBytes);

  const header = contents.subarray(0, expected.bytes.length);
  expect(
    header.equals(expected.bytes),
    `the downloaded file does not start with the signature for ${expected.label} `
      + `(got ${header.toString('hex')}, expected ${expected.bytes.toString('hex')})`,
  ).toBe(true);
});

// ------------------------------------------------------------------------------- stubbed-engine delivery

/**
 * Fault/stub injection — see the `reportRequests` fixture docstring. Fakes ONLY the env-blocked Jasper
 * RESPONSE so the app's real post-response delivery logic becomes reachable. Register before submitting.
 */
Given('the report engine returns a PDF named {string}', async ({ reportRequests }, filename: string) => {
  reportRequests.stubPdf(filename);
});

Given('the report engine returns a PDF with no filename header', async ({ reportRequests }) => {
  reportRequests.stubPdf();
});

/**
 * Fault injection for the submit-error branch. This used to need no faking at all — every report endpoint
 * returned HTTP 500 in this environment. Since the local report engine started working (2026-08-11) a real
 * submit succeeds, so the failure has to be injected (same `route.fulfill` pattern as
 * `pages/rsk/ScalerRiskAssessmentSearchPage.failSearchWith500`).
 */
Given('the report engine fails', async ({ reportRequests }) => {
  reportRequests.failWith500();
});

When('I submit the report and capture the download', async ({ reportScreenPage, world }) => {
  const downloadPromise = reportScreenPage.page.waitForEvent('download', { timeout: 30000 });
  await reportScreenPage.clickSend();
  const download = await downloadPromise;
  world.reportDownloadFilename = download.suggestedFilename();
});

Then('the downloaded report file is named {string}', async ({ world }, expected: string) => {
  expect(world.reportDownloadFilename).toBe(expected);
});

/**
 * Prove-the-negative for the email-delivery branch: with Preview=No AND a recipient, the page must NOT
 * download (it shows "Report request submitted" instead). Bounded wait — a download that never fires can
 * only be observed by waiting a little, so this races the event against a short timeout on purpose.
 */
When('I submit the report expecting no download', async ({ reportScreenPage, reportRequests }) => {
  // Used only by the email-delivery generation scenario, which needs the REAL backend: the whole point is
  // the genuine 202 ack (the render is handed to a background executor), which a stub cannot demonstrate.
  reportRequests.useRealEngine();

  let downloaded = false;
  const watcher = reportScreenPage.page
    .waitForEvent('download', { timeout: 5000 })
    .then(() => {
      downloaded = true;
    })
    .catch(() => {
      /* the expected outcome: no download event within the window */
    });

  await reportScreenPage.clickSend();
  await watcher;

  expect(downloaded, 'a report download was offered but email delivery was requested').toBe(false);
});

// --------------------------------------------------------------------------------- outcome (Then) — UI

Then('the report options show the error {string}', async ({ reportScreenPage }, message: string) => {
  await expect(reportScreenPage.emailError).toHaveText(message, { timeout: 30000 });
});

/** ReportPage clears `validationError` via a useEffect as soon as the offending input becomes valid. */
Then('the report options error is cleared', async ({ reportScreenPage }) => {
  await expect(reportScreenPage.emailError).toHaveCount(0, { timeout: 30000 });
});

/**
 * One step for BOTH per-field and cross-field date messages, because the app renders them in the same place:
 * `validateReportDateRange` mirrors its cross-field `rangeError` onto `toError`, so an inverted window or an
 * over-cap range surfaces as the To field's own requirement text. There is no separate form-level banner —
 * an earlier version of these screens had one, and the suite briefly asserted it through a
 * `p[role="alert"]` locator that now matches only the email error. (The one `role="alert"` paragraph left
 * under the Reports tab belongs to `ReportOutputOptions`, asserted by the report-options steps above.)
 */
Then(
  'the report date {string} shows the error {string}',
  async ({ reportScreenPage }, controlId: string, message: string) => {
    await expect(reportScreenPage.dateFieldError(controlId)).toHaveText(message, { timeout: 30000 });
  },
);

/** DateInput renders its `.cds--form-requirement` message only while `invalid` — so cleared = absent. */
Then('the report date {string} shows no error', async ({ reportScreenPage }, controlId: string) => {
  await expect(reportScreenPage.dateFieldError(controlId)).toHaveCount(0, { timeout: 30000 });
});

/**
 * A non-date parameter's own invalid message. Distinct from the report-options error (which is the shared
 * `ReportOutputOptions` banner) and from the date steps (same markup, but the date wording carries the
 * cross-field rule): this asserts a message rendered UNDER the named control, which is what makes an
 * unknown Scale Site # point at the Scale Site # field rather than at the form.
 */
Then(
  'the report parameter {string} shows the error {string}',
  async ({ reportScreenPage }, controlId: string, message: string) => {
    await expect(reportScreenPage.fieldError(controlId)).toHaveText(message, { timeout: 30000 });
  },
);

/**
 * A multi-value field's "does not exist" message — the legacy existence checks on the mark / site fields,
 * which render under that field (see `ReportScreenPage.multiValueError`), not as a form-level banner.
 */
Then(
  'the report field {string} shows the error {string}',
  async ({ reportScreenPage }, controlId: string, message: string) => {
    await expect(reportScreenPage.multiValueError(controlId)).toHaveText(message, { timeout: 30000 });
  },
);

/** Carbon renders `.cds--form-requirement` only while the control is `invalid` — so cleared = absent. */
Then('the report parameter {string} shows no error', async ({ reportScreenPage }, controlId: string) => {
  await expect(reportScreenPage.fieldError(controlId)).toHaveCount(0, { timeout: 30000 });
});

Then('the report shows the success message {string}', async ({ reportScreenPage }, message: string) => {
  await expect(reportScreenPage.successBanner).toContainText(message, { timeout: 30000 });
});

/** The Scale Site Compliance guard renders this INSTEAD of the form when the route id is not numeric. */
Then('the report shows the invalid-inspection error', async ({ reportScreenPage }) => {
  await expect(reportScreenPage.errorBanner).toContainText(
    'A valid site inspection is required to generate this report.',
    { timeout: 30000 },
  );
});

Then('the report shows the submit error', async ({ reportScreenPage }) => {
  await expect(reportScreenPage.errorBanner).toContainText('Unable to submit report', {
    timeout: 30000,
  });
});

Then(
  'the report parameter {string} has the value {string}',
  async ({ reportScreenPage }, controlId: string, expected: string) => {
    await expect(reportScreenPage.page.locator(`#${controlId}`)).toHaveValue(expected, {
      timeout: 30000,
    });
  },
);

Then('the report value {string} is no longer listed in {string}', async (
  { reportScreenPage },
  value: string,
  controlId: string,
) => {
  await expect(reportScreenPage.multiValuePill(controlId, value)).toHaveCount(0);
});

// ------------------------------------------------------------------------- outcome (Then) — the request

Then('no report request should be sent', async ({ reportScreenPage, reportRequests }) => {
  expect(reportRequests.callsFor(reportScreenPage.spec.endpoint)).toHaveLength(0);
});

Then('one report request should be sent', async ({ reportScreenPage, reportRequests }) => {
  await expect
    .poll(() => reportRequests.callsFor(reportScreenPage.spec.endpoint).length, { timeout: 30000 })
    .toBe(1);
});

/**
 * Assert fields of the payload the screen built. The table is `| field | value |`, and each expected value
 * is JSON-parsed so the assertion is TYPE-EXACT — which matters, because these payloads deliberately mix
 * types (`preview` is a boolean, the sort codes are numbers, `regDist` is a string):
 *
 *   ALL, DCC, MARK   → the string (not valid JSON, so used verbatim)
 *   true / false     → boolean
 *   1 / 0            → number
 *   "520"            → the STRING "520" — quote a digits-only value whose payload field is a string
 *                      (e.g. `scaleSiteNumber`), otherwise it parses to the number 520 and the assertion
 *                      fails on type alone
 *   (absent)         → the key must be OMITTED from the body. The screens send `undefined` for empty
 *                      optional parameters and JSON.stringify drops those keys, so "absent" is a real,
 *                      meaningful outcome distinct from an empty string — this is what keeps the flat
 *                      six-slot contracts (siteMark1..6, mark1..6, site1..6) honest.
 */
Then(
  'the report request payload includes:',
  async ({ reportScreenPage, reportRequests }, table: DataTable) => {
    const endpoint = reportScreenPage.spec.endpoint;
    await expect
      .poll(() => reportRequests.callsFor(endpoint).length, { timeout: 30000 })
      .toBeGreaterThan(0);

    const payload = reportRequests.callsFor(endpoint).at(-1)!.body;

    for (const [field, rawExpected] of table.rows()) {
      if (rawExpected === '(absent)') {
        expect(payload, `payload key "${field}" should be absent`).not.toHaveProperty(field);
        continue;
      }

      let expected: unknown = rawExpected;
      try {
        const parsed = JSON.parse(rawExpected);
        // Only accept the parse if it ROUND-TRIPS. A timber mark or site number shaped like a JSON number
        // literal (`12E3`, `1e5`, `007`) parses to a number that no longer reads as what the table said, and
        // these payload fields are strings — so a non-round-tripping parse means the cell was meant verbatim.
        // `1`/`0`/`true`/`false` and quoted `"520"` all round-trip, so the type-exactness above is unaffected.
        expected = JSON.stringify(parsed) === rawExpected ? parsed : rawExpected;
      } catch {
        // Not JSON — compare as the raw string (e.g. ALL, DCC, MARK).
      }

      expect(payload[field], `payload field "${field}"`).toEqual(expected);
    }
  },
);
