import axios from 'axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./APIs', () => ({
  BackendApiConfig: {
    BASE: '/api',
  },
}));

import { SummaryCheckScalesService, type SummaryCheckScaleCreateRequest } from './summaryCheckScales.service';

vi.mock('axios', () => ({
  default: {
    post: vi.fn(),
    get: vi.fn(),
  },
}));

describe('SummaryCheckScalesService', () => {
  const axiosPost = vi.mocked(axios.post);
  const axiosGet = vi.mocked(axios.get);
  const service = new SummaryCheckScalesService();

  beforeEach(() => {
    axiosPost.mockReset();
    axiosGet.mockReset();
  });

  it('gets the scaler summary check scales tab list (no filter/stats) with bearer header', async () => {
    axiosGet.mockResolvedValue({
      data: { summaryCheckScales: [{ checkScaleId: 146943, ckscType: 'SFPSCS' }] },
    } as never);

    const result = await service.getScalerSummaryCheckScales('1234', 'tok');

    expect(result.summaryCheckScales).toHaveLength(1);
    expect(result.summaryCheckScales?.[0].ckscType).toBe('SFPSCS');
    expect(axiosGet).toHaveBeenCalledTimes(1);
    expect(axiosGet).toHaveBeenCalledWith(
      expect.stringMatching(/\/scalers\/1234\/summary-check-scales$/),
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer tok' }),
      }),
    );
  });

  const payload: SummaryCheckScaleCreateRequest = {
    returnType: 'LOG_TALLY',
    checkScaleTypeCode: 'FRST',
    originalScalerLicenceNo: 'AAAA',
    checkScalerLicenceNo: 'BBBB',
    loadArrivalNumber: 'LD1',
    weighSlipNumber: null,
    timberMark: 'ABC123',
    scaleSiteIdNmbr: '0001',
    followedGoodPracticeInd: 'Y',
    originalWithinStandardInd: 'Y',
    checkReplacesOriginalInd: 'N',
    partialInd: null,
    originalScaleDate: '2024-01-01',
    originalScaleReturnNo: 100,
    chkScaleDate: '2024-01-02',
    chkScaleReturnNo: 101,
    chkScalerCommentTxt: null,
    spgRows: [
      {
        scaleSpeciesCode: 'FI',
        scaleProductCode: null,
        scaleGradeCode: '1',
        originalScalePieceCnt: 10,
        originalScaleNetVolume: 12.5,
        originalScaleNetValue: 100,
        checkScalePieceCnt: 9,
        checkScaleNetVolume: 11,
        checkScaleNetValue: 95,
      },
    ],
  };

  it('posts to the summary-check-scales create endpoint with bearer header and returns the id', async () => {
    axiosPost.mockResolvedValue({ data: { checkScaleId: 77 } } as never);

    const result = await service.createSummaryCheckScale(payload, 'tok');

    expect(result).toEqual({ checkScaleId: 77 });
    expect(axiosPost).toHaveBeenCalledTimes(1);
    expect(axiosPost).toHaveBeenCalledWith(
      expect.stringMatching(/\/summary-check-scales\/create$/),
      payload,
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer tok' }),
      }),
    );
  });

  it('omits the Authorization header when no token is supplied', async () => {
    axiosPost.mockResolvedValue({ data: { checkScaleId: 1 } } as never);

    await service.createSummaryCheckScale(payload);

    const [, , config] = axiosPost.mock.calls[0];
    expect((config as { headers: Record<string, string> }).headers.Authorization).toBeUndefined();
  });
});
