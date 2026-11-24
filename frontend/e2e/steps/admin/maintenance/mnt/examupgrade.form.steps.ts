import { daysAgo } from '../../../../fixtures/common/dates';
import { buildExamUpgradeBody } from '../../../../fixtures/admin/maintenance/exam-upgrade-test-data';
import { When } from '../../../fixtures';

/** MNT form-entry steps for the Maintain Exam Upgrades create/edit modal. */

When('I enter a valid exam upgrade', async ({ examUpgradesPage, world }) => {
  const body = buildExamUpgradeBody('create');
  world.examUpgradeBody = body;
  world.examUpgradeClassCode = body.classCode;
  await examUpgradesPage.selectType(body.classCode);
  await examUpgradesPage.selectLicenceAccredit(body.licenceAccreditInd);
  await examUpgradesPage.fillField('Description', body.description);
  await examUpgradesPage.setDate('Effective Date', body.effectiveDate);
  await examUpgradesPage.setDate('Expiry Date', body.expiryDate);
});

When('I clear the exam upgrade {string} field', async ({ examUpgradesPage, world }, field: string) => {
  if (field === 'Type') {
    await examUpgradesPage.selectType('');
    if (world.examUpgradeBody) world.examUpgradeBody.classCode = '';
  } else if (field === 'Licence Accredit?') {
    await examUpgradesPage.selectLicenceAccredit('');
  } else if (field === 'Effective Date' || field === 'Expiry Date') {
    await examUpgradesPage.setDate(field, '');
    if (world.examUpgradeBody) world.examUpgradeBody[field === 'Effective Date' ? 'effectiveDate' : 'expiryDate'] = '';
  } else if (field === 'Description') {
    await examUpgradesPage.fillField('Description', '');
    if (world.examUpgradeBody) world.examUpgradeBody.description = '';
  }
});

When('I set the exam upgrade {string} field to {string}', async ({ examUpgradesPage, world }, field: string, value: string) => {
  if (field === 'Description') {
    await examUpgradesPage.fillField('Description', value);
    if (world.examUpgradeBody) world.examUpgradeBody.description = value;
  } else {
    throw new Error(`[step] setting exam/upgrade "${field}" by text is not supported`);
  }
});

When('I set the exam upgrade Effective Date after its Expiry Date', async ({ examUpgradesPage }) => {
  await examUpgradesPage.setDate('Effective Date', daysAgo(1));
  await examUpgradesPage.setDate('Expiry Date', daysAgo(10));
});

When('I save the exam upgrade', async ({ examUpgradesPage }) => {
  await examUpgradesPage.save();
});
