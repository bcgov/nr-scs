import { Given, When } from '../../../fixtures';

/**
 * MNT navigation + seeding steps for Maintain Signatories / Signature Blocks (UC-MNT-001). Distinct
 * "signatory" vocabulary keeps every phrase bound to exactly one definition (no collision with the
 * appointment-type or CCQ steps).
 */

Given('I am on the Signatories list', async ({ signatureBlocksPage }) => {
  await signatureBlocksPage.goto();
});

Given('a disposable signatory exists', async ({ seedSignatureBlock, world }) => {
  const { id, body } = await seedSignatureBlock('fixture');
  world.signatoryId = id;
  world.signatureBlockBody = body;
});

When('I open the signatory create form', async ({ signatureBlocksPage }) => {
  await signatureBlocksPage.openCreate();
});

When('I open the signatory for view', async ({ signatureBlocksPage, world }) => {
  if (!world.signatoryId) throw new Error('[step] no signatory id in world — seed one first');
  await signatureBlocksPage.openView(world.signatoryId);
});

When('I open the signatory edit form', async ({ signatureBlocksPage }) => {
  await signatureBlocksPage.openEdit();
});
