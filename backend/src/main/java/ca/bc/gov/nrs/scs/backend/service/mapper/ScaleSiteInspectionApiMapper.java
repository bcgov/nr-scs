package ca.bc.gov.nrs.scs.backend.service.mapper;

import static ca.bc.gov.nrs.scs.backend.util.SCSUtils.trimToNull;

import ca.bc.gov.nrs.scs.backend.domain.inspection.Inspection;
import ca.bc.gov.nrs.scs.backend.domain.inspection.InspectionAnswerOption;
import ca.bc.gov.nrs.scs.backend.domain.inspection.InspectionCreateCommand;
import ca.bc.gov.nrs.scs.backend.domain.inspection.InspectionCreateInit;
import ca.bc.gov.nrs.scs.backend.domain.inspection.InspectionQuestionAndAnswer;
import ca.bc.gov.nrs.scs.backend.domain.inspection.InspectionQuestionResponseInput;
import ca.bc.gov.nrs.scs.backend.domain.inspection.InspectionSearchRef;
import ca.bc.gov.nrs.scs.backend.domain.inspection.InspectionSummary;
import ca.bc.gov.nrs.scs.backend.domain.inspection.InspectionUpdateCommand;
import ca.bc.gov.nrs.scs.backend.domain.scalesite.ScaleSiteContactOption;
import ca.bc.gov.nrs.scs.backend.domain.shared.YesNo;
import ca.bc.gov.nrs.scs.backend.model.ScaleSiteInspectionAnswerOption;
import ca.bc.gov.nrs.scs.backend.model.ScaleSiteInspectionCreateInitView;
import ca.bc.gov.nrs.scs.backend.model.ScaleSiteInspectionCreateRequest;
import ca.bc.gov.nrs.scs.backend.model.ScaleSiteInspectionDetail;
import ca.bc.gov.nrs.scs.backend.model.ScaleSiteInspectionEditQuestionResponse;
import ca.bc.gov.nrs.scs.backend.model.ScaleSiteInspectionEditView;
import ca.bc.gov.nrs.scs.backend.model.ScaleSiteInspectionQuestionResponse;
import ca.bc.gov.nrs.scs.backend.model.ScaleSiteInspectionQuestionResponseInput;
import ca.bc.gov.nrs.scs.backend.model.ScaleSiteInspectionRecipientOption;
import ca.bc.gov.nrs.scs.backend.model.ScaleSiteInspectionSearchResult;
import ca.bc.gov.nrs.scs.backend.model.ScaleSiteInspectionSummary;
import ca.bc.gov.nrs.scs.backend.model.ScaleSiteInspectionUpdateRequest;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import org.openapitools.jackson.nullable.JsonNullable;

public final class ScaleSiteInspectionApiMapper {

  private ScaleSiteInspectionApiMapper() {}

  public static ScaleSiteInspectionDetail toDetailResponse(Inspection inspection) {
    return new ScaleSiteInspectionDetail()
        .inspectionId(inspection.inspectionId())
        .inspectionTypeCode(inspection.inspectionTypeCode())
        .inspectionTypeDescription(inspection.inspectionTypeDescription())
        .inspectionDate(inspection.inspectionDate())
        .inspector(inspection.inspector())
        .scaleSiteIdNmbr(inspection.scaleSiteIdNmbr())
        .siteName(inspection.siteName())
        .siteLocation(inspection.siteLocation())
        .siteOwnerName(inspection.siteOwnerName())
        .siteTypeDisplay(inspection.siteTypeDisplay())
        .previousInspectionId(inspection.previousInspectionId())
        .recipient(inspection.recipient())
        .siteOperatorPresentInd(YesNo.toCode(inspection.siteOperatorPresent()))
        .siteOperatorPresentDescription(YesNo.toLabel(inspection.siteOperatorPresent()))
        .comments(inspection.comments())
        .questionResponses(inspection.questionResponses().stream()
            .map(ScaleSiteInspectionApiMapper::toDetailQuestionResponse)
            .toList());
  }

  public static ScaleSiteInspectionEditView toEditResponse(Inspection inspection) {
    return new ScaleSiteInspectionEditView()
        .inspectionId(inspection.inspectionId())
        .inspectionTypeCode(inspection.inspectionTypeCode())
        .inspectionTypeDescription(inspection.inspectionTypeDescription())
        .inspectionDate(inspection.inspectionDate())
        .inspector(inspection.inspector())
        .scaleSiteIdNmbr(inspection.scaleSiteIdNmbr())
        .siteName(inspection.siteName())
        .siteLocation(inspection.siteLocation())
        .siteOwnerName(inspection.siteOwnerName())
        .siteTypeDisplay(inspection.siteTypeDisplay())
        .previousInspectionId(inspection.previousInspectionId())
        .recipient(inspection.recipient())
        .siteOperatorPresentInd(
            ScaleSiteInspectionEditView.SiteOperatorPresentIndEnum.fromValue(
                YesNo.toCode(inspection.siteOperatorPresent())))
        .siteOperatorPresentDescription(YesNo.toLabel(inspection.siteOperatorPresent()))
        .comments(inspection.comments())
        .questionResponses(inspection.questionResponses().stream()
            .map(ScaleSiteInspectionApiMapper::toEditQuestionResponse)
            .toList());
  }

  private static ScaleSiteInspectionQuestionResponse toDetailQuestionResponse(InspectionQuestionAndAnswer entry) {
    return new ScaleSiteInspectionQuestionResponse()
        .questionText(entry.questionText())
        .inspectionAnswerCode(entry.inspectionAnswerCode())
        .inspectionAnswerDescription(entry.inspectionAnswerDescription())
        .commentsText(entry.commentsText())
        .followUpRequiredInd(YesNo.toCode(entry.followUpRequired()))
        .followUpRequiredDescription(YesNo.toLabel(entry.followUpRequired()))
        .followUpActionText(entry.followUpActionText())
        .followUpDueDate(entry.followUpDueDate())
        .followUpCompletedInd(YesNo.toCode(entry.followUpCompleted()))
        .followUpCompletedDescription(YesNo.toLabel(entry.followUpCompleted()));
  }

  public static List<ScaleSiteInspectionEditQuestionResponse> toEditQuestionResponses(
      List<InspectionQuestionAndAnswer> entries) {
    if (entries == null) return List.of();
    return entries.stream()
        .map(ScaleSiteInspectionApiMapper::toEditQuestionResponse)
        .toList();
  }

  private static ScaleSiteInspectionEditQuestionResponse toEditQuestionResponse(InspectionQuestionAndAnswer entry) {
    return new ScaleSiteInspectionEditQuestionResponse()
        .inspectionQuestionId(entry.inspectionQuestionId())
        .questionText(entry.questionText())
        .inspectionAnswerCode(entry.inspectionAnswerCode())
        .inspectionAnswerDescription(entry.inspectionAnswerDescription())
        .answerOptions(new ArrayList<>(toAnswerOptions(entry.answerOptions())))
        .commentsText(entry.commentsText())
        .followUpRequiredInd(
            ScaleSiteInspectionEditQuestionResponse.FollowUpRequiredIndEnum.fromValue(
                YesNo.toCode(entry.followUpRequired())))
        .followUpRequiredDescription(YesNo.toLabel(entry.followUpRequired()))
        .followUpActionText(entry.followUpActionText())
        .followUpDueDate(entry.followUpDueDate())
        .followUpCompletedInd(
            ScaleSiteInspectionEditQuestionResponse.FollowUpCompletedIndEnum.fromValue(
                YesNo.toCode(entry.followUpCompleted())))
        .followUpCompletedDescription(YesNo.toLabel(entry.followUpCompleted()));
  }

  private static List<ScaleSiteInspectionAnswerOption> toAnswerOptions(List<InspectionAnswerOption> options) {
    if (options == null) return List.of();
    return options.stream()
        .map(o -> new ScaleSiteInspectionAnswerOption().code(o.code()).description(o.description()))
        .toList();
  }

  public static ScaleSiteInspectionCreateInitView toCreateInitResponse(InspectionCreateInit init) {
    return new ScaleSiteInspectionCreateInitView()
        .scaleSiteIdNmbr(init.scaleSiteIdNmbr())
        .siteName(init.siteName())
        .siteLocation(init.siteLocation())
        .siteOwnerName(init.siteOwnerName())
        .inspectionTypeCode(init.inspectionTypeCode())
        .inspectionTypeDescription(init.inspectionTypeDescription())
        .siteTypeCodes(init.siteTypeCodes() == null ? null : new ArrayList<>(init.siteTypeCodes()))
        .siteTypeDisplay(init.siteTypeDisplay())
        .recipientOptions(toRecipientOptions(init.recipientContacts()))
        .inspector(init.inspector())
        .questionResponses(toEditQuestionResponses(init.questionShells()));
  }

  public static List<ScaleSiteInspectionSummary> toSummaryResponses(List<InspectionSummary> summaries) {
    if (summaries == null) return List.of();
    return summaries.stream()
        .map(ScaleSiteInspectionApiMapper::toSummaryResponse)
        .toList();
  }

  public static ScaleSiteInspectionSummary toSummaryResponse(InspectionSummary summary) {
    return new ScaleSiteInspectionSummary()
        .inspectionId(summary.inspectionId())
        .inspectionTypeDescription(trimToNull(summary.inspectionTypeDescription()))
        .siteTypeDisplay(trimToNull(summary.siteTypeDisplay()))
        .inspectionDate(summary.inspectionDate())
        .inspector(trimToNull(summary.inspector()))
        .followUpInspectionIndicator(trimToNull(summary.followUpInspectionIndicator()));
  }

  public static ScaleSiteInspectionSearchResult toSearchResultResponse(InspectionSearchRef ref) {
    return new ScaleSiteInspectionSearchResult()
        .scaleSiteIdNmbr(ref.scaleSiteIdNmbr())
        .inspectionId(ref.inspectionId());
  }

  public static List<ScaleSiteInspectionRecipientOption> toRecipientOptions(List<ScaleSiteContactOption> contacts) {
    if (contacts == null) return List.of();
    return contacts.stream()
        .filter(Objects::nonNull)
        .map(ScaleSiteInspectionApiMapper::toRecipientOption)
        .filter(Objects::nonNull)
        .toList();
  }

  public static InspectionCreateCommand toCreateCommand(
      String scaleSiteIdNmbr,
      ScaleSiteInspectionCreateRequest request) {
    return new InspectionCreateCommand(
        scaleSiteIdNmbr,
        request.getInspectionTypeCode(),
        List.copyOf(request.getSiteTypeCodes()),
        request.getInspectionDate(),
        YesNo.fromCode(request.getSiteOperatorPresentInd().getValue()),
        trimToNull(unwrap(request.getComments())),
        trimToNull(unwrap(request.getInspector())),
        unwrap(request.getPreviousInspectionId()),
        trimToNull(unwrap(request.getRecipient())),
        toQuestionResponseInputs(request.getQuestionResponses()));
  }

  public static InspectionUpdateCommand toUpdateCommand(
      Long inspectionId,
      ScaleSiteInspectionUpdateRequest request) {
    return new InspectionUpdateCommand(
        inspectionId,
        request.getInspectionDate(),
        trimToNull(request.getInspector()),
        YesNo.fromCode(request.getSiteOperatorPresentInd().getValue()),
        trimToNull(unwrap(request.getComments())),
        toQuestionResponseInputs(request.getQuestionResponses()));
  }

  private static List<InspectionQuestionResponseInput> toQuestionResponseInputs(
      List<ScaleSiteInspectionQuestionResponseInput> rows) {
    if (rows == null) return List.of();
    return rows.stream()
        .map(ScaleSiteInspectionApiMapper::toQuestionResponseInput)
        .toList();
  }

  private static InspectionQuestionResponseInput toQuestionResponseInput(
      ScaleSiteInspectionQuestionResponseInput row) {
    if (row == null) return null;
    return new InspectionQuestionResponseInput(
        row.getInspectionQuestionId(),
        trimToNull(row.getInspectionAnswerCode()),
        trimToNull(unwrap(row.getCommentsText())),
        YesNo.fromCode(row.getFollowUpRequiredInd().getValue()),
        trimToNull(unwrap(row.getFollowUpActionText())),
        unwrap(row.getFollowUpDueDate()),
        unwrapEnum(row.getFollowUpCompletedInd()));
  }

  private static YesNo unwrapEnum(JsonNullable<ScaleSiteInspectionQuestionResponseInput.FollowUpCompletedIndEnum> nullable) {
    if (nullable == null || !nullable.isPresent()) return null;
    var value = nullable.get();
    return value == null ? null : YesNo.fromCode(value.getValue());
  }

  private static <T> T unwrap(JsonNullable<T> nullable) {
    return nullable != null && nullable.isPresent() ? nullable.get() : null;
  }

  private static ScaleSiteInspectionRecipientOption toRecipientOption(ScaleSiteContactOption contact) {
    String label = trimToNull(contact.contactName());
    if (label == null) return null;
    String value = contact.clientContactId() == null
        ? label
        : String.valueOf(contact.clientContactId());
    return new ScaleSiteInspectionRecipientOption()
        .value(value)
        .label(label);
  }
}
