package ca.bc.gov.nrs.scs.backend.dto;

import java.time.LocalDate;
import java.time.OffsetDateTime;

/** The {@code RISK_QUESTIONNAIRE} row - carries the all-important {@code templateId} link. */
public record QuestionnaireRow(
    Long riskQuestionnaireId,
    LocalDate startQuestionnaireDate,
    LocalDate completedQuestionnaireDate,
    String comments,
    String scalerLicenceNo,
    Long wasteAssessmentAreaId,
    // scale_site_id_nmbr is VARCHAR2(4) - always String (both the scaler and scale-site
    // repos read it via rs.getString and bind via setStringOrNull).
    String scaleSiteIdNmbr,
    Long timberCruisePlanId,
    String riskTemplateType,
    Long templateId,
    Long timberCruiseParticipantId,
    String checkRecommendInd,
    String cruisePlanStageCode,
    OffsetDateTime entryTimestamp,
    String entryUserid,
    OffsetDateTime updateTimestamp,
    String updateUserid,
    Long revisionCount) {}
