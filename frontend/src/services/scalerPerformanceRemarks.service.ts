import axios from 'axios';

import { BackendApiConfig } from './APIs';
import { jsonHeaders } from './utils/headers';

import type {
  ScalerPerformanceRemarkCreateRequest,
  ScalerPerformanceRemarkDetail,
  ScalerPerformanceRemarkUpdateRequest,
} from './scalerPerformanceRemarks.types';

export type {
  ScalerPerformanceRemarkCreateRequest,
  ScalerPerformanceRemarkDetail,
  ScalerPerformanceRemarkUpdateRequest,
} from './scalerPerformanceRemarks.types';

export class ScalerPerformanceRemarksService {
  async getScalerPerformanceRemarks(
    scalerLicenceNo: string,
    token?: string,
  ): Promise<ScalerPerformanceRemarkDetail[]> {
    const response = await axios.get<ScalerPerformanceRemarkDetail[]>(
      `${BackendApiConfig.BASE}/scalers/${encodeURIComponent(scalerLicenceNo)}/performance-remarks`,
      {
        headers: jsonHeaders(token),
      },
    );
    return response.data;
  }

  async createScalerPerformanceRemark(
    scalerLicenceNo: string,
    payload: ScalerPerformanceRemarkCreateRequest,
    token?: string,
  ): Promise<ScalerPerformanceRemarkDetail> {
    const response = await axios.post<ScalerPerformanceRemarkDetail>(
      `${BackendApiConfig.BASE}/scalers/${encodeURIComponent(scalerLicenceNo)}/performance-remarks`,
      payload,
      {
        headers: jsonHeaders(token),
      },
    );
    return response.data;
  }

  async updateScalerPerformanceRemark(
    scalerLicenceNo: string,
    scalerPerformanceRemarkId: number,
    payload: ScalerPerformanceRemarkUpdateRequest,
    token?: string,
  ): Promise<ScalerPerformanceRemarkDetail> {
    const response = await axios.put<ScalerPerformanceRemarkDetail>(
      `${BackendApiConfig.BASE}/scalers/${encodeURIComponent(scalerLicenceNo)}/performance-remarks/${encodeURIComponent(String(scalerPerformanceRemarkId))}`,
      payload,
      {
        headers: jsonHeaders(token),
      },
    );
    return response.data;
  }

  async deleteScalerPerformanceRemark(
    scalerLicenceNo: string,
    scalerPerformanceRemarkId: number,
    token?: string,
  ): Promise<void> {
    await axios.delete(
      `${BackendApiConfig.BASE}/scalers/${encodeURIComponent(scalerLicenceNo)}/performance-remarks/${encodeURIComponent(String(scalerPerformanceRemarkId))}`,
      {
        headers: jsonHeaders(token),
      },
    );
  }
}
