import axios from 'axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./APIs', () => ({
  BackendApiConfig: {
    BASE: '/api',
  },
}));

vi.mock('axios', () => ({
  default: {
    get: vi.fn(),
  },
}));

import { ScaleSiteAuthorizedScalersService } from './scaleSiteAuthorizedScalers.service';

describe('ScaleSiteAuthorizedScalersService', () => {
  const axiosGet = vi.mocked(axios.get);
  const service = new ScaleSiteAuthorizedScalersService();

  beforeEach(() => {
    axiosGet.mockReset();
  });

  it('GETs the site authorized-scalers endpoint with JSON headers (id encoded)', async () => {
    axiosGet.mockResolvedValue({ data: [{ scalerAuthorizationId: 149129, scalerLicenceNo: '9579' }] } as never);

    const result = await service.getScaleSiteAuthorizedScalers('520', 'token');

    expect(axiosGet).toHaveBeenCalledWith('/api/scale-sites/520/authorized-scalers', {
      headers: expect.objectContaining({
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: 'Bearer token',
      }),
    });
    expect(result).toEqual([{ scalerAuthorizationId: 149129, scalerLicenceNo: '9579' }]);
  });
});
