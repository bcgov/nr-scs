import { DEPENDENT_CONDITION } from '../../../../fixtures/admin/maintenance/condition-test-data';
import { Given, When } from '../../../fixtures';

/** SSC navigation + seeding steps for Maintain Conditions (UC-SSC-002). Distinct vocabulary. */

Given('I am on the Conditions list', async ({ conditionsPage }) => {
  await conditionsPage.goto();
});

// Seeds an MSD condition (MSD has no Site Type + only ~16 real rows) so the class filter + page-size 50
// puts it on a single page — deterministically reachable under fullyParallel.
Given('a disposable condition exists', async ({ seedCondition, world }) => {
  const { classCode, id, body } = await seedCondition('fixture', 'MSD');
  world.conditionClassCode = classCode;
  world.conditionId = id;
  world.conditionBody = body;
});

Given('a condition with dependent records exists', async ({ world }) => {
  // A real, pre-seeded MSD condition with hauling_mark_site_condition children (see fixture provenance).
  // Its DELETE is blocked (dependentChildExists=true) and it is never mutated -> read-only / parallel-safe.
  world.conditionClassCode = DEPENDENT_CONDITION.classCode;
  world.conditionId = DEPENDENT_CONDITION.id;
});

When('I open the condition create form', async ({ conditionsPage }) => {
  await conditionsPage.openCreate();
});

When('I open the condition for view', async ({ conditionsPage, world }) => {
  if (!world.conditionClassCode || !world.conditionId) {
    throw new Error('[step] no condition key in world — seed one first');
  }
  await conditionsPage.openViewInClass(world.conditionClassCode, world.conditionId);
});

When('I open the condition edit form', async ({ conditionsPage }) => {
  await conditionsPage.openEdit();
});
