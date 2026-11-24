import axios from 'axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./APIs', () => ({
  BackendApiConfig: {
    BASE: '/api',
  },
}));

import { ScaleSiteRiskAssessmentsService } from './scaleSiteRiskAssessments.service';

import type { RiskAssessmentSaveRequest } from './riskAssessment.types';

vi.mock('axios', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
  },
}));

const TOKEN = 'token';

const bearerHeaders = () =>
  expect.objectContaining({
    headers: expect.objectContaining({
      Accept: 'application/json',
      Authorization: `Bearer ${TOKEN}`,
    }),
  });

describe('ScaleSiteRiskAssessmentsService', () => {
  const axiosGet = vi.mocked(axios.get);
  const axiosPost = vi.mocked(axios.post);
  const axiosPut = vi.mocked(axios.put);
  const service = new ScaleSiteRiskAssessmentsService();

  beforeEach(() => {
    axiosGet.mockReset();
    axiosPost.mockReset();
    axiosPut.mockReset();
  });

  describe('getScaleSiteRiskAssessment', () => {
    it('GETs one assessment by id with bearer auth', async () => {
      const detail = { riskQuestionnaireId: 42, scaleSiteIdNmbr: 'SITE1' };
      axiosGet.mockResolvedValue({ data: detail });

      const result = await service.getScaleSiteRiskAssessment(42, TOKEN);

      expect(result).toEqual(detail);
      expect(axiosGet).toHaveBeenCalledTimes(1);
      expect(axiosGet).toHaveBeenCalledWith('/api/scale-site-risk-assessments/42', bearerHeaders());
    });
  });

  describe('updateScaleSiteRiskAssessment', () => {
    it('PUTs the save request to the assessment id path', async () => {
      const request: RiskAssessmentSaveRequest = { comments: 'c', responses: [] };
      const updated = { riskQuestionnaireId: 42, comments: 'c' };
      axiosPut.mockResolvedValue({ data: updated });

      const result = await service.updateScaleSiteRiskAssessment(42, request, TOKEN);

      expect(result).toEqual(updated);
      expect(axiosPut).toHaveBeenCalledTimes(1);
      expect(axiosPut).toHaveBeenCalledWith(
        '/api/scale-site-risk-assessments/42',
        request,
        bearerHeaders(),
      );
    });
  });

  describe('searchScaleSiteRiskAssessments', () => {
    it('GETs the search endpoint passing the filters as query params', async () => {
      const rows = [{ riskQuestionnaireId: 1 }];
      axiosGet.mockResolvedValue({ data: rows });
      const params = { siteName: 'YARD', methodTypes: ['WT'], primarySort: 1 };

      const result = await service.searchScaleSiteRiskAssessments(params, TOKEN);

      expect(result).toEqual(rows);
      expect(axiosGet).toHaveBeenCalledWith(
        '/api/scale-site-risk-assessments/search',
        expect.objectContaining({
          params,
          headers: expect.objectContaining({ Authorization: `Bearer ${TOKEN}` }),
        }),
      );
    });
  });

  describe('getScaleSiteRiskRatings', () => {
    it('GETs the risk ratings summary with the encoded scale site id in the path', async () => {
      const ratings = [{ riskQuestionnaireId: 7, entryTimestamp: '2025-01-01' }];
      axiosGet.mockResolvedValue({ data: ratings });

      const result = await service.getScaleSiteRiskRatings('SITE 1', TOKEN);

      expect(result).toEqual(ratings);
      expect(axiosGet).toHaveBeenCalledWith(
        '/api/scale-sites/SITE%201/risk-ratings',
        bearerHeaders(),
      );
    });
  });

  describe('getScaleSiteRiskAssessmentCreateInit', () => {
    it('GETs the create-init payload with the encoded scale site id in the path', async () => {
      const detail = { scaleSiteIdNmbr: 'SITE 1', templateId: 7, sections: [], riskRatings: [] };
      axiosGet.mockResolvedValue({ data: detail });

      const result = await service.getScaleSiteRiskAssessmentCreateInit('SITE 1', 'token');

      expect(result).toEqual(detail);
      expect(axiosGet).toHaveBeenCalledTimes(1);
      expect(axiosGet).toHaveBeenCalledWith(
        expect.stringMatching(/\/scale-sites\/SITE%201\/risk-assessments\/create-init$/),
        expect.objectContaining({
          headers: expect.objectContaining({
            Accept: 'application/json',
            Authorization: 'Bearer token',
          }),
        }),
      );
    });
  });

  describe('createScaleSiteRiskAssessment', () => {
    it('POSTs the request body to the subject-scoped create path with the encoded id', async () => {
      const request: RiskAssessmentSaveRequest = {
        comments: 'note',
        responses: [{ questionId: 101, answerId: 5002 }],
      };
      const created = { riskQuestionnaireId: 999, scaleSiteIdNmbr: 'SITE 1' };
      axiosPost.mockResolvedValue({ data: created });

      const result = await service.createScaleSiteRiskAssessment('SITE 1', request, 'token');

      expect(result).toEqual(created);
      expect(axiosPost).toHaveBeenCalledTimes(1);
      expect(axiosPost).toHaveBeenCalledWith(
        expect.stringMatching(/\/scale-sites\/SITE%201\/risk-assessments$/),
        request,
        expect.objectContaining({
          headers: expect.objectContaining({
            Accept: 'application/json',
            Authorization: 'Bearer token',
          }),
        }),
      );
    });
  });
});
