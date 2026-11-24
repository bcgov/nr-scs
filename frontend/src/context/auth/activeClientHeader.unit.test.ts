import { beforeEach, describe, expect, it } from 'vitest';

import {
  ACTIVE_CLIENT_HEADER,
  activeClientHeader,
  getActiveClientForHeader,
  setActiveClientForHeader,
} from './activeClientHeader';

describe('activeClientHeader', () => {
  beforeEach(() => {
    setActiveClientForHeader(undefined);
  });

  it('emits the active client once one is set', () => {
    setActiveClientForHeader('00001074');

    expect(activeClientHeader()).toEqual({ [ACTIVE_CLIENT_HEADER]: '00001074' });
    expect(getActiveClientForHeader()).toBe('00001074');
  });

  /**
   * An internal user has no client scope, so nothing is sent and their requests are untouched. The
   * backend also ignores the header for internal users, so this is belt and braces.
   */
  it('emits nothing when no client is active', () => {
    expect(activeClientHeader()).toEqual({});
  });

  it('clears back to nothing', () => {
    setActiveClientForHeader('00001074');
    setActiveClientForHeader(undefined);

    expect(activeClientHeader()).toEqual({});
  });

  /**
   * Unlike the mock headers this must work in a production build — it is the switcher's transport, not
   * a dev affordance. Guards against someone copying the `isMockMode()` gate over from
   * mockClientHeader.
   */
  it('is not gated on mock mode', () => {
    setActiveClientForHeader('00002000');

    expect(activeClientHeader()).toEqual({ [ACTIVE_CLIENT_HEADER]: '00002000' });
  });
});
