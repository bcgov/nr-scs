import { expect, type APIRequestContext } from '@playwright/test';
import { test as base } from 'playwright-bdd';

import { ApiAccessProbe } from '../../pages/security/ApiAccessProbe';
import { ChromeBoundaryPage } from '../../pages/security/ChromeBoundaryPage';
import { MaintenancePage } from '../../pages/security/MaintenancePage';
import { RecordTabsPage } from '../../pages/security/RecordTabsPage';
import { RoleSessionPage } from '../../pages/security/RoleSessionPage';
import { ScaleSiteContactsTabPage } from '../../pages/security/ScaleSiteContactsTabPage';
import { WelcomePage } from '../../pages/security/WelcomePage';
import { WhoDidItPage } from '../../pages/security/WhoDidItPage';
import { buildSiteEntitlementAuthBody } from '../../fixtures/security/industry-scaler-test-data';
import {
  buildSummaryCheckScaleCreateBody,
  detailCheckScaleEditSeedBody,
} from '../../fixtures/chk/chk-test-data';
import { deleteCheckScalesViaDb } from '../chk/checkScaleDbCleanup';
import {
  buildScalerBridgeAuthBody,
  buildSiteEntitlementAuthBody as buildOwnerSiteEntitlementAuthBody,
} from '../../fixtures/security/scale-site-owner-test-data';

export type SecurityFixtures = {
  /** Seeds the mock role/client session and drives the browser as that user (GUI + URL levels). */
  roleSession: RoleSessionPage;
  /**
   * Builds an API probe bound to a role + client (API level). Disposed automatically.
   *
   * The fourth argument names the ACTIVE client (`X-Active-Client`) for a multi-client external user —
   * the switcher selection. Omit it for the single-client and internal cases, which is every scenario
   * written before the switcher shipped.
   */
  apiAs: (
    roles: string[],
    clientNumbers?: string[],
    activeClientNumber?: string,
  ) => Promise<ApiAccessProbe>;
  /**
   * Grants the mock industry scaler's client an in-force authorization at the entitled scale site and
   * yields its id; DELETEd on teardown. See `seedSiteEntitlement` below for why the seed is required.
   */
  seedSiteEntitlement: () => Promise<string>;
  /**
   * The same mechanism for the Scale Site Owner suite, against **its own** client and scaler. Kept as a
   * separate fixture rather than parameterising the one above so the two suites never seed onto the same
   * client's authorization list — see the industry-scaler `defects.md` V4 for why that matters under
   * `fullyParallel`.
   */
  seedOwnerSiteEntitlement: (scaleSiteId: string) => Promise<string>;
  /**
   * The mirror of the above: authorizes a THIRD client's scaler at a site the owner's client OWNS, which
   * is what admits the owner to that scaler's record (§4's first bullet). Yields the authorization id;
   * DELETEd on teardown.
   */
  seedOwnerScalerBridge: (scalerLicenceNo: string, scaleSiteId: string) => Promise<string>;
  /**
   * Seeds a DISPOSABLE check scale of the given kind and yields its id — the target for the
   * delete-denial probes. Disposable on purpose: the probe asks whether authorization refuses a DELETE,
   * so if it does NOT, the target is destroyed. Pointing that at a pinned anchor would cost the suite an
   * anchor to learn the same thing. Torn down as the administrator (detail at the DB, summary via its
   * endpoint), so teardown never depends on the permission under test.
   */
  seedDeletableCheckScale: (kind: 'detail' | 'summary') => Promise<string>;
  /** Locators for the site record's Contacts tab (the Actions-column removal case). */
  scaleSiteContactsTab: ScaleSiteContactsTabPage;
  /** Tab-strip driver with the settle wait, for sweeping in-page write controls on a record. */
  recordTabs: RecordTabsPage;
  /** Locators for the chrome a refused / lost / shut-out user lands on (SEC-11 chrome boundaries). */
  chromeBoundary: ChromeBoundaryPage;
  /** Driver for a reference-data maintenance screen's Add / Edit / Delete controls (SEC-11 §J sweep). */
  maintenance: MaintenancePage;
  /** The cross-cutting "Who Did It" audit popup (SEC-5 audit affordance). */
  whoDidIt: WhoDidItPage;
  /** The welcome / landing page an authorized user lands on (SEC-1). */
  welcome: WelcomePage;
};

export const securityTest = base.extend<SecurityFixtures>({
  roleSession: async ({ page }, use) => {
    await use(new RoleSessionPage(page));
  },

  scaleSiteContactsTab: async ({ page }, use) => {
    await use(new ScaleSiteContactsTabPage(page));
  },

  recordTabs: async ({ page }, use) => {
    await use(new RecordTabsPage(page));
  },

  chromeBoundary: async ({ page }, use) => {
    await use(new ChromeBoundaryPage(page));
  },

  maintenance: async ({ page }, use) => {
    await use(new MaintenancePage(page));
  },

  whoDidIt: async ({ page }, use) => {
    await use(new WhoDidItPage(page));
  },

  welcome: async ({ page }, use) => {
    await use(new WelcomePage(page));
  },

  // Probes are created per-call because a scenario may compare two identities (the role under test and
  // an administrator baseline). Every one built is disposed on teardown, so no context leaks.
  apiAs: async ({ baseURL }, use) => {
    const probes: ApiAccessProbe[] = [];
    await use(async (roles, clientNumbers = [], activeClientNumber?: string) => {
      const probe = await ApiAccessProbe.as(
        baseURL ?? 'http://localhost:3000',
        roles,
        clientNumbers,
        activeClientNumber,
      );
      probes.push(probe);
      return probe;
    });
    for (const probe of probes) {
      await probe.dispose();
    }
  },

  /**
   * Self-seeding, self-cleaning site entitlement (suite convention: a scenario leaves the shared seed DB
   * as it found it).
   *
   * The seed exists because the entitlement it creates cannot be found in the extract: it needs an
   * authorization that is IN FORCE TODAY, and today-relative state is exactly what a static extract
   * cannot hold — every real authorization for this client expired years ago. Seeding also makes the
   * scenario prove BOTH directions from one anchor: the same site is refused before the seed and
   * admitted after it, so the assertion cannot pass by accident on a site that was reachable anyway.
   *
   * Seeded as the default (administrator) identity — creating the fixture is not what is under test.
   */
  seedDeletableCheckScale: async ({ request }, use) => {
    const detailIds: string[] = [];
    const summaryIds: string[] = [];

    await use(async (kind) => {
      const path = kind === 'detail' ? '/api/check-scales/create' : '/api/summary-check-scales/create';
      const data = kind === 'detail' ? detailCheckScaleEditSeedBody : buildSummaryCheckScaleCreateBody(1);
      const response = await request.post(path, { data });
      expect(
        response.ok(),
        `[sec] failed to seed a disposable ${kind} check scale: HTTP ${response.status()} — ${await response.text()}`,
      ).toBeTruthy();
      const id = String(((await response.json()) as { checkScaleId: number }).checkScaleId);
      (kind === 'detail' ? detailIds : summaryIds).push(id);
      return id;
    });

    // Detail rows go at the DB (the detail DELETE endpoint is the thing under test); summary rows go
    // through their endpoint as the administrator. 404 is idempotent-OK — it means the probe's DELETE
    // went through, which the scenario itself asserts loudly enough.
    if (detailIds.length > 0) deleteCheckScalesViaDb(detailIds);
    for (const id of summaryIds) {
      const response = await request.delete(`/api/summary-check-scales/${id}`);
      expect(
        response.ok() || response.status() === 404,
        `[sec] failed to delete seeded summary check scale ${id}: HTTP ${response.status()}`,
      ).toBeTruthy();
    }
  },

  seedSiteEntitlement: async ({ request }, use) => {
    const createdIds: string[] = [];

    await use(async () => {
      const response = await request.post('/api/scaler-authorizations', {
        data: buildSiteEntitlementAuthBody(),
      });
      expect(
        response.ok(),
        `[sec] failed to seed the site entitlement authorization: HTTP ${response.status()} — ` +
          `${await response.text()}`,
      ).toBeTruthy();
      const id = String(((await response.json()) as { scalerAuthorizationId: number }).scalerAuthorizationId);
      createdIds.push(id);
      return id;
    });

    // Fail loud rather than leaking: a surviving in-force authorization would silently grant the site
    // to every later run, turning the "unentitled site is refused" assertion permanently green.
    for (const id of createdIds) {
      const response = await request.delete(`/api/scaler-authorizations/${id}`);
      expect(
        response.ok() || response.status() === 404,
        `[sec] failed to delete seeded authorization ${id}: HTTP ${response.status()}. Delete it by ` +
          `hand (DELETE /api/scaler-authorizations/${id}) before re-running, or the site-entitlement ` +
          `scenarios will pass for the wrong reason.`,
      ).toBeTruthy();
    }
  },

  /**
   * The Scale Site Owner suite's own seed — same mechanism, its own client, scaler and target site.
   *
   * What it proves is slightly different from the industry scaler's: for that role the seeded
   * authorization is the *only* way it ever reaches a site, whereas this role already reaches the five
   * sites its client owns. Here the seed is what gives the refusal teeth: site scope is resolved **per
   * role**, so the authorization must be live and in force for the owner's 403 to mean anything — a
   * refusal with no authorization present would pass under the old shared owner-OR-authorized predicate
   * too, and so could not detect a regression to it.
   *
   * Seeded as the default (administrator) identity — creating the fixture is not what is under test.
   */
  seedOwnerSiteEntitlement: async ({ request }, use) => {
    const seeder = createAuthSeeder(request, 'sec/owner');
    await use((scaleSiteId: string) => seeder.seed(buildOwnerSiteEntitlementAuthBody(scaleSiteId)));
    await seeder.teardown();
  },

  /**
   * The mirror seed: a THIRD client's scaler authorized at a site this owner's client OWNS, which is the
   * only thing that admits the owner to that scaler's record (`roles-permissions.md` §4's first bullet).
   * Separate from the fixture above so neither direction's teardown can touch the other's anchors.
   */
  seedOwnerScalerBridge: async ({ request }, use) => {
    const seeder = createAuthSeeder(request, 'sec/owner-bridge');
    await use((scalerLicenceNo: string, scaleSiteId: string) =>
      seeder.seed(buildScalerBridgeAuthBody(scalerLicenceNo, scaleSiteId)));
    await seeder.teardown();
  },
});

/**
 * One POST-and-DELETE seeder, shared by both owner fixtures because the mechanism is identical and only
 * the request body differs. Each fixture instantiates its own, so a scenario cleans up exactly the rows
 * it created.
 *
 * Teardown failures are loud rather than silent: every scenario that seeds also asserts the *unseeded*
 * behaviour first, so a leaked row turns that half permanently green instead of merely widening one
 * role's reach — a leak here disables an assertion rather than breaking it.
 */
function createAuthSeeder(request: APIRequestContext, label: string) {
  const createdIds: string[] = [];

  return {
    seed: async (body: object) => {
      const response = await request.post('/api/scaler-authorizations', { data: body });
      expect(
        response.ok(),
        `[${label}] failed to seed the entitlement authorization: HTTP ${response.status()} — ` +
          `${await response.text()}`,
      ).toBeTruthy();
      const id = String(
        ((await response.json()) as { scalerAuthorizationId: number }).scalerAuthorizationId,
      );
      createdIds.push(id);
      return id;
    },

    teardown: async () => {
      for (const id of createdIds) {
        const response = await request.delete(`/api/scaler-authorizations/${id}`);
        expect(
          response.ok() || response.status() === 404,
          `[${label}] failed to delete seeded authorization ${id}: HTTP ${response.status()}. Delete ` +
            `it by hand (DELETE /api/scaler-authorizations/${id}) before re-running, or the paired ` +
            `"refused without the authorization" step will pass for the wrong reason.`,
        ).toBeTruthy();
      }
    },
  };
}
