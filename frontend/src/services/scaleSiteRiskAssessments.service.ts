import axios from "axios";

import { BackendApiConfig } from "./APIs";
import { jsonHeaders } from "./utils/headers";

import type {
  RiskAssessmentRiskRating,
  RiskAssessmentSaveRequest,
  RiskAssessmentSection,
  RiskRatingSummary,
} from "./riskAssessment.types";

export interface ScaleSiteRiskAssessmentDetail extends ScaleSiteRiskAssessmentSearchResult {
  templateId?: number | null;
  regionName?: string | null;
  districtName?: string | null;
  comments?: string | null;
  sections?: RiskAssessmentSection[] | null;
  riskRatings?: RiskAssessmentRiskRating[] | null;
}

export interface ScaleSiteRiskAssessmentSearchResult {
  riskQuestionnaireId?: number | null;
  riskRating?: number | null;
  scaleSiteIdNmbr?: string | null;
  versionNo?: number | null;
  maxRiskRating?: number | null;
  ratingDescription?: string | null;
  riskTypeCode?: string | null;
  codeDescription?: string | null;
  rangeLowValue?: number | null;
  rangeHighValue?: number | null;
  numResp?: number | null;
  questCount?: number | null;
  completeInd?: string | null;
  orgUnitNo?: number | null;
  methodTypeCodeName?: string | null;
  ownerClientNumber?: string | null;
  ownerClientLocnCode?: string | null;
  siteName?: string | null;
  district?: string | null;
}

/**
 * A read-only risk-assessment summary row for the scale site record's "Risk Rating" tab. Sourced
 * from `scs_risk_summary_vw` (via `/scale-sites/{scaleSiteIdNmbr}/risk-ratings`), which carries
 * `entryTimestamp` (Date Created). Mirrors the scaler tab's summary shape.
 */
export type ScaleSiteRiskRatingSummary = RiskRatingSummary;

export type ScaleSiteRiskAssessmentSearchParams = {
  riskQuestionnaireId?: string;
  riskTypeCode?: string;
  completeInd?: "Y" | "N";
  scaleSiteIdNmbr?: string;
  orgUnitNo?: number;
  methodTypes?: string[];
  siteName?: string;
  ownerClientNumber?: string;
  ownerClientLocnCode?: string;
  primarySort?: number;
  secondarySort?: number;
};

export class ScaleSiteRiskAssessmentsService {
  async getScaleSiteRiskAssessment(
    riskQuestionnaireId: number,
    token?: string,
  ): Promise<ScaleSiteRiskAssessmentDetail> {
    const response = await axios.get<ScaleSiteRiskAssessmentDetail>(
      `${BackendApiConfig.BASE}/scale-site-risk-assessments/${riskQuestionnaireId}`,
      { headers: jsonHeaders(token) },
    );
    return response.data;
  }

  async updateScaleSiteRiskAssessment(
    riskQuestionnaireId: number,
    request: RiskAssessmentSaveRequest,
    token?: string,
  ): Promise<ScaleSiteRiskAssessmentDetail> {
    const response = await axios.put<ScaleSiteRiskAssessmentDetail>(
      `${BackendApiConfig.BASE}/scale-site-risk-assessments/${riskQuestionnaireId}`,
      request,
      { headers: jsonHeaders(token) },
    );
    return response.data;
  }

  async searchScaleSiteRiskAssessments(
    params: ScaleSiteRiskAssessmentSearchParams,
    token?: string,
  ): Promise<ScaleSiteRiskAssessmentSearchResult[]> {
    const response = await axios.get<ScaleSiteRiskAssessmentSearchResult[]>(
      `${BackendApiConfig.BASE}/scale-site-risk-assessments/search`,
      {
        params,
        headers: jsonHeaders(token),
      },
    );

    return response.data;
  }

  async getScaleSiteRiskRatings(
    scaleSiteIdNmbr: string,
    token?: string,
  ): Promise<ScaleSiteRiskRatingSummary[]> {
    const response = await axios.get<ScaleSiteRiskRatingSummary[]>(
      `${BackendApiConfig.BASE}/scale-sites/${encodeURIComponent(scaleSiteIdNmbr)}/risk-ratings`,
      {
        headers: jsonHeaders(token),
      },
    );

    return response.data;
  }

  /**
   * The blank "Add Risk Assessment" payload for a scale site: the scale-site header, the active SCSI
   * template's blank questionnaire, and the Risk Levels table. No record is persisted until the
   * create POST.
   */
  async getScaleSiteRiskAssessmentCreateInit(
    scaleSiteIdNmbr: string,
    token?: string,
  ): Promise<ScaleSiteRiskAssessmentDetail> {
    const response = await axios.get<ScaleSiteRiskAssessmentDetail>(
      `${BackendApiConfig.BASE}/scale-sites/${encodeURIComponent(scaleSiteIdNmbr)}/risk-assessments/create-init`,
      {
        headers: jsonHeaders(token),
      },
    );

    return response.data;
  }

  async createScaleSiteRiskAssessment(
    scaleSiteIdNmbr: string,
    request: RiskAssessmentSaveRequest,
    token?: string,
  ): Promise<ScaleSiteRiskAssessmentDetail> {
    const response = await axios.post<ScaleSiteRiskAssessmentDetail>(
      `${BackendApiConfig.BASE}/scale-sites/${encodeURIComponent(scaleSiteIdNmbr)}/risk-assessments`,
      request,
      {
        headers: jsonHeaders(token),
      },
    );

    return response.data;
  }
}
