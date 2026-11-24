import { When } from '../fixtures';

import { buildInertWriteBody } from '../../fixtures/security/write-verb-test-data';

/**
 * SEC-11 — the cross-cutting write-verb probes.
 *
 * One `When`. The role is a parameter, the body comes from the registry, and every `Then` is reused
 * from `apiAccess.steps.ts` / `roleColumnAccess.steps.ts` so "refused" and "passed authorization" mean
 * the same thing here as everywhere else in the suite.
 *
 * No forest client is sent: these verbs are all on internal columns, and adding a client header would
 * introduce the scoping layer into an assertion that is purely about permissions.
 */

When(
  'I probe {string} {string} with an inert body as the {string} role',
  async ({ apiAs, world }, method, path, role) => {
    const probe = await apiAs([role], []);
    world.apiStatus = await probe.status(method, path, buildInertWriteBody(method, path));
  },
);
