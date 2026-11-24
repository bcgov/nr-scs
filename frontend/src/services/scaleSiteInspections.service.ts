import axios from 'axios';

import { BackendApiConfig } from './APIs';
import { jsonHeaders } from './utils/headers';
import type {
  ScaleSiteInspectionCreateInitView,
  ScaleSiteInspectionCreateRequest,
  ScaleSiteInspectionDetail,
  ScaleSiteInspectionEditView,
  ScaleSiteInspectionSearchResult,
  ScaleSiteInspectionSummary,
  ScaleSiteInspectionUpdateRequest,
} from './scaleSiteInspections.types';

export type {
  ScaleSiteInspectionAnswerOption,
  ScaleSiteInspectionCreateInitView,
  ScaleSiteInspectionCreateRequest,
  ScaleSiteInspectionDetail,
  ScaleSiteInspectionEditQuestionResponse,
  ScaleSiteInspectionEditView,
  ScaleSiteInspectionQuestionResponse,
  ScaleSiteInspectionQuestionResponseInput,
  ScaleSiteInspectionRecipientOption,
  ScaleSiteInspectionSearchResult,
  ScaleSiteInspectionSummary,
  ScaleSiteInspectionUpdateRequest,
} from './scaleSiteInspections.types';

const normalizeInspectionSummaries = (payload: unknown): ScaleSiteInspectionSummary[] => {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (payload && typeof payload === 'object') {
    const candidate = payload as {
      inspections?: unknown;
      items?: unknown;
      content?: unknown;
      data?: unknown;
    };

    if (Array.isArray(candidate.inspections)) {
      return candidate.inspections;
    }

    if (Array.isArray(candidate.items)) {
      return candidate.items;
    }

    if (Array.isArray(candidate.content)) {
      return candidate.content;
    }

    if (Array.isArray(candidate.data)) {
      return candidate.data;
    }
  }

  throw new Error('Unexpected inspections response shape.');
};

export class ScaleSiteInspectionsService {
  async getScaleSiteInspectionSummaries(
    scaleSiteIdNmbr: string,
    token?: string,
  ): Promise<ScaleSiteInspectionSummary[]> {
    const response = await axios.get<ScaleSiteInspectionSummary[]>(
      `${BackendApiConfig.BASE}/scale-sites/${encodeURIComponent(scaleSiteIdNmbr)}/inspections`,
      {
        headers: jsonHeaders(token),
      },
    );

    return normalizeInspectionSummaries(response.data);
  }

  async searchScaleSiteInspection(
    inspectionId: number,
    token?: string,
  ): Promise<ScaleSiteInspectionSearchResult> {
    const response = await axios.get<ScaleSiteInspectionSearchResult>(
      `${BackendApiConfig.BASE}/scale-sites/inspection/search`,
      {
        params: { inspectionId },
        headers: jsonHeaders(token),
      },
    );

    return response.data;
  }

  async getScaleSiteInspectionDetail(
    inspectionId: number,
    token?: string,
  ): Promise<ScaleSiteInspectionDetail> {
    const response = await axios.get<ScaleSiteInspectionDetail>(
      `${BackendApiConfig.BASE}/scale-sites/inspection/${inspectionId}`,
      {
        headers: jsonHeaders(token),
      },
    );

    return response.data;
  }

  async getScaleSiteInspectionCreateInit(
    scaleSiteIdNmbr: string,
    inspectionTypeCode: string,
    siteTypeCodes: string[],
    token?: string,
  ): Promise<ScaleSiteInspectionCreateInitView> {
    const searchParams = new URLSearchParams();
    searchParams.set('inspectionTypeCode', inspectionTypeCode);
    siteTypeCodes.forEach((siteTypeCode) => {
      searchParams.append('siteTypeCodes', siteTypeCode);
    });

    const response = await axios.get<ScaleSiteInspectionCreateInitView>(
      `${BackendApiConfig.BASE}/scale-sites/${encodeURIComponent(scaleSiteIdNmbr)}/inspections/create?${searchParams.toString()}`,
      {
        headers: jsonHeaders(token),
      },
    );

    return response.data;
  }

  async getScaleSiteInspectionEdit(
    inspectionId: number,
    token?: string,
  ): Promise<ScaleSiteInspectionEditView> {
    const response = await axios.get<ScaleSiteInspectionEditView>(
      `${BackendApiConfig.BASE}/scale-sites/inspection/${inspectionId}/edit`,
      {
        headers: jsonHeaders(token),
      },
    );

    return response.data;
  }

  async updateScaleSiteInspection(
    inspectionId: number,
    request: ScaleSiteInspectionUpdateRequest,
    token?: string,
  ): Promise<ScaleSiteInspectionDetail> {
    const response = await axios.put<ScaleSiteInspectionDetail>(
      `${BackendApiConfig.BASE}/scale-sites/inspection/${inspectionId}`,
      request,
      {
        headers: jsonHeaders(token),
      },
    );

    return response.data;
  }

  async createScaleSiteInspection(
    scaleSiteIdNmbr: string,
    request: ScaleSiteInspectionCreateRequest,
    token?: string,
  ): Promise<ScaleSiteInspectionDetail> {
    const response = await axios.post<ScaleSiteInspectionDetail>(
      `${BackendApiConfig.BASE}/scale-sites/${encodeURIComponent(scaleSiteIdNmbr)}/inspections`,
      request,
      {
        headers: jsonHeaders(token),
      },
    );

    return response.data;
  }

  async deleteScaleSiteInspection(
    inspectionId: number,
    token?: string,
  ): Promise<void> {
    await axios.delete(
      `${BackendApiConfig.BASE}/scale-sites/inspection/${encodeURIComponent(String(inspectionId))}`,
      {
        headers: jsonHeaders(token),
      },
    );
  }
}


