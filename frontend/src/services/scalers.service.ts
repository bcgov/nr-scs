import axios from 'axios';
import type { AuditDetails } from './audit.types';

import { BackendApiConfig } from './APIs';
import { jsonHeaders } from './utils/headers';

export interface Scaler {
  scalerLicenceNo?: string | null;
  orgUnitName?: string | null;
  clientName?: string | null;
  legalFirstName?: string | null;
  legalMiddleName?: string | null;
  licenceType?: string | null;
  scalerClientLoc?: string | null;
}

export type ScalerSearchParams = {
  scalerLicenceNo?: string;
  clientNumber?: string;
  clientLocnCode?: string;
  orgUnitNo?: number;
  clientName?: string;
  legalFirstName?: string;
  scalarTrainingType?: string;
  scalerLicenceTypeCode?: string;
  scalerAppointmentType?: string;
  primarySort?: number;
  secondarySort?: number;
};

export interface ScalerCreateRequest {
  clientNumber: string;
  orgUnitNo: number;
  issuedDate: string;
  expiryDate?: string | null;
  oathTakenInd: 'Y' | 'N';
  licenceTypes: Array<'SCS' | 'WA'>;
  appointment?: {
    scalerAppointmentType: string;
    scaleGradingSystemCode: string;
    provinceWideInd: 'Y' | 'N';
    issuedDate: string;
    expiryDate?: string | null;
  } | null;
  exam?: {
    scalerTrainingTypeId: string;
    completionDate: string;
  } | null;
}

export interface ScalerDetail extends AuditDetails {
  scalerLicenceNo?: string | null;
  clientNumber?: string | null;
  orgUnitNo?: number | null;
  issuedDate?: string | null;
  expiryDate?: string | null;
  oathTakenInd?: string | null;
  licenceCancelledDate?: string | null;
  licenceTypes?: string[] | null;
  appointment?: {
    scalerLicenceAttributeId?: number | null;
    scalerLicenceNo?: string | null;
    scalerAppointmentType?: string | null;
    scaleGradingSystemCode?: string | null;
    orgUnitNo?: number | null;
    provinceWideInd?: string | null;
    issuedDate?: string | null;
    expiryDate?: string | null;
    orgUnitName?: string | null;
  } | null;
  exam?: {
    scalerTrainingId?: number | null;
    scalerLicenceNo?: string | null;
    scalarTrainingType?: string | null;
    examDate?: string | null;
    upgradeDate?: string | null;
    examScore?: number | null;
    passInd?: string | null;
  } | null;
  // Search-result enrichment fields
  orgUnitName?: string | null;
  clientName?: string | null;
  legalFirstName?: string | null;
  legalMiddleName?: string | null;
  licenceType?: string | null;
  scalerClientLoc?: string | null;
}

export interface ScalerAddress {
  scalerLicenceNo?: string | null;
  company?: string | null;
  lastName?: string | null;
  firstName?: string | null;
  businessPhone?: string | null;
  homePhone?: string | null;
  cellPhone?: string | null;
  faxNumber?: string | null;
  emailAddress?: string | null;
  address1?: string | null;
  address2?: string | null;
  address3?: string | null;
  city?: string | null;
  province?: string | null;
  country?: string | null;
  postalCode?: string | null;
}

export interface ScalerSummaryLicenceType {
  code?: string | null;
  description?: string | null;
}

export interface ScalerSummary {
  scalerLicenceNo?: string | null;
  clientNumber?: string | null;
  orgUnitName?: string | null;
  issuedDate?: string | null;
  expiryDate?: string | null;
  licenceCancelledDate?: string | null;
  oathTakenInd?: string | null;
  licenceStatus?: string | null;
  licenceTypes?: ScalerSummaryLicenceType[] | null;
}

export class ScalersService {
  /**
   * Calls POST /api/scalers
   */
  async createScaler(payload: ScalerCreateRequest, token?: string): Promise<ScalerDetail> {
    const response = await axios.post<ScalerDetail>(`${BackendApiConfig.BASE}/scalers`, payload, {
      headers: jsonHeaders(token),
    });
    return response.data;
  }

  /**
   * Calls PUT /api/scalers/{scalerLicenceNo}
   *
   * `licenceCancelledDate` is read-only via this endpoint — the edit form never sends it.
   */
  async updateScaler(
    scalerLicenceNo: string,
    payload: ScalerCreateRequest,
    token?: string,
  ): Promise<ScalerDetail> {
    const response = await axios.put<ScalerDetail>(
      `${BackendApiConfig.BASE}/scalers/${encodeURIComponent(scalerLicenceNo)}`,
      payload,
      {
        headers: jsonHeaders(token),
      },
    );
    return response.data;
  }

  /**
   * Calls DELETE /api/scalers/{scalerLicenceNo}
   *
   * Deletes the scaler and its intrinsic sub-records (legacy cascade). A scaler with dependent
   * records the cascade does not clear (authorizations, performance remarks, risk questionnaires)
   * returns 400 with the legacy child-record message.
   */
  async deleteScaler(scalerLicenceNo: string, token?: string): Promise<void> {
    await axios.delete(
      `${BackendApiConfig.BASE}/scalers/${encodeURIComponent(scalerLicenceNo)}`,
      {
        headers: jsonHeaders(token),
      },
    );
  }

  /**
   * Calls GET /api/scalers/{scalerLicenceNo}
   */
  async getScaler(scalerLicenceNo: string, token?: string): Promise<ScalerDetail> {
    const response = await axios.get<ScalerDetail>(
      `${BackendApiConfig.BASE}/scalers/${encodeURIComponent(scalerLicenceNo)}`,
      {
        headers: jsonHeaders(token),
      },
    );
    return response.data;
  }

  /**
   * Calls PATCH /api/scalers/{scalerLicenceNo}/licence-cancelled-date
   *
   * Sets or clears the scaler's Licence Cancelled Date (Performance Remarks tab). Pass null to
   * clear the date. Returns the updated scaler detail.
   */
  async updateLicenceCancelledDate(
    scalerLicenceNo: string,
    licenceCancelledDate: string | null,
    token?: string,
  ): Promise<ScalerDetail> {
    const response = await axios.patch<ScalerDetail>(
      `${BackendApiConfig.BASE}/scalers/${encodeURIComponent(scalerLicenceNo)}/licence-cancelled-date`,
      { licenceCancelledDate },
      {
        headers: jsonHeaders(token),
      },
    );
    return response.data;
  }

  /**
   * Calls GET /api/scalers/{scalerLicenceNo}/summary
   */
  async getScalerSummary(scalerLicenceNo: string, token?: string): Promise<ScalerSummary> {
    const response = await axios.get<ScalerSummary>(
      `${BackendApiConfig.BASE}/scalers/${encodeURIComponent(scalerLicenceNo)}/summary`,
      {
        headers: jsonHeaders(token),
      },
    );
    return response.data;
  }

  /**
   * Calls GET /api/scalers/{scalerLicenceNo}/address
   */
  async getScalerAddress(scalerLicenceNo: string, token?: string): Promise<ScalerAddress> {
    const response = await axios.get<ScalerAddress>(
      `${BackendApiConfig.BASE}/scalers/${encodeURIComponent(scalerLicenceNo)}/address`,
      {
        headers: jsonHeaders(token),
      },
    );
    return response.data;
  }

  /**
   * Calls GET /api/scalers/search
   */
  async searchScalers(params: ScalerSearchParams, token?: string): Promise<Scaler[]> {
    const response = await axios.get<Scaler[]>(`${BackendApiConfig.BASE}/scalers/search`, {
      params,
      headers: jsonHeaders(token),
    });

    return response.data;
  }

  /**
   * Calls GET /api/scalers/{scalerLicenceNo}/tombstone
   */
  async getScalerTombstone(scalerLicenceNo: string, token?: string): Promise<{
    scalerLicenceNo: string;
    clientName?: string | null;
    legalFirstName?: string | null;
    regionName?: string | null;
    districtName?: string | null;
  } | null> {
    const response = await axios.get(`${BackendApiConfig.BASE}/scalers/${encodeURIComponent(scalerLicenceNo)}/tombstone`, {
      headers: jsonHeaders(token),
    });
    return response.data ?? null;
  }
}
