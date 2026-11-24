import { test as base } from 'playwright-bdd';

import { ScalerCreatePage } from '../../pages/scl/ScalerCreatePage';
import { ScalerViewPage } from '../../pages/scl/ScalerViewPage';
import { ScalerAppointmentsPage } from '../../pages/scl/ScalerAppointmentsPage';
import { ScalerExamsPage } from '../../pages/scl/ScalerExamsPage';
import { buildScalerCreateBody } from '../../fixtures/scl/scaler-test-data';

export type SclFixtures = {
  // Create Scaler (UC-SCL-002): page object + transparent POST /api/scalers spy + teardown registry.
  scalerCreatePage: ScalerCreatePage;
  scalerMutationCounts: { create: number; update: number };
  // Single auto route spy owning all mutation counters (one handler, no overlapping globs).
  scalerRouteSpy: void;
  createScalerCalls: () => number;
  createdScalerLicenceNos: string[];
  // Update Scaler (UC-SCL-003): View page + "Scaler Record - Edit" modal (PUT /api/scalers/{no}).
  scalerViewPage: ScalerViewPage;
  updateScalerCalls: () => number;
  // API-seed a scaler and register it for DELETE cleanup; returns its licence no.
  seedScaler: (client: string) => Promise<string>;
  // Registers each UI-created scaler for cleanup the moment its create RESPONSE arrives (before any later step).
  createdScalerCapture: void;
  // Add Scaler Appointment (UC-SCL-004): Appointments tab + create modal (POST /api/scalers/{no}/appointments).
  // Added appointments are deleted BEFORE the parent scaler (else 400 on scaler delete).
  scalerAppointmentsPage: ScalerAppointmentsPage;
  appointmentMutationCounts: { create: number; update: number; remove: number };
  createAppointmentCalls: () => number;
  updateAppointmentCalls: () => number;
  removeAppointmentCalls: () => number;
  createdScalerAppointmentIds: Array<{ scalerLicenceNo: string; appointmentId: string }>;
  createdScalerAppointmentCapture: void;
  // Record Scaler Training (UC-SCL-007): Exams / Upgrades tab + create modal (POST /api/scalers/{no}/exams).
  // Added exams are deleted BEFORE the parent scaler (ORA-02292).
  scalerExamsPage: ScalerExamsPage;
  examMutationCounts: { create: number; update: number; remove: number };
  createExamCalls: () => number;
  updateExamCalls: () => number;
  removeExamCalls: () => number;
  createdScalerExamIds: Array<{ scalerLicenceNo: string; scalerTrainingTypeId: string }>;
  createdScalerExamCapture: void;
  // Update Scaler Training (UC-SCL-008): API-seed a training row (via `request`, so the route spy never counts
  // it) on an already-seeded scaler so an update slice can EDIT it in place. Torn down before its scaler.
  seedExam: (scalerLicenceNo: string, scalerTrainingTypeId: string, completionDate: string | null) => Promise<void>;
};

export const sclTest = base.extend<SclFixtures>({
  scalerCreatePage: async ({ page }, use) => {
    await use(new ScalerCreatePage(page));
  },

  scalerViewPage: async ({ page }, use) => {
    await use(new ScalerViewPage(page));
  },

  // Count-holder owned by the SINGLE scalerRouteSpy below — NOT its own page.route: two overlapping globs
  // that both route.continue() clobber each other (Playwright stops at the first handler), so a broad
  // '**/api/scalers**' would swallow the narrower appointment/exam requests and pin their counters at 0.
  scalerMutationCounts: async ({}, use) => {
    await use({ create: 0, update: 0 });
  },

  // The ONE spy over every /api/scalers* mutation (scaler + appointment/exam sub-resources). Auto, armed
  // before any step navigates; each request classified into exactly one counter, no second handler to shadow
  // it. API seed/cleanup use a separate APIRequestContext and are NOT seen here.
  scalerRouteSpy: [
    async ({ page, scalerMutationCounts, appointmentMutationCounts, examMutationCounts }, use) => {
      await page.route('**/api/scalers**', async (route) => {
        const req = route.request();
        const method = req.method();
        const path = new URL(req.url()).pathname;
        if (method === 'POST' && path.endsWith('/scalers')) scalerMutationCounts.create += 1;
        else if (method === 'PUT' && /\/scalers\/[^/]+$/.test(path)) scalerMutationCounts.update += 1;
        else if (method === 'POST' && /\/scalers\/[^/]+\/appointments$/.test(path)) appointmentMutationCounts.create += 1;
        else if (method === 'PUT' && /\/scalers\/[^/]+\/appointments\/[^/]+$/.test(path)) appointmentMutationCounts.update += 1;
        else if (method === 'DELETE' && /\/scalers\/[^/]+\/appointments\/[^/]+$/.test(path)) appointmentMutationCounts.remove += 1;
        else if (method === 'POST' && /\/scalers\/[^/]+\/exams$/.test(path)) examMutationCounts.create += 1;
        else if (method === 'PUT' && /\/scalers\/[^/]+\/exams\/[^/]+$/.test(path)) examMutationCounts.update += 1;
        else if (method === 'DELETE' && /\/scalers\/[^/]+\/exams\/[^/]+$/.test(path)) examMutationCounts.remove += 1;
        await route.continue();
      });
      await use(undefined);
    },
    { auto: true },
  ],
  createScalerCalls: async ({ scalerMutationCounts }, use) => {
    await use(() => scalerMutationCounts.create);
  },
  updateScalerCalls: async ({ scalerMutationCounts }, use) => {
    await use(() => scalerMutationCounts.update);
  },

  // Teardown: DELETE each UI-created scaler via the app endpoint (404 = idempotent OK). Fails loud on any
  // other residue so a leaked scaler can't occupy its client's SCLR_UK slot.
  createdScalerLicenceNos: async ({ request }, use) => {
    const ids: string[] = [];
    await use(ids);
    const residue: string[] = [];
    for (const id of ids) {
      try {
        const res = await request.delete(`/api/scalers/${encodeURIComponent(id)}`);
        if (res.ok() || res.status() === 404) continue;
        residue.push(`${id} -> HTTP ${res.status()}`);
      } catch (err) {
        residue.push(`${id} (delete threw: ${(err as Error).message})`);
      }
    }
    if (residue.length > 0) {
      throw new Error(`[cleanup] left scaler residue: ${residue.join(', ')}.`);
    }
  },

  seedScaler: async ({ request, createdScalerLicenceNos }, use) => {
    await use(async (client: string) => {
      const body = buildScalerCreateBody(client);
      let last = '';
      // Retries the concurrent-create collision on the non-atomic SCALER_LICENCE_NO (UC-SCL-002 Bug #1):
      // @mode:serial serialises within a file but not across files, so overlapping seeds race. The backend
      // surfaces it as 409 or 400, both carrying "same unique key" — retry on that signal. A real SCLR_UK
      // (client already has a scaler) is NOT retried.
      for (let attempt = 0; attempt < 8; attempt += 1) {
        const res = await request.post('/api/scalers', { data: body });
        if (res.ok()) {
          const no = String(((await res.json()) as { scalerLicenceNo: string }).scalerLicenceNo);
          createdScalerLicenceNos.push(no); // register for DELETE teardown
          return no;
        }
        const text = await res.text();
        last = `HTTP ${res.status()} — ${text}`;
        const licenceNoCollision = res.status() === 409 || text.includes('same unique key');
        if (!licenceNoCollision) break; // only the licence-no collision is retried
        // Jittered backoff so concurrent seeds don't re-collide in lockstep on the non-atomic licence-no —
        // a randomised wait desynchronises racing seeds. Only the collision path waits.
        await new Promise((resolve) =>
          setTimeout(resolve, 40 * (attempt + 1) + Math.floor(Math.random() * 120)),
        );
      }
      throw new Error(`[seed] scaler create failed: ${last}`);
    });
  },

  // Registers each UI-created scaler for cleanup the moment its POST /api/scalers RESPONSE arrives (browser
  // POSTs only — the API seedScaler registers itself). Each registration is async (awaits resp.json()), so
  // its promise is collected in `pending` and DRAINED at teardown: a failed/timed-out test must not run the
  // scaler-delete loop before a captured scaler was recorded. Safe because this fixture tears down before its
  // createdScalerLicenceNos dependency, so the drained list is complete when the delete loop runs. Idempotent.
  createdScalerCapture: [
    async ({ page, createdScalerLicenceNos }, use) => {
      const pending: Array<Promise<void>> = [];
      const onResponse = (resp: import('@playwright/test').Response) => {
        pending.push(
          (async () => {
            try {
              if (resp.request().method() !== 'POST' || !resp.ok()) return;
              if (!new URL(resp.url()).pathname.endsWith('/scalers')) return;
              const body = (await resp.json().catch(() => null)) as { scalerLicenceNo?: string } | null;
              const no = body?.scalerLicenceNo;
              if (no && !createdScalerLicenceNos.includes(no)) createdScalerLicenceNos.push(no);
            } catch {
              /* passive observer — never fail the test from here */
            }
          })(),
        );
      };
      page.on('response', onResponse);
      await use(undefined);
      page.off('response', onResponse);
      await Promise.allSettled(pending); // drain in-flight registrations before the delete loop
    },
    { auto: true },
  ],

  scalerAppointmentsPage: async ({ page }, use) => {
    await use(new ScalerAppointmentsPage(page));
  },

  // Count-holder for appointment mutations — populated by the single scalerRouteSpy above.
  appointmentMutationCounts: async ({}, use) => {
    await use({ create: 0, update: 0, remove: 0 });
  },
  createAppointmentCalls: async ({ appointmentMutationCounts }, use) => {
    await use(() => appointmentMutationCounts.create);
  },
  updateAppointmentCalls: async ({ appointmentMutationCounts }, use) => {
    await use(() => appointmentMutationCounts.update);
  },
  removeAppointmentCalls: async ({ appointmentMutationCounts }, use) => {
    await use(() => appointmentMutationCounts.remove);
  },

  // Teardown registry for UI-added appointments. Depends on createdScalerLicenceNos so it runs FIRST:
  // added appointments must be deleted before the parent scaler (ORA-02292). Fails loud; 404 OK.
  createdScalerAppointmentIds: async ({ request, createdScalerLicenceNos }, use) => {
    void createdScalerLicenceNos; // referenced only to order teardown (appointments before their scaler)
    const ids: Array<{ scalerLicenceNo: string; appointmentId: string }> = [];
    await use(ids);
    const residue: string[] = [];
    for (const { scalerLicenceNo, appointmentId } of ids) {
      try {
        const res = await request.delete(
          `/api/scalers/${encodeURIComponent(scalerLicenceNo)}/appointments/${encodeURIComponent(appointmentId)}`,
        );
        if (res.ok() || res.status() === 404) continue;
        residue.push(`${scalerLicenceNo}/${appointmentId} -> HTTP ${res.status()}`);
      } catch (err) {
        residue.push(`${scalerLicenceNo}/${appointmentId} (delete threw: ${(err as Error).message})`);
      }
    }
    if (residue.length > 0) {
      throw new Error(`[cleanup] left scaler-appointment residue (blocks parent scaler delete): ${residue.join(', ')}.`);
    }
  },

  // Registers each UI-added appointment from its POST /appointments RESPONSE. Browser POSTs only. Each
  // registration is async, so its promise is collected in `pending` and DRAINED at teardown — the same race
  // guard as createdScalerCapture / createdScalerExamCapture: a lost registration leaves the appointment and
  // the parent scaler DELETE then 400s (ORA-02292).
  createdScalerAppointmentCapture: [
    async ({ page, createdScalerAppointmentIds }, use) => {
      const pending: Array<Promise<void>> = [];
      const onResponse = (resp: import('@playwright/test').Response) => {
        pending.push(
          (async () => {
            try {
              if (resp.request().method() !== 'POST' || !resp.ok()) return;
              const m = new URL(resp.url()).pathname.match(/\/scalers\/([^/]+)\/appointments$/);
              if (!m) return;
              const body = (await resp.json().catch(() => null)) as { scalerLicenceAttributeId?: number } | null;
              const id = body?.scalerLicenceAttributeId;
              if (id != null) {
                createdScalerAppointmentIds.push({ scalerLicenceNo: decodeURIComponent(m[1]), appointmentId: String(id) });
              }
            } catch {
              /* passive observer — never fail the test from here */
            }
          })(),
        );
      };
      page.on('response', onResponse);
      await use(undefined);
      page.off('response', onResponse);
      await Promise.allSettled(pending); // drain in-flight registrations before the delete loop
    },
    { auto: true },
  ],

  scalerExamsPage: async ({ page }, use) => {
    await use(new ScalerExamsPage(page));
  },

  // Count-holder for exam/training mutations — populated by the single scalerRouteSpy above.
  examMutationCounts: async ({}, use) => {
    await use({ create: 0, update: 0, remove: 0 });
  },
  createExamCalls: async ({ examMutationCounts }, use) => {
    await use(() => examMutationCounts.create);
  },
  updateExamCalls: async ({ examMutationCounts }, use) => {
    await use(() => examMutationCounts.update);
  },
  removeExamCalls: async ({ examMutationCounts }, use) => {
    await use(() => examMutationCounts.remove);
  },

  // Teardown registry for UI-added training rows. Depends on createdScalerLicenceNos so it runs FIRST:
  // rows must be deleted before the parent scaler (ORA-02292). Delete key is the composite
  // (scalerLicenceNo, scalerTrainingTypeId). Fails loud; 404 OK.
  createdScalerExamIds: async ({ request, createdScalerLicenceNos }, use) => {
    void createdScalerLicenceNos; // referenced only to order teardown (exams before their scaler)
    const ids: Array<{ scalerLicenceNo: string; scalerTrainingTypeId: string }> = [];
    await use(ids);
    const residue: string[] = [];
    for (const { scalerLicenceNo, scalerTrainingTypeId } of ids) {
      try {
        const res = await request.delete(
          `/api/scalers/${encodeURIComponent(scalerLicenceNo)}/exams/${encodeURIComponent(scalerTrainingTypeId)}`,
        );
        if (res.ok() || res.status() === 404) continue;
        residue.push(`${scalerLicenceNo}/${scalerTrainingTypeId} -> HTTP ${res.status()}`);
      } catch (err) {
        residue.push(`${scalerLicenceNo}/${scalerTrainingTypeId} (delete threw: ${(err as Error).message})`);
      }
    }
    if (residue.length > 0) {
      throw new Error(`[cleanup] left scaler-exam residue (blocks parent scaler delete): ${residue.join(', ')}.`);
    }
  },

  // Registers each UI-added training row from its successful POST /exams RESPONSE. Browser POSTs, 2xx only
  // (the duplicate slice's 400 is skipped, so a rejected create leaves nothing to clean up). Each registration
  // is async, so its promise is collected in `pending` and DRAINED at teardown — the same race guard as
  // createdScalerCapture: a captured row must be recorded before createdScalerExamIds runs its delete loop,
  // or a lost registration leaves the training row (and then the parent scaler DELETE 400s on ORA-02292).
  createdScalerExamCapture: [
    async ({ page, createdScalerExamIds }, use) => {
      const pending: Array<Promise<void>> = [];
      const onResponse = (resp: import('@playwright/test').Response) => {
        pending.push(
          (async () => {
            try {
              if (resp.request().method() !== 'POST' || !resp.ok()) return;
              const m = new URL(resp.url()).pathname.match(/\/scalers\/([^/]+)\/exams$/);
              if (!m) return;
              const body = (await resp.json().catch(() => null)) as { scalerTrainingTypeId?: string | number } | null;
              const typeId = body?.scalerTrainingTypeId;
              if (typeId != null) {
                createdScalerExamIds.push({ scalerLicenceNo: decodeURIComponent(m[1]), scalerTrainingTypeId: String(typeId) });
              } else {
                // The row was created but we can't derive its delete key — a changed response shape would
                // otherwise surface much later as an opaque residue/ORA-02292 error. Warn so it's diagnosable.
                console.warn(
                  `[capture] POST ${new URL(resp.url()).pathname} 2xx but no scalerTrainingTypeId in the body — `
                    + `the training row will NOT be registered for teardown (response shape changed?).`,
                );
              }
            } catch {
              /* passive observer — never fail the test from here */
            }
          })(),
        );
      };
      page.on('response', onResponse);
      await use(undefined);
      page.off('response', onResponse);
      await Promise.allSettled(pending); // drain in-flight registrations before the delete loop
    },
    { auto: true },
  ],

  // API-seed a training row on an existing scaler so a UC-SCL-008 update slice can EDIT it in place. POSTs
  // via `request` (the route spy watches `page`, so the seed is invisible to the exam counters — updateExamCalls
  // sees ONLY the UI's PUT). Registers the row for teardown BEFORE its scaler (ORA-02292). Fails loud on non-2xx.
  seedExam: async ({ request, createdScalerExamIds }, use) => {
    await use(async (scalerLicenceNo: string, scalerTrainingTypeId: string, completionDate: string | null) => {
      const res = await request.post(`/api/scalers/${encodeURIComponent(scalerLicenceNo)}/exams`, {
        data: { scalerTrainingTypeId, completionDate },
      });
      if (!res.ok()) {
        throw new Error(`[seed] exam create failed for ${scalerLicenceNo}/${scalerTrainingTypeId}: HTTP ${res.status()} — ${await res.text()}`);
      }
      createdScalerExamIds.push({ scalerLicenceNo, scalerTrainingTypeId });
    });
  },
});
