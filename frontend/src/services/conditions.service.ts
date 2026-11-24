import axios from 'axios';
import type { AuditDetails } from './audit.types';

import { BackendApiConfig } from './APIs';
import { jsonHeaders } from './utils/headers';

export interface ScaleAuthConditionDetail extends AuditDetails {
  scaleConditionClassCode?: string | null;
  scaleAuthConditionId?: number | null;
  scaleAuthConditionTitle?: string | null;
  scaleAuthConditionDesc?: string | null;
  ministryStandardInd?: string | null;
  sortOrderNo?: number | null;
  effectiveDate?: string | null;
  expiryDate?: string | null;
  siteMethodTypeCodes?: string[] | null;
  dependentChildExists?: boolean | null;
}

export type ScaleAuthConditionSearchParams = {
  scaleConditionClassCode?: string;
  scaleAuthConditionId?: number;
  scaleAuthConditionTitle?: string;
  scaleAuthConditionDesc?: string;
  ministryStandardInd?: string;
  sortOrderNo?: number;
  effectiveDate?: string;
  expiryDate?: string;
};

export interface ScaleAuthConditionCreateRequest {
  scaleConditionClassCode: string;
  scaleAuthConditionTitle: string;
  scaleAuthConditionDesc: string;
  ministryStandardInd: string;
  sortOrderNo: number;
  effectiveDate: string;
  expiryDate?: string | null;
  siteMethodTypeCodes?: string[] | null;
}

export interface ScaleAuthConditionUpdateRequest {
  scaleConditionClassCode: string;
  scaleAuthConditionTitle: string;
  scaleAuthConditionDesc: string;
  ministryStandardInd: string;
  sortOrderNo: number;
  effectiveDate: string;
  expiryDate?: string | null;
  siteMethodTypeCodes?: string[] | null;
}

export class ConditionsService {
  async searchConditions(params?: ScaleAuthConditionSearchParams, token?: string): Promise<ScaleAuthConditionDetail[]> {
    const response = await axios.get<ScaleAuthConditionDetail[]>(`${BackendApiConfig.BASE}/conditions`, {
      params,
      headers: jsonHeaders(token),
    });
    return response.data;
  }

  async getCondition(scaleConditionClassCode: string, scaleAuthConditionId: number, token?: string): Promise<ScaleAuthConditionDetail> {
    const response = await axios.get<ScaleAuthConditionDetail>(
      `${BackendApiConfig.BASE}/conditions/${encodeURIComponent(scaleConditionClassCode)}/${encodeURIComponent(String(scaleAuthConditionId))}`,
      { headers: jsonHeaders(token) },
    );
    return response.data;
  }

  async createCondition(payload: ScaleAuthConditionCreateRequest, token?: string): Promise<ScaleAuthConditionDetail> {
    const response = await axios.post<ScaleAuthConditionDetail>(
      `${BackendApiConfig.BASE}/conditions`,
      payload,
      { headers: jsonHeaders(token) },
    );
    return response.data;
  }

  async updateCondition(
    scaleConditionClassCode: string,
    scaleAuthConditionId: number,
    payload: ScaleAuthConditionUpdateRequest,
    token?: string,
  ): Promise<ScaleAuthConditionDetail> {
    const response = await axios.put<ScaleAuthConditionDetail>(
      `${BackendApiConfig.BASE}/conditions/${encodeURIComponent(scaleConditionClassCode)}/${encodeURIComponent(String(scaleAuthConditionId))}`,
      payload,
      { headers: jsonHeaders(token) },
    );
    return response.data;
  }

  async deleteCondition(scaleConditionClassCode: string, scaleAuthConditionId: number, token?: string): Promise<void> {
    await axios.delete(
      `${BackendApiConfig.BASE}/conditions/${encodeURIComponent(scaleConditionClassCode)}/${encodeURIComponent(String(scaleAuthConditionId))}`,
      { headers: jsonHeaders(token) },
    );
  }
}
