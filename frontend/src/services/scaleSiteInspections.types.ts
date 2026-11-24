export interface ScaleSiteInspectionAnswerOption {
  code: string;
  description: string;
}

export interface ScaleSiteInspectionRecipientOption {
  value: string;
  label: string;
}

export interface ScaleSiteInspectionSummary {
  inspectionId?: number | null;
  inspectionTypeDescription?: string | null;
  siteTypeDisplay?: string | null;
  inspectionDate?: string | null;
  inspector?: string | null;
  followUpInspectionIndicator?: string | null;
}

export interface ScaleSiteInspectionSearchResult {
  scaleSiteIdNmbr?: string | null;
  inspectionId?: number | null;
}

export interface ScaleSiteInspectionQuestionResponse {
  questionText?: string | null;
  inspectionAnswerCode?: string | null;
  inspectionAnswerDescription?: string | null;
  commentsText?: string | null;
  followUpRequiredInd?: string | null;
  followUpRequiredDescription?: string | null;
  followUpActionText?: string | null;
  followUpDueDate?: string | null;
  followUpCompletedInd?: string | null;
  followUpCompletedDescription?: string | null;
}

export interface ScaleSiteInspectionEditQuestionResponse {
  inspectionQuestionId: number;
  questionText?: string | null;
  inspectionAnswerCode?: string | null;
  inspectionAnswerDescription?: string | null;
  answerOptions: ScaleSiteInspectionAnswerOption[];
  commentsText?: string | null;
  followUpRequiredInd?: 'Y' | 'N' | null;
  followUpRequiredDescription?: string | null;
  followUpActionText?: string | null;
  followUpDueDate?: string | null;
  followUpCompletedInd?: 'Y' | 'N' | null;
  followUpCompletedDescription?: string | null;
}

export interface ScaleSiteInspectionDetail {
  inspectionId?: number | null;
  inspectionTypeCode?: string | null;
  inspectionTypeDescription?: string | null;
  inspectionDate?: string | null;
  inspector?: string | null;
  scaleSiteIdNmbr?: string | null;
  siteName?: string | null;
  siteLocation?: string | null;
  siteOwnerName?: string | null;
  siteTypeDisplay?: string | null;
  previousInspectionId?: number | null;
  recipient?: string | null;
  siteOperatorPresentInd?: string | null;
  siteOperatorPresentDescription?: string | null;
  comments?: string | null;
  questionResponses?: ScaleSiteInspectionQuestionResponse[];
}

export interface ScaleSiteInspectionEditView {
  inspectionId?: number | null;
  inspectionTypeCode?: string | null;
  inspectionTypeDescription?: string | null;
  inspectionDate?: string | null;
  inspector?: string | null;
  scaleSiteIdNmbr?: string | null;
  siteName?: string | null;
  siteLocation?: string | null;
  siteOwnerName?: string | null;
  siteTypeDisplay?: string | null;
  previousInspectionId?: number | null;
  recipient?: string | null;
  siteOperatorPresentInd?: 'Y' | 'N' | null;
  siteOperatorPresentDescription?: string | null;
  comments?: string | null;
  questionResponses?: ScaleSiteInspectionEditQuestionResponse[];
}

export interface ScaleSiteInspectionCreateInitView {
  scaleSiteIdNmbr?: string | null;
  siteName?: string | null;
  siteLocation?: string | null;
  siteOwnerName?: string | null;
  inspectionTypeCode?: string | null;
  inspectionTypeDescription?: string | null;
  siteTypeCodes?: string[];
  siteTypeDisplay?: string | null;
  recipientOptions?: ScaleSiteInspectionRecipientOption[];
  recipient?: string | null;
  siteOperatorPresentInd?: 'Y' | 'N' | null;
  inspector?: string | null;
  inspectionDate?: string | null;
  previousInspectionId?: number | null;
  comments?: string | null;
  questionResponses?: ScaleSiteInspectionEditQuestionResponse[];
}

export interface ScaleSiteInspectionQuestionResponseInput {
  inspectionQuestionId: number;
  inspectionAnswerCode: string;
  commentsText?: string | null;
  followUpRequiredInd: 'Y' | 'N';
  followUpActionText?: string | null;
  followUpDueDate?: string | null;
  followUpCompletedInd?: 'Y' | 'N' | null;
}

export interface ScaleSiteInspectionUpdateRequest {
  inspectionDate: string;
  inspector: string;
  siteOperatorPresentInd: 'Y' | 'N';
  comments?: string | null;
  questionResponses: ScaleSiteInspectionQuestionResponseInput[];
}

export interface ScaleSiteInspectionCreateRequest {
  inspectionTypeCode: string;
  siteTypeCodes: string[];
  inspectionDate: string;
  inspector?: string | null;
  previousInspectionId?: number | null;
  recipient?: string | null;
  siteOperatorPresentInd: 'Y' | 'N';
  comments?: string | null;
  questionResponses: ScaleSiteInspectionQuestionResponseInput[];
}

