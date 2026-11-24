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

import { ScaleSiteAuthorizationsService } from './scaleSiteAuthorizations.service';

describe('ScaleSiteAuthorizationsService', () => {
  const axiosGet = vi.mocked(axios.get);
  const axiosPost = vi.mocked(axios.post);
  const axiosPut = vi.mocked(axios.put);
  const axiosDelete = vi.mocked(axios.delete);
  const service = new ScaleSiteAuthorizationsService();

  beforeEach(() => {
    axiosGet.mockReset();
    axiosPost.mockReset();
    axiosPut.mockReset();
    axiosDelete.mockReset();
  });

  describe('conditions', () => {
    it('passes the search params through as axios params, not a hand-built query string', async () => {
      axiosGet.mockResolvedValue({ data: [{ conditionId: 1 }] });

      const params = { conditionText: 'log haul', primarySort: 1 } as never;
      const result = await service.searchActiveScaleSiteAuthConditions(params);

      expect(axiosGet).toHaveBeenCalledWith(
        '/api/scale-site-authorizations/conditions',
        expect.objectContaining({ params }),
      );
      expect(result).toEqual([{ conditionId: 1 }]);
    });

    it('omits params entirely when called with none', async () => {
      axiosGet.mockResolvedValue({ data: [] });

      await service.searchActiveScaleSiteAuthConditions();

      expect(axiosGet).toHaveBeenCalledWith(
        '/api/scale-site-authorizations/conditions',
        expect.objectContaining({ params: undefined }),
      );
    });

    it('fetches the conditions attached to a template', async () => {
      axiosGet.mockResolvedValue({ data: [{ conditionId: 9 }] });

      const result = await service.getScaleSiteAuthTemplateConditions(55);

      expect(axiosGet).toHaveBeenCalledWith(
        '/api/scale-site-authorizations/templates/55/conditions',
        expect.anything(),
      );
      expect(result).toHaveLength(1);
    });
  });

  describe('create / update / read / delete', () => {
    it('posts a new authorization to the collection URL', async () => {
      const payload = { scaleSiteIdNmbr: 'SS-1' } as never;
      axiosPost.mockResolvedValue({ data: { scaleSiteAuthorizationId: 10 } });

      const result = await service.createScaleSiteAuthorization(payload);

      expect(axiosPost).toHaveBeenCalledWith(
        '/api/scale-site-authorizations',
        payload,
        expect.anything(),
      );
      expect(result).toEqual({ scaleSiteAuthorizationId: 10 });
    });

    it('puts an update to the id-scoped URL', async () => {
      const payload = { effectiveDate: '2026-01-01' } as never;
      axiosPut.mockResolvedValue({ data: { scaleSiteAuthorizationId: 10 } });

      await service.updateScaleSiteAuthorization(10, payload);

      expect(axiosPut).toHaveBeenCalledWith(
        '/api/scale-site-authorizations/10',
        payload,
        expect.anything(),
      );
    });

    it('reads one authorization by id', async () => {
      axiosGet.mockResolvedValue({ data: { scaleSiteAuthorizationId: 10 } });

      const result = await service.getScaleSiteAuthorization(10);

      expect(axiosGet).toHaveBeenCalledWith(
        '/api/scale-site-authorizations/10',
        expect.anything(),
      );
      expect(result.scaleSiteAuthorizationId).toBe(10);
    });

    it('lists the authorizations for a site, escaping the site number', async () => {
      axiosGet.mockResolvedValue({ data: [] });

      await service.listScaleSiteAuthorizations('SS 1/2');

      expect(axiosGet).toHaveBeenCalledWith(
        '/api/scale-sites/SS%201%2F2/authorizations',
        expect.anything(),
      );
    });

    it('deletes by id', async () => {
      axiosDelete.mockResolvedValue({ status: 204 });

      await service.deleteScaleSiteAuthorization(10);

      expect(axiosDelete).toHaveBeenCalledWith(
        '/api/scale-site-authorizations/10',
        expect.anything(),
      );
    });

    it('lets a failed delete bubble up', async () => {
      axiosDelete.mockRejectedValue(new Error('Conflict'));

      await expect(service.deleteScaleSiteAuthorization(10)).rejects.toThrow('Conflict');
    });
  });

  describe('letters', () => {
    const letterRequest = { outputFormat: 'PDF', preview: false } as never;

    it('generates a letter and parses its filename', async () => {
      const blob = new Blob(['pdf']);
      axiosPost.mockResolvedValue({
        data: blob,
        headers: { 'content-disposition': 'attachment; filename="site-auth.pdf"' },
      });

      const result = await service.createScaleSiteAuthorizationLetter(10, letterRequest);

      expect(axiosPost).toHaveBeenCalledWith(
        '/api/scale-site-authorizations/10/letter',
        letterRequest,
        expect.objectContaining({ responseType: 'blob' }),
      );
      expect(result.blob).toBe(blob);
      expect(result.filename).toBe('site-auth.pdf');
    });

    it('retrieves a previously generated letter', async () => {
      axiosGet.mockResolvedValue({
        data: new Blob(['pdf']),
        headers: { 'content-disposition': 'attachment; filename="stored.pdf"' },
      });

      const result = await service.getScaleSiteAuthorizationLetter(10);

      expect(axiosGet).toHaveBeenCalledWith(
        '/api/scale-site-authorizations/10/letter',
        expect.objectContaining({ responseType: 'blob' }),
      );
      expect(result.filename).toBe('stored.pdf');
    });

    it('yields a null filename when the header is absent', async () => {
      axiosGet.mockResolvedValue({ data: new Blob(['pdf']), headers: {} });

      const result = await service.getScaleSiteAuthorizationLetter(10);

      expect(result.filename).toBeNull();
    });
  });

  describe('workbench', () => {
    it('searches the workbench with the params object', async () => {
      const params = { timberMark: 'TM1', primarySort: 2 } as never;
      axiosGet.mockResolvedValue({ data: [{ scaleSiteAuthorizationId: 1 }] });

      const result = await service.searchScaleSiteAuthorizations(params);

      expect(axiosGet).toHaveBeenCalledWith(
        '/api/scale-site-authorizations/workbench',
        expect.objectContaining({ params }),
      );
      expect(result).toHaveLength(1);
    });

    it('renews with an empty body, not the id repeated in the payload', async () => {
      axiosPost.mockResolvedValue({ data: { renewed: true } });

      const result = await service.renewScaleSiteAuthorization(10);

      expect(axiosPost).toHaveBeenCalledWith(
        '/api/scale-site-authorizations/10/renew',
        undefined,
        expect.anything(),
      );
      expect(result).toEqual({ renewed: true });
    });

    it('surfaces a refused renewal to the caller', async () => {
      axiosPost.mockRejectedValue(new Error('Not renewable'));

      await expect(service.renewScaleSiteAuthorization(10)).rejects.toThrow('Not renewable');
    });

    it('removes an authorization from the workbench', async () => {
      axiosPost.mockResolvedValue({ status: 204 });

      await service.removeScaleSiteAuthorizationFromWorkbench(10);

      expect(axiosPost).toHaveBeenCalledWith(
        '/api/scale-site-authorizations/10/workbench/remove',
        undefined,
        expect.anything(),
      );
    });
  });
});
