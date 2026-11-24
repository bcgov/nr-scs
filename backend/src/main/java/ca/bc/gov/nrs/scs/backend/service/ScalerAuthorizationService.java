package ca.bc.gov.nrs.scs.backend.service;

import ca.bc.gov.nrs.scs.backend.exception.BadRequestException;
import ca.bc.gov.nrs.scs.backend.exception.ResourceNotFoundException;
import ca.bc.gov.nrs.scs.backend.model.ScaleAuthCondition;
import ca.bc.gov.nrs.scs.backend.model.ScalerAuthorizationCreate;
import ca.bc.gov.nrs.scs.backend.model.ScalerAuthorizationDetail;
import ca.bc.gov.nrs.scs.backend.model.ScalerAuthorizationListItem;
import ca.bc.gov.nrs.scs.backend.model.ScalerAuthorizationSaveRequest;
import ca.bc.gov.nrs.scs.backend.domain.authorization.ScalerAuthorizationRecord;
import ca.bc.gov.nrs.scs.backend.repository.ScalerAuthorizationRepository;
import ca.bc.gov.nrs.scs.backend.repository.ScalerRepository;
import ca.bc.gov.nrs.scs.backend.security.ClientScopeGuard;
import ca.bc.gov.nrs.scs.backend.service.mapper.ScalerAuthorizationApiMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

import static ca.bc.gov.nrs.scs.backend.util.SCSUtils.isBlank;
import static ca.bc.gov.nrs.scs.backend.util.SCSUtils.isYesNo;
import static ca.bc.gov.nrs.scs.backend.util.SCSUtils.requireDateOrder;
import static ca.bc.gov.nrs.scs.backend.util.SCSUtils.requireFound;
import static ca.bc.gov.nrs.scs.backend.util.SCSUtils.requireText;
import static ca.bc.gov.nrs.scs.backend.util.SCSUtils.requireNotNull;

@Service
public class ScalerAuthorizationService {

  private final ScalerAuthorizationRepository repository;
  private final ScalerRepository scalerRepository;
  private final ClientScopeGuard clientScopeGuard;

  public ScalerAuthorizationService(
      ScalerAuthorizationRepository scalerAuthorizationRepository,
      ScalerRepository scalerRepository,
      ClientScopeGuard clientScopeGuard) {
    this.repository = scalerAuthorizationRepository;
    this.scalerRepository = scalerRepository;
    this.clientScopeGuard = clientScopeGuard;
  }

  /**
   * Lists every authorization for a scaler, backing the Authorizations tab on the scaler
   * view page. Mirrors the legacy {@code ScalerAuthorizationAction.list()}.
   */
  public List<ScalerAuthorizationListItem> listScalerAuthorizations(String scalerLicenceNo) {
    requireText(scalerLicenceNo, "Scaler licence number is required.");
    requireFound(
        scalerRepository.getScalerSummaryCore(scalerLicenceNo),
        "No scaler found with licence number " + scalerLicenceNo);
    return ScalerAuthorizationApiMapper.toListItems(
        repository.listScalerAuthorizationsByLicence(scalerLicenceNo));
  }

  public void removeScalerAuthorizationFromWorkbench(Long authorizationId) {
    boolean updated = repository.setExpiryNotificationInd(authorizationId, "Y");
    if (!updated) {
      throw new ResourceNotFoundException("No scaler authorization found with id " + authorizationId);
    }
  }

  @Transactional
  public ScalerAuthorizationDetail createScalerAuthorization(ScalerAuthorizationSaveRequest request) {
    validateCreateRequest(request);

    if (request.getExpiryNotificationInd() == null || request.getExpiryNotificationInd().isBlank()) {
      request.setExpiryNotificationInd("N");
    }

    ScalerAuthorizationCreate base = toCreateRequest(request);
    ScalerAuthorizationDetail created = repository.createScalerAuthorization(base);
    if (created == null || created.getScalerAuthorizationId() == null) {
      throw new BadRequestException("Scaler authorization could not be created.");
    }

    Long authorizationId = created.getScalerAuthorizationId();
    repository.addConditions(authorizationId, request.getConditions());
    repository.addJobFunctions(authorizationId, request.getJobFunctions());
    repository.addAuthorizedForestProducts(authorizationId, request.getAuthForestProducts());
    if (!"Y".equalsIgnoreCase(request.getDistrictWideInd())) {
      repository.addScaleSites(authorizationId, request.getScaleSites());
    }

    return repository.getScalerAuthorization(authorizationId);
  }

  @Transactional
  public ScalerAuthorizationDetail updateScalerAuthorization(Long scalerAuthorizationId, ScalerAuthorizationSaveRequest request) {
    if (request == null) {
      throw new BadRequestException("Request body is required.");
    }

    ScalerAuthorizationDetail existing = repository.getScalerAuthorization(scalerAuthorizationId);
    requireFound(existing, "No scaler authorization found with id " + scalerAuthorizationId);

    boolean letterExists = Boolean.TRUE.equals(existing.getLetterExists());
    if (letterExists) {
      ScalerAuthorizationRecord letterLockedRecord = new ScalerAuthorizationRecord(
          existing.getScalerAuthorizationId(),
          existing.getScalerLicenceNo(),
          existing.getOrgUnitNo(),
          existing.getDistrictWideInd(),
          existing.getLetterArcsFileNumber(),
          existing.getAuthorizationEffectiveDate(),
          request.getAuthorizationExpiryDate(),
          existing.getExpiryNotificationInd(),
          request.getCancellationDate(),
          request.getCancellationReasonTxt(),
          existing.getEntryUserid().orElse(null));
      ScalerAuthorizationDetail updated = repository.updateScalerAuthorization(letterLockedRecord);
      if (updated == null) {
        throw new BadRequestException("Scaler authorization could not be updated.");
      }
      return repository.getScalerAuthorization(scalerAuthorizationId);
    }

    validateUpdateRequest(request);

    ScalerAuthorizationRecord record = toUpdateRecord(existing, request);
    ScalerAuthorizationDetail updated = repository.updateScalerAuthorization(record);
    if (updated == null) {
      throw new BadRequestException("Scaler authorization could not be updated.");
    }

    repository.deleteScalerAuthorizationAssociations(scalerAuthorizationId);
    repository.addConditions(scalerAuthorizationId, request.getConditions());
    repository.addJobFunctions(scalerAuthorizationId, request.getJobFunctions());
    repository.addAuthorizedForestProducts(scalerAuthorizationId, request.getAuthForestProducts());
    if (!"Y".equalsIgnoreCase(request.getDistrictWideInd())) {
      repository.addScaleSites(scalerAuthorizationId, request.getScaleSites());
    }

    return repository.getScalerAuthorization(scalerAuthorizationId);
  }

  @Transactional
  public void deleteScalerAuthorization(Long scalerAuthorizationId) {
    ScalerAuthorizationDetail existing = repository.getScalerAuthorization(scalerAuthorizationId);
    requireFound(existing, "No scaler authorization found with id " + scalerAuthorizationId);
    if (Boolean.TRUE.equals(existing.getLetterExists())) {
      throw new BadRequestException("Scaler authorization has an existing letter and cannot be deleted.");
    }

    repository.deleteScalerAuthorizationAssociations(scalerAuthorizationId);
    repository.deleteScalerAuthorization(scalerAuthorizationId);
  }

  public ScalerAuthorizationDetail getScalerAuthorization(Long scalerAuthorizationId) {
    ScalerAuthorizationDetail detail = repository.getScalerAuthorization(scalerAuthorizationId);
    // Industry Scalers may read authorizations (matrix row "Scaler Authorization" = R (ltd)), so this
    // read needs client scoping. It is addressed by authorization id rather than scaler licence
    // number, so ClientScopeInterceptor cannot cover it from the path — guard it here, via the
    // authorization's own scaler. A no-op for internal users.
    //
    // Before requireFound, so a restricted caller cannot tell "another client's authorization" from
    // "no such id" — the 403-before-404 rule ClientScopeInterceptor applies to path-addressed reads.
    clientScopeGuard.assertRecordScalerInScope(
        detail == null ? null : detail.getScalerLicenceNo());
    requireFound(detail, "No scaler authorization found with id " + scalerAuthorizationId);
    return detail;
  }

  public List<ScaleAuthCondition> searchActiveScaleAuthConditions(
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

  private void validateCreateRequest(ScalerAuthorizationSaveRequest request) {
    if (request == null) {
      throw new BadRequestException("Request body is required.");
    }
    if (isBlank(request.getScalerLicenceNo())) {
      throw new BadRequestException("Authorized Scaler Licence # is required.");
    }
    requireNotNull(request.getOrgUnitNo(), "Reg / Dist is required.");
    if (!isYesNo(request.getDistrictWideInd())) {
      throw new BadRequestException("District Wide must be Y or N.");
    }

    requireDateOrder(
        request.getAuthorizationEffectiveDate(),
        request.getAuthorizationExpiryDate(),
        "Effective Date must be on or before Expiry Date.");

    if (request.getJobFunctions().stream().anyMatch("S"::equalsIgnoreCase)
        && (request.getAuthForestProducts() == null || request.getAuthForestProducts().isEmpty())) {
      throw new BadRequestException("At least one Special Forest Product is required.");
    }

    if ("N".equalsIgnoreCase(request.getDistrictWideInd()) && (request.getScaleSites() == null || request.getScaleSites().isEmpty())) {
        throw new BadRequestException("At least one Scale Site is required when District Wide is No.");
    }
  }

  private void validateUpdateRequest(ScalerAuthorizationSaveRequest request) {
    validateCreateRequest(request);
  }

  private ScalerAuthorizationCreate toCreateRequest(ScalerAuthorizationSaveRequest request) {
    ScalerAuthorizationCreate base = new ScalerAuthorizationCreate();
    base.setScalerLicenceNo(request.getScalerLicenceNo());
    base.setOrgUnitNo(request.getOrgUnitNo());
    base.setDistrictWideInd(request.getDistrictWideInd());
    base.setAuthorizationEffectiveDate(request.getAuthorizationEffectiveDate());
    base.setAuthorizationExpiryDate(request.getAuthorizationExpiryDate());
    base.setLetterArcsFileNumber(request.getLetterArcsFileNumber());
    base.setExpiryNotificationInd(request.getExpiryNotificationInd());
    base.setCancellationDate(request.getCancellationDate());
    base.setCancellationReasonTxt(request.getCancellationReasonTxt());
    return base;
  }

  private ScalerAuthorizationRecord toUpdateRecord(
      ScalerAuthorizationDetail existing,
      ScalerAuthorizationSaveRequest request) {
    return new ScalerAuthorizationRecord(
        existing.getScalerAuthorizationId(),
        request.getScalerLicenceNo(),
        request.getOrgUnitNo(),
        request.getDistrictWideInd(),
        request.getLetterArcsFileNumber(),
        request.getAuthorizationEffectiveDate(),
        request.getAuthorizationExpiryDate(),
        isBlank(request.getExpiryNotificationInd()) ? "N" : request.getExpiryNotificationInd(),
        request.getCancellationDate(),
        request.getCancellationReasonTxt(),
        existing.getEntryUserid().orElse(null));
  }
}
