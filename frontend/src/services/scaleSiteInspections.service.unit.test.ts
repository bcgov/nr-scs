import axios from 'axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./APIs', () => ({
  BackendApiConfig: {
    BASE: '/api',
  },
}));

import { ScaleSiteInspectionsService } from './scaleSiteInspections.service';

vi.mock('axios', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('ScaleSiteInspectionsService', () => {
  const axiosGet = vi.mocked(axios.get);
  const axiosPost = vi.mocked(axios.post);
  const axiosPut = vi.mocked(axios.put);
  const axiosDelete = vi.mocked(axios.delete);
  const service = new ScaleSiteInspectionsService();

  beforeEach(() => {
    axiosGet.mockReset();
    axiosPost.mockReset();
    axiosPut.mockReset();
    axiosDelete.mockReset();
  });

  it('calls the inspection summaries endpoint with the scale site id in the path', async () => {
    axiosGet.mockResolvedValue({
      data: [
        {
          inspectionId: 12345,
          inspectionTypeDescription: 'Compliance',
        },
      ],
    } as never);

    const result = await service.getScaleSiteInspectionSummaries('SITE001', 'token');

    expect(result).toEqual([
      {
        inspectionId: 12345,
        inspectionTypeDescription: 'Compliance',
      },
    ]);
    expect(axiosGet).toHaveBeenCalledTimes(1);
    expect(axiosGet).toHaveBeenCalledWith(
      expect.stringMatching(/\/scale-sites\/SITE001\/inspections$/),
      expect.objectContaining({
        headers: expect.objectContaining({
          Accept: 'application/json',
          Authorization: 'Bearer token',
        }),
      }),
    );
  });

  it('normalizes a wrapped inspections payload into an array', async () => {
    axiosGet.mockResolvedValue({
      data: {
        inspections: [
          {
            inspectionId: 12345,
            inspectionTypeDescription: 'Compliance',
          },
        ],
      },
    } as never);

    const result = await service.getScaleSiteInspectionSummaries('SITE001', 'token');

    expect(result).toEqual([
      {
        inspectionId: 12345,
        inspectionTypeDescription: 'Compliance',
      },
    ]);
  });

  it('throws a controlled error when the inspections payload is not array-like', async () => {
    axiosGet.mockResolvedValue({
      data: {
        inspectionId: 12345,
      },
    } as never);

    await expect(service.getScaleSiteInspectionSummaries('SITE001', 'token')).rejects.toThrow(
      'Unexpected inspections response shape.',
    );
  });

  it('calls the inspection lookup endpoint with the inspection id as a query parameter', async () => {
    axiosGet.mockResolvedValue({ data: { inspectionId: 12345, scaleSiteIdNmbr: 'SITE001' } } as never);

    const result = await service.searchScaleSiteInspection(12345, 'token');

    expect(result).toEqual({ inspectionId: 12345, scaleSiteIdNmbr: 'SITE001' });
    expect(axiosGet).toHaveBeenCalledTimes(1);
    expect(axiosGet).toHaveBeenCalledWith(
      expect.stringMatching(/\/scale-sites\/inspection\/search$/),
      expect.objectContaining({
        params: { inspectionId: 12345 },
        headers: expect.objectContaining({
          Accept: 'application/json',
          Authorization: 'Bearer token',
        }),
      }),
    );
  });

  it('calls the inspection detail endpoint with the inspection id in the path', async () => {
    axiosGet.mockResolvedValue({
      data: {
        inspectionId: 12345,
        siteName: 'MAIN YARD',
        questionResponses: [
          {
            questionText: 'Was the scale head sealed?',
            inspectionAnswerDescription: 'Yes',
          },
        ],
      },
    } as never);

    const result = await service.getScaleSiteInspectionDetail(12345, 'token');

    expect(result).toEqual({
      inspectionId: 12345,
      siteName: 'MAIN YARD',
      questionResponses: [
        {
          questionText: 'Was the scale head sealed?',
          inspectionAnswerDescription: 'Yes',
        },
      ],
    });
    expect(axiosGet).toHaveBeenCalledTimes(1);
    expect(axiosGet).toHaveBeenCalledWith(
      expect.stringMatching(/\/scale-sites\/inspection\/12345$/),
      expect.objectContaining({
        headers: expect.objectContaining({
          Accept: 'application/json',
          Authorization: 'Bearer token',
        }),
      }),
    );
  });

  it('calls the inspection create-init endpoint with repeated siteTypeCodes query params', async () => {
    axiosGet.mockResolvedValue({
      data: {
        scaleSiteIdNmbr: 'SITE001',
        inspectionTypeCode: 'COM',
        siteTypeCodes: ['W', 'P'],
      },
    } as never);

    const result = await service.getScaleSiteInspectionCreateInit('SITE001', 'COM', ['W', 'P'], 'token');

    expect(result).toEqual({
      scaleSiteIdNmbr: 'SITE001',
      inspectionTypeCode: 'COM',
      siteTypeCodes: ['W', 'P'],
    });
    expect(axiosGet).toHaveBeenCalledTimes(1);
    expect(axiosGet).toHaveBeenCalledWith(
      expect.stringMatching(/\/scale-sites\/SITE001\/inspections\/create\?inspectionTypeCode=COM&siteTypeCodes=W&siteTypeCodes=P$/),
      expect.objectContaining({
        headers: expect.objectContaining({
          Accept: 'application/json',
          Authorization: 'Bearer token',
        }),
      }),
    );
  });

  it('calls the inspection edit endpoint with the inspection id in the edit path', async () => {
    axiosGet.mockResolvedValue({
      data: {
        inspectionId: 12345,
        siteOperatorPresentInd: 'Y',
        questionResponses: [
          {
            inspectionQuestionId: 777,
            questionText: 'Was the scale head sealed?',
            answerOptions: [
              { code: 'Y', description: 'Yes' },
              { code: 'N', description: 'No' },
            ],
          },
        ],
      },
    } as never);

    const result = await service.getScaleSiteInspectionEdit(12345, 'token');

    expect(result).toEqual({
      inspectionId: 12345,
      siteOperatorPresentInd: 'Y',
      questionResponses: [
        {
          inspectionQuestionId: 777,
          questionText: 'Was the scale head sealed?',
          answerOptions: [
            { code: 'Y', description: 'Yes' },
            { code: 'N', description: 'No' },
          ],
        },
      ],
    });
    expect(axiosGet).toHaveBeenCalledTimes(1);
    expect(axiosGet).toHaveBeenCalledWith(
      expect.stringMatching(/\/scale-sites\/inspection\/12345\/edit$/),
      expect.objectContaining({
        headers: expect.objectContaining({
          Accept: 'application/json',
          Authorization: 'Bearer token',
        }),
      }),
    );
  });

  it('calls the inspection update endpoint with the request body and JSON headers', async () => {
    const request = {
      inspectionDate: '2026-03-11',
      inspector: 'guid-123',
      siteOperatorPresentInd: 'Y' as const,
      comments: 'Updated after revisit.',
      questionResponses: [
        {
          inspectionQuestionId: 777,
          inspectionAnswerCode: 'N',
          commentsText: 'Needs correction',
          followUpRequiredInd: 'Y' as const,
          followUpActionText: 'Issue corrective action request',
          followUpDueDate: '2026-03-20',
          followUpCompletedInd: 'N' as const,
        },
      ],
    };

    axiosPut.mockResolvedValue({
      data: {
        inspectionId: 12345,
        comments: 'Updated after revisit.',
      },
    } as never);

    const result = await service.updateScaleSiteInspection(12345, request, 'token');

    expect(result).toEqual({
      inspectionId: 12345,
      comments: 'Updated after revisit.',
    });
    expect(axiosPut).toHaveBeenCalledTimes(1);
    expect(axiosPut).toHaveBeenCalledWith(
      expect.stringMatching(/\/scale-sites\/inspection\/12345$/),
      request,
      expect.objectContaining({
        headers: expect.objectContaining({
          Accept: 'application/json',
          Authorization: 'Bearer token',
          'Content-Type': 'application/json',
        }),
      }),
    );
  });

  it('calls the inspection create endpoint with the request body and JSON headers', async () => {
    const request = {
      inspectionTypeCode: 'COM',
      siteTypeCodes: ['W'],
      inspectionDate: '2026-03-11',
      inspector: 'guid-123',
      previousInspectionId: null,
      recipient: '77',
      siteOperatorPresentInd: 'Y' as const,
      comments: 'Created from staged workflow.',
      questionResponses: [],
    };

    axiosPost.mockResolvedValue({
      data: {
        inspectionId: 12345,
        scaleSiteIdNmbr: 'SITE001',
      },
    } as never);

    const result = await service.createScaleSiteInspection('SITE001', request, 'token');

    expect(result).toEqual({
      inspectionId: 12345,
      scaleSiteIdNmbr: 'SITE001',
    });
    expect(axiosPost).toHaveBeenCalledTimes(1);
    expect(axiosPost).toHaveBeenCalledWith(
      expect.stringMatching(/\/scale-sites\/SITE001\/inspections$/),
      request,
      expect.objectContaining({
        headers: expect.objectContaining({
          Accept: 'application/json',
          Authorization: 'Bearer token',
          'Content-Type': 'application/json',
        }),
      }),
    );
  });

  it('calls the inspection delete endpoint with the inspection id in the path', async () => {
    axiosDelete.mockResolvedValue({} as never);

    await service.deleteScaleSiteInspection(12345, 'token');

    expect(axiosDelete).toHaveBeenCalledTimes(1);
    expect(axiosDelete).toHaveBeenCalledWith(
      expect.stringMatching(/\/scale-sites\/inspection\/12345$/),
      expect.objectContaining({
        headers: expect.objectContaining({
          Accept: 'application/json',
          Authorization: 'Bearer token',
        }),
      }),
    );
  });
});


