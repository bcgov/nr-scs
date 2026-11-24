import axios from 'axios';
import type { AuditDetails } from './audit.types';

import { BackendApiConfig } from './APIs';
import { jsonHeaders } from './utils/headers';

export interface AppointmentType extends AuditDetails {
  code?: string | null;
  description?: string | null;
  actingInd?: 'Y' | 'N' | null;
  effectiveDate?: string | null;
  expiryDate?: string | null;
}

export type AppointmentTypeSearchParams = {
  code?: string;
  description?: string;
  actingInd?: 'Y' | 'N';
  effectiveDate?: string;
  expiryDate?: string;
};

export type AppointmentTypeCreateRequest = {
  code: string;
  description: string;
  actingInd: 'Y' | 'N';
  effectiveDate: string;
  expiryDate: string;
};

export type AppointmentTypeUpdateRequest = {
  description: string;
  actingInd: 'Y' | 'N';
  effectiveDate: string;
  expiryDate: string;
};

export class AppointmentTypesService {
  async searchAppointmentTypes(params?: AppointmentTypeSearchParams, token?: string): Promise<AppointmentType[]> {
    const response = await axios.get<AppointmentType[]>(`${BackendApiConfig.BASE}/appointment-types`, {
      params,
      headers: jsonHeaders(token),
    });
    return response.data;
  }

  async createAppointmentType(
    payload: AppointmentTypeCreateRequest,
    token?: string,
  ): Promise<AppointmentType> {
    const response = await axios.post<AppointmentType>(
      `${BackendApiConfig.BASE}/appointment-types`,
      payload,
      { headers: jsonHeaders(token) },
    );
    return response.data;
  }

  async updateAppointmentType(
    appointmentTypeCode: string,
    payload: AppointmentTypeUpdateRequest,
    token?: string,
  ): Promise<AppointmentType> {
    const response = await axios.put<AppointmentType>(
      `${BackendApiConfig.BASE}/appointment-types/${encodeURIComponent(appointmentTypeCode)}`,
      payload,
      { headers: jsonHeaders(token) },
    );
    return response.data;
  }

  async deleteAppointmentType(appointmentTypeCode: string, token?: string): Promise<void> {
    await axios.delete(
      `${BackendApiConfig.BASE}/appointment-types/${encodeURIComponent(appointmentTypeCode)}`,
      { headers: jsonHeaders(token) },
    );
  }
}
