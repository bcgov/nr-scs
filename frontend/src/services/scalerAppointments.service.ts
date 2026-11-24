import axios from 'axios';

import { BackendApiConfig } from './APIs';
import { jsonHeaders } from './utils/headers';
import type {
  ScalerAppointmentCreateRequest,
  ScalerAppointmentDetail,
  ScalerAppointmentUpdateRequest,
} from './scalerAppointments.types';

export type {
  ProvinceWideIndicator,
  ScalerAppointmentCreateRequest,
  ScalerAppointmentDetail,
  ScalerAppointmentUpdateRequest,
} from './scalerAppointments.types';

export class ScalerAppointmentsService {
  async getScalerAppointments(scalerLicenceNo: string, token?: string): Promise<ScalerAppointmentDetail[]> {
    const response = await axios.get<ScalerAppointmentDetail[]>(
      `${BackendApiConfig.BASE}/scalers/${encodeURIComponent(scalerLicenceNo)}/appointments`,
      {
        headers: jsonHeaders(token),
      },
    );
    return response.data;
  }

  async createScalerAppointment(
    scalerLicenceNo: string,
    payload: ScalerAppointmentCreateRequest,
    token?: string,
  ): Promise<ScalerAppointmentDetail> {
    const response = await axios.post<ScalerAppointmentDetail>(
      `${BackendApiConfig.BASE}/scalers/${encodeURIComponent(scalerLicenceNo)}/appointments`,
      payload,
      {
        headers: jsonHeaders(token),
      },
    );
    return response.data;
  }

  async updateScalerAppointment(
    scalerLicenceNo: string,
    scalerLicenceAttributeId: number,
    payload: ScalerAppointmentUpdateRequest,
    token?: string,
  ): Promise<ScalerAppointmentDetail> {
    const response = await axios.put<ScalerAppointmentDetail>(
      `${BackendApiConfig.BASE}/scalers/${encodeURIComponent(scalerLicenceNo)}/appointments/${encodeURIComponent(String(scalerLicenceAttributeId))}`,
      payload,
      {
        headers: jsonHeaders(token),
      },
    );
    return response.data;
  }

  async deleteScalerAppointment(
    scalerLicenceNo: string,
    scalerLicenceAttributeId: number,
    token?: string,
  ): Promise<void> {
    await axios.delete(
      `${BackendApiConfig.BASE}/scalers/${encodeURIComponent(scalerLicenceNo)}/appointments/${encodeURIComponent(String(scalerLicenceAttributeId))}`,
      {
        headers: jsonHeaders(token),
      },
    );
  }
}


