import axios from 'axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./APIs', () => ({ BackendApiConfig: { BASE: '/api' } }));
vi.mock('axios', () => ({ default: { get: vi.fn() } }));

import { LovService } from './lov.service';

describe('LovService', () => {
  const axiosGet = vi.mocked(axios.get);
  const service = new LovService();

  beforeEach(() => {
    axiosGet.mockReset();
    axiosGet.mockResolvedValue({ data: [] });
  });

  it.each([
    ['getAppointmentTypeLov', '/api/appointment-type-lov'],
    ['getRegionDistrictLov', '/api/region-district-lov'],
    ['getRegionDistrictRollupLov', '/api/region-district-rollup-lov'],
    ['getScaleMethodTypeLov', '/api/scale-method-type-lov'],
    ['getStaticLov', '/api/static-lov'],
  ])('%s requests %s', async (method, url) => {
    await (service as unknown as Record<string, (p?: unknown) => Promise<unknown>>)[method]();

    expect(axiosGet).toHaveBeenCalledWith(url, expect.anything());
  });

  it('requests the grading code appointment types', async () => {
    await service.getGradingCodeAppointmentTypeLov();

    expect(axiosGet).toHaveBeenCalledWith(
      '/api/grading-code-appointment-type-lov',
      expect.anything(),
    );
  });

  it('requests the scaler training types', async () => {
    await service.getScalerTrainingTypeLov();

    expect(axiosGet).toHaveBeenCalledWith('/api/scaler-training-type-lov', expect.anything());
  });

  it('requests the species product grade cross-reference', async () => {
    await service.getSpeciesProductGradeXref();

    expect(axiosGet).toHaveBeenCalledWith(
      '/api/species-product-grade-xref-lov',
      expect.anything(),
    );
  });

  it('passes filters through as axios params rather than a hand-built query string', async () => {
    const params = { tableKey: 'SCALE_SPECIES_CODE' };

    await service.getStaticLov(params);

    expect(axiosGet).toHaveBeenCalledWith(
      '/api/static-lov',
      expect.objectContaining({ params }),
    );
  });

  it('escapes the template filter field into the path', async () => {
    await service.getTemplates('scaler auth/ind');

    expect(axiosGet).toHaveBeenCalledWith(
      '/api/templates/scaler%20auth%2Find',
      expect.anything(),
    );
  });

  it('sends a bearer header when given a token', async () => {
    await service.getStaticLov(undefined, 'tok-123');

    expect(axiosGet).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer tok-123' }),
      }),
    );
  });

  it('returns the list the backend sends', async () => {
    axiosGet.mockResolvedValue({ data: [{ code: 'A', description: 'Option A' }] });

    await expect(service.getStaticLov()).resolves.toEqual([
      { code: 'A', description: 'Option A' },
    ]);
  });

  it('lets a failure bubble up rather than resolving empty', async () => {
    axiosGet.mockRejectedValue(new Error('LOV service unavailable.'));

    await expect(service.getStaticLov()).rejects.toThrow('LOV service unavailable.');
  });
});
