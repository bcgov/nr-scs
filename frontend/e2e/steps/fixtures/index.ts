import { mergeTests } from '@playwright/test';
import { createBdd } from 'playwright-bdd';

import { globalTest } from './global';
import { chkTest } from './chk';
import { insTest } from './ins';
import { ccqTest } from './ccq';
import { msdTest } from './msd';
import { qryTest } from './qry';
import { mntTest } from './mnt';
import { sscTest } from './ssc';
import { sysTest } from './sys';
import { scaTest } from './sca';
import { rptTest } from './rpt';
import { rskTest } from './rsk';
import { sclTest } from './scl';
import { sstTest } from './sst';
import { prfTest } from './prf';
import { securityTest } from './security';

/**
 * Central composition for the SCS BDD suite. Each domain owns its own fixtures file (`./<domain>`); this
 * merges them into the single `test` that `createBdd` binds the Given/When/Then decorators to. Adding a
 * domain = create `./<domain>.ts` exporting `<domain>Test = base.extend<...>({...})` and add it here.
 * Every step file imports `Given/When/Then/expect` from `'../fixtures'`, which resolves to this index.
 */
export const test = mergeTests(
  globalTest,
  chkTest,
  insTest,
  ccqTest,
  msdTest,
  qryTest,
  mntTest,
  sscTest,
  sysTest,
  scaTest,
  rptTest,
  rskTest,
  sclTest,
  sstTest,
  prfTest,
  securityTest,
);

export type { ScsWorld } from './global';

export const { Given, When, Then } = createBdd(test);
export { expect } from '@playwright/test';
