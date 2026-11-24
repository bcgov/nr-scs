import type { ConditionsPage } from '../../../../pages/admin/maintenance/ConditionsPage';
import { daysAgo } from '../../../../fixtures/common/dates';
import { type ConditionBody, buildConditionBody } from '../../../../fixtures/admin/maintenance/condition-test-data';
import { When } from '../../../fixtures';

/** SSC form-entry steps for the Maintain Conditions create/edit modal. */

type ConditionWorld = { conditionBody?: ConditionBody; conditionClassCode?: string };

async function enterCondition(conditionsPage: ConditionsPage, world: ConditionWorld, classCode: string): Promise<void> {
  const body = buildConditionBody('create', classCode);
  world.conditionBody = body;
  world.conditionClassCode = body.classCode;
  await conditionsPage.selectType(body.classCode);
  await conditionsPage.fillField('Title', body.title);
  await conditionsPage.selectMandatory(body.ministryStandardInd);
  await conditionsPage.fillField('Sort Order', body.sortOrderNo);
  await conditionsPage.setDate('Effective Date', body.effectiveDate);
  await conditionsPage.setDate('Expiry Date', body.expiryDate);
  await conditionsPage.fillField('Condition Text', body.desc);
  // SIA shows + requires Site Type; MSD hides it; SCA shows+requires it at the client but the server
  // forbids it (Divergence #1), so the SCA path deliberately leaves it empty.
  for (const label of body.siteTypeLabels) {
    await conditionsPage.addSiteType(label);
  }
}

When('I enter a valid condition', async ({ conditionsPage, world }) => {
  await enterCondition(conditionsPage, world, 'SIA');
});

When('I enter a valid condition of type {string}', async ({ conditionsPage, world }, classCode: string) => {
  await enterCondition(conditionsPage, world, classCode);
});

When('I clear the condition {string} field', async ({ conditionsPage, world }, field: string) => {
  const body = world.conditionBody;
  switch (field) {
    case 'Type':
      await conditionsPage.selectType('');
      if (body) body.classCode = '';
      break;
    case 'Title':
      await conditionsPage.fillField('Title', '');
      if (body) body.title = '';
      break;
    case 'Mandatory?':
      await conditionsPage.selectMandatory('');
      break;
    case 'Sort Order':
      await conditionsPage.fillField('Sort Order', '');
      if (body) body.sortOrderNo = '';
      break;
    case 'Effective Date':
      await conditionsPage.setDate('Effective Date', '');
      if (body) body.effectiveDate = '';
      break;
    case 'Condition Text':
      await conditionsPage.fillField('Condition Text', '');
      if (body) body.desc = '';
      break;
    case 'Site Type':
      await conditionsPage.clearSiteTypes();
      if (body) body.siteMethodTypeCodes = [];
      break;
    default:
      throw new Error(`[step] clearing condition "${field}" is not supported`);
  }
});

When('I set the condition {string} field to {string}', async ({ conditionsPage, world }, field: string, value: string) => {
  const body = world.conditionBody;
  if (field === 'Title') {
    await conditionsPage.fillField('Title', value);
    if (body) body.title = value;
  } else if (field === 'Condition Text') {
    await conditionsPage.fillField('Condition Text', value);
    if (body) body.desc = value;
  } else if (field === 'Sort Order') {
    await conditionsPage.fillField('Sort Order', value);
    if (body) body.sortOrderNo = value;
  } else {
    throw new Error(`[step] setting condition "${field}" by text is not supported`);
  }
});

When('I set the condition Effective Date after its Expiry Date', async ({ conditionsPage }) => {
  await conditionsPage.setDate('Effective Date', daysAgo(1));
  await conditionsPage.setDate('Expiry Date', daysAgo(10));
});

When('I save the condition', async ({ conditionsPage }) => {
  await conditionsPage.save();
});
