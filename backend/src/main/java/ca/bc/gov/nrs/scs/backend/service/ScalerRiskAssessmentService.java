package ca.bc.gov.nrs.scs.backend.service;

import static ca.bc.gov.nrs.scs.backend.util.SCSUtils.filterByWildcardId;
import static ca.bc.gov.nrs.scs.backend.util.SCSUtils.parseRiskQuestionnaireId;
import static ca.bc.gov.nrs.scs.backend.util.SCSUtils.resolveSort;
import static ca.bc.gov.nrs.scs.backend.util.SCSUtils.upperOrNull;

import ca.bc.gov.nrs.scs.backend.domain.riskassessment.RiskAssessmentCreateCommand;
import ca.bc.gov.nrs.scs.backend.domain.riskassessment.RiskAssessmentUpdateCommand;
import ca.bc.gov.nrs.scs.backend.dto.ActiveTemplateRow;
import ca.bc.gov.nrs.scs.backend.dto.QuestionnaireRow;
import ca.bc.gov.nrs.scs.backend.exception.BadRequestException;
import ca.bc.gov.nrs.scs.backend.exception.ResourceNotFoundException;
import ca.bc.gov.nrs.scs.backend.model.RiskAssessmentRiskRating;
import ca.bc.gov.nrs.scs.backend.model.RiskAssessmentSection;
import ca.bc.gov.nrs.scs.backend.model.ScalerRiskAssessmentDetail;
import ca.bc.gov.nrs.scs.backend.model.ScalerRiskAssessmentSearchResult;
import ca.bc.gov.nrs.scs.backend.domain.scaler.ScalerTombstoneRecord;
import ca.bc.gov.nrs.scs.backend.repository.ScalerRepository;
import ca.bc.gov.nrs.scs.backend.repository.ScalerRiskAssessmentRepository;
import ca.bc.gov.nrs.scs.backend.security.ClientScopeGuard;
import ca.bc.gov.nrs.scs.backend.security.SecurityContextUtils;
import ca.bc.gov.nrs.scs.backend.service.mapper.RiskAssessmentApiMapper;
import ca.bc.gov.nrs.scs.backend.util.SCSUtils;
import java.util.List;
import java.util.Set;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Composes the scaler risk assessment detail and search results. The data-driven questionnaire
 * structure (sections, questions, answers, risk levels) and the response/comment save are handled
 * by the shared {@link RiskQuestionnaireService}; this service only adds the scaler-specific header
 * (licence, client, region/district) and search.
 */
@Service
public class ScalerRiskAssessmentService {

  private static final Set<Integer> PRIMARY_SORTS = Set.of(1, 3, 4, 8, 14, 16, 17);
  private static final Set<Integer> SECONDARY_SORTS = Set.of(0, 1, 3, 4, 8, 14, 16, 17);

  // A new scaler assessment always binds to the active scaler template type (the Consequences (C) /
  // Likelihood (L) format). Legacy Constants.TEMPLATE_TYPE_SCALER_2.
  private static final String SCALER_TEMPLATE_TYPE = "SCLE";

  private final ScalerRiskAssessmentRepository scalerRiskAssessmentRepository;
  private final RiskQuestionnaireService riskQuestionnaireService;
  private final ScalerRepository scalerRepository;
  private final ClientScopeGuard clientScopeGuard;

  public ScalerRiskAssessmentService(
      ScalerRiskAssessmentRepository scalerRiskAssessmentRepository,
      RiskQuestionnaireService riskQuestionnaireService,
      ScalerRepository scalerRepository,
      ClientScopeGuard clientScopeGuard) {
    this.scalerRiskAssessmentRepository = scalerRiskAssessmentRepository;
    this.riskQuestionnaireService = riskQuestionnaireService;
    this.scalerRepository = scalerRepository;
    this.clientScopeGuard = clientScopeGuard;
  }

  public List<ScalerRiskAssessmentSearchResult> searchScalerRiskAssessments(
      String riskQuestionnaireIdInput,
      String riskTypeCode,
      String completeInd,
      String scalerLicenceNo,
      Long orgUnitNo,
      String clientNumber,
      String scalerLicenceTypeCode,
      Integer primarySort,
      Integer secondarySort) {

    var parsed = parseRiskQuestionnaireId(riskQuestionnaireIdInput);
    Long exactId = parsed.exactId();
    String wildcardPattern = parsed.wildcardPattern();

    // Client-restricted external users see only their own forest client, so the request's client value
    // is ignored — the same override ScalerService.searchScalers applies. No external role reaches this
    // search today (the Industry Scaler was given _ASSESSMENT_READ without _ASSESSMENT_QUERY on
    // 2026-09-03, so it works from the scaler record instead), but the override stays: it is the
    // precondition for granting the permission, and removing it would silently re-open the hole.
    // Internal users search what they asked for.
    String effectiveClientNumber = SecurityContextUtils.isClientRestricted()
        ? SecurityContextUtils.currentUserClientNumber()
        : upperOrNull(clientNumber);

    List<ScalerRiskAssessmentSearchResult> results =
        scalerRiskAssessmentRepository.searchScalerRiskAssessments(
            exactId,
            upperOrNull(riskTypeCode),
            upperOrNull(completeInd),
            upperOrNull(scalerLicenceNo),
            orgUnitNo,
            effectiveClientNumber,
            upperOrNull(scalerLicenceTypeCode),
            resolveSort(primarySort, PRIMARY_SORTS, 1),
            resolveSort(secondarySort, SECONDARY_SORTS, 0));

    return filterByWildcardId(results, wildcardPattern, ScalerRiskAssessmentSearchResult::getRiskQuestionnaireId);
  }

  /**
   * The assessment is keyed on {@code riskQuestionnaireId}, which {@code ClientScopeInterceptor} cannot
   * scope, so the guard runs here — on the scaler the header names, and <b>before</b> the not-found
   * check, so a restricted caller cannot use the id as an existence oracle.
   *
   * <p>The header is read <b>once</b> and handed to both steps. The guard needs no
   * {@code isClientRestricted} branch around it: {@code assertRecordScalerInScope} already returns
   * immediately for an internal caller and already treats a null record as a denial, so a branch here
   * would only duplicate its first two lines — and cost a second read of the same row to do it. Same
   * shape as {@code ScalerAuthorizationService.getScalerAuthorization}, which this endpoint is the
   * id-addressed twin of.
   */
  public ScalerRiskAssessmentDetail getScalerRiskAssessment(Long riskQuestionnaireId) {
    validateId(riskQuestionnaireId);
    ScalerRiskAssessmentSearchResult header =
        scalerRiskAssessmentRepository.getScalerRiskAssessment(riskQuestionnaireId);
    clientScopeGuard.assertRecordScalerInScope(
        header == null ? null : SCSUtils.getNullable(header.getScalerLicenceNo()));
    requireHeader(header, riskQuestionnaireId);
    QuestionnaireRow questionnaire = getRequiredQuestionnaire(riskQuestionnaireId);
    Long templateId = questionnaire.templateId();
    return buildDetail(
        header,
        templateId,
        questionnaire.comments(),
        riskQuestionnaireService.buildSections(templateId, riskQuestionnaireId),
        riskQuestionnaireService.buildRiskRatings(templateId),
        questionnaire);
  }

  /**
   * Build the payload for the "Add Risk Assessment" form: the scaler header (from the tombstone),
   * the currently active {@code SCLE} template's blank questionnaire, and its Risk Levels table. No
   * {@code RISK_QUESTIONNAIRE} row is created here — persistence happens only on
   * {@link #createScalerRiskAssessment}.
   */
  public ScalerRiskAssessmentDetail getScalerRiskAssessmentCreateInit(String scalerLicenceNo) {
    String licenceNo = requireLicence(scalerLicenceNo);
    ScalerTombstoneRecord tombstone = getRequiredTombstone(licenceNo);
    ActiveTemplateRow template = riskQuestionnaireService.findActiveTemplate(SCALER_TEMPLATE_TYPE);

    return buildCreateInitDetail(
        licenceNo,
        tombstone,
        template,
        riskQuestionnaireService.buildBlankSections(template.templateId()),
        riskQuestionnaireService.buildRiskRatings(template.templateId()));
  }

  /**
   * Create a new scaler risk assessment bound to the active {@code SCLE} template, writing the row
   * and the answered responses in one transaction (mirroring the legacy add + save). Returns the
   * freshly-read detail (including the DB-derived rating/level), so the caller sees the same shape
   * the view/edit pages use.
   */
  @Transactional
  public ScalerRiskAssessmentDetail createScalerRiskAssessment(
      String scalerLicenceNo, RiskAssessmentCreateCommand command) {
    String licenceNo = requireLicence(scalerLicenceNo);
    getRequiredTombstone(licenceNo);
    ActiveTemplateRow template = riskQuestionnaireService.findActiveTemplate(SCALER_TEMPLATE_TYPE);

    RiskQuestionnaireService.CreateResult created =
        riskQuestionnaireService.create(
            licenceNo, null, SCALER_TEMPLATE_TYPE, template.templateId(), command);

    return getScalerRiskAssessment(created.riskQuestionnaireId());
  }

  @Transactional
  public ScalerRiskAssessmentDetail updateScalerRiskAssessment(
      Long riskQuestionnaireId, RiskAssessmentUpdateCommand command) {
    validateId(riskQuestionnaireId);
    // Read up front purely as the existence check, so a bad id 404s before anything is written.
    getRequiredHeader(riskQuestionnaireId);
    QuestionnaireRow questionnaire = getRequiredQuestionnaire(riskQuestionnaireId);

    // The template rows loaded for the save are reused (a save cannot change the template);
    // the responses just written are re-read for the rebuilt sections.
    RiskQuestionnaireService.SaveResult saved = riskQuestionnaireService.save(questionnaire, command);
    Long templateId = questionnaire.templateId();
    // Re-read the header and questionnaire *after* the save so the returned detail reflects this
    // update rather than the pre-save state. The header must be re-read, not reused: it carries the
    // Risk Level derived by the DB view from the stored responses (risk_rating, risk_type_code,
    // code_description, range_low_value/range_high_value), and the responses just written can move
    // the assessment into a different band. The questionnaire carries the audit fields
    // (updateTimestamp/updateUserid/revisionCount).
    //
    // A valid save answers every question (RiskQuestionnaireService.save -> requireAllAnswered: edit
    // mirrors create, so an edit that leaves any question blank is rejected before any write). That
    // all-answered rule keeps a save from rating BELOW the lowest band — the low-end vanish it was
    // added to fix (a sub-floor assessment is invisible to the banded view and would drop off the Risk
    // Rating tab and searches). It does NOT, however, guarantee a row here: the view rates by the
    // PRODUCT of section weight-sums while the bands are sized to a SUM, so a fully answered but
    // high-weight assessment rates ABOVE the top band and the inner join (SCS_RISK_SUMMARY_VW joined to
    // SCS_RISK_RATING_VW on `risk_rating BETWEEN range_low_value AND range_high_value`) yields nothing.
    // So getRequiredHeader's 404 here is NOT proof the record is genuinely missing — a high-risk save
    // that persisted fine still 404s (and on the @Transactional create path, rolls back). That
    // high-end overflow is a pre-existing DB-view defect (the Oracle view is immutable) tracked in the
    // RSK defects.md files, not something this save path can resolve.
    ScalerRiskAssessmentSearchResult updatedHeader = getRequiredHeader(riskQuestionnaireId);
    QuestionnaireRow updatedQuestionnaire = getRequiredQuestionnaire(riskQuestionnaireId);
    return buildDetail(
        updatedHeader,
        templateId,
        saved.comments(),
        riskQuestionnaireService.buildSections(saved.templateQa(), riskQuestionnaireId),
        riskQuestionnaireService.buildRiskRatings(templateId),
        updatedQuestionnaire);
  }

  // --- detail composition -------------------------------------------------------------------

  private ScalerRiskAssessmentDetail buildDetail(
      ScalerRiskAssessmentSearchResult header,
      Long templateId,
      String comments,
      List<RiskAssessmentSection> sections,
      List<RiskAssessmentRiskRating> riskRatings,
      QuestionnaireRow questionnaire) {

    String licenceNo = SCSUtils.getNullable(header.getScalerLicenceNo());
    ScalerTombstoneRecord tombstone =
        licenceNo != null ? scalerRepository.getScalerTombstone(licenceNo) : null;

    return RiskAssessmentApiMapper.toScalerDetail(
        header,
        templateId,
        comments,
        tombstone != null ? tombstone.regionName() : null,
        tombstone != null ? tombstone.districtName() : null,
        sections,
        riskRatings,
        questionnaire);
  }

  private ScalerRiskAssessmentDetail buildCreateInitDetail(
      String scalerLicenceNo,
      ScalerTombstoneRecord tombstone,
      ActiveTemplateRow template,
      List<RiskAssessmentSection> sections,
      List<RiskAssessmentRiskRating> riskRatings) {

    return new ScalerRiskAssessmentDetail()
        .scalerLicenceNo(scalerLicenceNo)
        .clientName(tombstoneDisplayName(tombstone))
        .regionName(tombstone.regionName())
        .districtName(tombstone.districtName())
        .templateId(template.templateId())
        .versionNo(template.versionNo())
        .sections(sections)
        .riskRatings(riskRatings);
  }

  /**
   * The Name cell of the Scaler Record header, as "LAST, FIRST".
   *
   * <p>Composed here because create-init is the one path that reads the header from
   * {@code scs_scaler_tombstone_vw}, which exposes {@code client_name} and {@code legal_first_name}
   * as two raw columns. Every other path ({@link #getScalerRiskAssessment}, update, search) reads
   * {@code scs_risk_scaler_vw}, whose {@code CLIENT_NAME} the view has already composed
   * ({@code fc.client_name || ', ' || fc.legal_first_name}). Composing here — rather than adding a
   * {@code legalFirstName} field to the detail and joining in the frontend — keeps
   * {@code clientName} one shape across all four paths, so the shared form's header renders the same
   * name on create, edit and view. Without it the create form showed the surname alone.
   *
   * <p>The rule is the legacy {@code ScsScalerTombstone} tag's (2.20.2): append {@code ", " +
   * legal_first_name} only when it is present. That is deliberately NOT the view's
   * {@code CLIENT_TYPE_CODE = 'C'} branch, which the tombstone view cannot express (it carries no
   * client-type column) — and does not need to: a corporation has no {@code legal_first_name}, so
   * both rules yield the bare name for one. It also avoids the view's trailing-comma artifact
   * ({@code "NAME, "}) for an individual with no first name recorded.
   */
  private static String tombstoneDisplayName(ScalerTombstoneRecord tombstone) {
    String clientName = SCSUtils.trimToNull(tombstone.clientName());
    String legalFirstName = SCSUtils.trimToNull(tombstone.legalFirstName());
    if (clientName == null) {
      return legalFirstName;
    }
    return legalFirstName == null ? clientName : clientName + ", " + legalFirstName;
  }

  // --- lookups ------------------------------------------------------------------------------

  private String requireLicence(String scalerLicenceNo) {
    String trimmed = scalerLicenceNo == null ? null : scalerLicenceNo.trim();
    if (trimmed == null || trimmed.isEmpty()) {
      throw new BadRequestException("Scaler licence number is required.");
    }
    return trimmed;
  }

  private ScalerTombstoneRecord getRequiredTombstone(String scalerLicenceNo) {
    ScalerTombstoneRecord tombstone = scalerRepository.getScalerTombstone(scalerLicenceNo);
    if (tombstone == null) {
      throw new ResourceNotFoundException(
          "No scaler tombstone found for licence number " + scalerLicenceNo);
    }
    return tombstone;
  }

  private void validateId(Long riskQuestionnaireId) {
    if (riskQuestionnaireId == null || riskQuestionnaireId <= 0) {
      throw new BadRequestException("riskQuestionnaireId must be a positive number.");
    }
  }

  private ScalerRiskAssessmentSearchResult getRequiredHeader(Long riskQuestionnaireId) {
    return requireHeader(
        scalerRiskAssessmentRepository.getScalerRiskAssessment(riskQuestionnaireId),
        riskQuestionnaireId);
  }

  /**
   * The not-found half of {@link #getRequiredHeader}, split out so a caller that has already read the
   * row (to hand it to the client-scope guard) does not read it a second time.
   */
  private ScalerRiskAssessmentSearchResult requireHeader(
      ScalerRiskAssessmentSearchResult header, Long riskQuestionnaireId) {
    if (header == null) {
      throw new ResourceNotFoundException(
          "Scaler risk assessment not found for id: " + riskQuestionnaireId);
    }
    return header;
  }

  private QuestionnaireRow getRequiredQuestionnaire(Long riskQuestionnaireId) {
    QuestionnaireRow questionnaire = riskQuestionnaireService.findQuestionnaire(riskQuestionnaireId);
    if (questionnaire == null) {
      throw new ResourceNotFoundException(
          "Scaler risk assessment not found for id: " + riskQuestionnaireId);
    }
    return questionnaire;
  }
}
