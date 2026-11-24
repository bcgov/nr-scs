import axios from 'axios';
import type { AuditDetails } from './audit.types';

import { BackendApiConfig } from './APIs';
import { jsonHeaders } from './utils/headers';
import type { ScaleAuthCondition, ScaleAuthConditionRef } from './scalerAuthorizations.service';

export interface ScaleAuthTemplate extends AuditDetails {
  scaleAuthTemplateId?: number | null;
  orgUnitNo?: number | null;
  scaleConditionClassCode?: string | null;
  scaleAuthTemplateName?: string | null;
  conditions?: ScaleAuthCondition[] | null;
}

export interface ScaleAuthTemplateSaveRequest {
  scaleAuthTemplateName: string;
  scaleConditionClassCode: string;
  orgUnitNo: number;
  conditions?: ScaleAuthConditionRef[] | null;
}

export type ScaleAuthTemplateSearchParams = {
  scaleConditionClassCode?: string;
  orgUnitNo?: number;
  scaleAuthTemplateName?: string;
};

export class ScaleAuthTemplatesService {
  async searchTemplates(
    params?: ScaleAuthTemplateSearchParams,
    token?: string,
  ): Promise<ScaleAuthTemplate[]> {
    const response = await axios.get<ScaleAuthTemplate[]>(
      `${BackendApiConfig.BASE}/scale-auth-templates`,
      { params, headers: jsonHeaders(token) },
    );
    return response.data;
  }

  async getTemplate(templateId: number, token?: string): Promise<ScaleAuthTemplate> {
    const response = await axios.get<ScaleAuthTemplate>(
      `${BackendApiConfig.BASE}/scale-auth-templates/${templateId}`,
      { headers: jsonHeaders(token) },
    );
    return response.data;
  }

  async createTemplate(
    request: ScaleAuthTemplateSaveRequest,
    token?: string,
  ): Promise<ScaleAuthTemplate> {
    const response = await axios.post<ScaleAuthTemplate>(
      `${BackendApiConfig.BASE}/scale-auth-templates`,
      request,
      { headers: jsonHeaders(token) },
    );
    return response.data;
  }

  async updateTemplate(
    templateId: number,
    request: ScaleAuthTemplateSaveRequest,
    token?: string,
  ): Promise<ScaleAuthTemplate> {
    const response = await axios.put<ScaleAuthTemplate>(
      `${BackendApiConfig.BASE}/scale-auth-templates/${templateId}`,
      request,
      { headers: jsonHeaders(token) },
    );
    return response.data;
  }

  async deleteTemplate(templateId: number, token?: string): Promise<void> {
    await axios.delete(`${BackendApiConfig.BASE}/scale-auth-templates/${templateId}`, {
      headers: jsonHeaders(token),
    });
  }
}
