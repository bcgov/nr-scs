import axios from 'axios';

import { BackendApiConfig } from './APIs';
// The shared builder rather than a local copy: it also carries the client-scope headers, so a local
// one silently opted this service out of the active-client switcher and the dev mock client.
import { jsonHeaders } from './utils/headers';

import type { ScalerExamDetail, ScalerExamRequest } from './scalerExams.types';

export type { ScalerExamDetail, ScalerExamRequest } from './scalerExams.types';

export class ScalerExamsService {
  async getScalerExams(
    scalerLicenceNo: string,
    token?: string,
  ): Promise<ScalerExamDetail[]> {
    const response = await axios.get<ScalerExamDetail[]>(
      `${BackendApiConfig.BASE}/scalers/${encodeURIComponent(scalerLicenceNo)}/exams`,
      {
        headers: jsonHeaders(token),
      },
    );
    return response.data;
  }

  async createScalerExam(
    scalerLicenceNo: string,
    payload: ScalerExamRequest,
    token?: string,
  ): Promise<ScalerExamDetail> {
    const response = await axios.post<ScalerExamDetail>(
      `${BackendApiConfig.BASE}/scalers/${encodeURIComponent(scalerLicenceNo)}/exams`,
      payload,
      {
        headers: jsonHeaders(token),
      },
    );
    return response.data;
  }

  async updateScalerExam(
    scalerLicenceNo: string,
    scalerTrainingTypeId: string,
    payload: ScalerExamRequest,
    token?: string,
  ): Promise<ScalerExamDetail> {
    const response = await axios.put<ScalerExamDetail>(
      `${BackendApiConfig.BASE}/scalers/${encodeURIComponent(scalerLicenceNo)}/exams/${encodeURIComponent(scalerTrainingTypeId)}`,
      payload,
      {
        headers: jsonHeaders(token),
      },
    );
    return response.data;
  }

  async deleteScalerExam(
    scalerLicenceNo: string,
    scalerTrainingTypeId: string,
    token?: string,
  ): Promise<void> {
    await axios.delete(
      `${BackendApiConfig.BASE}/scalers/${encodeURIComponent(scalerLicenceNo)}/exams/${encodeURIComponent(scalerTrainingTypeId)}`,
      {
        headers: jsonHeaders(token),
      },
    );
  }
}
