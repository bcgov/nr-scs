import { buildSignatureBlockBody } from '../../../../fixtures/admin/maintenance/signature-block-test-data';
import { When } from '../../../fixtures';

/**
 * MNT form-entry steps for the Maintain Signatories create/edit modal. All DOM access is delegated to the
 * page object; the pinned builder supplies known-good values (valid Reg/Dist, <=40-char names).
 */

/** Visible label -> world.signatureBlockBody key, so field-setting steps keep the read-back comparand in sync. */
const BODY_KEY_BY_LABEL: Record<string, keyof ReturnType<typeof buildSignatureBlockBody>> = {
  'First Name': 'firstName',
  'Middle Name': 'middleName',
  'Last Name': 'lastName',
  Position: 'signatureTitle',
};

When('I enter a valid signatory', async ({ signatureBlocksPage, world }) => {
  const body = buildSignatureBlockBody('create');
  world.signatureBlockBody = body;
  await signatureBlocksPage.fillField('First Name', body.firstName);
  await signatureBlocksPage.fillField('Last Name', body.lastName);
  await signatureBlocksPage.fillField('Position', body.signatureTitle);
  await signatureBlocksPage.selectRegDist(body.orgUnitCode);
});

When('I clear the signatory {string} field', async ({ signatureBlocksPage, world }, field: string) => {
  if (field === 'Reg / Dist') {
    await signatureBlocksPage.selectRegDist('');
  } else {
    await signatureBlocksPage.fillField(field, '');
  }
  const key = BODY_KEY_BY_LABEL[field];
  if (key && world.signatureBlockBody) (world.signatureBlockBody as Record<string, unknown>)[key] = '';
});

When('I set the signatory {string} field to {string}', async ({ signatureBlocksPage, world }, field: string, value: string) => {
  await signatureBlocksPage.fillField(field, value);
  const key = BODY_KEY_BY_LABEL[field];
  if (key && world.signatureBlockBody) (world.signatureBlockBody as Record<string, unknown>)[key] = value;
});

When('I set the signatory {string} field to a 41-character string', async ({ signatureBlocksPage }, field: string) => {
  await signatureBlocksPage.fillField(field, 'A'.repeat(41));
});

When('I save the signatory', async ({ signatureBlocksPage }) => {
  await signatureBlocksPage.save();
});
