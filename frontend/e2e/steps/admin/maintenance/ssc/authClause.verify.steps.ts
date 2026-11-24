import type { APIRequestContext } from '@playwright/test';

import { CREATE_SCALE_METHOD_LABEL } from '../../../../fixtures/admin/maintenance/authorization-clause-test-data';
import { Then, expect } from '../../../fixtures';

/**
 * SSC read-back / state assertions for Maintain Authorization Clauses. Read-back is by the COMPOSITE key
 * GET /api/auth-clauses/{methodCode}/{clauseId}; the server-assigned clause id is read from the view.
 */

type AuthClauseDetail = {
  scaleMethodAuthClauseId: number;
  scaleMethodTypeCode: string;
  scalerAuthorizationClause: string;
  effectiveDate: string;
  expiryDate: string | null;
};

async function fetchByKey(request: APIRequestContext, methodCode: string, clauseId: string): Promise<AuthClauseDetail | undefined> {
  const res = await request.get(`/api/auth-clauses/${encodeURIComponent(methodCode)}/${encodeURIComponent(clauseId)}`);
  if (res.status() === 404) return undefined;
  if (!res.ok()) throw new Error(`[verify] read-back failed: HTTP ${res.status()} — ${await res.text()}`);
  return (await res.json()) as AuthClauseDetail;
}

// Capture the server-assigned clause id from the view (forwarded to on create success), set it in world,
// and register the composite key for cleanup — BEFORE any assertion that might fail.
Then('the created authorization clause is registered for cleanup', async ({ authorizationClausesPage, world, createdAuthClauseKeys }) => {
  const clauseId = await authorizationClausesPage.readCreatedClauseId();
  const methodCode = world.authClauseMethodCode;
  if (!methodCode) throw new Error('[verify] no authClauseMethodCode in world — enter a clause first');
  world.authClauseId = clauseId;
  if (!createdAuthClauseKeys.some((k) => k.methodCode === methodCode && k.clauseId === clauseId)) {
    createdAuthClauseKeys.push({ methodCode, clauseId });
  }
});

Then('the authorization clause should be shown in the view', async ({ authorizationClausesPage, world }) => {
  const body = world.authClauseBody;
  if (!body) throw new Error('[verify] no authClauseBody in world');
  await authorizationClausesPage.expectViewValue('#view-clause-text', body.scalerAuthorizationClause);
});

Then('the authorization clause view should show the seeded values', async ({ authorizationClausesPage, world }) => {
  const body = world.authClauseBody;
  if (!body) throw new Error('[verify] no authClauseBody in world — seed one first');
  await authorizationClausesPage.expectViewValue('#view-clause-text', body.scalerAuthorizationClause);
  await authorizationClausesPage.expectViewValue('#view-clause-type', CREATE_SCALE_METHOD_LABEL);
  await authorizationClausesPage.expectViewValue('#view-clause-effective', body.effectiveDate);
  await authorizationClausesPage.expectViewValue('#view-clause-expiry', body.expiryDate);
});

Then('the saved authorization clause should match the submitted values', async ({ request, world }) => {
  const body = world.authClauseBody;
  const methodCode = world.authClauseMethodCode;
  const clauseId = world.authClauseId;
  if (!body || !methodCode || !clauseId) throw new Error('[verify] missing authClause key/body in world');
  let detail: AuthClauseDetail | undefined;
  await expect
    .poll(
      async () => {
        detail = await fetchByKey(request, methodCode, clauseId);
        return detail?.scalerAuthorizationClause;
      },
      { timeout: 10_000, message: `authorization clause ${methodCode}/${clauseId} did not reflect the submitted values after save` },
    )
    .toBe(body.scalerAuthorizationClause);
  expect(detail!.scaleMethodTypeCode).toBe(body.scaleMethodTypeCode);
  expect(detail!.effectiveDate).toBe(body.effectiveDate);
  expect(detail!.expiryDate).toBe(body.expiryDate);
});

Then('no create-authorization-clause request should be sent', async ({ createAuthClauseCalls }) => {
  expect(createAuthClauseCalls()).toBe(0);
});

Then('no update-authorization-clause request should be sent', async ({ updateAuthClauseCalls }) => {
  expect(updateAuthClauseCalls()).toBe(0);
});

Then('the authorization clause should no longer exist', async ({ request, world }) => {
  const { authClauseMethodCode: methodCode, authClauseId: clauseId } = world;
  if (!methodCode || !clauseId) throw new Error('[verify] no authClause key in world');
  await expect
    .poll(async () => ((await fetchByKey(request, methodCode, clauseId)) ? 1 : 0), {
      timeout: 10_000,
      message: `deleted authorization clause ${methodCode}/${clauseId} still resolves on read-back`,
    })
    .toBe(0);
});
