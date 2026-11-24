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

import {
  CheckScalesService,
  type CheckScaleCreateRequest,
  type CheckScaleUpdateRequest,
} from './checkScales.service';

const createPayload: CheckScaleCreateRequest = {
  chkLogTallyDocNo: 'C123',
  chkLogTallyVer: 1,
  orgLogTallyDocNo: 'O123',
  orgLogTallyVer: 2,
  checkScaleTypeCode: 'F',
  followedGoodPracticeInd: 'Y',
  originalWithinStandardInd: 'N',
  chkScalerCommentTxt: 'Within tolerance',
  originalScaleNetValue: 1000,
  checkScaleNetValue: 1010,
};

const updatePayload: CheckScaleUpdateRequest = {
  checkScaleTypeCode: 'P',
  followedGoodPracticeInd: 'N',
  originalWithinStandardInd: 'Y',
  chkScalerCommentTxt: null,
  originalScaleNetValue: 500,
  checkScaleNetValue: 480,
};

describe('CheckScalesService', () => {
  const axiosGet = vi.mocked(axios.get);
  const axiosPost = vi.mocked(axios.post);
  const axiosPut = vi.mocked(axios.put);
  const axiosDelete = vi.mocked(axios.delete);
  const service = new CheckScalesService();

  beforeEach(() => {
    axiosGet.mockReset();
    axiosPost.mockReset();
    axiosPut.mockReset();
    axiosDelete.mockReset();
  });

  describe('findCheckScale', () => {
    it('returns the first row of the search result', async () => {
      axiosGet.mockResolvedValue({ data: [{ checkScaleId: 42 }, { checkScaleId: 99 }] });

      expect(await service.findCheckScale('42')).toEqual({ checkScaleId: 42 });
    });

    it('returns null rather than throwing when no check scale has that id', async () => {
      axiosGet.mockResolvedValue({ data: [] });

      expect(await service.findCheckScale('123')).toBeNull();
    });

    it('still rejects when the request itself fails', async () => {
      axiosGet.mockRejectedValue(new Error('Network Error'));

      await expect(service.findCheckScale('42')).rejects.toThrow('Network Error');
    });
  });

  describe('getCheckScale', () => {
    it('returns the first row of the search result', async () => {
      axiosGet.mockResolvedValue({ data: [{ checkScaleId: 42 }, { checkScaleId: 99 }] });

      const result = await service.getCheckScale('42');

      expect(axiosGet).toHaveBeenCalledWith(
        '/api/check-scales/search?checkScaleId=42',
        expect.anything(),
      );
      expect(result).toEqual({ checkScaleId: 42 });
    });

    it('throws when the search comes back empty rather than returning undefined', async () => {
      axiosGet.mockResolvedValue({ data: [] });

      await expect(service.getCheckScale('42')).rejects.toThrow('CheckScale 42 not found');
    });

    it('throws when the body has no rows at all', async () => {
      axiosGet.mockResolvedValue({ data: null });

      await expect(service.getCheckScale('7')).rejects.toThrow('CheckScale 7 not found');
    });

    it('escapes the id into the query string', async () => {
      axiosGet.mockResolvedValue({ data: [{ checkScaleId: 1 }] });

      await service.getCheckScale('a b&c');

      expect(axiosGet).toHaveBeenCalledWith(
        '/api/check-scales/search?checkScaleId=a%20b%26c',
        expect.anything(),
      );
    });

    it('sends a bearer header when given a token', async () => {
      axiosGet.mockResolvedValue({ data: [{ checkScaleId: 1 }] });

      await service.getCheckScale('1', 'tok-123');

      expect(axiosGet).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({ Authorization: 'Bearer tok-123' }),
        }),
      );
    });
  });

  describe('validateCheckScale', () => {
    it('returns the enriched preview on success', async () => {
      axiosPost.mockResolvedValue({ data: { ok: true, checkScale: { checkScaleId: 5 } } });

      const result = await service.validateCheckScale({ chkLogTallyDocNo: 'C1' });

      expect(axiosPost).toHaveBeenCalledWith(
        '/api/check-scales/validate',
        { chkLogTallyDocNo: 'C1' },
        expect.anything(),
      );
      expect(result.ok).toBe(true);
    });

    it('turns a 400 validation body into a normal result rather than a rejection', async () => {
      // The whole point of this branch: field errors are an expected outcome, not a failure.
      axiosPost.mockRejectedValue({
        response: {
          status: 400,
          data: { ok: false, errors: [{ field: 'checkScaleDdn', message: 'Required' }] },
        },
      });

      const result = await service.validateCheckScale({});

      expect(result.ok).toBe(false);
      expect(result.errors).toEqual([{ field: 'checkScaleDdn', message: 'Required' }]);
    });

    it('rethrows a transport failure that carries no validation body', async () => {
      const networkError = new Error('Network Error');
      axiosPost.mockRejectedValue(networkError);

      await expect(service.validateCheckScale({})).rejects.toThrow('Network Error');
    });

    it('rethrows a 500 whose body is not a validation result', async () => {
      axiosPost.mockRejectedValue({
        response: { status: 500, data: 'Internal Server Error' },
      });

      await expect(service.validateCheckScale({})).rejects.toBeDefined();
    });
  });

  describe('createCheckScale', () => {
    it('posts the payload and returns the new id', async () => {
      axiosPost.mockResolvedValue({ data: { checkScaleId: 777 } });

      const result = await service.createCheckScale(createPayload);

      expect(axiosPost).toHaveBeenCalledWith(
        '/api/check-scales/create',
        createPayload,
        expect.anything(),
      );
      expect(result).toEqual({ checkScaleId: 777 });
    });

    it('lets a failure bubble up', async () => {
      axiosPost.mockRejectedValue(new Error('Conflict'));

      await expect(service.createCheckScale(createPayload)).rejects.toThrow('Conflict');
    });
  });

  describe('updateCheckScale', () => {
    it('puts to the id-scoped URL and returns the updated record', async () => {
      axiosPut.mockResolvedValue({ data: { checkScaleId: 42, checkScaleTypeCode: 'P' } });

      const result = await service.updateCheckScale('42', updatePayload);

      expect(axiosPut).toHaveBeenCalledWith(
        '/api/check-scales/42',
        updatePayload,
        expect.anything(),
      );
      expect(result.checkScaleTypeCode).toBe('P');
    });
  });

  describe('deleteCheckScale', () => {
    it('deletes the id-scoped URL', async () => {
      axiosDelete.mockResolvedValue({ status: 204 });

      await service.deleteCheckScale('42');

      expect(axiosDelete).toHaveBeenCalledWith('/api/check-scales/42', expect.anything());
    });

    it('lets a failed delete bubble up so the screen can report it', async () => {
      axiosDelete.mockRejectedValue(new Error('Forbidden'));

      await expect(service.deleteCheckScale('42')).rejects.toThrow('Forbidden');
    });
  });

  describe('getScalerCheckScales', () => {
    it('requests the tab data with the filter in the query string', async () => {
      axiosGet.mockResolvedValue({ data: { stats: { allVolume: 1.5 }, checkScales: [] } });

      const result = await service.getScalerCheckScales('S123', 'Primary/Secondary');

      expect(axiosGet).toHaveBeenCalledWith(
        '/api/scalers/S123/check-scales?filter=Primary%2FSecondary',
        expect.anything(),
      );
      expect(result.stats?.allVolume).toBe(1.5);
    });
  });

  describe('getScaleSiteCheckScales', () => {
    it('omits the query string entirely when no type code is given', async () => {
      axiosGet.mockResolvedValue({ data: { checkScales: [] } });

      await service.getScaleSiteCheckScales('SS-1');

      expect(axiosGet).toHaveBeenCalledWith(
        '/api/scale-sites/SS-1/check-scales',
        expect.anything(),
      );
    });

    it('adds the type code when one is given', async () => {
      axiosGet.mockResolvedValue({ data: { checkScales: [] } });

      await service.getScaleSiteCheckScales('SS-1', 'F');

      expect(axiosGet).toHaveBeenCalledWith(
        '/api/scale-sites/SS-1/check-scales?checkScaleTypeCode=F',
        expect.anything(),
      );
    });
  });

  describe('createCheckScaleAdvisoryLetter', () => {
    const letterRequest = {
      regDist: 'DCK',
      outputFormat: 'PDF' as const,
      preview: true,
    };

    it('returns the blob and the filename parsed from the header', async () => {
      const blob = new Blob(['pdf']);
      axiosPost.mockResolvedValue({
        data: blob,
        headers: { 'content-disposition': 'attachment; filename="advisory.pdf"' },
      });

      const result = await service.createCheckScaleAdvisoryLetter(42, letterRequest);

      expect(axiosPost).toHaveBeenCalledWith(
        '/api/check-scales/42/advisory-letter',
        letterRequest,
        expect.objectContaining({ responseType: 'blob' }),
      );
      expect(result.blob).toBe(blob);
      expect(result.filename).toBe('advisory.pdf');
    });

    it('returns a null filename when the response carries no headers', async () => {
      axiosPost.mockResolvedValue({ data: new Blob(['pdf']) });

      const result = await service.createCheckScaleAdvisoryLetter(42, letterRequest);

      expect(result.filename).toBeNull();
    });

    it('asks for the binary content types', async () => {
      axiosPost.mockResolvedValue({ data: new Blob(['pdf']), headers: {} });

      await service.createCheckScaleAdvisoryLetter(42, letterRequest);

      expect(axiosPost).toHaveBeenCalledWith(
        expect.any(String),
        expect.anything(),
        expect.objectContaining({
          headers: expect.objectContaining({
            Accept: expect.stringContaining('application/pdf'),
          }),
        }),
      );
    });
  });
});
