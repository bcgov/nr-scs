import { daysAgo } from '../../../../fixtures/common/dates';
import { buildAuthClauseBody } from '../../../../fixtures/admin/maintenance/authorization-clause-test-data';
import { When } from '../../../fixtures';

/** SSC form-entry steps for the Maintain Authorization Clauses create/edit modal. */

When('I enter a valid authorization clause', async ({ authorizationClausesPage, world }) => {
  const body = buildAuthClauseBody('create');
  world.authClauseBody = body;
  world.authClauseMethodCode = body.scaleMethodTypeCode;
  await authorizationClausesPage.selectScaleMethod(body.scaleMethodTypeCode);
  await authorizationClausesPage.fillField('Clause', body.scalerAuthorizationClause);
  await authorizationClausesPage.setDate('Effective Date', body.effectiveDate);
  await authorizationClausesPage.setDate('Expiry Date', body.expiryDate);
});

When('I clear the authorization clause {string} field', async ({ authorizationClausesPage, world }, field: string) => {
  if (field === 'Scale Method') {
    await authorizationClausesPage.selectScaleMethod('');
    if (world.authClauseBody) world.authClauseBody.scaleMethodTypeCode = '';
  } else if (field === 'Effective Date' || field === 'Expiry Date') {
    await authorizationClausesPage.setDate(field, '');
    if (world.authClauseBody) world.authClauseBody[field === 'Effective Date' ? 'effectiveDate' : 'expiryDate'] = '';
  } else if (field === 'Clause') {
    await authorizationClausesPage.fillField('Clause', '');
    if (world.authClauseBody) world.authClauseBody.scalerAuthorizationClause = '';
  } else {
    throw new Error(`[step] clearing authorization clause "${field}" is not supported`);
  }
});

When('I set the authorization clause {string} field to {string}', async ({ authorizationClausesPage, world }, field: string, value: string) => {
  if (field === 'Clause') {
    await authorizationClausesPage.fillField('Clause', value);
    if (world.authClauseBody) world.authClauseBody.scalerAuthorizationClause = value;
  } else {
    throw new Error(`[step] setting authorization clause "${field}" by text is not supported`);
  }
});

// For the >200-char divergence: the client has no length guard, so this POSTs to the backend, where the
// DB column length rejects it. Enter a clause text of the given length (unique prefix keeps it valid
// otherwise).
When('I enter an authorization clause of {int} characters', async ({ authorizationClausesPage, world }, length: number) => {
  const text = 'X'.repeat(length);
  await authorizationClausesPage.selectScaleMethod('P');
  await authorizationClausesPage.fillField('Clause', text);
  await authorizationClausesPage.setDate('Effective Date', daysAgo(1));
  if (world.authClauseBody) {
    world.authClauseBody.scaleMethodTypeCode = 'P';
    world.authClauseBody.scalerAuthorizationClause = text;
  }
});

When('I set the authorization clause Effective Date after its Expiry Date', async ({ authorizationClausesPage }) => {
  await authorizationClausesPage.setDate('Effective Date', daysAgo(1));
  await authorizationClausesPage.setDate('Expiry Date', daysAgo(10));
});

When('I save the authorization clause', async ({ authorizationClausesPage }) => {
  await authorizationClausesPage.save();
});
