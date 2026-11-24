import axios from 'axios';
import type { AuditDetails } from './audit.types';

import { BackendApiConfig } from './APIs';
import { extractFilename } from './utils/contentDisposition';
import { blobHeaders, jsonHeaders } from './utils/headers';

export interface MarkSiteDesignation {
  haulingMarkAuthorizationId?: number | null;
  effectiveDate?: string | null;
  expiryDate?: string | null;
  timberMark?: string | null;
  regionId?: number | null;
  districtId?: number | null;
}

/** Row from the general timber-mark query (not limited to expiring records). */
export interface MarkSiteDesignationSearchResult {
  haulingMarkAuthorizationId?: number | null;
  timberMark?: string | null;
  effectiveDate?: string | null;
  expiryDate?: string | null;
  orgUnitName?: string | null;
}

export interface RenewResult {
  newAuthorizationId?: number | null;
}

export interface MarkSiteDesignationTimberMarkLookup {
  timberMark?: string | null;
  markHolderClient?: string | null;
  markHolderLoc?: string | null;
  markHolderName?: string | null;
  markStatus?: string | null;
}

export interface MarkSiteDesignationCreateRequest {
  timberMark: string;
  geographicLocation?: string | null;
  population?: string | null;
  effectiveDate: string;
  expiryDate: string;
  orgUnitNo: number;
  districtWideInd: 'Y' | 'N';
  estimatedVolume?: number | null;
  estimatedTruckLoads?: number | null;
  timberDescription?: string | null;
  transportationDateDesc?: string | null;
  otherRequirements?: string | null;
  scaleSites?: string[];
  speciesContent?: Array<{
    scaleSpeciesCode?: string | null;
    contentPercent?: number | null;
  }>;
  conditions?: Array<{
    scaleConditionClassCode?: string | null;
    scaleAuthConditionId?: number | null;
  }>;
  /** Exempt mark method codes (the "Exemptions" multi-select). */
  exceptions?: string[];
}

export interface MarkSiteDesignationCreateResponse {
  haulingMarkAuthorizationId?: number | null;
}

export interface MarkSiteDesignationScaleSite {
  scaleSiteIdNmbr?: string | null;
  siteName?: string | null;
}

export interface MarkSiteDesignationCondition {
  scaleConditionClassCode?: string | null;
  scaleAuthConditionId?: number | null;
  scaleAuthConditionTitle?: string | null;
  scaleAuthConditionDesc?: string | null;
  ministryStandardInd?: string | null;
  sortOrderNo?: number | null;
  effectiveDate?: string | null;
  expiryDate?: string | null;
}

export interface MarkSiteDesignationSpeciesContent {
  scaleSpeciesCode?: string | null;
  contentPercent?: number | null;
}

export interface MarkSiteDesignationDetail extends AuditDetails {
  haulingMarkAuthorizationId?: number | null;
  timberMark?: string | null;
  markHolderClient?: string | null;
  markHolderLoc?: string | null;
  markHolderName?: string | null;
  markStatus?: string | null;
  geographicLocation?: string | null;
  population?: number | null;
  effectiveDate?: string | null;
  expiryDate?: string | null;
  estimatedVolume?: number | null;
  estimatedTruckLoads?: number | null;
  timberDescription?: string | null;
  transportationDateDesc?: string | null;
  otherRequirements?: string | null;
  orgUnitNo?: number | null;
  districtWideInd?: string | null;
  scaleSites?: MarkSiteDesignationScaleSite[];
  speciesContent?: MarkSiteDesignationSpeciesContent[];
  conditions?: MarkSiteDesignationCondition[];
  /** Exempt mark method codes (the "Exemptions" multi-select). */
  exceptions?: string[];
  letterExists?: boolean | null;
  orgUnitNo?: number | null;
}

export interface MarkSiteDesignationUpdateRequest {
  geographicLocation?: string | null;
  population?: string | null;
  effectiveDate?: string | null;
  expiryDate: string;
  orgUnitNo?: number | null;
  districtWideInd?: 'Y' | 'N' | null;
  estimatedVolume?: number | null;
  estimatedTruckLoads?: number | null;
  timberDescription?: string | null;
  transportationDateDesc?: string | null;
  otherRequirements?: string | null;
  scaleSites?: string[];
  speciesContent?: Array<{
    scaleSpeciesCode?: string | null;
    contentPercent?: number | null;
  }>;
  conditions?: Array<{
    scaleConditionClassCode?: string | null;
    scaleAuthConditionId?: number | null;
  }>;
  /** Exempt mark method codes (the "Exemptions" multi-select). */
  exceptions?: string[];
}

export type MarkSiteDesignationLetterReportRequest = {
  regDist: string;
  ccField?: string;
  scaleSignatoryBlockId: number;
  outputFormat: 'PDF' | 'XLS';
  emailRecipient?: string;
  preview: boolean;
};

export type ReportDownload = {
  blob: Blob;
  filename?: string | null;
};

export type MarkSiteDesignationSearchParams = {
  haulingMarkAuthorizationId?: number;
  effectiveDate?: string;
  expiryDate?: string;
  timberMark?: string;
  regionId?: number;
  districtId?: number;
  primarySort?: number;
  secondarySort?: number;
};

export class MarkSiteDesignationService {
  async searchMarkSiteDesignations(
    params: MarkSiteDesignationSearchParams,
    token?: string,
  ): Promise<MarkSiteDesignation[]> {
    const response = await axios.get<MarkSiteDesignation[]>(
      `${BackendApiConfig.BASE}/mark-site-designations/workbench`,
      {
        params,
        headers: jsonHeaders(token),
      },
    );

    return response.data;
  }

  /**
   * Calls GET /api/mark-site-designations/search?timberMark=...
   * General timber-mark query (Queries > Mark Site Designations); not limited to expiring records.
   */
  async searchMarkSiteDesignationsByTimberMark(
    timberMark: string,
    token?: string,
  ): Promise<MarkSiteDesignationSearchResult[]> {
    const response = await axios.get<MarkSiteDesignationSearchResult[]>(
      `${BackendApiConfig.BASE}/mark-site-designations/search`,
      {
        params: { timberMark },
        headers: jsonHeaders(token),
      },
    );

    return response.data;
  }

  async getMarkSiteDesignationTimberMarkLookup(
    timberMark: string,
    token?: string,
  ): Promise<MarkSiteDesignationTimberMarkLookup> {
    const response = await axios.get<MarkSiteDesignationTimberMarkLookup>(
      `${BackendApiConfig.BASE}/mark-site-designations`,
      {
        params: { timberMark },
        headers: jsonHeaders(token),
      },
    );

    return response.data;
  }

  async getMarkSiteDesignation(
    authorizationId: number,
    token?: string,
  ): Promise<MarkSiteDesignationDetail> {
    const response = await axios.get<MarkSiteDesignationDetail>(
      `${BackendApiConfig.BASE}/mark-site-designations/${encodeURIComponent(String(authorizationId))}`,
      {
        headers: jsonHeaders(token),
      },
    );

    return response.data;
  }

  async createMarkSiteDesignation(
    payload: MarkSiteDesignationCreateRequest,
    token?: string,
  ): Promise<MarkSiteDesignationCreateResponse> {
    const response = await axios.post<MarkSiteDesignationCreateResponse>(
      `${BackendApiConfig.BASE}/mark-site-designations`,
      payload,
      {
        headers: jsonHeaders(token),
      },
    );

    return response.data;
  }

  async updateMarkSiteDesignation(
    authorizationId: number,
    payload: MarkSiteDesignationUpdateRequest,
    token?: string,
  ): Promise<MarkSiteDesignationDetail> {
    const response = await axios.put<MarkSiteDesignationDetail>(
      `${BackendApiConfig.BASE}/mark-site-designations/${encodeURIComponent(String(authorizationId))}`,
      payload,
      {
        headers: jsonHeaders(token),
      },
    );

    return response.data;
  }

  async renewMarkSiteDesignation(
    authorizationId: number,
    token?: string,
  ): Promise<RenewResult> {
    const response = await axios.post<RenewResult>(
      `${BackendApiConfig.BASE}/mark-site-designations/${authorizationId}/renew`,
      undefined,
      {
        headers: jsonHeaders(token),
      },
    );

    return response.data;
  }

  async removeMarkSiteDesignationFromWorkbench(
    authorizationId: number,
    token?: string,
  ): Promise<void> {
    await axios.post(
      `${BackendApiConfig.BASE}/mark-site-designations/${authorizationId}/workbench/remove`,
      undefined,
      {
        headers: jsonHeaders(token),
      },
    );
  }

  async createMarkSiteDesignationLetter(
    authorizationId: number,
    payload: MarkSiteDesignationLetterReportRequest,
    token?: string,
  ): Promise<ReportDownload> {
    const response = await axios.post(
      `${BackendApiConfig.BASE}/mark-site-designations/${encodeURIComponent(String(authorizationId))}/letter`,
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

  async getMarkSiteDesignationLetter(
    authorizationId: number,
    token?: string,
  ): Promise<ReportDownload> {
    const response = await axios.get(
      `${BackendApiConfig.BASE}/mark-site-designations/${encodeURIComponent(String(authorizationId))}/letter`,
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
}
