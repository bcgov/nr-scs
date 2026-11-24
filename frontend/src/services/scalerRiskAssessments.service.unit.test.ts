import axios from 'axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./APIs', () => ({ BackendApiConfig: { BASE: '/api' } }));
vi.mock('axios', () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

import { ScalerRiskAssessmentsService } from './scalerRiskAssessments.service';

describe('ScalerRiskAssessmentsService', () => {
  const axiosGet = vi.mocked(axios.get);
  const axiosPost = vi.mocked(axios.post);
  const axiosPut = vi.mocked(axios.put);
  const service = new ScalerRiskAssessmentsService();

  beforeEach(() => {
    axiosGet.mockReset();
    axiosPost.mockReset();
    axiosPut.mockReset();
  });

  it('reads one assessment by id', async () => {
    axiosGet.mockResolvedValue({ data: { riskQuestionnaireId: 7 } });

    const result = await service.getScalerRiskAssessment(7);

    expect(axiosGet).toHaveBeenCalledWith(
      '/api/scaler-risk-assessments/7',
      expect.anything(),
    );
    expect(result.riskQuestionnaireId).toBe(7);
  });

  it('sends a bearer header when given a token', async () => {
    axiosGet.mockResolvedValue({ data: {} });

    await service.getScalerRiskAssessment(7, 'tok-123');

    expect(axiosGet).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer tok-123' }),
      }),
    );
  });

  it('updates an assessment by id', async () => {
    const payload = { answers: [] } as never;
    axiosPut.mockResolvedValue({ data: { riskQuestionnaireId: 7 } });

    await service.updateScalerRiskAssessment(7, payload);

    expect(axiosPut).toHaveBeenCalledWith(
      '/api/scaler-risk-assessments/7',
      payload,
      expect.anything(),
    );
  });

  it('searches with the params object rather than a hand-built query string', async () => {
    const params = { scalerLicenceNo: 'S1234' } as never;
    axiosGet.mockResolvedValue({ data: [{ riskQuestionnaireId: 1 }] });

    const result = await service.searchScalerRiskAssessments(params);

    expect(axiosGet).toHaveBeenCalledWith(
      '/api/scaler-risk-assessments/search',
      expect.objectContaining({ params }),
    );
    expect(result).toHaveLength(1);
  });

  it('reads the risk ratings for a scaler, escaping the licence number', async () => {
    axiosGet.mockResolvedValue({ data: [] });

    await service.getScalerRiskRatings('S 1234/A');

    expect(axiosGet).toHaveBeenCalledWith(
      '/api/scalers/S%201234%2FA/risk-ratings',
      expect.anything(),
    );
  });

  it('reads the create-init payload for a scaler', async () => {
    axiosGet.mockResolvedValue({ data: { riskQuestionnaireId: null } });

    await service.getScalerRiskAssessmentCreateInit('S1234');

    expect(axiosGet).toHaveBeenCalledWith(
      '/api/scalers/S1234/risk-assessments/create-init',
      expect.anything(),
    );
  });

  it('creates an assessment for a scaler', async () => {
    const payload = { answers: [] } as never;
    axiosPost.mockResolvedValue({ data: { riskQuestionnaireId: 9 } });

    const result = await service.createScalerRiskAssessment('S1234', payload);

    expect(axiosPost).toHaveBeenCalledWith(
      '/api/scalers/S1234/risk-assessments',
      payload,
      expect.anything(),
    );
    expect(result.riskQuestionnaireId).toBe(9);
  });

  it('lets a failure bubble up rather than resolving empty', async () => {
    axiosGet.mockRejectedValue(new Error('Service unavailable.'));

    await expect(service.getScalerRiskAssessment(7)).rejects.toThrow('Service unavailable.');
  });
});
