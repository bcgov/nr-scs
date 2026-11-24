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
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

import { SignatureBlocksService } from './signatureBlocks.service';

describe('SignatureBlocksService', () => {
  const axiosGet = vi.mocked(axios.get);
  const service = new SignatureBlocksService();

  beforeEach(() => {
    axiosGet.mockReset();
  });

  it('looks up the letter signatory picker on its own endpoint, not the Maintenance search', async () => {
    axiosGet.mockResolvedValue({ data: [{ scaleSignatoryBlockId: 744 }] });

    const result = await service.searchLetterSignatureBlocks({ orgUnitNo: 70, rollupRegionNo: 5 }, 'token');

    expect(result).toEqual([{ scaleSignatoryBlockId: 744 }]);
    expect(axiosGet).toHaveBeenCalledWith(
      expect.stringMatching(/\/letter-signature-blocks$/),
      expect.objectContaining({
        params: { orgUnitNo: 70, rollupRegionNo: 5 },
        headers: expect.objectContaining({ Accept: 'application/json', Authorization: 'Bearer token' }),
      }),
    );
  });

  it('searches signature blocks with the given params (the Maintenance screen)', async () => {
    axiosGet.mockResolvedValue({ data: [{ scaleSignatoryBlockId: 744 }] });

    const result = await service.searchSignatureBlocks({ orgUnitNo: 70, rollupRegionNo: 5 }, 'token');

    expect(result).toEqual([{ scaleSignatoryBlockId: 744 }]);
    expect(axiosGet).toHaveBeenCalledWith(
      expect.stringMatching(/\/signature-blocks$/),
      expect.objectContaining({
        params: { orgUnitNo: 70, rollupRegionNo: 5 },
        headers: expect.objectContaining({ Accept: 'application/json', Authorization: 'Bearer token' }),
      }),
    );
  });

  it('gets a single signature block by id', async () => {
    axiosGet.mockResolvedValue({ data: { scaleSignatoryBlockId: 744, fullName: 'Allard, Zoe' } });

    const result = await service.getSignatureBlock(744, 'token');

    expect(result).toEqual({ scaleSignatoryBlockId: 744, fullName: 'Allard, Zoe' });
    expect(axiosGet).toHaveBeenCalledWith(
      expect.stringMatching(/\/signature-blocks\/744$/),
      expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer token' }) }),
    );
  });
});
