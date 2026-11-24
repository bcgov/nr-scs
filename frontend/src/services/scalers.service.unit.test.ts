import axios from 'axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./APIs', () => ({ BackendApiConfig: { BASE: '/api' } }));
vi.mock('axios', () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

import { ScalersService } from './scalers.service';

describe('ScalersService', () => {
  const axiosGet = vi.mocked(axios.get);
  const axiosPost = vi.mocked(axios.post);
  const axiosPut = vi.mocked(axios.put);
  const axiosPatch = vi.mocked(axios.patch);
  const axiosDelete = vi.mocked(axios.delete);
  const service = new ScalersService();

  beforeEach(() => {
    axiosGet.mockReset().mockResolvedValue({ data: {} });
    axiosPost.mockReset().mockResolvedValue({ data: {} });
    axiosPut.mockReset().mockResolvedValue({ data: {} });
    axiosPatch.mockReset().mockResolvedValue({ data: {} });
    axiosDelete.mockReset().mockResolvedValue({ status: 204 });
  });

  it('creates a scaler at the collection URL', async () => {
    const payload = { legalFirstName: 'Jane' } as never;

    await service.createScaler(payload);

    expect(axiosPost).toHaveBeenCalledWith('/api/scalers', payload, expect.anything());
  });

  it('reads one scaler, escaping the licence number', async () => {
    await service.getScaler('S 1234/A');

    expect(axiosGet).toHaveBeenCalledWith('/api/scalers/S%201234%2FA', expect.anything());
  });

  it('updates a scaler at its id-scoped URL', async () => {
    const payload = { legalFirstName: 'Jane' } as never;

    await service.updateScaler('S1234', payload);

    expect(axiosPut).toHaveBeenCalledWith('/api/scalers/S1234', payload, expect.anything());
  });

  it('deletes a scaler', async () => {
    await service.deleteScaler('S1234');

    expect(axiosDelete).toHaveBeenCalledWith('/api/scalers/S1234', expect.anything());
  });

  it('patches the licence cancelled date on its own endpoint', async () => {
    // A PATCH, not a PUT: only this one field is being changed.
    await service.updateLicenceCancelledDate('S1234', '2026-06-01');

    expect(axiosPatch).toHaveBeenCalledWith(
      '/api/scalers/S1234/licence-cancelled-date',
      { licenceCancelledDate: '2026-06-01' },
      expect.anything(),
    );
  });

  it('clears the licence cancelled date by sending null', async () => {
    await service.updateLicenceCancelledDate('S1234', null);

    expect(axiosPatch).toHaveBeenCalledWith(
      expect.any(String),
      { licenceCancelledDate: null },
      expect.anything(),
    );
  });

  it('reads the scaler summary', async () => {
    await service.getScalerSummary('S1234');

    expect(axiosGet).toHaveBeenCalledWith('/api/scalers/S1234/summary', expect.anything());
  });

  it('reads the scaler address', async () => {
    await service.getScalerAddress('S1234');

    expect(axiosGet).toHaveBeenCalledWith('/api/scalers/S1234/address', expect.anything());
  });

  it('reads the scaler tombstone', async () => {
    await service.getScalerTombstone('S1234');

    expect(axiosGet).toHaveBeenCalledWith('/api/scalers/S1234/tombstone', expect.anything());
  });

  it('searches with the params object', async () => {
    const params = { scalerLicenceNo: 'S1234' } as never;
    axiosGet.mockResolvedValue({ data: [] });

    await service.searchScalers(params);

    expect(axiosGet).toHaveBeenCalledWith(
      '/api/scalers/search',
      expect.objectContaining({ params }),
    );
  });

  it('sends a bearer header when given a token', async () => {
    await service.getScaler('S1234', 'tok-123');

    expect(axiosGet).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer tok-123' }),
      }),
    );
  });

  it('lets a failed delete bubble up', async () => {
    axiosDelete.mockRejectedValue(new Error('Forbidden'));

    await expect(service.deleteScaler('S1234')).rejects.toThrow('Forbidden');
  });
});
