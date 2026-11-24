import { test as base } from 'playwright-bdd';

import { SystemPage } from '../../pages/admin/maintenance/SystemPage';
import { WMSG_KEY } from '../../fixtures/admin/maintenance/system-setting-test-data';

export type SysFixtures = {
  // Configure System Setting (UC-SYS-002) — single-setting (WMSG) form; read + update only.
  systemPage: SystemPage;
  wmsgGuard: { original: string };
  systemSettingMutationCounts: { update: number };
  updateSystemSettingCalls: () => number;
};

export const sysTest = base.extend<SysFixtures>({
  systemPage: async ({ page }, use) => {
    await use(new SystemPage(page));
  },

  // Capture WMSG before the scenario; restore it after (the System page mutates one shared singleton row,
  // so there is nothing to create/delete — we snapshot + restore instead). Only restores a non-blank
  // original (a blank PUT is rejected by the DB with a 500). SYS scenarios run @mode:serial, so this
  // capture/restore never races another WMSG scenario.
  wmsgGuard: async ({ request }, use) => {
    const res = await request.get(`/api/system-settings/${WMSG_KEY}`);
    const original = res.ok() ? String(((await res.json()) as { systemSettingValue?: string }).systemSettingValue ?? '') : '';
    await use({ original });
    if (original.trim().length > 0) {
      const restore = await request.put(`/api/system-settings/${WMSG_KEY}`, { data: { systemSettingValue: original } });
      if (!restore.ok()) {
        throw new Error(
          `[cleanup] failed to restore WMSG to its original value (HTTP ${restore.status()}). ` +
            `The shared welcome-message setting may be left modified — investigate before re-running.`,
        );
      }
    }
  },

  // Transparent spy over the system-setting mutation. PUT /system-settings/{key} = update. Lets the Back
  // and Reset scenarios PROVE no write was sent.
  systemSettingMutationCounts: [
    async ({ page }, use) => {
      const counts = { update: 0 };
      await page.route('**/api/system-settings/**', async (route) => {
        const req = route.request();
        if (req.method() === 'PUT') counts.update += 1;
        await route.continue();
      });
      await use(counts);
    },
    { auto: true },
  ],
  updateSystemSettingCalls: async ({ systemSettingMutationCounts }, use) => {
    await use(() => systemSettingMutationCounts.update);
  },

});
