import { DEPENDENT_EXAM_UPGRADE } from '../../../../fixtures/admin/maintenance/exam-upgrade-test-data';
import { Given, When } from '../../../fixtures';

/** MNT navigation + seeding steps for Maintain Exam Upgrades (UC-MNT-002). Distinct vocabulary. */

Given('I am on the Exam Upgrades list', async ({ examUpgradesPage }) => {
  await examUpgradesPage.goto();
});

Given('a disposable exam upgrade exists', async ({ seedExamUpgrade, world }) => {
  const { classCode, typeId, body } = await seedExamUpgrade('fixture');
  world.examUpgradeClassCode = classCode;
  world.examUpgradeTypeId = typeId;
  world.examUpgradeBody = body;
});

Given('an exam upgrade with dependent records exists', async ({ world }) => {
  // A real, pre-seeded composite key with scaler_training children (see fixture provenance). Its DELETE
  // is rejected and the row survives, so this is read-only / parallel-safe — no seed needed.
  world.examUpgradeClassCode = DEPENDENT_EXAM_UPGRADE.classCode;
  world.examUpgradeTypeId = DEPENDENT_EXAM_UPGRADE.typeId;
});

When('I open the exam upgrade create form', async ({ examUpgradesPage }) => {
  await examUpgradesPage.openCreate();
});

When('I open the exam upgrade for view', async ({ examUpgradesPage, world }) => {
  if (!world.examUpgradeTypeId) throw new Error('[step] no exam/upgrade typeId in world — seed one first');
  await examUpgradesPage.openView(world.examUpgradeTypeId);
});

When('I open the exam upgrade edit form', async ({ examUpgradesPage }) => {
  await examUpgradesPage.openEdit();
});
