package ca.bc.gov.nrs.scs.backend.service;

import static ca.bc.gov.nrs.scs.backend.util.SCSUtils.isBlank;
import static ca.bc.gov.nrs.scs.backend.util.SCSUtils.requireDateOrder;
import static ca.bc.gov.nrs.scs.backend.util.SCSUtils.requireFound;
import static ca.bc.gov.nrs.scs.backend.util.SCSUtils.requireNotNull;
import static ca.bc.gov.nrs.scs.backend.util.SCSUtils.requireText;

import java.time.LocalDate;
import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import ca.bc.gov.nrs.scs.backend.exception.BadRequestException;
import ca.bc.gov.nrs.scs.backend.exception.ResourceNotFoundException;
import ca.bc.gov.nrs.scs.backend.model.ScaleAuthCondition;
import ca.bc.gov.nrs.scs.backend.model.ScaleSiteAuthorizationDetail;
import ca.bc.gov.nrs.scs.backend.model.ScaleSiteAuthorizationSaveRequest;
import ca.bc.gov.nrs.scs.backend.domain.authorization.ScaleSiteAuthorizationRecord;
import ca.bc.gov.nrs.scs.backend.repository.ScaleSiteAuthorizationRepository;
import ca.bc.gov.nrs.scs.backend.repository.ScaleSiteRepository;
import ca.bc.gov.nrs.scs.backend.repository.SystemSettingRepository;
import ca.bc.gov.nrs.scs.backend.security.ClientScopeGuard;
import ca.bc.gov.nrs.scs.backend.service.mapper.ScaleSiteAuthorizationApiMapper;

@Service
public class ScaleSiteAuthorizationService {

  private static final String MAX_SITE_AUTHORIZATION_LENGTH_KEY = "SALM";

  private final ScaleSiteAuthorizationRepository repository;
  private final ScaleSiteRepository scaleSiteRepository;
  private final SystemSettingRepository systemSettingRepository;
  private final ClientScopeGuard clientScopeGuard;

  public ScaleSiteAuthorizationService(
      ScaleSiteAuthorizationRepository repository,
      ScaleSiteRepository scaleSiteRepository,
      SystemSettingRepository systemSettingRepository,
      ClientScopeGuard clientScopeGuard) {
    this.repository = repository;
    this.scaleSiteRepository = scaleSiteRepository;
    this.systemSettingRepository = systemSettingRepository;
    this.clientScopeGuard = clientScopeGuard;
  }

  /**
   * Lists every authorization for a scale site, backing the Site Authorizations tab on the scale
   * site view page. Mirrors the legacy {@code ScaleSiteAuthorizationsAction} list.
   */
  public List<ScaleSiteAuthorizationDetail> listScaleSiteAuthorizations(String scaleSiteIdNmbr) {
    requireText(scaleSiteIdNmbr, "Scale site number is required.");
    requireFound(
        scaleSiteRepository.getScaleSite(scaleSiteIdNmbr),
        "No scale site found with number " + scaleSiteIdNmbr);
    return ScaleSiteAuthorizationApiMapper.toDetails(
        repository.listScaleSiteAuthorizationsByScaleSite(scaleSiteIdNmbr));
  }

  public void removeScaleSiteAuthorizationFromWorkbench(Long authorizationId) {
    boolean updated = repository.setExpiryNotificationInd(authorizationId, "Y");
    if (!updated) {
      throw new ResourceNotFoundException("No scale site authorization found with id " + authorizationId);
    }
  }

  @Transactional
  public ScaleSiteAuthorizationDetail createScaleSiteAuthorization(ScaleSiteAuthorizationSaveRequest request) {
    validateCreateRequest(request);

    if (request.getExpiryNotificationInd() == null || request.getExpiryNotificationInd().isBlank()) {
      request.setExpiryNotificationInd("N");
    }

    ScaleSiteAuthorizationDetail created = repository.createScaleSiteAuthorization(request);
    if (created == null || created.getScaleSiteAuthorizationId() == null) {
      throw new BadRequestException("Scale site authorization could not be created.");
    }

    Long authorizationId = created.getScaleSiteAuthorizationId();
    repository.addConditions(authorizationId, request.getConditions());

    return repository.getScaleSiteAuthorization(authorizationId);
  }

  @Transactional
  public ScaleSiteAuthorizationDetail updateScaleSiteAuthorization(Long scaleSiteAuthorizationId, ScaleSiteAuthorizationSaveRequest request) {
    if (request == null) {
      throw new BadRequestException("Request body is required.");
    }

    ScaleSiteAuthorizationDetail existing = repository.getScaleSiteAuthorization(scaleSiteAuthorizationId);
    requireFound(existing, "No scale site authorization found with id " + scaleSiteAuthorizationId);

    boolean letterExists = Boolean.TRUE.equals(existing.getLetterExists());
    if (letterExists) {
      ScaleSiteAuthorizationRecord letterLockedRecord = new ScaleSiteAuthorizationRecord(
          existing.getScaleSiteAuthorizationId(),
          existing.getScaleSiteIdNmbr(),
          existing.getLetterArcsFileNumber(),
          existing.getAuthorizationEffectiveDate(),
          existing.getAuthorizationExpiryDate(),
          existing.getExpiryNotificationInd(),
          existing.getExpectedScaleVolume(),
          request.getCancellationDate(),
          request.getCancellationReasonTxt(),
          existing.getEntryUserid().orElse(null));
      ScaleSiteAuthorizationDetail updated = repository.updateScaleSiteAuthorization(letterLockedRecord);
      if (updated == null) {
        throw new BadRequestException("Scale site authorization could not be updated.");
      }
      return repository.getScaleSiteAuthorization(scaleSiteAuthorizationId);
    }

    validateCreateRequest(request);

    ScaleSiteAuthorizationRecord record = toUpdateRecord(existing, request);
    ScaleSiteAuthorizationDetail updated = repository.updateScaleSiteAuthorization(record);
    if (updated == null) {
      throw new BadRequestException("Scale site authorization could not be updated.");
    }

    repository.deleteSiteAuthorizationConditions(scaleSiteAuthorizationId, existing.getConditions());
    repository.addConditions(scaleSiteAuthorizationId, request.getConditions());

    return repository.getScaleSiteAuthorization(scaleSiteAuthorizationId);
  }

  @Transactional
  public void deleteScaleSiteAuthorization(Long scaleSiteAuthorizationId) {
    ScaleSiteAuthorizationDetail existing = repository.getScaleSiteAuthorization(scaleSiteAuthorizationId);
    requireFound(existing, "No scale site authorization found with id " + scaleSiteAuthorizationId);
    if (Boolean.TRUE.equals(existing.getLetterExists())) {
      throw new BadRequestException("Scale site authorization has an existing letter and cannot be deleted.");
    }

    repository.deleteSiteAuthorizationConditions(scaleSiteAuthorizationId, existing.getConditions());
    repository.deleteScaleSiteAuthorization(scaleSiteAuthorizationId);
  }

  public ScaleSiteAuthorizationDetail getScaleSiteAuthorization(Long scaleSiteAuthorizationId) {
    ScaleSiteAuthorizationDetail detail = repository.getScaleSiteAuthorization(scaleSiteAuthorizationId);
    // Scale Site Owners may read site authorizations (matrix §3.E row "Scale Site Authorization" =
    // R (ltd)), so this read needs client scoping. It is addressed by authorization id rather than
    // scale site number, so ClientScopeInterceptor cannot cover it from the path — guard it here, via
    // the authorization's own site. A no-op for internal users.
    //
    // Exactly the shape ScalerAuthorizationService.getScalerAuthorization already uses for the scaler
    // side. It was missing here because no client-scoped role held SCALE_SITE_AUTHORIZATION_READ until
    // SCS_OWNER was enabled: the permission gate refused SCS_INDUSTRY_SCALER outright, so nothing ever
    // reached this method unscoped. Enabling the role turned that into a live cross-client read of
    // another company's authorization dates, conditions and cancellation reason.
    //
    // Before requireFound, not after: the interceptor answers 403 for an id that does not exist, and a
    // restricted caller must not be able to tell "another client's authorization" from "no such id" on
    // this endpoint either. assertRecordSiteInScope takes the null and refuses; internal users fall
    // through to the 404 below.
    clientScopeGuard.assertRecordSiteInScope(
        detail == null ? null : detail.getScaleSiteIdNmbr());
    requireFound(detail, "No scale site authorization found with id " + scaleSiteAuthorizationId);
    return detail;
  }

  public List<ScaleAuthCondition> searchActiveScaleSiteAuthConditions(
      String scaleConditionClassCode,
      Long scaleAuthConditionId,
      String scaleAuthConditionTitle,
      String scaleAuthConditionDesc,
      String ministryStandardInd,
      Integer sortOrderNo) {
    return repository.searchActiveScaleAuthConditions(
        scaleConditionClassCode,
        scaleAuthConditionId,
        scaleAuthConditionTitle,
        scaleAuthConditionDesc,
        ministryStandardInd,
        sortOrderNo);
  }

  public List<ScaleAuthCondition> getScaleAuthTemplateConditions(Long templateId) {
    return repository.getScaleAuthTemplateConditions(templateId);
  }

  private void validateCreateRequest(ScaleSiteAuthorizationSaveRequest request) {
    if (request == null) {
      throw new BadRequestException("Request body is required.");
    }
    if (isBlank(request.getScaleSiteIdNmbr())) {
      throw new BadRequestException("Scale Site # is required.");
    }

    LocalDate effectiveDate = requireNotNull(
        request.getAuthorizationEffectiveDate(),
        "Effective Date is required.");
    LocalDate expiryDate = requireNotNull(
        request.getAuthorizationExpiryDate(),
        "Expiry Date is required.");
    Long expectedScaleVolume = requireNotNull(
        request.getExpectedScaleVolume(),
        "Expected Annual Scale Volume is required.");

    if (expectedScaleVolume < 0) {
      throw new BadRequestException("Expected Annual Scale Volume must be 0 or greater.");
    }

    requireDateOrder(
        effectiveDate,
        expiryDate,
        "Effective Date must be on or before Expiry Date.");

    validateScaleSiteExists(request.getScaleSiteIdNmbr());
    validateMaxAuthorizationLength(effectiveDate, expiryDate);
  }

  private void validateScaleSiteExists(String scaleSiteIdNmbr) {
    if (scaleSiteRepository.getScaleSite(scaleSiteIdNmbr) == null) {
      throw new BadRequestException("Scale Site # does not exist.");
    }
  }

  private void validateMaxAuthorizationLength(LocalDate effectiveDate, LocalDate expiryDate) {
    Integer maxYears = systemSettingRepository
        .findSystemSettingValue(MAX_SITE_AUTHORIZATION_LENGTH_KEY)
        .map(String::trim)
        .filter(value -> !value.isEmpty())
        .map(value -> {
          try {
            return Integer.parseInt(value);
          } catch (NumberFormatException ex) {
            return null;
          }
        })
        .orElse(null);

    if (maxYears == null || maxYears <= 0) {
      return;
    }

    LocalDate maxExpiry = effectiveDate.plusYears(maxYears);
    if (maxExpiry.isBefore(expiryDate)) {
      throw new BadRequestException(
          "Scale Site Authorization cannot exceed " + maxYears + " years.");
    }
  }

  private ScaleSiteAuthorizationRecord toUpdateRecord(
      ScaleSiteAuthorizationDetail existing,
      ScaleSiteAuthorizationSaveRequest request) {
    return new ScaleSiteAuthorizationRecord(
        existing.getScaleSiteAuthorizationId(),
        request.getScaleSiteIdNmbr(),
        request.getLetterArcsFileNumber(),
        request.getAuthorizationEffectiveDate(),
        request.getAuthorizationExpiryDate(),
        isBlank(request.getExpiryNotificationInd()) ? "N" : request.getExpiryNotificationInd(),
        request.getExpectedScaleVolume(),
        request.getCancellationDate(),
        request.getCancellationReasonTxt(),
        existing.getEntryUserid().orElse(null));
  }
}
