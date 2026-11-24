import axios from "axios";

import { BackendApiConfig } from "./APIs";
import { jsonHeaders } from "./utils/headers";

import type {
  RiskAssessmentRiskRating,
  RiskAssessmentSaveRequest,
  RiskAssessmentSection,
  RiskRatingSummary,
} from "./riskAssessment.types";

export interface ScalerRiskAssessmentSearchResult {
  riskQuestionnaireId?: number | null;
  riskRating?: number | null;
  maxRiskRating?: number | null;
  numResp?: number | null;
  questCount?: number | null;
  riskTypeCode?: string | null;
  codeDescription?: string | null;
  rangeLowValue?: number | null;
  rangeHighValue?: number | null;
  versionNo?: number | null;
  scalerLicenceNo?: string | null;
  scalerClientLoc?: string | null;
  orgUnitName?: string | null;
  clientName?: string | null;
}

export interface ScalerRiskAssessmentDetail extends ScalerRiskAssessmentSearchResult {
  templateId?: number | null;
  districtName?: string | null;
  regionName?: string | null;
  comments?: string | null;
  sections?: RiskAssessmentSection[] | null;
  riskRatings?: RiskAssessmentRiskRating[] | null;
}

/**
 * A read-only risk-assessment summary row for the scaler record's "Risk Rating" tab. Sourced from
 * `scs_risk_summary_vw` (via `/scalers/{scalerLicenceNo}/risk-ratings`), which — unlike the query
 * search — carries `entryTimestamp` (Date Created).
 */
export type ScalerRiskRatingSummary = RiskRatingSummary;

export type ScalerRiskAssessmentSearchParams = {
  riskQuestionnaireId?: string;
  riskTypeCode?: string;
  completeInd?: "Y" | "N";
  scalerLicenceNo?: string;
  orgUnitNo?: number;
  clientNumber?: string;
  scalerLicenceTypeCode?: "SCS" | "WA";
  primarySort?: number;
  secondarySort?: number;
};

export class ScalerRiskAssessmentsService {
  async getScalerRiskAssessment(
    riskQuestionnaireId: number,
    token?: string,
  ): Promise<ScalerRiskAssessmentDetail> {
    const response = await axios.get<ScalerRiskAssessmentDetail>(
      `${BackendApiConfig.BASE}/scaler-risk-assessments/${riskQuestionnaireId}`,
      {
        headers: jsonHeaders(token),
      },
    );

    return response.data;
  }

  async updateScalerRiskAssessment(
    riskQuestionnaireId: number,
    request: RiskAssessmentSaveRequest,
    token?: string,
  ): Promise<ScalerRiskAssessmentDetail> {
    const response = await axios.put<ScalerRiskAssessmentDetail>(
      `${BackendApiConfig.BASE}/scaler-risk-assessments/${riskQuestionnaireId}`,
      request,
      {
        headers: jsonHeaders(token),
      },
    );

    return response.data;
  }

  async searchScalerRiskAssessments(
    params: ScalerRiskAssessmentSearchParams,
    token?: string,
  ): Promise<ScalerRiskAssessmentSearchResult[]> {
    const response = await axios.get<ScalerRiskAssessmentSearchResult[]>(
      `${BackendApiConfig.BASE}/scaler-risk-assessments/search`,
      {
        params,
        headers: jsonHeaders(token),
      },
    );

    return response.data;
  }

  async getScalerRiskRatings(
    scalerLicenceNo: string,
    token?: string,
  ): Promise<ScalerRiskRatingSummary[]> {
    const response = await axios.get<ScalerRiskRatingSummary[]>(
      `${BackendApiConfig.BASE}/scalers/${encodeURIComponent(scalerLicenceNo)}/risk-ratings`,
      {
        headers: jsonHeaders(token),
      },
    );

    return response.data;
  }

  /**
   * The blank "Add Risk Assessment" payload for a scaler: the scaler header, the active SCLE
   * template's blank questionnaire, and the Risk Levels table. No record is persisted until the
   * create POST.
   */
  async getScalerRiskAssessmentCreateInit(
    scalerLicenceNo: string,
    token?: string,
  ): Promise<ScalerRiskAssessmentDetail> {
    const response = await axios.get<ScalerRiskAssessmentDetail>(
      `${BackendApiConfig.BASE}/scalers/${encodeURIComponent(scalerLicenceNo)}/risk-assessments/create-init`,
      {
        headers: jsonHeaders(token),
      },
    );

    return response.data;
  }

  async createScalerRiskAssessment(
    scalerLicenceNo: string,
    request: RiskAssessmentSaveRequest,
    token?: string,
  ): Promise<ScalerRiskAssessmentDetail> {
    const response = await axios.post<ScalerRiskAssessmentDetail>(
      `${BackendApiConfig.BASE}/scalers/${encodeURIComponent(scalerLicenceNo)}/risk-assessments`,
      request,
      {
        headers: jsonHeaders(token),
      },
    );

    return response.data;
  }
}
