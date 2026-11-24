import { Given, When } from '../../../fixtures';

/** SSC navigation + seeding steps for Maintain Authorization Clauses (UC-SSC-001). Distinct vocabulary. */

Given('I am on the Authorization Clauses list', async ({ authorizationClausesPage }) => {
  await authorizationClausesPage.goto();
});

Given('a disposable authorization clause exists', async ({ seedAuthClause, world }) => {
  const { methodCode, clauseId, body } = await seedAuthClause('fixture');
  world.authClauseMethodCode = methodCode;
  world.authClauseId = clauseId;
  world.authClauseBody = body;
});

When('I open the authorization clause create form', async ({ authorizationClausesPage }) => {
  await authorizationClausesPage.openCreate();
});

When('I open the authorization clause for view', async ({ authorizationClausesPage, world }) => {
  if (!world.authClauseId) throw new Error('[step] no authorization clause id in world — seed one first');
  await authorizationClausesPage.openView(world.authClauseId);
});

When('I open the authorization clause edit form', async ({ authorizationClausesPage }) => {
  await authorizationClausesPage.openEdit();
});
