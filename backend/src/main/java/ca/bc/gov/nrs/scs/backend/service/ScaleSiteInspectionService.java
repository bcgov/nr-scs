package ca.bc.gov.nrs.scs.backend.service;

import static ca.bc.gov.nrs.scs.backend.util.SCSUtils.isUuidLike;
import static ca.bc.gov.nrs.scs.backend.util.SCSUtils.trimToNull;
import static ca.bc.gov.nrs.scs.backend.util.SCSUtils.upperOrNull;
import static ca.bc.gov.nrs.scs.backend.security.SecurityContextUtils.currentUserGuidOrNull;
import static ca.bc.gov.nrs.scs.backend.security.SecurityContextUtils.currentUserIdOrSystem;

import ca.bc.gov.nrs.scs.backend.util.SCSUtils;
import ca.bc.gov.nrs.scs.backend.exception.BadRequestException;
import ca.bc.gov.nrs.scs.backend.exception.ConflictException;
import ca.bc.gov.nrs.scs.backend.exception.FieldValidationException;
import ca.bc.gov.nrs.scs.backend.exception.FieldValidationException.FieldErrorDetail;
import ca.bc.gov.nrs.scs.backend.exception.ResourceNotFoundException;
import ca.bc.gov.nrs.scs.backend.exception.UnprocessableEntityException;
import ca.bc.gov.nrs.scs.backend.security.ClientScopeGuard;
import ca.bc.gov.nrs.scs.backend.service.inspection.InspectionQuestionAssembler;
import ca.bc.gov.nrs.scs.backend.service.inspection.InspectionQuestionAssembler.AnswerOptionLoad;
import ca.bc.gov.nrs.scs.backend.service.inspection.InspectionValidator;
import ca.bc.gov.nrs.scs.backend.service.mapper.ScaleSiteInspectionApiMapper;
import ca.bc.gov.nrs.scs.backend.model.ScaleMethodTypeLov;
import ca.bc.gov.nrs.scs.backend.model.ScaleSiteInspectionCreateInitView;
import ca.bc.gov.nrs.scs.backend.model.ScaleSiteInspectionDetail;
import ca.bc.gov.nrs.scs.backend.model.ScaleSiteInspectionEditView;
import ca.bc.gov.nrs.scs.backend.model.ScaleSiteInspectionSearchResult;
import ca.bc.gov.nrs.scs.backend.model.ScaleSiteInspectionSummary;
import ca.bc.gov.nrs.scs.backend.domain.inspection.Inspection;
import ca.bc.gov.nrs.scs.backend.domain.inspection.InspectionBase;
import ca.bc.gov.nrs.scs.backend.domain.inspection.InspectionCreateCommand;
import ca.bc.gov.nrs.scs.backend.domain.inspection.InspectionCreateInit;
import ca.bc.gov.nrs.scs.backend.domain.inspection.InspectionCreateParams;
import ca.bc.gov.nrs.scs.backend.domain.inspection.InspectionQuestion;
import ca.bc.gov.nrs.scs.backend.domain.inspection.InspectionQuestionAndAnswer;
import ca.bc.gov.nrs.scs.backend.domain.inspection.InspectionQuestionResponseInput;
import ca.bc.gov.nrs.scs.backend.domain.inspection.InspectionResponse;
import ca.bc.gov.nrs.scs.backend.domain.inspection.InspectionSearchRef;
import ca.bc.gov.nrs.scs.backend.domain.inspection.InspectionUpdateCommand;
import ca.bc.gov.nrs.scs.backend.domain.inspection.InspectionUpdateParams;
import ca.bc.gov.nrs.scs.backend.domain.shared.YesNo;
import ca.bc.gov.nrs.scs.backend.domain.scalesite.ScaleSiteCore;
import ca.bc.gov.nrs.scs.backend.domain.scalesite.ScaleSiteOwnerInfo;
import ca.bc.gov.nrs.scs.backend.repository.ScaleSiteInspectionRepository;
import ca.bc.gov.nrs.scs.backend.repository.ScaleSiteRepository;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Orchestrates scale site inspection read/write use cases. Validation rules live in
 * {@link InspectionValidator} and question/answer assembly in {@link InspectionQuestionAssembler};
 * this service coordinates them with the repositories and the API mapper.
 */
@Service
public class ScaleSiteInspectionService {

  private static final String INSPECTION_ANSWER_CODE_TABLE_KEY = "INSPECTION_ANSWER_CODE";
  private static final String INSPECTION_ID_REQUIRED = "Inspection id is required.";
  private static final String NO_READABLE_INSPECTION_FOUND = "No readable scale site inspection found with inspection id ";
  private static final String NO_SCALE_SITE_FOUND = "No scale site found with scale site number ";
  private static final String INSPECTION_TYPE_TABLE_KEY = "SCALE_SITE_INSPCTN_TYPE_CODE";

  private final ScaleSiteInspectionRepository scaleSiteInspectionRepository;
  private final ScaleSiteRepository scaleSiteRepository;
  private final LovService lovService;
  private final InspectionValidator inspectionValidator;
  private final InspectionQuestionAssembler inspectionQuestionAssembler;
  private final ClientScopeGuard clientScopeGuard;

  public ScaleSiteInspectionService(
      ScaleSiteInspectionRepository scaleSiteInspectionRepository,
      ScaleSiteRepository scaleSiteRepository,
      LovService lovService,
      InspectionValidator inspectionValidator,
      InspectionQuestionAssembler inspectionQuestionAssembler,
      ClientScopeGuard clientScopeGuard) {
    this.scaleSiteInspectionRepository = scaleSiteInspectionRepository;
    this.scaleSiteRepository = scaleSiteRepository;
    this.lovService = lovService;
    this.inspectionValidator = inspectionValidator;
    this.inspectionQuestionAssembler = inspectionQuestionAssembler;
    this.clientScopeGuard = clientScopeGuard;
  }

  public ScaleSiteInspectionSearchResult searchScaleSiteInspection(Long inspectionId) {
    if (inspectionId == null || inspectionId <= 0) {
      throw new BadRequestException(INSPECTION_ID_REQUIRED);
    }

    List<InspectionSearchRef> matches =
        scaleSiteInspectionRepository.searchScaleSiteInspectionByInspectionId(inspectionId);

    // The lookup-by-number path: the Scale Sites query page's "OR enter inspection #" box resolves an
    // arbitrary inspection id and navigates straight to its record, so without this a client-restricted
    // caller could type any number and be walked into another company's inspection. Scoped on the
    // matched inspection's own site. A no-op for internal users.
    //
    // Ahead of every throw below, because each of them tells a restricted caller something about an id
    // outside their client: whether it exists, whether it is duplicated, whether CIMS shows it. Only an
    // internal caller gets those answers.
    clientScopeGuard.assertRecordSiteInScope(
        matches == null || matches.isEmpty() ? null : matches.getFirst().scaleSiteIdNmbr());

    if (matches == null || matches.isEmpty()) {
      throw new ResourceNotFoundException(
          "No scale site inspection found with inspection id " + inspectionId);
    }

    if (matches.size() > 1) {
      throw new ConflictException(
          "Multiple scale site inspections found with inspection id " + inspectionId);
    }

    if (!scaleSiteInspectionRepository.isInspectionViewableInCims(inspectionId)) {
      throw new UnprocessableEntityException(
          "Inspection " + inspectionId + " is not viewable in CIMS.");
    }

    return ScaleSiteInspectionApiMapper.toSearchResultResponse(matches.getFirst());
  }

  public List<ScaleSiteInspectionSummary> getScaleSiteInspectionSummaries(String scaleSiteIdNmbr) {
    String normalizedScaleSiteIdNmbr =
        SCSUtils.requireText(upperOrNull(scaleSiteIdNmbr), "Scale site number is required.");

    if (scaleSiteRepository.getScaleSiteSummaryCore(normalizedScaleSiteIdNmbr) == null) {
      throw new ResourceNotFoundException(
          NO_SCALE_SITE_FOUND + normalizedScaleSiteIdNmbr);
    }

    return ScaleSiteInspectionApiMapper.toSummaryResponses(
        scaleSiteInspectionRepository.getScaleSiteInspectionSummaries(normalizedScaleSiteIdNmbr));
  }

  public ScaleSiteInspectionCreateInitView getScaleSiteInspectionCreateInit(
      String scaleSiteIdNmbr,
      String inspectionTypeCode,
      List<String> siteTypeCodes) {
    return ScaleSiteInspectionApiMapper.toCreateInitResponse(
        loadInspectionCreateInit(scaleSiteIdNmbr, inspectionTypeCode, siteTypeCodes));
  }

  private InspectionCreateInit loadInspectionCreateInit(
      String scaleSiteIdNmbr,
      String inspectionTypeCode,
      List<String> siteTypeCodes) {
    String normalizedScaleSiteIdNmbr = requireScaleSiteIdNmbr(scaleSiteIdNmbr);
    Map<String, String> inspectionTypeDescriptions =
        lovService.getStaticLovDescriptionMap(INSPECTION_TYPE_TABLE_KEY);
    String normalizedInspectionTypeCode =
        normalizeInspectionTypeCode(inspectionTypeCode, inspectionTypeDescriptions);
    Map<String, String> methodDescriptions =
        toScaleMethodDescriptionMap(lovService.getScaleMethodTypeLov(null, null));
    List<String> normalizedSiteTypeCodes = normalizeSiteTypeCodes(siteTypeCodes, methodDescriptions);
    inspectionValidator.validateAutomatedInspectionSiteTypes(
        normalizedInspectionTypeCode, normalizedSiteTypeCodes, true);

    ScaleSiteCore scaleSite = getRequiredScaleSite(normalizedScaleSiteIdNmbr);
    ScaleSiteOwnerInfo owner = scaleSiteRepository.getScaleSiteOwner(normalizedScaleSiteIdNmbr);
    Map<String, String> answerDescriptions =
        lovService.getStaticLovDescriptionMap(INSPECTION_ANSWER_CODE_TABLE_KEY);
    String currentInspector = firstNonBlank(currentUserGuidOrNull(), currentUserIdOrSystem());

    List<InspectionQuestionAndAnswer> shellEntries = inspectionQuestionAssembler.buildShellEntries(
        normalizedInspectionTypeCode,
        normalizedSiteTypeCodes,
        answerDescriptions);

    return new InspectionCreateInit(
        normalizedScaleSiteIdNmbr,
        firstNonBlank(scaleSite.siteName(), null),
        firstNonBlank(scaleSite.siteLocation(), null),
        toOwnerName(owner),
        normalizedInspectionTypeCode,
        inspectionTypeDescriptions.get(normalizedInspectionTypeCode),
        normalizedSiteTypeCodes,
        joinScaleMethodDescriptions(normalizedSiteTypeCodes, methodDescriptions),
        scaleSiteInspectionRepository.getScaleSiteContactOptions(normalizedScaleSiteIdNmbr),
        currentInspector,
        shellEntries);
  }

  @Transactional
  public ScaleSiteInspectionDetail createScaleSiteInspection(InspectionCreateCommand command) {
    String normalizedScaleSiteIdNmbr = requireScaleSiteIdNmbr(command.scaleSiteIdNmbr());
    requireScaleSiteExists(normalizedScaleSiteIdNmbr);

    Map<String, String> inspectionTypeDescriptions =
        lovService.getStaticLovDescriptionMap(INSPECTION_TYPE_TABLE_KEY);
    String normalizedInspectionTypeCode =
        normalizeInspectionTypeCode(command.inspectionTypeCode(), inspectionTypeDescriptions);
    Map<String, String> methodDescriptions =
        toScaleMethodDescriptionMap(lovService.getScaleMethodTypeLov(null, null));
    List<String> normalizedSiteTypeCodes = normalizeSiteTypeCodes(command.siteTypeCodes(), methodDescriptions);

    inspectionValidator.validateCreate(
        command,
        normalizedInspectionTypeCode,
        normalizedSiteTypeCodes,
        inspectionQuestionAssembler::getValidAnswerCodesForQuestion);
    inspectionValidator.validateQuestionCoverage(
        applicableQuestionIds(normalizedInspectionTypeCode, normalizedSiteTypeCodes),
        command.questionResponses());
    validatePreviousInspectionExists(command.previousInspectionId());

    List<InspectionResponse> normalizedResponses = normalizeResponses(command.questionResponses());
    String inspectorUserGuid = resolveInspectorUserGuid(command.inspector());
    Long inspectionId = scaleSiteInspectionRepository.createScaleSiteInspectionBase(
        new InspectionCreateParams(
            normalizedScaleSiteIdNmbr,
            command.inspectionDate(),
            inspectorUserGuid,
            YesNo.toCode(command.siteOperatorPresent()),
            command.comments(),
            normalizedInspectionTypeCode,
            command.previousInspectionId(),
            command.recipient()));

    for (String siteTypeCode : normalizedSiteTypeCodes) {
      scaleSiteInspectionRepository.insertInspectedScalingMethod(inspectionId, siteTypeCode);
    }

    for (InspectionResponse row : normalizedResponses) {
      scaleSiteInspectionRepository.insertInspectionResponse(inspectionId, row);
    }

    return getScaleSiteInspectionDetail(inspectionId);
  }

  public ScaleSiteInspectionDetail getScaleSiteInspectionDetail(Long inspectionId) {
    return ScaleSiteInspectionApiMapper.toDetailResponse(
        loadInspection(inspectionId, AnswerOptionLoad.EXCLUDE));
  }

  public ScaleSiteInspectionEditView getScaleSiteInspectionEdit(Long inspectionId) {
    return ScaleSiteInspectionApiMapper.toEditResponse(
        loadInspection(inspectionId, AnswerOptionLoad.INCLUDE));
  }

  private Inspection loadInspection(Long inspectionId, AnswerOptionLoad load) {
    if (inspectionId == null || inspectionId <= 0) {
      throw new BadRequestException(INSPECTION_ID_REQUIRED);
    }

    InspectionBase base =
        scaleSiteInspectionRepository.getScaleSiteInspectionDetailBase(inspectionId);

    // Scale Site Owners may read inspections (matrix §3.H row "Site Inspection" = R (ltd)), so this
    // read needs client scoping. `/scale-sites/inspection/{inspectionId}` puts a literal segment before
    // the id, so ClientScopeInterceptor's path-variable match does not see it — guard it here, via the
    // inspection's own site. Placed in loadInspection so it covers the detail AND edit reads at once,
    // and ahead of the not-found throw so an unknown id is a 403 for a restricted caller and a 404 for
    // an internal one. A no-op for internal users.
    clientScopeGuard.assertRecordSiteInScope(base == null ? null : base.scaleSiteIdNmbr());

    if (base == null) {
      throw new ResourceNotFoundException(NO_READABLE_INSPECTION_FOUND + inspectionId);
    }

    ScaleSiteCore scaleSite = fetchScaleSiteRecord(base.scaleSiteIdNmbr());
    ScaleSiteOwnerInfo owner = fetchScaleSiteOwner(base.scaleSiteIdNmbr());

    List<String> inspectedScalingMethodCodes =
        scaleSiteInspectionRepository.getInspectedScalingMethodCodes(inspectionId);
    Map<String, String> methodDescriptions = toScaleMethodDescriptionMap(
        lovService.getScaleMethodTypeLov(null, null));
    String siteTypeDisplay = inspectedScalingMethodCodes.stream()
        .map(code -> methodDescriptions.get(upperOrNull(code)))
        .filter(Objects::nonNull)
        .distinct()
        .collect(Collectors.joining(", "));

    Map<String, String> answerDescriptions =
        lovService.getStaticLovDescriptionMap(INSPECTION_ANSWER_CODE_TABLE_KEY);

    List<InspectionQuestionAndAnswer> entries = inspectionQuestionAssembler.buildQuestionEntries(
        inspectionId,
        trimToNull(base.inspectionTypeCode()),
        inspectedScalingMethodCodes,
        answerDescriptions,
        load);

    return new Inspection(
        inspectionId,
        trimToNull(base.inspectionTypeCode()),
        trimToNull(base.inspectionTypeDescription()),
        base.inspectionDate(),
        trimToNull(base.inspector()),
        firstNonBlank(base.scaleSiteIdNmbr(), scaleSite == null ? null : scaleSite.scaleSiteIdNmbr()),
        firstNonBlank(scaleSite == null ? null : scaleSite.siteName(), base.siteName()),
        firstNonBlank(scaleSite == null ? null : scaleSite.siteLocation(), base.siteLocation()),
        toOwnerName(owner),
        trimToNull(siteTypeDisplay),
        base.previousInspectionId(),
        trimToNull(base.recipient()),
        YesNo.fromCode(base.siteOperatorPresentInd()),
        trimToNull(base.comments()),
        entries);
  }

  @Transactional
  public ScaleSiteInspectionDetail updateScaleSiteInspection(InspectionUpdateCommand command) {
    Long inspectionId = command.inspectionId();
    if (inspectionId == null || inspectionId <= 0) {
      throw new BadRequestException(INSPECTION_ID_REQUIRED);
    }

    InspectionBase existing =
        scaleSiteInspectionRepository.getScaleSiteInspectionDetailBase(inspectionId);

    // Guarded here, not left to the getScaleSiteInspectionDetail read at the end of this method: that
    // one runs after every write, so the ForbiddenException it raises is only ever a @Transactional
    // rollback of work that should never have executed. No client-restricted role holds
    // SCALE_SITE_INSPECTION_UPDATE today, so the guard is latent — which is exactly why it has to be
    // written down rather than inferred from the read that happens to follow.
    clientScopeGuard.assertRecordSiteInScope(existing == null ? null : existing.scaleSiteIdNmbr());

    if (existing == null) {
      throw new ResourceNotFoundException(NO_READABLE_INSPECTION_FOUND + inspectionId);
    }

    List<InspectionResponse> existingResponses =
        scaleSiteInspectionRepository.getInspectionResponses(inspectionId);
    inspectionValidator.validateQuestionCoverage(
        getRequiredQuestionIdsForUpdate(
            existingResponses,
            trimToNull(existing.inspectionTypeCode()),
            scaleSiteInspectionRepository.getInspectedScalingMethodCodes(inspectionId)),
        command.questionResponses());
    inspectionValidator.validateUpdate(
        command, inspectionQuestionAssembler::getValidAnswerCodesForQuestion);

    List<InspectionResponse> normalizedResponses = normalizeResponses(command.questionResponses());

    String inspectorUserGuid = resolveInspectorUserGuid(command.inspector());
    scaleSiteInspectionRepository.updateScaleSiteInspectionBase(new InspectionUpdateParams(
        inspectionId,
        command.inspectionDate(),
        inspectorUserGuid,
        YesNo.toCode(command.siteOperatorPresent()),
        command.comments()));

    for (InspectionResponse existingResponse : existingResponses) {
      scaleSiteInspectionRepository.deleteInspectionResponse(
          inspectionId,
          existingResponse.inspectionQuestionId(),
          existingResponse.inspectionAnswerCode());
    }

    for (InspectionResponse row : normalizedResponses) {
      scaleSiteInspectionRepository.insertInspectionResponse(inspectionId, row);
    }

    return getScaleSiteInspectionDetail(inspectionId);
  }

  @Transactional
  public void deleteScaleSiteInspection(Long inspectionId) {
    if (inspectionId == null || inspectionId <= 0) {
      throw new BadRequestException(INSPECTION_ID_REQUIRED);
    }

    InspectionBase existing = scaleSiteInspectionRepository.getScaleSiteInspectionDetailBase(inspectionId);

    // The delete reached no guard at all: unlike the update it ends in no read, so nothing incidental
    // scoped it. Latent only because no client-restricted role holds SCALE_SITE_INSPECTION_DELETE.
    clientScopeGuard.assertRecordSiteInScope(existing == null ? null : existing.scaleSiteIdNmbr());

    SCSUtils.requireFound(existing, NO_READABLE_INSPECTION_FOUND + inspectionId);

    scaleSiteInspectionRepository.deleteScaleSiteInspection(inspectionId);
  }

  private Set<Long> applicableQuestionIds(
      String inspectionTypeCode, List<String> inspectedScalingMethodCodes) {
    return inspectionQuestionAssembler
        .getApplicableInspectionQuestions(inspectionTypeCode, inspectedScalingMethodCodes)
        .stream()
        .map(InspectionQuestion::inspectionQuestionId)
        .filter(Objects::nonNull)
        .collect(Collectors.toSet());
  }

  private Set<Long> getRequiredQuestionIdsForUpdate(
      List<InspectionResponse> existingResponses,
      String inspectionTypeCode,
      List<String> inspectedScalingMethodCodes) {
    // Prefer the currently persisted question set when it exists so update
    // validation protects against wiping already-saved responses. Only fall
    // back to reconstructed applicable questions when the inspection has no
    // saved response rows at all.
    Set<Long> existingQuestionIds = existingResponses == null
        ? Set.of()
        : existingResponses.stream()
            .map(InspectionResponse::inspectionQuestionId)
            .filter(Objects::nonNull)
            .collect(Collectors.toSet());
    if (!existingQuestionIds.isEmpty()) {
      return existingQuestionIds;
    }

    return applicableQuestionIds(inspectionTypeCode, inspectedScalingMethodCodes);
  }

  private ScaleSiteCore fetchScaleSiteRecord(String scaleSiteIdNmbr) {
    if (scaleSiteIdNmbr == null || scaleSiteIdNmbr.isBlank()) {
      return null;
    }
    return scaleSiteRepository.getScaleSite(scaleSiteIdNmbr);
  }

  private ScaleSiteOwnerInfo fetchScaleSiteOwner(String scaleSiteIdNmbr) {
    if (scaleSiteIdNmbr == null || scaleSiteIdNmbr.isBlank()) {
      return null;
    }
    return scaleSiteRepository.getScaleSiteOwner(scaleSiteIdNmbr);
  }

  private String requireScaleSiteIdNmbr(String scaleSiteIdNmbr) {
    return SCSUtils.requireText(upperOrNull(scaleSiteIdNmbr), "Scale site number is required.");
  }

  private void requireScaleSiteExists(String scaleSiteIdNmbr) {
    if (scaleSiteRepository.getScaleSiteSummaryCore(scaleSiteIdNmbr) == null) {
      throw new ResourceNotFoundException(
          NO_SCALE_SITE_FOUND + scaleSiteIdNmbr);
    }
  }

  /**
   * The "Follow-up to Inspection #" field carries the id of an existing inspection. Without this check
   * a non-existent id reaches the create proc, which fails deep in Oracle on the foreign key and
   * surfaces as a generic 500 banner naming no field. Verify existence here — using the same by-id
   * lookup the inspection-number search uses — and raise a {@link FieldValidationException} so the
   * frontend can render an inline "does not exist" message on the field itself. A {@code null} value is
   * allowed (the field is optional); the {@code > 0} shape check lives in {@link InspectionValidator}.
   */
  private void validatePreviousInspectionExists(Long previousInspectionId) {
    if (previousInspectionId == null) {
      return;
    }
    List<InspectionSearchRef> matches =
        scaleSiteInspectionRepository.searchScaleSiteInspectionByInspectionId(previousInspectionId);
    if (matches == null || matches.isEmpty()) {
      throw new FieldValidationException(List.of(new FieldErrorDetail(
          "previousInspectionId",
          "Inspection # " + previousInspectionId + " does not exist.")));
    }
  }

  private ScaleSiteCore getRequiredScaleSite(String scaleSiteIdNmbr) {
    requireScaleSiteExists(scaleSiteIdNmbr);
    ScaleSiteCore scaleSite = scaleSiteRepository.getScaleSite(scaleSiteIdNmbr);
    SCSUtils.requireFound(scaleSite, NO_SCALE_SITE_FOUND + scaleSiteIdNmbr);
    return scaleSite;
  }

  private String normalizeInspectionTypeCode(
      String inspectionTypeCode,
      Map<String, String> inspectionTypeDescriptions) {
    String normalizedInspectionTypeCode =
        SCSUtils.requireText(upperOrNull(inspectionTypeCode), "inspectionTypeCode is required.");
    if (!inspectionTypeDescriptions.containsKey(normalizedInspectionTypeCode)) {
      throw new BadRequestException(
          "inspectionTypeCode " + normalizedInspectionTypeCode + " is not valid.");
    }
    return normalizedInspectionTypeCode;
  }

  private List<String> normalizeSiteTypeCodes(
      List<String> siteTypeCodes,
      Map<String, String> methodDescriptions) {
    if (siteTypeCodes == null || siteTypeCodes.isEmpty()) {
      throw new BadRequestException("At least one siteTypeCode is required.");
    }

    List<String> normalizedSiteTypeCodes = siteTypeCodes.stream()
        .map(SCSUtils::upperOrNull)
        .filter(Objects::nonNull)
        .distinct()
        .toList();
    if (normalizedSiteTypeCodes.isEmpty()) {
      throw new BadRequestException("At least one siteTypeCode is required.");
    }

    for (String siteTypeCode : normalizedSiteTypeCodes) {
      if (!methodDescriptions.containsKey(siteTypeCode)) {
        throw new BadRequestException("siteTypeCode " + siteTypeCode + " is not valid.");
      }
    }
    return normalizedSiteTypeCodes;
  }

  private String joinScaleMethodDescriptions(
      List<String> siteTypeCodes,
      Map<String, String> methodDescriptions) {
    return siteTypeCodes.stream()
        .map(methodDescriptions::get)
        .filter(Objects::nonNull)
        .distinct()
        .collect(Collectors.joining(", "));
  }

  private Map<String, String> toScaleMethodDescriptionMap(List<ScaleMethodTypeLov> rows) {
    Map<String, String> out = new LinkedHashMap<>();
    if (rows == null) {
      return out;
    }

    for (ScaleMethodTypeLov row : rows) {
      if (row != null && row.getCode() != null && row.getCode().isPresent()) {
        String code = upperOrNull(row.getCode().get());
        if (code != null) {
          String description = row.getDescription() != null && row.getDescription().isPresent()
              ? trimToNull(row.getDescription().get())
              : null;
          out.put(code, description);
        }
      }
    }
    return out;
  }

  /**
   * Honour the euser GUID submitted on the form — legacy records who performed the inspection, not the
   * logged-in user (the form just defaults it to the current user). An unknown GUID is rejected by the
   * package (a generic DB error, as in legacy), not translated here.
   */
  private String resolveInspectorUserGuid(String inspector) {
    String trimmed = trimToNull(inspector);
    if (isUuidLike(trimmed)) {
      return trimmed;
    }
    // User-facing + dev-neutral. The local-mock cause (unset security.mock.user-guid → non-GUID principal)
    // is diagnosed at MockRequestFilter startup, so no dev-config text leaks into this prod-facing message.
    throw new BadRequestException("A valid inspector is required. Select an inspector on the form.");
  }

  private List<InspectionResponse> normalizeResponses(List<InspectionQuestionResponseInput> rows) {
    if (rows == null) return List.of();
    List<InspectionResponse> out = new ArrayList<>();
    for (InspectionQuestionResponseInput row : rows) {
      String followUpActionText;
      LocalDate followUpDueDate;
      String followUpCompletedInd;
      if (row.followUpRequired() == YesNo.Y) {
        followUpActionText = row.followUpActionText();
        followUpDueDate = row.followUpDueDate();
        followUpCompletedInd = YesNo.toCode(row.followUpCompleted());
      } else {
        followUpActionText = null;
        followUpDueDate = null;
        followUpCompletedInd = "N";
      }

      out.add(new InspectionResponse(
          row.inspectionQuestionId(),
          row.inspectionAnswerCode(),
          row.commentsText(),
          followUpActionText,
          followUpDueDate,
          followUpCompletedInd));
    }
    return out;
  }

  private String toOwnerName(ScaleSiteOwnerInfo owner) {
    if (owner == null) {
      return null;
    }

    String companyName = trimToNull(owner.companyName());
    if (companyName != null) {
      return companyName;
    }

    String lastName = trimToNull(owner.lastName());
    String firstName = trimToNull(owner.firstName());
    if (lastName == null) {
      return null;
    }
    return firstName == null ? lastName : lastName + ", " + firstName;
  }

  private String firstNonBlank(String primary, String fallback) {
    String normalizedPrimary = trimToNull(primary);
    return normalizedPrimary != null ? normalizedPrimary : trimToNull(fallback);
  }
}
