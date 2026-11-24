import axios from 'axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./APIs', () => ({
  BackendApiConfig: {
    BASE: '/api',
  },
}));

import { ScaleSiteContactsService } from './scaleSiteContacts.service';

vi.mock('axios', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('ScaleSiteContactsService', () => {
  const axiosGet = vi.mocked(axios.get);
  const axiosPost = vi.mocked(axios.post);
  const axiosPut = vi.mocked(axios.put);
  const axiosDelete = vi.mocked(axios.delete);
  const service = new ScaleSiteContactsService();

  beforeEach(() => {
    axiosGet.mockReset();
    axiosPost.mockReset();
    axiosPut.mockReset();
    axiosDelete.mockReset();
  });

  it('gets the contacts list with the scale site id in the path', async () => {
    axiosGet.mockResolvedValue({ data: [{ clientContactId: 12345 }] });

    const result = await service.getScaleSiteContacts('SITE 001', 'token');

    expect(result).toEqual([{ clientContactId: 12345 }]);
    expect(axiosGet).toHaveBeenCalledTimes(1);
    expect(axiosGet).toHaveBeenCalledWith(
      expect.stringMatching(/\/scale-sites\/SITE%20001\/contacts$/),
      expect.objectContaining({
        headers: expect.objectContaining({
          Accept: 'application/json',
          Authorization: 'Bearer token',
        }),
      }),
    );
  });

  it('normalizes wrapped contacts payloads to a list', async () => {
    axiosGet.mockResolvedValue({ data: { contacts: [{ clientContactId: 12345 }] } });

    const result = await service.getScaleSiteContacts('SITE 001');

    expect(result).toEqual([{ clientContactId: 12345 }]);
  });

  it('creates a contact with the request body and JSON headers', async () => {
    const payload = {
      clientContactId: 12345,
      contactRoleDescription: 'Site Manager',
      primaryContactInd: 'Y' as const,
      siteInformationAccessInd: 'N' as const,
      effectiveDate: '2024-01-01',
      expiryDate: null,
    };
    axiosPost.mockResolvedValue({ data: { clientContactId: 12345 } });

    const result = await service.createScaleSiteContact('SITE001', payload, 'token');

    expect(result).toEqual({ clientContactId: 12345 });
    expect(axiosPost).toHaveBeenCalledTimes(1);
    expect(axiosPost).toHaveBeenCalledWith(
      expect.stringMatching(/\/scale-sites\/SITE001\/contacts$/),
      payload,
      expect.objectContaining({
        headers: expect.objectContaining({
          Accept: 'application/json',
          Authorization: 'Bearer token',
          'Content-Type': 'application/json',
        }),
      }),
    );
  });

  it('updates a contact with the client contact id in the path and the request body', async () => {
    const payload = {
      contactRoleDescription: 'Lead Manager',
      primaryContactInd: 'Y' as const,
      siteInformationAccessInd: 'N' as const,
      effectiveDate: '2024-01-01',
      expiryDate: null,
    };
    axiosPut.mockResolvedValue({ data: { clientContactId: 12345 } });

    const result = await service.updateScaleSiteContact('SITE001', 12345, payload, 'token');

    expect(result).toEqual({ clientContactId: 12345 });
    expect(axiosPut).toHaveBeenCalledTimes(1);
    expect(axiosPut).toHaveBeenCalledWith(
      expect.stringMatching(/\/scale-sites\/SITE001\/contacts\/12345$/),
      payload,
      expect.objectContaining({
        headers: expect.objectContaining({
          Accept: 'application/json',
          Authorization: 'Bearer token',
          'Content-Type': 'application/json',
        }),
      }),
    );
  });

  it('deletes a contact with the client contact id in the path', async () => {
    axiosDelete.mockResolvedValue({ data: undefined });

    await service.deleteScaleSiteContact('SITE001', 12345, 'token');

    expect(axiosDelete).toHaveBeenCalledTimes(1);
    expect(axiosDelete).toHaveBeenCalledWith(
      expect.stringMatching(/\/scale-sites\/SITE001\/contacts\/12345$/),
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer token' }),
      }),
    );
  });

  it('gets the scale site owner with the scale site id in the path', async () => {
    axiosGet.mockResolvedValue({ data: { companyName: 'ACME' } });

    const result = await service.getScaleSiteOwner('SITE001', 'token');

    expect(result).toEqual({ companyName: 'ACME' });
    expect(axiosGet).toHaveBeenCalledWith(
      expect.stringMatching(/\/scale-sites\/SITE001\/owner$/),
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer token' }),
      }),
    );
  });

  it('searches client contacts by name as a query parameter', async () => {
    axiosGet.mockResolvedValue({ data: [{ clientContactId: 12345 }] });

    const result = await service.searchClientContacts({ contactName: 'smith' }, 'token');

    expect(result).toEqual([{ clientContactId: 12345 }]);
    expect(axiosGet).toHaveBeenCalledWith(
      expect.stringMatching(/\/client-contacts\/search\?contactName=smith$/),
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer token' }),
      }),
    );
  });

  it('searches client contacts by id as a query parameter', async () => {
    axiosGet.mockResolvedValue({ data: [] });

    await service.searchClientContacts({ clientContactId: 12345 });

    expect(axiosGet).toHaveBeenCalledWith(
      expect.stringMatching(/\/client-contacts\/search\?clientContactId=12345$/),
      expect.objectContaining({
        headers: expect.objectContaining({ Accept: 'application/json' }),
      }),
    );
  });

  it('searches client contacts by client number, location and name', async () => {
    axiosGet.mockResolvedValue({ data: [] });

    await service.searchClientContacts({ clientNumber: '12345678', clientLocnCode: '00', contactName: 'smith' }, 'token');

    expect(axiosGet).toHaveBeenCalledWith(
      expect.stringMatching(/\/client-contacts\/search\?contactName=smith&clientNumber=12345678&clientLocnCode=00$/),
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer token' }),
      }),
    );
  });
});
