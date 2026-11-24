import axios from 'axios';
import type { AuditDetails } from './audit.types';

import { BackendApiConfig } from './APIs';
import { extractFilename } from './utils/contentDisposition';
import { blobHeaders, jsonHeaders } from './utils/headers';

export interface ScaleSiteAuthCondition {
  scaleConditionClassCode?: string | null;
  scaleAuthConditionId?: number | null;
  scaleAuthConditionTitle?: string | null;
  scaleAuthConditionDesc?: string | null;
  ministryStandardInd?: string | null;
  sortOrderNo?: number | null;
  effectiveDate?: string | null;
  expiryDate?: string | null;
}

export type ScaleSiteAuthConditionSearchParams = {
  scaleConditionClassCode?: string;
  scaleAuthConditionId?: number;
  scaleAuthConditionTitle?: string;
  scaleAuthConditionDesc?: string;
  ministryStandardInd?: string;
  sortOrderNo?: number;
};

export interface ScaleSiteAuthorizationCreateRequest {
  scaleSiteIdNmbr: string;
  authorizationEffectiveDate: string;
  authorizationExpiryDate: string;
  expectedScaleVolume: number;
  letterArcsFileNumber?: string;
  expiryNotificationInd?: string;
  cancellationDate?: string;
  cancellationReasonTxt?: string;
  conditions?: Array<{ scaleConditionClassCode?: string | null; scaleAuthConditionId?: number | null }>;
}

export type ScaleSiteAuthorizationUpdateRequest = ScaleSiteAuthorizationCreateRequest;

export type ScaleSiteAuthorizationLetterReportRequest = {
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

export interface ScaleSiteAuthorizationDetail extends AuditDetails {
  scaleSiteAuthorizationId?: number | null;
  scaleSiteIdNmbr?: string | null;
  letterArcsFileNumber?: string | null;
  authorizationEffectiveDate?: string | null;
  authorizationExpiryDate?: string | null;
  expiryNotificationInd?: string | null;
  expectedScaleVolume?: number | null;
  cancellationDate?: string | null;
  cancellationReasonTxt?: string | null;
  status?: string | null;
  letterExists?: boolean | null;
  conditions?: ScaleSiteAuthCondition[];
}

export interface ScaleSiteAuthorization {
  scaleSiteAuthorizationId?: number | null;
  effectiveDate?: string | null;
  expiryDate?: string | null;
  scaleSiteNumber?: string | null;
  scaleSiteName?: string | null;
  regionId?: number | null;
  districtId?: number | null;
}

export interface RenewResult {
  newAuthorizationId?: number | null;
}

export type ScaleSiteAuthorizationSearchParams = {
  scaleSiteAuthorizationId?: number;
  effectiveDate?: string;
  expiryDate?: string;
  scaleSiteNumber?: string;
  scaleSiteName?: string;
  regionId?: number;
  districtId?: number;
  primarySort?: number;
  secondarySort?: number;
};

export class ScaleSiteAuthorizationsService {
  /**
   * Calls GET /api/scale-site-authorizations/conditions
   */
  async searchActiveScaleSiteAuthConditions(
    params?: ScaleSiteAuthConditionSearchParams,
    token?: string,
  ): Promise<ScaleSiteAuthCondition[]> {
    const response = await axios.get<ScaleSiteAuthCondition[]>(
      `${BackendApiConfig.BASE}/scale-site-authorizations/conditions`,
      {
        params,
        headers: jsonHeaders(token),
      },
    );
    return response.data;
  }

  /**
   * Calls GET /api/scale-site-authorizations/templates/{id}/conditions
   * Attempts to retrieve the conditions associated with a template.
   */
  async getScaleSiteAuthTemplateConditions(templateId: number, token?: string): Promise<ScaleSiteAuthCondition[]> {
    const response = await axios.get<ScaleSiteAuthCondition[]>(
      `${BackendApiConfig.BASE}/scale-site-authorizations/templates/${templateId}/conditions`,
      {
        headers: jsonHeaders(token),
      },
    );
    return response.data;
  }

  /**
   * Calls POST /api/scale-site-authorizations
   */
  async createScaleSiteAuthorization(
    payload: ScaleSiteAuthorizationCreateRequest,
    token?: string,
  ): Promise<ScaleSiteAuthorizationDetail> {
    const response = await axios.post<ScaleSiteAuthorizationDetail>(
      `${BackendApiConfig.BASE}/scale-site-authorizations`,
      payload,
      {
        headers: jsonHeaders(token),
      },
    );

    return response.data;
  }

  /**
   * Calls PUT /api/scale-site-authorizations/{id}
   */
  async updateScaleSiteAuthorization(
    scaleSiteAuthorizationId: number,
    payload: ScaleSiteAuthorizationUpdateRequest,
    token?: string,
  ): Promise<ScaleSiteAuthorizationDetail> {
    const response = await axios.put<ScaleSiteAuthorizationDetail>(
      `${BackendApiConfig.BASE}/scale-site-authorizations/${encodeURIComponent(String(scaleSiteAuthorizationId))}`,
      payload,
      {
        headers: jsonHeaders(token),
      },
    );

    return response.data;
  }

  /**
   * Calls GET /api/scale-sites/{scaleSiteIdNmbr}/authorizations
   * Lists every authorization for a scale site, backing the Site Authorizations tab.
   */
  async listScaleSiteAuthorizations(
    scaleSiteIdNmbr: string,
    token?: string,
  ): Promise<ScaleSiteAuthorizationDetail[]> {
    const response = await axios.get<ScaleSiteAuthorizationDetail[]>(
      `${BackendApiConfig.BASE}/scale-sites/${encodeURIComponent(scaleSiteIdNmbr)}/authorizations`,
      {
        headers: jsonHeaders(token),
      },
    );
    return response.data;
  }

  /**
   * Calls GET /api/scale-site-authorizations/{id}
   */
  async getScaleSiteAuthorization(scaleSiteAuthorizationId: number, token?: string): Promise<ScaleSiteAuthorizationDetail> {
    const response = await axios.get<ScaleSiteAuthorizationDetail>(
      `${BackendApiConfig.BASE}/scale-site-authorizations/${encodeURIComponent(String(scaleSiteAuthorizationId))}`,
      {
        headers: jsonHeaders(token),
      },
    );

    return response.data;
  }

  /**
   * Calls DELETE /api/scale-site-authorizations/{id}
   */
  async deleteScaleSiteAuthorization(
    scaleSiteAuthorizationId: number,
    token?: string,
  ): Promise<void> {
    await axios.delete(
      `${BackendApiConfig.BASE}/scale-site-authorizations/${encodeURIComponent(String(scaleSiteAuthorizationId))}`,
      {
        headers: jsonHeaders(token),
      },
    );
  }

  /**
   * Calls POST /api/scale-site-authorizations/{id}/letter
   */
  async createScaleSiteAuthorizationLetter(
    scaleSiteAuthorizationId: number,
    payload: ScaleSiteAuthorizationLetterReportRequest,
    token?: string,
  ): Promise<ReportDownload> {
    const response = await axios.post(
      `${BackendApiConfig.BASE}/scale-site-authorizations/${encodeURIComponent(String(scaleSiteAuthorizationId))}/letter`,
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
   * Calls GET /api/scale-site-authorizations/{id}/letter
   */
  async getScaleSiteAuthorizationLetter(
    scaleSiteAuthorizationId: number,
    token?: string,
  ): Promise<ReportDownload> {
    const response = await axios.get(
      `${BackendApiConfig.BASE}/scale-site-authorizations/${encodeURIComponent(String(scaleSiteAuthorizationId))}/letter`,
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

  async searchScaleSiteAuthorizations(
    params: ScaleSiteAuthorizationSearchParams,
    token?: string,
  ): Promise<ScaleSiteAuthorization[]> {
    const response = await axios.get<ScaleSiteAuthorization[]>(
      `${BackendApiConfig.BASE}/scale-site-authorizations/workbench`,
      {
        params,
        headers: jsonHeaders(token),
      },
    );

    return response.data;
  }

  async renewScaleSiteAuthorization(
    authorizationId: number,
    token?: string,
  ): Promise<RenewResult> {
    const response = await axios.post<RenewResult>(
      `${BackendApiConfig.BASE}/scale-site-authorizations/${authorizationId}/renew`,
      undefined,
      {
        headers: jsonHeaders(token),
      },
    );

    return response.data;
  }

  async removeScaleSiteAuthorizationFromWorkbench(
    authorizationId: number,
    token?: string,
  ): Promise<void> {
    await axios.post(
      `${BackendApiConfig.BASE}/scale-site-authorizations/${authorizationId}/workbench/remove`,
      undefined,
      {
        headers: jsonHeaders(token),
      },
    );
  }

}
