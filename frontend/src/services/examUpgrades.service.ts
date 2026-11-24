import axios from 'axios';
import type { AuditDetails } from './audit.types';

import { BackendApiConfig } from './APIs';
import { jsonHeaders } from './utils/headers';

export interface ExamUpgrade extends AuditDetails {
  scalerTrainingClassCode: string;
  scalerTrainingTypeId: string;
  licenceAccreditInd?: string | null;
  description?: string | null;
  effectiveDate?: string | null;
  expiryDate?: string | null;
}

export interface ExamUpgradeCreateRequest {
  scalerTrainingClassCode: string;
  licenceAccreditInd: string;
  description: string;
  effectiveDate: string;
  expiryDate?: string | null;
}

export interface ExamUpgradeUpdateRequest {
  licenceAccreditInd: string;
  description: string;
  effectiveDate: string;
  expiryDate?: string | null;
}

export class ExamUpgradesService {
  async listExamUpgrades(classCode?: string, token?: string): Promise<ExamUpgrade[]> {
    const response = await axios.get<ExamUpgrade[]>(`${BackendApiConfig.BASE}/exam-upgrades`, {
      params: classCode ? { classCode } : undefined,
      headers: jsonHeaders(token),
    });
    return response.data;
  }

  async getExamUpgrade(classCode: string, typeId: string, token?: string): Promise<ExamUpgrade> {
    const response = await axios.get<ExamUpgrade>(
      `${BackendApiConfig.BASE}/exam-upgrades/${encodeURIComponent(classCode)}/${encodeURIComponent(typeId)}`,
      { headers: jsonHeaders(token) },
    );
    return response.data;
  }

  async createExamUpgrade(payload: ExamUpgradeCreateRequest, token?: string): Promise<ExamUpgrade> {
    const response = await axios.post<ExamUpgrade>(
      `${BackendApiConfig.BASE}/exam-upgrades`,
      payload,
      { headers: jsonHeaders(token) },
    );
    return response.data;
  }

  async updateExamUpgrade(
    classCode: string,
    typeId: string,
    payload: ExamUpgradeUpdateRequest,
    token?: string,
  ): Promise<ExamUpgrade> {
    const response = await axios.put<ExamUpgrade>(
      `${BackendApiConfig.BASE}/exam-upgrades/${encodeURIComponent(classCode)}/${encodeURIComponent(typeId)}`,
      payload,
      { headers: jsonHeaders(token) },
    );
    return response.data;
  }

  async deleteExamUpgrade(classCode: string, typeId: string, token?: string): Promise<void> {
    await axios.delete(
      `${BackendApiConfig.BASE}/exam-upgrades/${encodeURIComponent(classCode)}/${encodeURIComponent(typeId)}`,
      { headers: jsonHeaders(token) },
    );
  }
}
