import axios from 'axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./APIs', () => ({
  BackendApiConfig: {
    BASE: '/api',
  },
}));

import { ScaleSiteActivityService } from './scaleSiteActivity.service';

vi.mock('axios', () => ({
  default: {
    get: vi.fn(),
  },
}));

describe('ScaleSiteActivityService', () => {
  const axiosGet = vi.mocked(axios.get);
  const service = new ScaleSiteActivityService();

  beforeEach(() => {
    axiosGet.mockReset();
  });

  it('gets the activity summary with the encoded scale site id in the path', async () => {
    const summary = {
      scaleSiteIdNmbr: 'SITE 001',
      lastScaleDate: '2024-09-15',
      numberOfSamples: 42,
      sampleVolume: 1234.56,
      scaledVolume: 98765.43,
    };
    axiosGet.mockResolvedValue({ data: summary });

    const result = await service.getScaleSiteActivitySummary('SITE 001', 'token');

    expect(result).toEqual(summary);
    expect(axiosGet).toHaveBeenCalledTimes(1);
    expect(axiosGet).toHaveBeenCalledWith(
      expect.stringMatching(/\/scale-sites\/SITE%20001\/activity-summary$/),
      expect.objectContaining({
        headers: expect.objectContaining({
          Accept: 'application/json',
          Authorization: 'Bearer token',
        }),
      }),
    );
  });
});
