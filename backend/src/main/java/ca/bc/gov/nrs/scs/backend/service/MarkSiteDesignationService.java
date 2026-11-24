package ca.bc.gov.nrs.scs.backend.service;

import static ca.bc.gov.nrs.scs.backend.util.SCSUtils.isBlank;
import static ca.bc.gov.nrs.scs.backend.util.SCSUtils.requireDateOrder;
import static ca.bc.gov.nrs.scs.backend.util.SCSUtils.requireFound;
import static ca.bc.gov.nrs.scs.backend.util.SCSUtils.requireMaxLength;
import static ca.bc.gov.nrs.scs.backend.util.SCSUtils.requireNotNull;
import static ca.bc.gov.nrs.scs.backend.util.SCSUtils.requireYesNo;
import static ca.bc.gov.nrs.scs.backend.util.SCSUtils.upperOrNull;

import ca.bc.gov.nrs.scs.backend.domain.marksitedesignation.HaulingMarkAuthorizationDetail;
import ca.bc.gov.nrs.scs.backend.domain.marksitedesignation.MarkSiteDesignationCreateCommand;
import ca.bc.gov.nrs.scs.backend.domain.marksitedesignation.MarkSiteDesignationTimberMarkHolder;
import ca.bc.gov.nrs.scs.backend.domain.marksitedesignation.MarkSiteDesignationUpdateCommand;
import ca.bc.gov.nrs.scs.backend.exception.BadRequestException;
import ca.bc.gov.nrs.scs.backend.exception.ConflictException;
import ca.bc.gov.nrs.scs.backend.exception.ResourceNotFoundException;
import ca.bc.gov.nrs.scs.backend.model.MarkSiteDesignationDetail;
import ca.bc.gov.nrs.scs.backend.model.MarkSiteDesignationScaleSite;
import ca.bc.gov.nrs.scs.backend.model.MarkSiteDesignationSearchResult;
import ca.bc.gov.nrs.scs.backend.model.MarkSiteDesignationSpeciesContent;
import ca.bc.gov.nrs.scs.backend.model.MarkSiteDesignationTimberMarkLookup;
import ca.bc.gov.nrs.scs.backend.model.ScaleAuthCondition;
import ca.bc.gov.nrs.scs.backend.repository.MarkSiteDesignationRepository;
import ca.bc.gov.nrs.scs.backend.service.mapper.MarkSiteDesignationApiMapper;
import java.time.LocalDate;
import java.util.List;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class MarkSiteDesignationService {

  private static final String EXPIRY_DATE_REQUIRED = "Expiry date is required.";
  private static final String EFFECTIVE_BEFORE_EXPIRY =
      "Effective date must be on or before the expiry date.";
  // Legacy S07/ERR-014. Surfaced when the HAULING_MARK_SITE (timber mark + scale site) unique key
  // rejects a scale site that already has a valid designation, in place of the raw ORA-00001 message.
  private static final String DUPLICATE_MARK_SITE =
      "A valid Mark Site Designation already exists for this Timber Mark and Scale Site.";

  // Column lengths from HAULING_MARK_AUTHORIZATION, as enforced by the legacy
  // HaulingMarkAuthorizationValidator.checkFieldLengths(). Mirrored here so a request that bypasses
  // the create/edit screens gets the same field-named message instead of a raw ORA-12899.
  private static final int MAX_GEOGRAPHIC_LOCATION = 40;
  private static final int MAX_TIMBER_DESCRIPTION = 40;
  private static final int MAX_TRANSPORTATION_DATE_DESC = 200;
  private static final int MAX_OTHER_REQUIREMENTS = 4000;
  private static final int MAX_POPULATION = 4;

  private final MarkSiteDesignationRepository repository;

  public MarkSiteDesignationService(MarkSiteDesignationRepository repository) {
    this.repository = repository;
  }

  public MarkSiteDesignationTimberMarkLookup lookupTimberMarkHolder(String timberMark) {
    String normalized = upperOrNull(timberMark);
    if (normalized == null) {
      throw new BadRequestException("Timber Mark is required.");
    }

    MarkSiteDesignationTimberMarkHolder holder = repository.findTimberMarkHolder(normalized);
    requireFound(holder, "No mark holder found for timber mark " + normalized);

    return MarkSiteDesignationApiMapper.toMarkSiteDesignationTimberMarkLookup(holder);
  }

  /**
   * General timber-mark search backing the Queries > Mark Site Designations page. Returns all
   * matching designations regardless of expiry.
   */
  public List<MarkSiteDesignationSearchResult> searchMarkSiteDesignationsByTimberMark(String timberMark) {
    String normalized = upperOrNull(timberMark);
    if (normalized == null) {
      throw new BadRequestException("Timber Mark is required.");
    }
    return MarkSiteDesignationApiMapper.toSearchResults(repository.searchByTimberMark(normalized));
  }

  public MarkSiteDesignationDetail getMarkSiteDesignation(Long authorizationId) {
    var detail = repository.getMarkSiteAuthorizationDetail(authorizationId);
    requireFound(detail, "No mark site designation found with id " + authorizationId);

    var holder = repository.findTimberMarkHolder(detail.timberMark());
    List<MarkSiteDesignationScaleSite> scaleSites = repository.getMarkSiteDesignationScaleSites(authorizationId);
    List<MarkSiteDesignationSpeciesContent> speciesContent = repository.getMarkSiteDesignationSpeciesContent(authorizationId);
    List<ScaleAuthCondition> conditions = repository.getMarkSiteDesignationConditions(authorizationId);
    List<String> exceptions = repository.getMarkSiteDesignationExceptions(authorizationId);
    boolean letterExists = repository.getMarkSiteDesignationLetterExists(authorizationId);

    return MarkSiteDesignationApiMapper.toDetail(detail, holder, scaleSites, speciesContent, conditions, exceptions, letterExists);
  }

  @Transactional
  public Long createMarkSiteDesignation(MarkSiteDesignationCreateCommand command) {
    validateCreateCommand(command);

    if (!repository.timberMarkHolderExists(command.timberMark())) {
      throw new ResourceNotFoundException("No mark holder found for timber mark " + command.timberMark());
    }

    Long authorizationId = repository.createMarkSiteDesignation(command);
    if (authorizationId == null) {
      throw new BadRequestException("Mark site designation could not be created.");
    }

    try {
      // The (timber mark + scale site) uniqueness lives on HAULING_MARK_SITE, so a duplicate surfaces
      // from this call only. Translating it here — rather than around the whole sequence — keeps the
      // ERR-014 message off the other child inserts (notably the concurrency-race condition duplicate
      // on HAULING_MARK_SITE_CONDITION, which is a different defect). The DB key stays the real guard,
      // so no racy pre-check is needed and a re-create after a prior designation ends is never blocked.
      repository.addMarkSiteScaleSites(authorizationId, command.scaleSites());
    } catch (DuplicateKeyException ex) {
      throw new ConflictException(DUPLICATE_MARK_SITE);
    }
    repository.addMarkSiteSpeciesContent(authorizationId, command.speciesContent());
    repository.addMarkSiteConditions(authorizationId, command.conditions());
    repository.addMarkSiteExceptions(authorizationId, command.exceptions());

    return authorizationId;
  }

  @Transactional
  public MarkSiteDesignationDetail updateMarkSiteDesignation(
      Long authorizationId, MarkSiteDesignationUpdateCommand command) {
    HaulingMarkAuthorizationDetail existing = requireFound(
        repository.getMarkSiteAuthorizationDetail(authorizationId),
        "No mark site designation found with id " + authorizationId);
    if (repository.getMarkSiteDesignationLetterExists(authorizationId)) {
      LocalDate expiryDate = requireNotNull(command.expiryDate(), EXPIRY_DATE_REQUIRED);
      // Expiry stays editable once a letter is issued, but the locked effective date still bounds
      // it. Compare against the stored value, not the submitted one: this path discards every other
      // field, so a crafted request could otherwise slip an out-of-order expiry past the check.
      requireDateOrder(existing.effectiveDate(), expiryDate, EFFECTIVE_BEFORE_EXPIRY);
      repository.updateMarkSiteDesignationExpiryOnly(authorizationId, expiryDate);
    } else {
      validateUpdateCommand(command);
      repository.updateMarkSiteDesignationRecord(authorizationId, command);
      repository.deleteMarkSiteDesignationAssociations(authorizationId);
      repository.addMarkSiteScaleSites(authorizationId, command.scaleSites());
      repository.addMarkSiteSpeciesContent(authorizationId, command.speciesContent());
      repository.addMarkSiteConditions(authorizationId, command.conditions());
      repository.addMarkSiteExceptions(authorizationId, command.exceptions());
    }

    return getMarkSiteDesignation(authorizationId);
  }

  public void removeMarkSiteDesignationFromWorkbench(Long authorizationId) {
    boolean updated = repository.setExpiryNotificationInd(authorizationId, "Y");
    if (!updated) {
      throw new ResourceNotFoundException("No mark site designation found with id " + authorizationId);
    }
  }

  private void validateUpdateCommand(MarkSiteDesignationUpdateCommand command) {
    LocalDate effectiveDate = requireNotNull(command.effectiveDate(), "Effective date is required.");
    LocalDate expiryDate = requireNotNull(command.expiryDate(), EXPIRY_DATE_REQUIRED);
    requireNotNull(command.orgUnitNo(), "Reg / Dist is required.");
    requireNotNull(command.districtWideInd(), "District wide is required.");
    requireYesNo(command.districtWideInd(), "District wide must be Y or N.");
    requireDateOrder(effectiveDate, expiryDate, EFFECTIVE_BEFORE_EXPIRY);
    requireScaleSiteWhenNotDistrictWide(command.districtWideInd(), command.scaleSites());
    validateTextLengths(
        command.geographicLocation(),
        command.population(),
        command.timberDescription(),
        command.transportationDateDesc(),
        command.otherRequirements());
  }

  private void validateCreateCommand(MarkSiteDesignationCreateCommand command) {
    if (isBlank(command.timberMark())) {
      throw new BadRequestException("Timber Mark is required.");
    }

    LocalDate effectiveDate = requireNotNull(command.effectiveDate(), "Effective date is required.");
    LocalDate expiryDate = requireNotNull(command.expiryDate(), EXPIRY_DATE_REQUIRED);
    requireNotNull(command.orgUnitNo(), "Reg / Dist is required.");
    requireNotNull(command.districtWideInd(), "District wide is required.");
    requireYesNo(command.districtWideInd(), "District wide must be Y or N.");

    requireDateOrder(effectiveDate, expiryDate, EFFECTIVE_BEFORE_EXPIRY);
    requireScaleSiteWhenNotDistrictWide(command.districtWideInd(), command.scaleSites());
    validateTextLengths(
        command.geographicLocation(),
        command.population(),
        command.timberDescription(),
        command.transportationDateDesc(),
        command.otherRequirements());
  }

  /**
   * Mirrors the create/edit screens' ERR-019..ERR-022 length rules server-side. Field names match
   * the screen labels so the message reads the same wherever it surfaces.
   */
  private void validateTextLengths(
      String geographicLocation,
      String population,
      String timberDescription,
      String transportationDateDesc,
      String otherRequirements) {
    requireMaxLength(geographicLocation, MAX_GEOGRAPHIC_LOCATION, "Geographic Location");
    requireMaxLength(population, MAX_POPULATION, "Population");
    requireMaxLength(timberDescription, MAX_TIMBER_DESCRIPTION, "Timber Description");
    requireMaxLength(
        transportationDateDesc, MAX_TRANSPORTATION_DATE_DESC, "Transportation Date Desc");
    requireMaxLength(otherRequirements, MAX_OTHER_REQUIREMENTS, "Other Requirements");
  }

  /**
   * Mirrors the create/edit screens' ERR-011 rule server-side so a crafted request cannot bypass the
   * UI: a designation that is not district wide must name at least one scale site.
   */
  private void requireScaleSiteWhenNotDistrictWide(String districtWideInd, List<String> scaleSites) {
    if ("N".equalsIgnoreCase(districtWideInd) && (scaleSites == null || scaleSites.isEmpty())) {
      throw new BadRequestException("At least one scale site is required when district wide is N.");
    }
  }

}
