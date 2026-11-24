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
  ScalerAuthorizationsService,
  type ScalerAuthorizationCreateRequest,
  type ScalerAuthorizationUpdateRequest,
  type ScalerAuthorizationLetterReportRequest,
} from './scalerAuthorizations.service';

describe('ScalerAuthorizationsService', () => {
  const axiosGet = vi.mocked(axios.get);
  const axiosPost = vi.mocked(axios.post);
  const axiosPut = vi.mocked(axios.put);
  const axiosDelete = vi.mocked(axios.delete);
  const service = new ScalerAuthorizationsService();
  const TOKEN = 'token';

  const jsonHeader = expect.objectContaining({
    'Content-Type': 'application/json',
    Accept: 'application/json',
    Authorization: 'Bearer token',
  });
  const blobHeader = expect.objectContaining({
    Accept: expect.stringContaining('application/pdf'),
    Authorization: 'Bearer token',
  });

  beforeEach(() => {
    axiosGet.mockReset();
    axiosPost.mockReset();
    axiosPut.mockReset();
    axiosDelete.mockReset();
  });

  it('searchActiveScaleAuthConditions GETs /conditions with params + JSON headers', async () => {
    axiosGet.mockResolvedValue({ data: [{ scaleAuthConditionId: 102 }] } as never);
    const params = { scaleConditionClassCode: 'SCA', ministryStandardInd: 'Y' };

    const result = await service.searchActiveScaleAuthConditions(params, TOKEN);

    expect(axiosGet).toHaveBeenCalledWith('/api/scaler-authorizations/conditions', {
      params,
      headers: jsonHeader,
    });
    expect(result).toEqual([{ scaleAuthConditionId: 102 }]);
  });

  it('getScaleAuthTemplateConditions GETs the template conditions endpoint', async () => {
    axiosGet.mockResolvedValue({ data: [] } as never);

    await service.getScaleAuthTemplateConditions(443, TOKEN);

    expect(axiosGet).toHaveBeenCalledWith('/api/scaler-authorizations/templates/443/conditions', {
      headers: jsonHeader,
    });
  });

  it('createScalerAuthorization POSTs the payload to the collection endpoint', async () => {
    const payload: ScalerAuthorizationCreateRequest = {
      scalerLicenceNo: '8437',
      orgUnitNo: 1831,
      districtWideInd: 'Y',
      authorizationEffectiveDate: '2026-01-01',
      authorizationExpiryDate: '2027-01-01',
      jobFunctions: ['P'],
    };
    axiosPost.mockResolvedValue({ data: { scalerAuthorizationId: 5 } } as never);

    const result = await service.createScalerAuthorization(payload, TOKEN);

    expect(axiosPost).toHaveBeenCalledWith('/api/scaler-authorizations', payload, {
      headers: jsonHeader,
    });
    expect(result).toEqual({ scalerAuthorizationId: 5 });
  });

  it('updateScalerAuthorization PUTs to the id endpoint (id encoded)', async () => {
    const payload = { scalerLicenceNo: '8437' } as ScalerAuthorizationUpdateRequest;
    axiosPut.mockResolvedValue({ data: { scalerAuthorizationId: 42 } } as never);

    await service.updateScalerAuthorization(42, payload, TOKEN);

    expect(axiosPut).toHaveBeenCalledWith('/api/scaler-authorizations/42', payload, {
      headers: jsonHeader,
    });
  });

  it('listScalerAuthorizations GETs the by-scaler list endpoint (licence encoded)', async () => {
    axiosGet.mockResolvedValue({ data: [{ scalerAuthorizationId: 3071 }] } as never);

    const result = await service.listScalerAuthorizations('001A', TOKEN);

    expect(axiosGet).toHaveBeenCalledWith('/api/scalers/001A/authorizations', {
      headers: jsonHeader,
    });
    expect(result).toEqual([{ scalerAuthorizationId: 3071 }]);
  });

  it('getScalerAuthorization GETs the id endpoint', async () => {
    axiosGet.mockResolvedValue({ data: { scalerAuthorizationId: 5 } } as never);

    await service.getScalerAuthorization(5, TOKEN);

    expect(axiosGet).toHaveBeenCalledWith('/api/scaler-authorizations/5', {
      headers: jsonHeader,
    });
  });

  it('deleteScalerAuthorization DELETEs the id endpoint (id encoded)', async () => {
    axiosDelete.mockResolvedValue({} as never);

    await service.deleteScalerAuthorization(5, TOKEN);

    expect(axiosDelete).toHaveBeenCalledWith('/api/scaler-authorizations/5', {
      headers: jsonHeader,
    });
  });

  it('createScalerAuthorizationLetter POSTs as a blob and extracts the filename', async () => {
    const payload = { regDist: '1831', scaleSignatoryBlockId: 744, outputFormat: 'PDF', preview: true } as ScalerAuthorizationLetterReportRequest;
    const blob = new Blob(['pdf']);
    axiosPost.mockResolvedValue({
      data: blob,
      headers: { 'content-disposition': 'attachment; filename="letter-5.pdf"' },
    } as never);

    const result = await service.createScalerAuthorizationLetter(5, payload, TOKEN);

    expect(axiosPost).toHaveBeenCalledWith('/api/scaler-authorizations/5/letter', payload, {
      responseType: 'blob',
      headers: blobHeader,
    });
    expect(result.blob).toBe(blob);
    expect(result.filename).toBe('letter-5.pdf');
  });

  it('getScalerAuthorizationLetter GETs the stored letter as a blob', async () => {
    const blob = new Blob(['pdf']);
    axiosGet.mockResolvedValue({ data: blob, headers: {} } as never);

    const result = await service.getScalerAuthorizationLetter(5, TOKEN);

    expect(axiosGet).toHaveBeenCalledWith('/api/scaler-authorizations/5/letter', {
      responseType: 'blob',
      headers: blobHeader,
    });
    expect(result.blob).toBe(blob);
    expect(result.filename).toBeNull(); // no content-disposition → null
  });
});
