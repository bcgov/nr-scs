import { BINDABLE_MSD_CONDITION } from '../../../../fixtures/admin/maintenance/template-test-data';
import { Given, When } from '../../../fixtures';

/**
 * CCQ navigation + seeding steps for Maintain Templates (UC-CCQ-003 — Scale Authorization Templates).
 * Distinct "template" vocabulary keeps every phrase bound to exactly one definition (no collision with
 * the CCQ Questions or the SSC condition steps).
 */

Given('I am on the Templates list', async ({ templatesPage }) => {
  await templatesPage.goto();
});

// Seeds an MSD template (MSD is the smallest Type, so the class filter + page-size 50 puts it on a single
// page — deterministically reachable under fullyParallel).
Given('a disposable template exists', async ({ seedTemplate, world }) => {
  const { id, body } = await seedTemplate('fixture', 'MSD');
  world.templateId = id;
  world.templateBody = body;
  // Snapshot before any form step mutates templateBody (same convention as originalQuestionBody).
  world.originalTemplateBody = { ...body };
});

When('I open the template create form', async ({ templatesPage }) => {
  await templatesPage.openCreate();
});

When('I open the template for view', async ({ templatesPage, world }) => {
  if (!world.templateId || !world.templateBody) {
    throw new Error('[step] no template in world — seed one first');
  }
  await templatesPage.openViewByName(world.templateBody.scaleConditionClassCode, world.templateBody.scaleAuthTemplateName);
});

When('I open the template edit form', async ({ templatesPage }) => {
  await templatesPage.openEdit();
});

When('I filter the templates to type {string}', async ({ templatesPage }, classCode: string) => {
  await templatesPage.narrowToClass(classCode);
});

// Seeds a template that ALREADY has a binding. The unbind and delete-cascade scenarios both need to
// start from bindings that exist — seeding them via the API keeps each test's setup its own.
Given('a disposable template with a bound condition exists', async ({ seedTemplate, world }) => {
  const { id, body } = await seedTemplate('bound', 'MSD', [BINDABLE_MSD_CONDITION.id]);
  world.templateId = id;
  world.templateBody = body;
  world.originalTemplateBody = { ...body };
});
