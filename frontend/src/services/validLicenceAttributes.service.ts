import axios from 'axios';
import type { AuditDetails } from './audit.types';

import { BackendApiConfig } from './APIs';
import { jsonHeaders } from './utils/headers';

export interface ValidLicenceAttributeDetail extends AuditDetails {
  scaleGradingSystemCode?: string | null;
  scalerAppointmentType?: string | null;
  effectiveDate?: string | null;
  expiryDate?: string | null;
  scalerAppointmentTypeDescription?: string | null;
  scalerAppointmentTypeActing?: string | null;
  dependentChildExists?: boolean | null;
}

export interface ValidLicenceAttributeCreateRequest {
  scaleGradingSystemCode: string;
  scalerAppointmentType: string;
  effectiveDate: string;
  expiryDate?: string | null;
}

export interface ValidLicenceAttributeUpdateRequest {
  effectiveDate: string;
  expiryDate?: string | null;
}

export type ValidLicenceAttributeSearchParams = {
  scaleGradingSystemCode?: string;
  scalerAppointmentType?: string;
};

export class ValidLicenceAttributesService {
  async searchValidLicenceAttributes(
    params?: ValidLicenceAttributeSearchParams,
    token?: string,
  ): Promise<ValidLicenceAttributeDetail[]> {
    const response = await axios.get<ValidLicenceAttributeDetail[]>(
      `${BackendApiConfig.BASE}/valid-licence-attributes`,
      { params, headers: jsonHeaders(token) },
    );
    return response.data;
  }

  async getValidLicenceAttribute(
    scaleGradingSystemCode: string,
    scalerAppointmentType: string,
    token?: string,
  ): Promise<ValidLicenceAttributeDetail> {
    const response = await axios.get<ValidLicenceAttributeDetail>(
      `${BackendApiConfig.BASE}/valid-licence-attributes/${encodeURIComponent(scaleGradingSystemCode)}/${encodeURIComponent(scalerAppointmentType)}`,
      { headers: jsonHeaders(token) },
    );
    return response.data;
  }

  async createValidLicenceAttribute(
    payload: ValidLicenceAttributeCreateRequest,
    token?: string,
  ): Promise<ValidLicenceAttributeDetail> {
    const response = await axios.post<ValidLicenceAttributeDetail>(
      `${BackendApiConfig.BASE}/valid-licence-attributes`,
      payload,
      { headers: jsonHeaders(token) },
    );
    return response.data;
  }

  async updateValidLicenceAttribute(
    scaleGradingSystemCode: string,
    scalerAppointmentType: string,
    payload: ValidLicenceAttributeUpdateRequest,
    token?: string,
  ): Promise<ValidLicenceAttributeDetail> {
    const response = await axios.put<ValidLicenceAttributeDetail>(
      `${BackendApiConfig.BASE}/valid-licence-attributes/${encodeURIComponent(scaleGradingSystemCode)}/${encodeURIComponent(scalerAppointmentType)}`,
      payload,
      { headers: jsonHeaders(token) },
    );
    return response.data;
  }

  async deleteValidLicenceAttribute(
    scaleGradingSystemCode: string,
    scalerAppointmentType: string,
    token?: string,
  ): Promise<void> {
    await axios.delete(
      `${BackendApiConfig.BASE}/valid-licence-attributes/${encodeURIComponent(scaleGradingSystemCode)}/${encodeURIComponent(scalerAppointmentType)}`,
      { headers: jsonHeaders(token) },
    );
  }
}
