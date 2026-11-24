// Shared data-driven questionnaire types for the scaler and scale-site risk assessments. Both
// features render the same sections/questions/answers/risk-levels structure and submit the same
// save payload; only the detail header and search differ, so those stay in each domain service.

import type { AuditDetails } from './audit.types';

export interface RiskAssessmentAnswer {
  answerId?: number | null;
  answerText?: string | null;
  weight?: number | null;
  answerOrder?: number | null;
}

export interface RiskAssessmentQuestion {
  questionId?: number | null;
  questionText?: string | null;
  questionOrder?: number | null;
  selectedAnswerId?: number | null;
  answers?: RiskAssessmentAnswer[] | null;
}

export interface RiskAssessmentSection {
  sectionId?: number | null;
  sectionDescription?: string | null;
  sectionOrder?: number | null;
  questions?: RiskAssessmentQuestion[] | null;
}

export interface RiskAssessmentRiskRating {
  riskTypeCode?: string | null;
  codeDescription?: string | null;
  ratingDescription?: string | null;
  rangeLowValue?: number | null;
  rangeHighValue?: number | null;
}

export interface RiskAssessmentResponseInput {
  questionId: number;
  answerId?: number | null;
}

export type RiskAssessmentSaveRequest = {
  comments?: string;
  responses?: RiskAssessmentResponseInput[];
};

/**
 * A read-only risk-assessment summary row for the record "Risk Rating" tabs. Sourced from
 * `scs_risk_summary_vw` (via `/{scalers|scale-sites}/{id}/risk-ratings`), which — unlike the query
 * search — carries `entryTimestamp` (Date Created). Identical for scaler and scale site, so both
 * domains' services alias this one shape and the shared table/tab consume it directly.
 */
export interface RiskRatingSummary {
  riskQuestionnaireId?: number | null;
  entryTimestamp?: string | null;
  riskRating?: number | null;
  riskTypeCode?: string | null;
  codeDescription?: string | null;
  rangeLowValue?: number | null;
  rangeHighValue?: number | null;
  ratingDescription?: string | null;
  versionNo?: number | null;
}

/** The questionnaire fields the shared edit page needs, common to both domains' detail types. */
export interface RiskAssessmentDetailBase extends AuditDetails {
  riskQuestionnaireId?: number | null;
  templateId?: number | null;
  comments?: string | null;
  sections?: RiskAssessmentSection[] | null;
  riskRatings?: RiskAssessmentRiskRating[] | null;
}
