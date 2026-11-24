import type { TemplatesPage } from '../../../../pages/admin/maintenance/TemplatesPage';
import {
  BINDABLE_MSD_CONDITION,
  buildTemplateBody,
  buildTemplateNameOfLength,
  TEMPLATE_REG_DIST_ALT,
  type TemplateBody,
} from '../../../../fixtures/admin/maintenance/template-test-data';
import { When, Then } from '../../../fixtures';

/** CCQ form-entry steps for the Maintain Templates create/edit modal. */

type TemplateWorld = { templateBody?: TemplateBody };

async function enterTemplate(templatesPage: TemplatesPage, world: TemplateWorld, classCode: string): Promise<void> {
  const body = buildTemplateBody('create', classCode);
  world.templateBody = body;
  await templatesPage.fillName(body.scaleAuthTemplateName);
  await templatesPage.selectType(body.scaleConditionClassCode);
  await templatesPage.selectRegDist(body.orgUnitCode);
}

When('I enter a valid template', async ({ templatesPage, world }) => {
  await enterTemplate(templatesPage, world, 'MSD');
});

When('I enter a valid template of type {string}', async ({ templatesPage, world }, classCode: string) => {
  await enterTemplate(templatesPage, world, classCode);
});

When('I bind a condition to the template', async ({ templatesPage }) => {
  await templatesPage.bindCondition(BINDABLE_MSD_CONDITION.id);
});

When('I clear the template {string} field', async ({ templatesPage, world }, field: string) => {
  const body = world.templateBody;
  switch (field) {
    case 'Template Name':
      await templatesPage.fillName('');
      if (body) body.scaleAuthTemplateName = '';
      break;
    case 'Type':
      await templatesPage.selectType('');
      if (body) body.scaleConditionClassCode = '';
      break;
    case 'Reg / Dist':
      await templatesPage.selectRegDist('');
      break;
    default:
      throw new Error(`[step] clearing template "${field}" is not supported`);
  }
});

When('I set the template Name field to {string}', async ({ templatesPage, world }, value: string) => {
  await templatesPage.fillName(value);
  if (world.templateBody) world.templateBody.scaleAuthTemplateName = value;
});

// Over-length name: the client has NO length guard, so this reaches the backend (which rejects >100).
When('I enter a template name of {int} characters', async ({ templatesPage, world }, len: number) => {
  const name = buildTemplateNameOfLength(len);
  await templatesPage.fillName(name);
  if (world.templateBody) world.templateBody.scaleAuthTemplateName = name;
});

// Enter ONLY a name (leaves Type + Reg/Dist blank) so the required-field gating can be asserted.
When('I enter a template name only', async ({ templatesPage, world }) => {
  const body = buildTemplateBody('gating', 'MSD');
  // record the name for a later "not persisted" read-back if the scenario needs it
  world.templateBody = { ...body, scaleConditionClassCode: '', orgUnitCode: '', orgUnitNo: 0 };
  await templatesPage.fillName(body.scaleAuthTemplateName);
});

When('I save the template', async ({ templatesPage }) => {
  await templatesPage.save();
});

When('I reset the template form', async ({ templatesPage }) => {
  await templatesPage.reset();
});

When('I go back from the template form', async ({ templatesPage }) => {
  await templatesPage.back();
});

Then('the Template Name field should be blank', async ({ templatesPage }) => {
  await templatesPage.expectViewValue('#tmpl-name', '');
});

Then('the template Save button should be disabled', async ({ templatesPage }) => {
  await templatesPage.expectSaveDisabled();
});

Then('the template Save button should be enabled', async ({ templatesPage }) => {
  await templatesPage.expectSaveEnabled();
});

// Edit-mode Reset restores the LOADED record, so the comparand is the seeded snapshot — not
// world.templateBody, which the "set the template Name field" step above has already overwritten.
Then("the Template Name field should show the template's saved name", async ({ templatesPage, world }) => {
  const original = world.originalTemplateBody;
  if (!original) throw new Error('[verify] no originalTemplateBody in world — seed a template first');
  await templatesPage.expectViewValue('#tmpl-name', original.scaleAuthTemplateName);
});

When('I unbind the condition from the template', async ({ templatesPage }) => {
  await templatesPage.unbindCondition(BINDABLE_MSD_CONDITION.id);
});

// Guards the unbind scenario against a false pass: if the edit form opened with the box already clear,
// "unbind then save" would assert nothing. Anchors the state before the When acts on it.
Then('the condition should already be bound on the form', async ({ templatesPage }) => {
  await templatesPage.expectConditionChecked(BINDABLE_MSD_CONDITION.id, true);
});

When('I change the template {string} field to the alternate district', async ({ templatesPage, world }, field: string) => {
  if (field !== 'Reg / Dist') throw new Error(`[step] alternate-district change is only defined for Reg / Dist, got "${field}"`);
  await templatesPage.selectRegDist(TEMPLATE_REG_DIST_ALT.orgUnitCode);
  if (world.templateBody) {
    world.templateBody.orgUnitCode = TEMPLATE_REG_DIST_ALT.orgUnitCode;
    world.templateBody.orgUnitNo = TEMPLATE_REG_DIST_ALT.orgUnitNo;
  }
});
