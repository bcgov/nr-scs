package ca.bc.gov.nrs.scs.backend.service;

import ca.bc.gov.nrs.scs.backend.exception.BadRequestException;
import ca.bc.gov.nrs.scs.backend.model.ScaleAuthConditionCreateRequest;
import ca.bc.gov.nrs.scs.backend.model.ScaleAuthConditionDetail;
import ca.bc.gov.nrs.scs.backend.model.ScaleAuthConditionUpdateRequest;
import ca.bc.gov.nrs.scs.backend.repository.ConditionRepository;
import ca.bc.gov.nrs.scs.backend.util.SCSUtils;
import java.time.LocalDate;
import java.util.List;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;

@Service
public class ConditionService {

  private static final Logger log = LogManager.getLogger(ConditionService.class);

  private static final String CLASS_CODE_SCALE_SITE = "SIA";
  private static final String CLASS_CODE_MSD = "MSD";
  private static final String CLASS_CODE_SCA = "SCA";
  private static final String NO_CONDITION_FOUND = "No condition found with id ";
  private static final String DEPENDENT_RECORDS_MESSAGE =
      "Condition has dependent records and cannot be deleted.";

  private final ConditionRepository repository;

  public ConditionService(ConditionRepository repository) {
    this.repository = repository;
  }

  public List<ScaleAuthConditionDetail> searchConditions(
      String scaleConditionClassCode,
      Long scaleAuthConditionId,
      String scaleAuthConditionTitle,
      String scaleAuthConditionDesc,
      String ministryStandardInd,
      Integer sortOrderNo,
      LocalDate effectiveDate,
      LocalDate expiryDate) {
    return repository.searchConditions(
        scaleConditionClassCode,
        scaleAuthConditionId,
        scaleAuthConditionTitle,
        scaleAuthConditionDesc,
        ministryStandardInd,
        sortOrderNo,
        effectiveDate,
        expiryDate);
  }

  public ScaleAuthConditionDetail getCondition(String scaleConditionClassCode, Long scaleAuthConditionId) {
    ScaleAuthConditionDetail detail = repository.getCondition(scaleConditionClassCode, scaleAuthConditionId);
    SCSUtils.requireFound(detail, NO_CONDITION_FOUND + scaleAuthConditionId);
    return detail;
  }

  public ScaleAuthConditionDetail createCondition(ScaleAuthConditionCreateRequest request) {
    validateRequest(request.getScaleConditionClassCode(), request);

    ScaleAuthConditionDetail created = repository.createCondition(request);
    if (created == null || created.getScaleAuthConditionId() == null) {
      throw new BadRequestException("Condition could not be created.");
    }
    return created;
  }

  public ScaleAuthConditionDetail updateCondition(
      String scaleConditionClassCode,
      Long scaleAuthConditionId,
      ScaleAuthConditionUpdateRequest request) {
    if (request.getScaleConditionClassCode() != null
        && !request.getScaleConditionClassCode().equalsIgnoreCase(scaleConditionClassCode)) {
      throw new BadRequestException("Scale condition class code cannot be changed.");
    }

    validateRequest(scaleConditionClassCode, request);

    ScaleAuthConditionDetail existing = repository.getCondition(scaleConditionClassCode, scaleAuthConditionId);
    SCSUtils.requireFound(existing, NO_CONDITION_FOUND + scaleAuthConditionId);

    ScaleAuthConditionDetail updated = repository.updateCondition(scaleConditionClassCode, scaleAuthConditionId, request);
    if (updated == null) {
      throw new BadRequestException("Condition could not be updated.");
    }
    return updated;
  }

  public void deleteCondition(String scaleConditionClassCode, Long scaleAuthConditionId) {
    ScaleAuthConditionDetail existing = repository.getCondition(scaleConditionClassCode, scaleAuthConditionId);
    SCSUtils.requireFound(existing, NO_CONDITION_FOUND + scaleAuthConditionId);

    if (Boolean.TRUE.equals(existing.getDependentChildExists())) {
      throw new BadRequestException(DEPENDENT_RECORDS_MESSAGE);
    }

    try {
      repository.deleteCondition(scaleConditionClassCode, scaleAuthConditionId);
    } catch (DataIntegrityViolationException ex) {
      // TOCTOU backstop: the dependentChildExists check above passed, but a child row can be
      // inserted between the check and the delete. Deleting this single parent row can only
      // realistically violate an FK (ORA-02292) — unique/NOT NULL/check violations aren't reachable
      // from this DELETE — so classify it as dependent records. Logged so the actual constraint
      // stays traceable.
      log.warn("Integrity violation deleting condition {} / {}",
          scaleConditionClassCode, scaleAuthConditionId, ex);
      throw new BadRequestException(DEPENDENT_RECORDS_MESSAGE);
    }
  }

  private void validateRequest(String scaleConditionClassCode, ScaleAuthConditionCreateRequest request) {
    validateRequestCommon(
        scaleConditionClassCode,
        request.getScaleAuthConditionTitle(),
        request.getScaleAuthConditionDesc(),
        request.getMinistryStandardInd(),
        request.getSortOrderNo(),
        request.getEffectiveDate(),
        request.getExpiryDate(),
        request.getSiteMethodTypeCodes());
  }

  private void validateRequest(String scaleConditionClassCode, ScaleAuthConditionUpdateRequest request) {
    validateRequestCommon(
        scaleConditionClassCode,
        request.getScaleAuthConditionTitle(),
        request.getScaleAuthConditionDesc(),
        request.getMinistryStandardInd(),
        request.getSortOrderNo(),
        request.getEffectiveDate(),
        request.getExpiryDate(),
        request.getSiteMethodTypeCodes());
  }

  private void validateRequestCommon(
      String scaleConditionClassCode,
      String title,
      String description,
      String ministryStandardInd,
      Integer sortOrderNo,
      LocalDate effectiveDate,
      LocalDate expiryDate,
      List<String> siteMethodTypeCodes) {
    SCSUtils.requireText(scaleConditionClassCode, "Condition type is required.");
    SCSUtils.requireText(title, "Condition title is required.");
    SCSUtils.requireText(description, "Condition text is required.");
    SCSUtils.requireText(ministryStandardInd, "Mandatory indicator is required.");
    if (!SCSUtils.isYesNo(ministryStandardInd)) {
      throw new BadRequestException("Mandatory indicator must be Y or N.");
    }
    if (sortOrderNo == null) {
      throw new BadRequestException("Sort order is required.");
    }
    if (sortOrderNo < 0 || sortOrderNo > 9999) {
      throw new BadRequestException("Sort order must be between 0 and 9999.");
    }
    if (effectiveDate == null) {
      throw new BadRequestException("Effective date is required.");
    }
    SCSUtils.requireDateOrder(effectiveDate, expiryDate,
        "Expiry date must be on or after Effective date.");

    validateSiteMethodTypeCodes(scaleConditionClassCode, siteMethodTypeCodes);
  }

  private void validateSiteMethodTypeCodes(String scaleConditionClassCode, List<String> siteMethodTypeCodes) {
    if (CLASS_CODE_SCALE_SITE.equalsIgnoreCase(scaleConditionClassCode)) {
      if (siteMethodTypeCodes == null || siteMethodTypeCodes.isEmpty()) {
        throw new BadRequestException("Site Type is required for scale site conditions.");
      }
    } else if (CLASS_CODE_MSD.equalsIgnoreCase(scaleConditionClassCode)
        || CLASS_CODE_SCA.equalsIgnoreCase(scaleConditionClassCode)) {
      if (siteMethodTypeCodes != null && !siteMethodTypeCodes.isEmpty()) {
        throw new BadRequestException("Site Type is only valid for scale site conditions.");
      }
    }
  }

}
