import axios from 'axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./APIs', () => ({
  BackendApiConfig: {
    BASE: '/api',
  },
}));

import { MarkSiteDesignationService } from './markSiteDesignation.service';

vi.mock('axios', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
  },
}));

describe('MarkSiteDesignationService', () => {
  const axiosGet = vi.mocked(axios.get);
  const axiosPost = vi.mocked(axios.post);
  const axiosPut = vi.mocked(axios.put);
  const service = new MarkSiteDesignationService();

  beforeEach(() => {
    axiosGet.mockReset();
    axiosPost.mockReset();
    axiosPut.mockReset();
  });

  it('calls the workbench search endpoint with expected params', async () => {
    axiosGet.mockResolvedValue({ data: [{ haulingMarkAuthorizationId: 12345, timberMark: 'TM123' }] });

    const result = await service.searchMarkSiteDesignations(
      {
        timberMark: 'TM123',
        primarySort: 2,
        secondarySort: 1,
      },
      'token',
    );

    expect(result).toEqual([{ haulingMarkAuthorizationId: 12345, timberMark: 'TM123' }]);
    expect(axiosGet).toHaveBeenCalledWith(
      expect.stringMatching(/\/mark-site-designations\/workbench$/),
      expect.objectContaining({
        params: {
          timberMark: 'TM123',
          primarySort: 2,
          secondarySort: 1,
        },
        headers: expect.objectContaining({
          Accept: 'application/json',
          Authorization: 'Bearer token',
        }),
      }),
    );
  });

  it('calls remove-from-workbench endpoint with the authorization id', async () => {
    axiosPost.mockResolvedValue({ data: {} });

    await service.removeMarkSiteDesignationFromWorkbench(12345, 'token');

    expect(axiosPost).toHaveBeenCalledWith(
      expect.stringMatching(/\/mark-site-designations\/12345\/workbench\/remove$/),
      undefined,
      expect.objectContaining({
        headers: expect.objectContaining({
          Accept: 'application/json',
          Authorization: 'Bearer token',
        }),
      }),
    );
  });

  it('calls the mark-site-designations detail endpoint with authorization id', async () => {
    axiosGet.mockResolvedValue({
      data: {
        haulingMarkAuthorizationId: 12345,
        timberMark: 'TM123',
      },
    });

    const result = await service.getMarkSiteDesignation(12345, 'token');

    expect(result).toEqual({
      haulingMarkAuthorizationId: 12345,
      timberMark: 'TM123',
    });
    expect(axiosGet).toHaveBeenCalledWith(
      expect.stringMatching(/\/mark-site-designations\/12345$/),
      expect.objectContaining({
        headers: expect.objectContaining({
          Accept: 'application/json',
          Authorization: 'Bearer token',
        }),
      }),
    );
  });

  it('calls the timber-mark search endpoint with the timberMark param', async () => {
    axiosGet.mockResolvedValue({ data: [{ haulingMarkAuthorizationId: 1, timberMark: 'GE5412' }] });

    const result = await service.searchMarkSiteDesignationsByTimberMark('GE5412', 'token');

    expect(result).toEqual([{ haulingMarkAuthorizationId: 1, timberMark: 'GE5412' }]);
    expect(axiosGet).toHaveBeenCalledWith(
      expect.stringMatching(/\/mark-site-designations\/search$/),
      expect.objectContaining({ params: { timberMark: 'GE5412' } }),
    );
  });

  it('calls the timber-mark holder lookup endpoint with the timberMark param', async () => {
    axiosGet.mockResolvedValue({ data: { timberMark: 'GE5412', markHolderName: 'HOLDER' } });

    const result = await service.getMarkSiteDesignationTimberMarkLookup('GE5412', 'token');

    expect(result).toEqual({ timberMark: 'GE5412', markHolderName: 'HOLDER' });
    expect(axiosGet).toHaveBeenCalledWith(
      expect.stringMatching(/\/mark-site-designations$/),
      expect.objectContaining({ params: { timberMark: 'GE5412' } }),
    );
  });

  it('posts the create payload to the collection endpoint', async () => {
    axiosPost.mockResolvedValue({ data: { haulingMarkAuthorizationId: 555 } });
    const payload = { timberMark: 'ES20R4', effectiveDate: '2026-01-01', expiryDate: '2026-12-31', orgUnitNo: 1831, districtWideInd: 'Y' as const };

    const result = await service.createMarkSiteDesignation(payload, 'token');

    expect(result).toEqual({ haulingMarkAuthorizationId: 555 });
    expect(axiosPost).toHaveBeenCalledWith(
      expect.stringMatching(/\/mark-site-designations$/),
      payload,
      expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer token' }) }),
    );
  });

  it('puts the update payload to the by-id endpoint', async () => {
    axiosPut.mockResolvedValue({ data: { haulingMarkAuthorizationId: 555 } });
    const payload = { expiryDate: '2027-12-31' };

    await service.updateMarkSiteDesignation(555, payload, 'token');

    expect(axiosPut).toHaveBeenCalledWith(
      expect.stringMatching(/\/mark-site-designations\/555$/),
      payload,
      expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer token' }) }),
    );
  });

  it('posts to the renew endpoint with the authorization id', async () => {
    axiosPost.mockResolvedValue({ data: { newAuthorizationId: 777 } });

    const result = await service.renewMarkSiteDesignation(555, 'token');

    expect(result).toEqual({ newAuthorizationId: 777 });
    expect(axiosPost).toHaveBeenCalledWith(
      expect.stringMatching(/\/mark-site-designations\/555\/renew$/),
      undefined,
      expect.anything(),
    );
  });

  it('creates a letter and returns the blob + filename from content-disposition', async () => {
    const blob = new Blob(['pdf']);
    axiosPost.mockResolvedValue({ data: blob, headers: { 'content-disposition': 'attachment; filename="ES20R4-letter.pdf"' } });
    const payload = { regDist: '1831', scaleSignatoryBlockId: 744, outputFormat: 'PDF' as const, preview: true };

    const result = await service.createMarkSiteDesignationLetter(555, payload, 'token');

    expect(result.blob).toBe(blob);
    expect(result.filename).toBe('ES20R4-letter.pdf');
    expect(axiosPost).toHaveBeenCalledWith(
      expect.stringMatching(/\/mark-site-designations\/555\/letter$/),
      payload,
      expect.objectContaining({ responseType: 'blob' }),
    );
  });

  it('gets an existing letter and returns the blob + filename', async () => {
    const blob = new Blob(['pdf']);
    axiosGet.mockResolvedValue({ data: blob, headers: { 'content-disposition': 'attachment; filename="ES20R4-letter.pdf"' } });

    const result = await service.getMarkSiteDesignationLetter(555, 'token');

    expect(result.blob).toBe(blob);
    expect(result.filename).toBe('ES20R4-letter.pdf');
    expect(axiosGet).toHaveBeenCalledWith(
      expect.stringMatching(/\/mark-site-designations\/555\/letter$/),
      expect.objectContaining({ responseType: 'blob' }),
    );
  });
});
