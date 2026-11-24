import { test as base } from 'playwright-bdd';

import { ClientSearchPage } from '../../pages/qry/ClientSearchPage';
import { ScalerSearchPage } from '../../pages/qry/ScalerSearchPage';
import { ScaleSiteSearchPage } from '../../pages/qry/ScaleSiteSearchPage';
import { MarkSiteDesignationSearchPage } from '../../pages/qry/MarkSiteDesignationSearchPage';
import { ScaleSiteActivityTabPage } from '../../pages/qry/ScaleSiteActivityTabPage';

export type QryFixtures = {
  // Client Search (UC-QRY-001) — read-only; `clientSearchCalls` is a getter over a transparent spy on
  // GET /api/clients/search. The all-blank search is an accepted intentional divergence, so the spy is
  // used as defence-in-depth to confirm a request DID fire (count >= 1).
  clientSearchPage: ClientSearchPage;
  clientSearchCounts: { search: number };
  clientSearchCalls: () => number;
  // Scaler Search (UC-QRY-003) — read-only; no seed/cleanup, no spy. Lazy page-object fixture.
  scalerSearchPage: ScalerSearchPage;
  // Scale Site Search (UC-QRY-004) — read-only parameter search; the inspection-# happy path seeds its
  // own inspection via the shared `seedInspection`/`createdInspectionIds` (INS) fixtures. Lazy page
  // object. `inspectionSearchCalls` is a getter over a transparent spy on GET
  // /api/scale-sites/inspection/search, so the non-numeric-id scenario can PROVE the client-side
  // validation fired BEFORE any lookup (count === 0) rather than inferring it from a missing navigation.
  scaleSiteSearchPage: ScaleSiteSearchPage;
  inspectionSearchCounts: { search: number };
  inspectionSearchCalls: () => number;
  // Mark Site Designation Search (UC-QRY-005) — read-only timber-mark query. Lazy page object; no seed /
  // cleanup. The GET /api/mark-site-designations/search spy (used to prove client-side guards fire no
  // request) is `searchMsdCalls`, owned by the MSD domain fixtures because that spy already intercepts
  // every /mark-site-designations** path — a second overlapping route would race it.
  markSiteDesignationSearchPage: MarkSiteDesignationSearchPage;
  // Scale Site Activity Summary tab (UC-QRY-008) — read-only tab on the scale-site view; no seed / cleanup,
  // no spy (nothing mutates). Lazy page object.
  scaleSiteActivityPage: ScaleSiteActivityTabPage;
};

export const qryTest = base.extend<QryFixtures>({
  clientSearchPage: async ({ page }, use) => {
    await use(new ClientSearchPage(page));
  },

  // Transparent spy over the client-search read endpoint. Auto so it is armed before any step navigates.
  // Matches GET /api/clients/search only (no other endpoint lives under /clients/search). Used as
  // defence-in-depth by the accepted blank-search divergence (asserts a request DID fire, count >= 1);
  // route.continue() => positive searches are unaffected.
  clientSearchCounts: [
    async ({ page }, use) => {
      const counts = { search: 0 };
      await page.route('**/api/clients/search**', async (route) => {
        const req = route.request();
        if (req.method() === 'GET' && new URL(req.url()).pathname.endsWith('/clients/search')) {
          counts.search += 1;
        }
        await route.continue();
      });
      await use(counts);
    },
    { auto: true },
  ],
  clientSearchCalls: async ({ clientSearchCounts }, use) => {
    await use(() => clientSearchCounts.search);
  },

  scalerSearchPage: async ({ page }, use) => {
    await use(new ScalerSearchPage(page));
  },

  scaleSiteSearchPage: async ({ page }, use) => {
    await use(new ScaleSiteSearchPage(page));
  },

  markSiteDesignationSearchPage: async ({ page }, use) => {
    await use(new MarkSiteDesignationSearchPage(page));
  },

  scaleSiteActivityPage: async ({ page }, use) => {
    await use(new ScaleSiteActivityTabPage(page));
  },

  // Transparent spy over the inspection-# lookup endpoint. Auto so it is armed before any step navigates.
  // Matches GET /api/scale-sites/inspection/search only (the create/list endpoints live under
  // /scale-sites/{id}/inspections — a different path), so the non-numeric-id scenario can assert
  // search === 0 to PROVE the client-side validation blocked the lookup. route.continue() => positive
  // inspection searches (S04 seeded id, S06 not-found id) are unaffected.
  inspectionSearchCounts: [
    async ({ page }, use) => {
      const counts = { search: 0 };
      await page.route('**/api/scale-sites/inspection/search**', async (route) => {
        const req = route.request();
        if (req.method() === 'GET' && new URL(req.url()).pathname.endsWith('/scale-sites/inspection/search')) {
          counts.search += 1;
        }
        await route.continue();
      });
      await use(counts);
    },
    { auto: true },
  ],
  inspectionSearchCalls: async ({ inspectionSearchCounts }, use) => {
    await use(() => inspectionSearchCounts.search);
  },

});
