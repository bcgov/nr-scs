import axios from 'axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./APIs', () => ({
  BackendApiConfig: {
    BASE: '/api',
  },
}));

import { SCALE_SITE_PRIORITY_CODE, ScaleSitesService, serializeScaleSiteSearchParams } from './scaleSites.service';

vi.mock('axios', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

describe('ScaleSitesService', () => {
  const axiosGet = vi.mocked(axios.get);
  const axiosPost = vi.mocked(axios.post);
  const service = new ScaleSitesService();

  beforeEach(() => {
    axiosGet.mockReset();
    axiosPost.mockReset();
  });

  it('serializes repeated methodTypes without bracket notation', () => {
    const query = serializeScaleSiteSearchParams({
      scaleSiteIdNmbr: 'SITE001',
      methodTypes: ['W', 'S'],
      primarySort: 1,
      secondarySort: 0,
    });

    expect(query).toBe('scaleSiteIdNmbr=SITE001&methodTypes=W&methodTypes=S&primarySort=1&secondarySort=0');
  });

  it('calls the scale-sites search endpoint with JSON headers and serializer', async () => {
    axiosGet.mockResolvedValue({ data: [{ scaleSiteIdNmbr: 'SITE001' }] } as never);

    const result = await service.searchScaleSites(
      {
        scaleSiteIdNmbr: 'SITE001',
        ownerClientNumber: '00123456',
        methodTypes: ['W'],
        primarySort: 1,
        secondarySort: 0,
      },
      'token',
    );

    expect(result).toEqual([{ scaleSiteIdNmbr: 'SITE001' }]);
    expect(axiosGet).toHaveBeenCalledTimes(1);
    expect(axiosGet).toHaveBeenCalledWith(
      expect.stringMatching(/\/scale-sites\/search$/),
      expect.objectContaining({
        params: expect.objectContaining({
          scaleSiteIdNmbr: 'SITE001',
          ownerClientNumber: '00123456',
          methodTypes: ['W'],
          primarySort: 1,
          secondarySort: 0,
        }),
        headers: expect.objectContaining({
          Accept: 'application/json',
          Authorization: 'Bearer token',
        }),
      }),
    );

    const config = axiosGet.mock.calls[0]?.[1] as {
      paramsSerializer?: {
        serialize?: (params: Record<string, unknown>) => string;
      };
    } | undefined;
    const serialized = config?.paramsSerializer?.serialize?.({
      methodTypes: ['W', 'P'],
      primarySort: 1,
      secondarySort: 0,
    });
    expect(serialized).toBe('methodTypes=W&methodTypes=P&primarySort=1&secondarySort=0');
  });

  it('calls the scale-site tombstone endpoint with the scale site id in the path', async () => {
    axiosGet.mockResolvedValue({
      data: {
        scaleSiteIdNmbr: 'SITE001',
        siteName: 'MAIN YARD',
        regionName: 'South Coast Natural Resource Region',
        districtName: 'South Island District',
      },
    } as never);

    const result = await service.getScaleSiteTombstone('SITE001', 'token');

    expect(result).toEqual({
      scaleSiteIdNmbr: 'SITE001',
      siteName: 'MAIN YARD',
      regionName: 'South Coast Natural Resource Region',
      districtName: 'South Island District',
    });
    expect(axiosGet).toHaveBeenCalledTimes(1);
    expect(axiosGet).toHaveBeenCalledWith(
      expect.stringMatching(/\/scale-sites\/SITE001\/tombstone$/),
      expect.objectContaining({
        headers: expect.objectContaining({
          Accept: 'application/json',
          Authorization: 'Bearer token',
        }),
      }),
    );
  });

  it('posts the scale-site create payload with JSON headers and bearer token', async () => {
    axiosPost.mockResolvedValue({
      data: {
        scaleSiteIdNmbr: 'SITE001',
        siteName: 'MAIN YARD',
        siteTypes: [{ priorityCode: SCALE_SITE_PRIORITY_CODE.PRIMARY, scaleMethodTypeCode: 'W' }],
      },
    } as never);

    const payload = {
      siteName: 'MAIN YARD',
      ownerClientNumber: '12345678',
      ownerClientLocnCode: '00',
      orgUnitNo: 100,
      siteLocation: 'Nanaimo, BC',
      scalingMethods: [{ scaleMethodTypeCode: 'W', scaleSitePriorityCode: SCALE_SITE_PRIORITY_CODE.PRIMARY }],
    };

    const result = await service.createScaleSite(payload, 'token');

    expect(result).toEqual({
      scaleSiteIdNmbr: 'SITE001',
      siteName: 'MAIN YARD',
      siteTypes: [{ priorityCode: SCALE_SITE_PRIORITY_CODE.PRIMARY, scaleMethodTypeCode: 'W' }],
    });
    expect(axiosPost).toHaveBeenCalledTimes(1);
    expect(axiosPost).toHaveBeenCalledWith(
      expect.stringMatching(/\/scale-sites$/),
      payload,
      expect.objectContaining({
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Authorization: 'Bearer token',
        }),
      }),
    );
  });

  it('calls the scale-site summary endpoint with the scale site id in the path', async () => {
    axiosGet.mockResolvedValue({
      data: {
        scaleSiteIdNmbr: 'SITE001',
        siteName: 'MAIN YARD',
        ownerClientNumber: '12345678',
        ownerClientLocnCode: '00',
        siteTypes: [{ priorityCode: SCALE_SITE_PRIORITY_CODE.PRIMARY, scaleMethodTypeCode: 'W' }],
      },
    } as never);

    const result = await service.getScaleSiteSummary('SITE001', 'token');

    expect(result).toEqual({
      scaleSiteIdNmbr: 'SITE001',
      siteName: 'MAIN YARD',
      ownerClientNumber: '12345678',
      ownerClientLocnCode: '00',
      siteTypes: [{ priorityCode: SCALE_SITE_PRIORITY_CODE.PRIMARY, scaleMethodTypeCode: 'W' }],
    });
    expect(axiosGet).toHaveBeenCalledTimes(1);
    expect(axiosGet).toHaveBeenCalledWith(
      expect.stringMatching(/\/scale-sites\/SITE001\/summary$/),
      expect.objectContaining({
        headers: expect.objectContaining({
          Accept: 'application/json',
          Authorization: 'Bearer token',
        }),
      }),
    );
  });
});


