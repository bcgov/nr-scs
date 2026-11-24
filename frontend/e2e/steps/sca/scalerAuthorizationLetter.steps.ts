import { Given, When, Then, expect } from '../fixtures';
import { scalerAuthSampleId } from '../../fixtures/sca/sca-test-data';

/**
 * UC-RPT-007 — Scaler Authorization Letter Options (client-side validation only). DOM in
 * pages/sca/ScalerAuthorizationLetterPage. Route /scaler-authorizations/{id}/letter (shared
 * LetterOptionsPage/ReportPage). Opens the READ-ONLY sample record `scalerAuthSampleId` (3071) — the
 * email/preview/signature validations all run BEFORE the generate POST, so submitting an invalid form
 * mutates nothing and sends no letter request (asserted via `scalerAuthLetterCalls`). Letter GENERATION
 * (POST → Jasper) and stored-letter VIEW are env/data-blocked — see defects.md.
 *
 * Distinct step phrasing ("scaler letter") so these do not collide with the MSD letter steps
 * (steps/rpt/…): both drive the same shared form, but the prove-negative spy is domain-specific.
 */

Given('I open the scaler authorization letter options', async ({ scalerAuthorizationLetterPage }) => {
  await scalerAuthorizationLetterPage.open(scalerAuthSampleId);
});

When('I set the scaler letter email recipient to {string}', async ({ scalerAuthorizationLetterPage }, value: string) => {
  await scalerAuthorizationLetterPage.setEmail(value);
});

When('I set the scaler letter Preview Report to No', async ({ scalerAuthorizationLetterPage }) => {
  await scalerAuthorizationLetterPage.setPreviewNo();
});

When('I clear the scaler letter signature block', async ({ scalerAuthorizationLetterPage }) => {
  await scalerAuthorizationLetterPage.clearSignatureBlock();
});

When('I submit the scaler letter options', async ({ scalerAuthorizationLetterPage }) => {
  await scalerAuthorizationLetterPage.clickSend();
});

Then('the scaler letter shows the email error {string}', async ({ scalerAuthorizationLetterPage }, message: string) => {
  await expect(scalerAuthorizationLetterPage.emailError).toHaveText(message);
});

Then('the scaler letter shows the error {string}', async ({ scalerAuthorizationLetterPage }, message: string) => {
  await expect(scalerAuthorizationLetterPage.formError(message)).toBeVisible();
});

Then('no scaler letter request should be sent', async ({ scalerAuthLetterCalls }) => {
  // Give any (erroneous) in-flight POST a beat to register before asserting the negative.
  await expect.poll(() => scalerAuthLetterCalls()).toBe(0);
});
