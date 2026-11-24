import axios from 'axios';
import type { AuditDetails } from './audit.types';

import { BackendApiConfig } from './APIs';
import { jsonHeaders } from './utils/headers';

export interface InspectionQuestionSummary extends AuditDetails {
  inspectionQuestionId?: number | null;
  questionText?: string | null;
  commentRequiredInd?: string | null;
  sortOrderNo?: number | null;
  effectiveDate?: string | null;
  expiryDate?: string | null;
  inspectionTypeCodes?: string[] | null;
}

export interface InspectionQuestionDetail extends InspectionQuestionSummary {
  scalingMethodTypeCodes?: string[] | null;
  validResponseCodes?: string[] | null;
  questionUsed?: boolean | null;
}

export interface InspectionQuestionSaveRequest {
  questionText: string;
  commentRequiredInd: string;
  sortOrderNo: number;
  effectiveDate: string;
  expiryDate: string;
  inspectionTypeCodes: string[];
  scalingMethodTypeCodes: string[];
  validResponseCodes: string[];
}

export type InspectionQuestionSearchParams = {
  inspectionQuestionId?: number;
  questionText?: string;
  commentRequiredInd?: string;
  sortOrderNo?: number;
  effectiveDate?: string;
  expiryDate?: string;
};

export class InspectionQuestionsService {
  async searchQuestions(
    params?: InspectionQuestionSearchParams,
    token?: string,
  ): Promise<InspectionQuestionSummary[]> {
    const response = await axios.get<InspectionQuestionSummary[]>(
      `${BackendApiConfig.BASE}/inspection-questions`,
      { params, headers: jsonHeaders(token) },
    );
    return response.data;
  }

  async getQuestion(questionId: number, token?: string): Promise<InspectionQuestionDetail> {
    const response = await axios.get<InspectionQuestionDetail>(
      `${BackendApiConfig.BASE}/inspection-questions/${questionId}`,
      { headers: jsonHeaders(token) },
    );
    return response.data;
  }

  async createQuestion(
    request: InspectionQuestionSaveRequest,
    token?: string,
  ): Promise<InspectionQuestionDetail> {
    const response = await axios.post<InspectionQuestionDetail>(
      `${BackendApiConfig.BASE}/inspection-questions`,
      request,
      { headers: jsonHeaders(token) },
    );
    return response.data;
  }

  async updateQuestion(
    questionId: number,
    request: InspectionQuestionSaveRequest,
    token?: string,
  ): Promise<InspectionQuestionDetail> {
    const response = await axios.put<InspectionQuestionDetail>(
      `${BackendApiConfig.BASE}/inspection-questions/${questionId}`,
      request,
      { headers: jsonHeaders(token) },
    );
    return response.data;
  }

  async deleteQuestion(questionId: number, token?: string): Promise<void> {
    await axios.delete(`${BackendApiConfig.BASE}/inspection-questions/${questionId}`, {
      headers: jsonHeaders(token),
    });
  }
}
