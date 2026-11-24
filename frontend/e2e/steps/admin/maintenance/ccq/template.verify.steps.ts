import type { APIRequestContext } from '@playwright/test';

import { BINDABLE_MSD_CONDITION, TEMPLATE_REG_DIST, TEMPLATE_REG_DIST_ALT, TYPE_LABEL } from '../../../../fixtures/admin/maintenance/template-test-data';
import { countTemplateConditionRows } from './templateDbCheck';
import { Then, expect } from '../../../fixtures';

/**
 * CCQ read-back / state assertions for Maintain Templates (UC-CCQ-003). Read-back is by the single PK
 * GET /api/scale-auth-templates/{id}; the server-assigned id is read from the view (#view-template-id).
 * The over-length "not persisted" proof searches by the exact (unique) name.
 */

type TemplateDetail = {
  scaleAuthTemplateId: number;
  scaleAuthTemplateName: string;
  scaleConditionClassCode: string;
  orgUnitNo: number;
  conditions?: Array<{ scaleAuthConditionId?: number | null }> | null;
};

async function fetchById(request: APIRequestContext, id: string): Promise<TemplateDetail | undefined> {
  const res = await request.get(`/api/scale-auth-templates/${encodeURIComponent(id)}`);
  if (res.status() === 404) return undefined;
  if (!res.ok()) throw new Error(`[verify] read-back failed: HTTP ${res.status()} — ${await res.text()}`);
  return (await res.json()) as TemplateDetail;
}

async function searchByName(request: APIRequestContext, name: string): Promise<TemplateDetail[]> {
  const res = await request.get(`/api/scale-auth-templates`, { params: { scaleAuthTemplateName: name } });
  if (!res.ok()) throw new Error(`[verify] search failed: HTTP ${res.status()} — ${await res.text()}`);
  return (await res.json()) as TemplateDetail[];
}

// Capture the server-assigned id from the view (forwarded to on create success), set it in world, and
// register it for cleanup — BEFORE any assertion that might fail.
Then('the created template is registered for cleanup', async ({ templatesPage, world, createdTemplateIds }) => {
  const id = await templatesPage.readCreatedTemplateId();
  world.templateId = id;
  if (!createdTemplateIds.includes(id)) createdTemplateIds.push(id);
});

Then('the template should be shown in the view', async ({ templatesPage, world }) => {
  const body = world.templateBody;
  if (!body) throw new Error('[verify] no templateBody in world');
  await templatesPage.expectViewValue('#view-template-name', body.scaleAuthTemplateName);
});

Then('the template view should show the seeded values', async ({ templatesPage, world }) => {
  const body = world.templateBody;
  if (!body) throw new Error('[verify] no templateBody in world — seed one first');
  await templatesPage.expectViewValue('#view-template-name', body.scaleAuthTemplateName);
  await templatesPage.expectViewValue('#view-template-type', TYPE_LABEL[body.scaleConditionClassCode] ?? body.scaleConditionClassCode);
  await templatesPage.expectViewValue('#view-template-org', TEMPLATE_REG_DIST.description);
});

Then('the saved template should match the submitted values', async ({ request, world }) => {
  const body = world.templateBody;
  const id = world.templateId;
  if (!body || !id) throw new Error('[verify] missing template id/body in world');
  let detail: TemplateDetail | undefined;
  await expect
    .poll(
      async () => {
        detail = await fetchById(request, id);
        return detail?.scaleAuthTemplateName;
      },
      { timeout: 10_000, message: `template ${id} did not reflect the submitted values after save` },
    )
    .toBe(body.scaleAuthTemplateName);
  expect(detail!.scaleConditionClassCode).toBe(body.scaleConditionClassCode);
  expect(detail!.orgUnitNo).toBe(body.orgUnitNo);
});

Then('the saved template should include the bound condition', async ({ request, world }) => {
  const id = world.templateId;
  if (!id) throw new Error('[verify] no template id in world');
  let ids: number[] = [];
  await expect
    .poll(
      async () => {
        const detail = await fetchById(request, id);
        ids = (detail?.conditions ?? []).map((c) => Number(c.scaleAuthConditionId)).filter((n) => !Number.isNaN(n));
        return ids.includes(BINDABLE_MSD_CONDITION.id);
      },
      { timeout: 10_000, message: `template ${id} did not include bound condition ${BINDABLE_MSD_CONDITION.id} (got ${ids.join(',')})` },
    )
    .toBe(true);
});

Then('no create-template request should be sent', async ({ createTemplateCalls }) => {
  expect(createTemplateCalls()).toBe(0);
});

Then('the template should no longer exist', async ({ request, world }) => {
  if (!world.templateId) throw new Error('[verify] no template id in world');
  await expect
    .poll(async () => ((await fetchById(request, world.templateId!)) ? 1 : 0), {
      timeout: 10_000,
      message: `deleted template ${world.templateId} still resolves on read-back`,
    })
    .toBe(0);
});

Then('the template should still exist', async ({ request, world }) => {
  if (!world.templateId) throw new Error('[verify] no template id in world');
  expect(await fetchById(request, world.templateId), `expected template ${world.templateId} to still exist`).toBeTruthy();
});

// Prove-the-negative that nothing was persisted, by searching for the name's unique ≤100-char prefix
// (the search endpoint itself caps the param at 100 chars, so the full over-length name can't be queried;
// the prefix carries the unique uuid, so a match would mean the row exists). Covers both the over-length
// rejection (POST fired, backend rejected) and the Back-discards case (no POST at all).
Then('no template matching the entered name should exist', async ({ request, world }) => {
  const name = world.templateBody?.scaleAuthTemplateName;
  if (!name) throw new Error('[verify] no template name in world');
  const queryable = name.slice(0, 100);
  await expect
    .poll(async () => (await searchByName(request, queryable)).length, {
      timeout: 10_000,
      message: `a template matching "${queryable}" was unexpectedly persisted`,
    })
    .toBe(0);
});

Then('a template save error should be shown', async ({ templatesPage }) => {
  await templatesPage.expectErrorBanner();
});

Then('the seeded template should appear in the filtered list', async ({ page, world }) => {
  const name = world.templateBody?.scaleAuthTemplateName;
  if (!name) throw new Error('[verify] no template name in world');
  await expect(page.getByRole('button', { name, exact: true })).toBeVisible({ timeout: 15_000 });
});

Then('the seeded template should not appear in the filtered list', async ({ page, world }) => {
  const name = world.templateBody?.scaleAuthTemplateName;
  if (!name) throw new Error('[verify] no template name in world');
  await expect(page.getByRole('button', { name, exact: true })).toHaveCount(0, { timeout: 15_000 });
});

Then('the template modal should be closed', async ({ templatesPage }) => {
  await templatesPage.expectModalClosed();
});

// A failed save does NOT forward to the view (onError keeps modalMode='create'), so the create heading is
// still shown — proof the over-length create did not succeed (nothing persisted).
Then('the template create form should still be shown', async ({ templatesPage }) => {
  await expect(templatesPage.modal.getByText('Template - Create')).toBeVisible();
});

Then('no update-template request should be sent', async ({ updateTemplateCalls }) => {
  expect(updateTemplateCalls()).toBe(0);
});

// The spy above proves no PUT left the browser; this proves the stored record still matches the seed, so
// a discarded edit is caught even if it reached the server by some other path.
Then("the stored template should still have its saved name", async ({ request, world }) => {
  const original = world.originalTemplateBody;
  if (!original || !world.templateId) throw new Error('[verify] no seeded template in world');
  await expect
    .poll(async () => (await fetchById(request, world.templateId!))?.scaleAuthTemplateName, {
      timeout: 10_000,
      message: `template ${world.templateId} no longer holds its seeded name — a discarded edit was persisted`,
    })
    .toBe(original.scaleAuthTemplateName);
});

// STA-002 — a template is allowed to exist with nothing bound. The happy path creates one that way, but
// "the create succeeded" does not by itself assert the empty-binding case, so it is stated explicitly
// rather than claimed implicitly in the coverage matrix.
Then('the saved template should have no bound conditions', async ({ request, world }) => {
  const id = world.templateId;
  if (!id) throw new Error('[verify] no template id in world');
  const detail = await fetchById(request, id);
  expect(detail?.conditions ?? [], `template ${id} should have no bound conditions`).toHaveLength(0);
});

Then('the saved template should not include the bound condition', async ({ request, world }) => {
  const id = world.templateId;
  if (!id) throw new Error('[verify] no template id in world');
  await expect
    .poll(
      async () => {
        const detail = await fetchById(request, id);
        return (detail?.conditions ?? []).map((c) => Number(c.scaleAuthConditionId));
      },
      { timeout: 10_000, message: `template ${id} still lists condition ${BINDABLE_MSD_CONDITION.id} after unbinding` },
    )
    .not.toContain(BINDABLE_MSD_CONDITION.id);
});

Then('the saved template should have the alternate district', async ({ request, world }) => {
  const id = world.templateId;
  if (!id) throw new Error('[verify] no template id in world');
  await expect
    .poll(async () => (await fetchById(request, id))?.orgUnitNo, {
      timeout: 10_000,
      message: `template ${id} did not persist the new Reg / Dist`,
    })
    .toBe(TEMPLATE_REG_DIST_ALT.orgUnitNo);
});

// The binding rows outlive the API once the parent is gone, so this reads the join table directly. Polled
// because the DELETE is fired by a UI click and the commit can trail the assertion.
Then('no condition bindings should remain for the deleted template', async ({ world }) => {
  const id = world.templateId;
  if (!id) throw new Error('[verify] no template id in world');
  await expect
    .poll(() => countTemplateConditionRows(id), {
      timeout: 10_000,
      message: `SCALE_TEMPLATE_CONDITION still holds rows for deleted template ${id} — the cascade leaked orphans`,
    })
    .toBe(0);
});
