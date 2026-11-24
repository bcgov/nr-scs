import axios from 'axios';
import type { AuditDetails } from './audit.types';

import { BackendApiConfig } from './APIs';
import { extractFilename } from './utils/contentDisposition';
import { blobHeaders, jsonHeaders } from './utils/headers';

export interface ScaleAuthCondition {
  scaleConditionClassCode?: string | null;
  scaleAuthConditionId?: number | null;
  scaleAuthConditionTitle?: string | null;
  scaleAuthConditionDesc?: string | null;
  ministryStandardInd?: string | null;
  sortOrderNo?: number | null;
  effectiveDate?: string | null;
  expiryDate?: string | null;
}

export interface ScaleAuthConditionRef {
  scaleConditionClassCode?: string | null;
  scaleAuthConditionId?: number | null;
}

export type ScaleAuthConditionSearchParams = {
  scaleConditionClassCode?: string;
  scaleAuthConditionId?: number;
  scaleAuthConditionTitle?: string;
  scaleAuthConditionDesc?: string;
  ministryStandardInd?: string;
  sortOrderNo?: number;
};

export interface ScalerAuthorizationCreateRequest {
  scalerLicenceNo: string;
  orgUnitNo: number;
  districtWideInd: 'Y' | 'N';
  authorizationEffectiveDate: string;
  authorizationExpiryDate: string;
  jobFunctions: string[];
  authForestProducts?: string[];
  conditions?: ScaleAuthConditionRef[];
  scaleSites?: string[];
}

export interface ScalerAuthorizationUpdateRequest extends ScalerAuthorizationCreateRequest {
  letterArcsFileNumber?: string | null;
  expiryNotificationInd?: string | null;
  cancellationDate?: string | null;
  cancellationReasonTxt?: string | null;
}

export type ScalerAuthorizationLetterReportRequest = {
  regDist: string;
  ccField?: string;
  showSignatureBlockInd?: 'Y' | 'N';
  scaleSignatoryBlockId: number;
  outputFormat: 'PDF' | 'XLS';
  emailRecipient?: string;
  preview: boolean;
};

export type ReportDownload = {
  blob: Blob;
  filename?: string | null;
};

export interface ScalerAuthorizationDetail extends AuditDetails {
  scalerAuthorizationId?: number | null;
  scalerLicenceNo?: string | null;
  orgUnitNo?: number | null;
  districtWideInd?: string | null;
  letterArcsFileNumber?: string | null;
  authorizationEffectiveDate?: string | null;
  authorizationExpiryDate?: string | null;
  expiryNotificationInd?: string | null;
  cancellationDate?: string | null;
  cancellationReasonTxt?: string | null;
  status?: string | null;
  letterExists?: boolean | null;
  jobFunctions?: string[] | null;
  authForestProducts?: string[] | null;
  scaleSites?: Array<{ scaleSiteIdNmbr?: string | null; siteName?: string | null }> | null;
  conditions?: ScaleAuthCondition[] | null;
}

export interface ScalerAuthorization {
  scalerAuthorizationId?: number | null;
  effectiveDate?: string | null;
  expiryDate?: string | null;
  scalerLicenceNumber?: string | null;
  scalerName?: string | null;
  regionId?: number | null;
  districtId?: number | null;
}

export interface ScalerAuthorizationListItem {
  scalerAuthorizationId?: number | null;
  authorizationEffectiveDate?: string | null;
  authorizationExpiryDate?: string | null;
  districtWideInd?: string | null;
  orgUnitNo?: number | null;
  authorizedSites?: string[] | null;
  status?: string | null;
  letterExists?: boolean | null;
}

export interface RenewResult {
  newAuthorizationId?: number | null;
}

export type ScalerAuthorizationSearchParams = {
  scalerAuthorizationId?: number;
  effectiveDate?: string;
  expiryDate?: string;
  scalerLicenceNumber?: string;
  regionId?: number;
  districtId?: number;
  scalerName?: string;
  primarySort?: number;
  secondarySort?: number;
};

export class ScalerAuthorizationsService {
  /**
   * Calls GET /api/scaler-authorizations/conditions
   */
  async searchActiveScaleAuthConditions(
    params?: ScaleAuthConditionSearchParams,
    token?: string,
  ): Promise<ScaleAuthCondition[]> {
    const response = await axios.get<ScaleAuthCondition[]>(`${BackendApiConfig.BASE}/scaler-authorizations/conditions`, {
      params,
      headers: jsonHeaders(token),
    });
    return response.data;
  }
  /**
   * Calls GET /api/scaler-authorizations/templates/{id}/conditions
   * Attempts to retrieve the conditions associated with a template.
   */
  async getScaleAuthTemplateConditions(templateId: number, token?: string): Promise<ScaleAuthCondition[]> {
    const response = await axios.get<ScaleAuthCondition[]>(`${BackendApiConfig.BASE}/scaler-authorizations/templates/${templateId}/conditions`, {
      headers: jsonHeaders(token),
    });
    return response.data;
  }
  /**
   * Calls POST /api/scaler-authorizations
   */
  async createScalerAuthorization(
    payload: ScalerAuthorizationCreateRequest,
    token?: string,
  ): Promise<ScalerAuthorizationDetail> {
    const response = await axios.post<ScalerAuthorizationDetail>(
      `${BackendApiConfig.BASE}/scaler-authorizations`,
      payload,
      {
        headers: jsonHeaders(token),
      },
    );

    return response.data;
  }

  /**
   * Calls PUT /api/scaler-authorizations/{id}
   */
  async updateScalerAuthorization(
    scalerAuthorizationId: number,
    payload: ScalerAuthorizationUpdateRequest,
    token?: string,
  ): Promise<ScalerAuthorizationDetail> {
    const response = await axios.put<ScalerAuthorizationDetail>(
      `${BackendApiConfig.BASE}/scaler-authorizations/${encodeURIComponent(String(scalerAuthorizationId))}`,
      payload,
      {
        headers: jsonHeaders(token),
      },
    );

    return response.data;
  }

  /**
   * Calls GET /api/scalers/{scalerLicenceNo}/authorizations
   * Lists every authorization for a scaler, backing the Authorizations tab.
   */
  async listScalerAuthorizations(
    scalerLicenceNo: string,
    token?: string,
  ): Promise<ScalerAuthorizationListItem[]> {
    const response = await axios.get<ScalerAuthorizationListItem[]>(
      `${BackendApiConfig.BASE}/scalers/${encodeURIComponent(scalerLicenceNo)}/authorizations`,
      {
        headers: jsonHeaders(token),
      },
    );
    return response.data;
  }

  /**
   * Calls GET /api/scaler-authorizations/{id}
   */
  async getScalerAuthorization(id: number, token?: string): Promise<ScalerAuthorizationDetail> {
    const response = await axios.get<ScalerAuthorizationDetail>(`${BackendApiConfig.BASE}/scaler-authorizations/${id}`, {
      headers: jsonHeaders(token),
    });
    return response.data;
  }

  /**
   * Calls DELETE /api/scaler-authorizations/{id}
   */
  async deleteScalerAuthorization(
    scalerAuthorizationId: number,
    token?: string,
  ): Promise<void> {
    await axios.delete(
      `${BackendApiConfig.BASE}/scaler-authorizations/${encodeURIComponent(String(scalerAuthorizationId))}`,
      {
        headers: jsonHeaders(token),
      },
    );
  }

  /**
   * Calls POST /api/scaler-authorizations/{id}/letter
   */
  async createScalerAuthorizationLetter(
    scalerAuthorizationId: number,
    payload: ScalerAuthorizationLetterReportRequest,
    token?: string,
  ): Promise<ReportDownload> {
    const response = await axios.post(
      `${BackendApiConfig.BASE}/scaler-authorizations/${encodeURIComponent(String(scalerAuthorizationId))}/letter`,
      payload,
      {
        responseType: 'blob',
        headers: blobHeaders(token),
      },
    );

    return {
      blob: response.data as Blob,
      filename: extractFilename(response.headers?.['content-disposition']),
    };
  }

  /**
   * Calls GET /api/scaler-authorizations/{id}/letter
   */
  async getScalerAuthorizationLetter(
    scalerAuthorizationId: number,
    token?: string,
  ): Promise<ReportDownload> {
    const response = await axios.get(
      `${BackendApiConfig.BASE}/scaler-authorizations/${encodeURIComponent(String(scalerAuthorizationId))}/letter`,
      {
        responseType: 'blob',
        headers: blobHeaders(token),
      },
    );

    return {
      blob: response.data as Blob,
      filename: extractFilename(response.headers?.['content-disposition']),
    };
  }

  async searchScalerAuthorizations(
    params: ScalerAuthorizationSearchParams,
    token?: string,
  ): Promise<ScalerAuthorization[]> {
    const response = await axios.get<ScalerAuthorization[]>(
      `${BackendApiConfig.BASE}/scaler-authorizations/workbench`,
      {
        params,
        headers: jsonHeaders(token),
      },
    );

    return response.data;
  }

  async renewScalerAuthorization(
    authorizationId: number,
    token?: string,
  ): Promise<RenewResult> {
    const response = await axios.post<RenewResult>(
      `${BackendApiConfig.BASE}/scaler-authorizations/${authorizationId}/renew`,
      undefined,
      {
        headers: jsonHeaders(token),
      },
    );

    return response.data;
  }

  async removeScalerAuthorizationFromWorkbench(
    authorizationId: number,
    token?: string,
  ): Promise<void> {
    await axios.post(
      `${BackendApiConfig.BASE}/scaler-authorizations/${authorizationId}/workbench/remove`,
      undefined,
      {
        headers: jsonHeaders(token),
      },
    );
  }
}
