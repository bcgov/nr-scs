package ca.bc.gov.nrs.scs.backend.service;

import static ca.bc.gov.nrs.scs.backend.util.SCSUtils.filterByWildcardId;
import static ca.bc.gov.nrs.scs.backend.util.SCSUtils.parseRiskQuestionnaireId;
import static ca.bc.gov.nrs.scs.backend.util.SCSUtils.padClientNumberCriterion;
import static ca.bc.gov.nrs.scs.backend.util.SCSUtils.resolveSort;
import static ca.bc.gov.nrs.scs.backend.util.SCSUtils.upperOrNull;

import ca.bc.gov.nrs.scs.backend.domain.riskassessment.RiskAssessmentCreateCommand;
import ca.bc.gov.nrs.scs.backend.domain.riskassessment.RiskAssessmentUpdateCommand;
import ca.bc.gov.nrs.scs.backend.domain.scalesite.ScaleSiteTombstoneRecord;
import ca.bc.gov.nrs.scs.backend.dto.ActiveTemplateRow;
import ca.bc.gov.nrs.scs.backend.dto.QuestionnaireRow;
import ca.bc.gov.nrs.scs.backend.domain.shared.RegionDistrict;
import ca.bc.gov.nrs.scs.backend.exception.BadRequestException;
import ca.bc.gov.nrs.scs.backend.exception.ResourceNotFoundException;
import ca.bc.gov.nrs.scs.backend.model.RiskAssessmentRiskRating;
import ca.bc.gov.nrs.scs.backend.model.RiskAssessmentSection;
import ca.bc.gov.nrs.scs.backend.model.ScaleSiteRiskAssessmentDetail;
import ca.bc.gov.nrs.scs.backend.model.ScaleSiteRiskAssessmentSearchResult;
import ca.bc.gov.nrs.scs.backend.repository.OrgUnitRepository;
import ca.bc.gov.nrs.scs.backend.repository.ScaleSiteRepository;
import ca.bc.gov.nrs.scs.backend.repository.ScaleSiteRiskAssessmentRepository;
import ca.bc.gov.nrs.scs.backend.security.ClientScopeGuard;
import ca.bc.gov.nrs.scs.backend.security.SecurityContextUtils;
import ca.bc.gov.nrs.scs.backend.service.mapper.RiskAssessmentApiMapper;
import ca.bc.gov.nrs.scs.backend.util.SCSUtils;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Composes the scale site risk assessment detail and search results. The data-driven questionnaire
 * structure (sections, questions, answers, risk levels) and the response/comment save are handled
 * by the shared {@link RiskQuestionnaireService}; this service only adds the scale-site-specific
 * header (scale site id/name, region/district) and search.
 */
@Service
public class ScaleSiteRiskAssessmentService {

  private static final Set<Integer> PRIMARY_SORTS = Set.of(1, 8, 4, 3, 21, 22, 19);
  private static final Set<Integer> SECONDARY_SORTS = Set.of(0, 1, 8, 4, 3, 21, 22, 19);

  // A new scale-site assessment always binds to the active scale-site template type. Legacy
  // Constants.TEMPLATE_TYPE_SCALE_SITE_2.
  private static final String SCALE_SITE_TEMPLATE_TYPE = "SCSI";

  private final ScaleSiteRiskAssessmentRepository scaleSiteRiskAssessmentRepository;
  private final RiskQuestionnaireService riskQuestionnaireService;
  private final OrgUnitRepository orgUnitRepository;
  private final ScaleSiteRepository scaleSiteRepository;
  private final ClientScopeGuard clientScopeGuard;

  public ScaleSiteRiskAssessmentService(
      ScaleSiteRiskAssessmentRepository scaleSiteRiskAssessmentRepository,
      RiskQuestionnaireService riskQuestionnaireService,
      OrgUnitRepository orgUnitRepository,
      ScaleSiteRepository scaleSiteRepository,
      ClientScopeGuard clientScopeGuard) {
    this.scaleSiteRiskAssessmentRepository = scaleSiteRiskAssessmentRepository;
    this.riskQuestionnaireService = riskQuestionnaireService;
    this.orgUnitRepository = orgUnitRepository;
    this.scaleSiteRepository = scaleSiteRepository;
    this.clientScopeGuard = clientScopeGuard;
  }

  /**
   * The assessment is keyed on {@code riskQuestionnaireId}, which {@code ClientScopeInterceptor} cannot
   * scope, so the guard runs here — on the site the header names, and <b>before</b> the not-found
   * check, so a restricted caller cannot use the id as an existence oracle.
   *
   * <p>The header is read <b>once</b> and handed to both steps. The guard needs no
   * {@code isClientRestricted} branch around it: {@code assertRecordSiteInScope} already returns
   * immediately for an internal caller and already treats a null record as a denial, so a branch here
   * would only duplicate its first two lines — and cost a second read of the same row to do it. Same
   * shape as {@code ScaleSiteAuthorizationService.getScaleSiteAuthorization}, which this endpoint is
   * the id-addressed twin of.
   */
  public ScaleSiteRiskAssessmentDetail getScaleSiteRiskAssessment(Long riskQuestionnaireId) {
    validateId(riskQuestionnaireId);
    ScaleSiteRiskAssessmentSearchResult header =
        scaleSiteRiskAssessmentRepository.getScaleSiteRiskAssessment(riskQuestionnaireId);
    clientScopeGuard.assertRecordSiteInScope(
        header == null ? null : SCSUtils.getNullable(header.getScaleSiteIdNmbr()));
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

  @Transactional
  public ScaleSiteRiskAssessmentDetail updateScaleSiteRiskAssessment(
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
    ScaleSiteRiskAssessmentSearchResult updatedHeader = getRequiredHeader(riskQuestionnaireId);
    QuestionnaireRow updatedQuestionnaire = getRequiredQuestionnaire(riskQuestionnaireId);
    return buildDetail(
        updatedHeader,
        templateId,
        saved.comments(),
        riskQuestionnaireService.buildSections(saved.templateQa(), riskQuestionnaireId),
        riskQuestionnaireService.buildRiskRatings(templateId),
        updatedQuestionnaire);
  }

  /**
   * Build the payload for the "Add Risk Assessment" form: the scale-site header (from the
   * tombstone), the currently active {@code SCSI} template's blank questionnaire, and its Risk
   * Levels table. No {@code RISK_QUESTIONNAIRE} row is created here — persistence happens only on
   * {@link #createScaleSiteRiskAssessment}.
   */
  public ScaleSiteRiskAssessmentDetail getScaleSiteRiskAssessmentCreateInit(String scaleSiteIdNmbr) {
    String idNmbr = requireScaleSiteId(scaleSiteIdNmbr);
    ScaleSiteTombstoneRecord tombstone = getRequiredTombstone(idNmbr);
    ActiveTemplateRow template = riskQuestionnaireService.findActiveTemplate(SCALE_SITE_TEMPLATE_TYPE);

    return buildCreateInitDetail(
        idNmbr,
        tombstone,
        template,
        riskQuestionnaireService.buildBlankSections(template.templateId()),
        riskQuestionnaireService.buildRiskRatings(template.templateId()));
  }

  /**
   * Create a new scale-site risk assessment bound to the active {@code SCSI} template, writing the
   * row and the answered responses in one transaction (mirroring the legacy add + save). Returns the
   * freshly-read detail (including the DB-derived rating/level), so the caller sees the same shape
   * the view/edit pages use.
   */
  @Transactional
  public ScaleSiteRiskAssessmentDetail createScaleSiteRiskAssessment(
      String scaleSiteIdNmbr, RiskAssessmentCreateCommand command) {
    String idNmbr = requireScaleSiteId(scaleSiteIdNmbr);
    getRequiredTombstone(idNmbr);
    ActiveTemplateRow template = riskQuestionnaireService.findActiveTemplate(SCALE_SITE_TEMPLATE_TYPE);

    RiskQuestionnaireService.CreateResult created =
        riskQuestionnaireService.create(
            null, idNmbr, SCALE_SITE_TEMPLATE_TYPE, template.templateId(), command);

    return getScaleSiteRiskAssessment(created.riskQuestionnaireId());
  }

  // --- detail composition -------------------------------------------------------------------

  private ScaleSiteRiskAssessmentDetail buildDetail(
      ScaleSiteRiskAssessmentSearchResult header,
      Long templateId,
      String comments,
      List<RiskAssessmentSection> sections,
      List<RiskAssessmentRiskRating> riskRatings,
      QuestionnaireRow questionnaire) {

    RegionDistrict regionDistrict =
        orgUnitRepository
            .findRegionDistrict(SCSUtils.getNullable(header.getOrgUnitNo()))
            .orElse(null);

    return RiskAssessmentApiMapper.toScaleSiteDetail(
        header,
        templateId,
        comments,
        regionDistrict != null ? regionDistrict.regionName() : null,
        regionDistrict != null ? regionDistrict.districtName() : null,
        sections,
        riskRatings,
        questionnaire);
  }

  private ScaleSiteRiskAssessmentDetail buildCreateInitDetail(
      String scaleSiteIdNmbr,
      ScaleSiteTombstoneRecord tombstone,
      ActiveTemplateRow template,
      List<RiskAssessmentSection> sections,
      List<RiskAssessmentRiskRating> riskRatings) {

    return new ScaleSiteRiskAssessmentDetail()
        .scaleSiteIdNmbr(scaleSiteIdNmbr)
        .siteName(tombstone.siteName())
        .regionName(tombstone.regionName())
        .districtName(tombstone.districtName())
        .templateId(template.templateId())
        .versionNo(template.versionNo())
        .sections(sections)
        .riskRatings(riskRatings);
  }

  // --- lookups ------------------------------------------------------------------------------

  private String requireScaleSiteId(String scaleSiteIdNmbr) {
    String trimmed = scaleSiteIdNmbr == null ? null : scaleSiteIdNmbr.trim();
    if (trimmed == null || trimmed.isEmpty()) {
      throw new BadRequestException("Scale site id number is required.");
    }
    return trimmed;
  }

  private ScaleSiteTombstoneRecord getRequiredTombstone(String scaleSiteIdNmbr) {
    ScaleSiteTombstoneRecord tombstone = scaleSiteRepository.getScaleSiteTombstone(scaleSiteIdNmbr);
    if (tombstone == null) {
      throw new ResourceNotFoundException(
          "No scale site tombstone found for scale site id " + scaleSiteIdNmbr);
    }
    return tombstone;
  }

  private void validateId(Long riskQuestionnaireId) {
    if (riskQuestionnaireId == null || riskQuestionnaireId <= 0) {
      throw new BadRequestException("riskQuestionnaireId must be a positive number.");
    }
  }

  private ScaleSiteRiskAssessmentSearchResult getRequiredHeader(Long riskQuestionnaireId) {
    return requireHeader(
        scaleSiteRiskAssessmentRepository.getScaleSiteRiskAssessment(riskQuestionnaireId),
        riskQuestionnaireId);
  }

  /**
   * The not-found half of {@link #getRequiredHeader}, split out so a caller that has already read the
   * row (to hand it to the client-scope guard) does not read it a second time.
   */
  private ScaleSiteRiskAssessmentSearchResult requireHeader(
      ScaleSiteRiskAssessmentSearchResult header, Long riskQuestionnaireId) {
    if (header == null) {
      throw new ResourceNotFoundException(
          "Scale site risk assessment not found for id: " + riskQuestionnaireId);
    }
    return header;
  }

  private QuestionnaireRow getRequiredQuestionnaire(Long riskQuestionnaireId) {
    QuestionnaireRow questionnaire = riskQuestionnaireService.findQuestionnaire(riskQuestionnaireId);
    if (questionnaire == null) {
      throw new ResourceNotFoundException(
          "Scale site risk assessment not found for id: " + riskQuestionnaireId);
    }
    return questionnaire;
  }

  // --- search -------------------------------------------------------------------------------

  public List<ScaleSiteRiskAssessmentSearchResult> searchScaleSiteRiskAssessments(
      String riskQuestionnaireIdInput,
      String riskTypeCode,
      String completeInd,
      String scaleSiteIdNmbr,
      Long orgUnitNo,
      List<String> methodTypes,
      String siteName,
      String ownerClientNumber,
      String ownerClientLocnCode,
      Integer primarySort,
      Integer secondarySort) {

    var parsed = parseRiskQuestionnaireId(riskQuestionnaireIdInput);
    Long exactId = parsed.exactId();
    String wildcardPattern = parsed.wildcardPattern();

    int resolvedPrimarySort = resolveSort(primarySort, PRIMARY_SORTS, 1);
    int resolvedSecondarySort = resolveSort(secondarySort, SECONDARY_SORTS, 0);
    Set<String> normalizedMethodTypes = normalizeMethodTypes(methodTypes);

    // Client-restricted external users see only their own forest client, so the request's owner client
    // is ignored — the same override ScaleSiteService.searchScaleSites applies. No external role reaches
    // this search today (the Scale Site Owner was given _ASSESSMENT_READ without _ASSESSMENT_QUERY on
    // 2026-09-03, so it works from the scale-site record instead), but the override stays: it is the
    // precondition for granting the permission, and removing it would silently re-open the hole.
    String effectiveOwnerClientNumber = SecurityContextUtils.isClientRestricted()
        ? SecurityContextUtils.currentUserClientNumber()
        : padClientNumberCriterion(ownerClientNumber);

    List<ScaleSiteRiskAssessmentSearchResult> results = scaleSiteRiskAssessmentRepository.searchScaleSiteRiskAssessments(
        exactId,
        upperOrNull(riskTypeCode),
        upperOrNull(completeInd),
        upperOrNull(scaleSiteIdNmbr),
        null,
        orgUnitNo,
        normalizedMethodTypes.contains("W"),
        normalizedMethodTypes.contains("P"),
        normalizedMethodTypes.contains("S"),
        effectiveOwnerClientNumber,
        upperOrNull(ownerClientLocnCode),
        normalizeWildcardText(siteName),
        resolvedPrimarySort,
        resolvedSecondarySort);

    return filterByWildcardId(results, wildcardPattern, ScaleSiteRiskAssessmentSearchResult::getRiskQuestionnaireId);
  }

  private Set<String> normalizeMethodTypes(List<String> methodTypes) {
    LinkedHashSet<String> normalized = new LinkedHashSet<>();
    if (methodTypes == null) {
      return normalized;
    }

    for (String methodType : methodTypes) {
      String value = upperOrNull(methodType);
      if (value == null) {
        continue;
      }
      if (Set.of("W", "P", "S").contains(value)) {
        normalized.add(value);
      }
    }

    return normalized;
  }


  private String normalizeWildcardText(String value) {
    String normalized = upperOrNull(value);
    if (normalized == null || !normalized.contains("%")) {
      return normalized;
    }

    return normalizeContainsWildcard(normalized);
  }

  private static String normalizeContainsWildcard(String pattern) {
    String withLeading = pattern.startsWith("%") ? pattern : "%" + pattern;
    return withLeading.endsWith("%") ? withLeading : withLeading + "%";
  }
}
