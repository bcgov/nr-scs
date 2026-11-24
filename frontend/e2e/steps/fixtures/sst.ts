import { test as base } from 'playwright-bdd';

import { ScaleSiteCreatePage } from '../../pages/sst/ScaleSiteCreatePage';
import { ScaleSiteEditPage } from '../../pages/sst/ScaleSiteEditPage';
import { ScaleSiteContactsPage } from '../../pages/sst/ScaleSiteContactsPage';
import { ScaleSiteSoftwarePage } from '../../pages/sst/ScaleSiteSoftwarePage';
import { ScaleSiteAuthorizedScalersPage } from '../../pages/sst/ScaleSiteAuthorizedScalersPage';
import { deleteScaleSitesViaDb } from '../sst/scaleSiteDbCleanup';
import { buildCreateBody, buildContactBody } from '../../fixtures/sst/scale-site-test-data';

export type SstFixtures = {
  scaleSiteCreatePage: ScaleSiteCreatePage;
  scaleSiteEditPage: ScaleSiteEditPage;
  scaleSiteContactsPage: ScaleSiteContactsPage;
  scaleSiteSoftwarePage: ScaleSiteSoftwarePage;
  scaleSiteAuthorizedScalersPage: ScaleSiteAuthorizedScalersPage;
  sstMutationCounts: { create: number; update: number; contactCreate: number; contactUpdate: number };
  createScaleSiteCalls: () => number;
  updateScaleSiteCalls: () => number;
  createContactCalls: () => number;
  updateContactCalls: () => number;
  seedScaleSite: (overrides?: Record<string, unknown>) => Promise<string>;
  seedScaleSiteContact: (scaleSiteIdNmbr: string, overrides?: Record<string, unknown>) => Promise<string>;
  createdScaleSiteIds: string[];
};

export const sstTest = base.extend<SstFixtures>({
  scaleSiteCreatePage: async ({ page }, use) => {
    await use(new ScaleSiteCreatePage(page));
  },
  scaleSiteEditPage: async ({ page }, use) => {
    await use(new ScaleSiteEditPage(page));
  },
  scaleSiteContactsPage: async ({ page }, use) => {
    await use(new ScaleSiteContactsPage(page));
  },
  scaleSiteSoftwarePage: async ({ page }, use) => {
    await use(new ScaleSiteSoftwarePage(page));
  },
  scaleSiteAuthorizedScalersPage: async ({ page }, use) => {
    await use(new ScaleSiteAuthorizedScalersPage(page));
  },

  // Transparent spy over the scale-site CREATE (`POST /api/scale-sites`) and UPDATE
  // (`PUT /api/scale-sites/{id}`) endpoints. Auto so it is armed before any step navigates. Two narrow
  // globs deliberately avoid overlapping the sibling scale-site routes owned by other domains
  // (`/scale-sites/search`, `/scale-sites/{id}/inspections|risk-assessments|summary|tombstone`,
  // `/scale-sites/inspection/search`): `**/api/scale-sites` (exact) is the create collection; the
  // single-segment `**/api/scale-sites/*` PUT is the update. Lets a client-validation negative PROVE the
  // write never left the browser (count === 0). API-seeded writes go through the `request` fixture, not
  // the page, so they are NOT counted here.
  sstMutationCounts: [
    async ({ page }, use) => {
      const counts = { create: 0, update: 0, contactCreate: 0, contactUpdate: 0 };
      await page.route('**/api/scale-sites', async (route) => {
        const req = route.request();
        if (req.method() === 'POST' && new URL(req.url()).pathname.endsWith('/scale-sites')) {
          counts.create += 1;
        }
        await route.continue();
      });
      await page.route('**/api/scale-sites/*', async (route) => {
        const req = route.request();
        // Only the collection-item PUT (`/scale-sites/{id}`) — a single segment after `scale-sites`.
        if (req.method() === 'PUT' && /\/scale-sites\/[^/]+$/.test(new URL(req.url()).pathname)) {
          counts.update += 1;
        }
        await route.continue();
      });
      // Contact create (`POST /scale-sites/{id}/contacts`) and update (`PUT /scale-sites/{id}/contacts/{cc}`).
      await page.route('**/api/scale-sites/*/contacts', async (route) => {
        const req = route.request();
        if (req.method() === 'POST' && /\/scale-sites\/[^/]+\/contacts$/.test(new URL(req.url()).pathname)) {
          counts.contactCreate += 1;
        }
        await route.continue();
      });
      await page.route('**/api/scale-sites/*/contacts/*', async (route) => {
        const req = route.request();
        if (req.method() === 'PUT' && /\/scale-sites\/[^/]+\/contacts\/[^/]+$/.test(new URL(req.url()).pathname)) {
          counts.contactUpdate += 1;
        }
        await route.continue();
      });
      await use(counts);
    },
    { auto: true },
  ],
  createScaleSiteCalls: async ({ sstMutationCounts }, use) => {
    await use(() => sstMutationCounts.create);
  },
  updateScaleSiteCalls: async ({ sstMutationCounts }, use) => {
    await use(() => sstMutationCounts.update);
  },
  createContactCalls: async ({ sstMutationCounts }, use) => {
    await use(() => sstMutationCounts.contactCreate);
  },
  updateContactCalls: async ({ sstMutationCounts }, use) => {
    await use(() => sstMutationCounts.contactUpdate);
  },

  // Seed a fresh scale site via the API create and register it for DB cleanup; returns its generated id.
  // RETRIES on a non-OK response: the legacy min-free-id PK trigger (SCS_SCST_BR_IU_TRG) races under
  // concurrent creates (ORA-00001 → HTTP 500; see uc-sst-004-create/defects.md), so a parallel seed can
  // transiently 500. A failed create rolls back (nothing persisted), so re-POSTing recomputes a fresh id.
  // This hardens the seed scaffolding around a known app concurrency limitation; it wraps no behaviour
  // under test.
  seedScaleSite: async ({ request, createdScaleSiteIds }, use) => {
    await use(async (overrides: Record<string, unknown> = {}) => {
      const body = buildCreateBody(overrides);
      let last = '';
      for (let attempt = 0; attempt < 5; attempt += 1) {
        const res = await request.post('/api/scale-sites', { data: body });
        if (res.ok()) {
          const id = String(((await res.json()) as { scaleSiteIdNmbr: string }).scaleSiteIdNmbr);
          createdScaleSiteIds.push(id); // register for DB teardown the moment the id is known
          return id;
        }
        last = `HTTP ${res.status()} — ${await res.text()}`;
      }
      throw new Error(`[seed] scale site create failed after retries: ${last}`);
    });
  },

  // Seed a contact onto an existing site via the API create; returns its clientContactId (string). The
  // contact row is cleaned up by the site's DB teardown (which deletes SCALE_SITE_CONTACT children), so no
  // separate registry is needed. Used by the update / delete / view scenarios that need a pre-existing contact.
  seedScaleSiteContact: async ({ request }, use) => {
    await use(async (scaleSiteIdNmbr: string, overrides: Record<string, unknown> = {}) => {
      const body = buildContactBody(overrides);
      const res = await request.post(`/api/scale-sites/${encodeURIComponent(scaleSiteIdNmbr)}/contacts`, { data: body });
      if (!res.ok()) {
        throw new Error(`[seed] contact create failed: HTTP ${res.status()} — ${await res.text()}`);
      }
      return String(body.clientContactId);
    });
  },

  createdScaleSiteIds: async ({ request }, use) => {
    const ids: string[] = [];
    await use(ids);
    // No DELETE endpoint for scale sites — remove the rows at the DB (children-then-parent, fails loud),
    // then read back through the API to PROVE they are gone (don't trust the delete blindly).
    if (ids.length === 0) return;
    deleteScaleSitesViaDb(ids); // throws on sqlplus error
    const residue: string[] = [];
    for (const id of ids) {
      const res = await request.get(`/api/scale-sites/${encodeURIComponent(id)}/summary`);
      if (res.ok()) residue.push(id); // still fetchable => not deleted
    }
    if (residue.length > 0) {
      throw new Error(
        `[cleanup] scale sites still present after DB delete: ${residue.join(', ')}. ` +
          `Investigate the DB state before re-running.`,
      );
    }
  },
});
