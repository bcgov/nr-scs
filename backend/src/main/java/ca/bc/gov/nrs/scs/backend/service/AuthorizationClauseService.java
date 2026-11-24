package ca.bc.gov.nrs.scs.backend.service;

import ca.bc.gov.nrs.scs.backend.exception.BadRequestException;
import ca.bc.gov.nrs.scs.backend.exception.ResourceNotFoundException;
import ca.bc.gov.nrs.scs.backend.domain.authorizationclause.AuthorizationClause;
import ca.bc.gov.nrs.scs.backend.dto.ScaleMethodAuthClauseRow;
import ca.bc.gov.nrs.scs.backend.model.ScaleMethodAuthClauseCreateRequest;
import ca.bc.gov.nrs.scs.backend.model.ScaleMethodAuthClause;
import ca.bc.gov.nrs.scs.backend.model.ScaleMethodAuthClauseUpdateRequest;
import ca.bc.gov.nrs.scs.backend.repository.AuthorizationClauseRepository;
import ca.bc.gov.nrs.scs.backend.util.SCSUtils;
import ca.bc.gov.nrs.scs.backend.service.mapper.AuthorizationClauseMapper;
import java.time.LocalDate;
import java.util.List;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;

/**
 * Service for managing Scale Method Authorization Clauses.
 */
@Service
public class AuthorizationClauseService {

  private final AuthorizationClauseRepository repository;

  public AuthorizationClauseService(AuthorizationClauseRepository repository) {
    this.repository = repository;
  }

  /**
   * Search for authorization clauses.
   *
   * @param scaleMethodTypeCode Optional filter by scale method type code
   * @return List of matching authorization clauses
   */
  public List<ScaleMethodAuthClause> searchAuthorizationClauses(String scaleMethodTypeCode) {
    List<ScaleMethodAuthClauseRow> rows = repository.searchAuthorizationClauses(scaleMethodTypeCode);
    return rows.stream()
        .map(AuthorizationClauseMapper::toDomain)
        .map(AuthorizationClauseMapper::toModel)
        .toList();
  }

  /**
   * Get a specific authorization clause by ID.
   *
   * @param scaleMethodTypeCode The scale method type code
   * @param scaleMethodAuthClauseId The authorization clause ID
   * @return The authorization clause detail
   * @throws ResourceNotFoundException if not found
   */
  public ScaleMethodAuthClause getAuthorizationClause(
      String scaleMethodTypeCode, Long scaleMethodAuthClauseId) {
    ScaleMethodAuthClauseRow row =
        repository.getAuthorizationClause(scaleMethodTypeCode, scaleMethodAuthClauseId);
    if (row == null) {
      throw new ResourceNotFoundException(
          "No authorization clause found with id " + scaleMethodAuthClauseId);
    }
    return AuthorizationClauseMapper.toModel(AuthorizationClauseMapper.toDomain(row));
  }

  /**
   * Create a new authorization clause.
   *
   * @param request The create request
   * @return The created authorization clause
   * @throws BadRequestException if validation fails
   */
  public ScaleMethodAuthClause createAuthorizationClause(
      ScaleMethodAuthClauseCreateRequest request) {
    validateRequestCommon(
      request.getScaleMethodTypeCode(),
      request.getScalerAuthorizationClause(),
      request.getEffectiveDate(),
      request.getExpiryDate());

    ScaleMethodAuthClauseRow createdRow = repository.createAuthorizationClause(request);
    if (createdRow == null || createdRow.getScaleMethodAuthClauseId() == null) {
      throw new BadRequestException("Authorization clause could not be created.");
    }
    AuthorizationClause domain = AuthorizationClauseMapper.toDomain(createdRow);
    return AuthorizationClauseMapper.toModel(domain);
  }

  /**
   * Update an existing authorization clause.
   *
   * @param scaleMethodTypeCode The scale method type code
   * @param scaleMethodAuthClauseId The authorization clause ID
   * @param request The update request
   * @return The updated authorization clause
   * @throws BadRequestException if validation fails
   * @throws ResourceNotFoundException if not found
   */
  public ScaleMethodAuthClause updateAuthorizationClause(
      String scaleMethodTypeCode,
      Long scaleMethodAuthClauseId,
      ScaleMethodAuthClauseUpdateRequest request) {
    validateRequestCommon(
      request.getScaleMethodTypeCode(),
      request.getScalerAuthorizationClause(),
      request.getEffectiveDate(),
      request.getExpiryDate());

    ScaleMethodAuthClauseRow existing =
      repository.getAuthorizationClause(scaleMethodTypeCode, scaleMethodAuthClauseId);
    if (existing == null) {
      throw new ResourceNotFoundException(
          "No authorization clause found with id " + scaleMethodAuthClauseId);
    }

    ScaleMethodAuthClauseRow updatedRow =
      repository.updateAuthorizationClause(scaleMethodTypeCode, scaleMethodAuthClauseId, request);
    if (updatedRow == null) {
      throw new BadRequestException("Authorization clause could not be updated.");
    }
    AuthorizationClause domain = AuthorizationClauseMapper.toDomain(updatedRow);
    return AuthorizationClauseMapper.toModel(domain);
  }

  /**
   * Delete an authorization clause.
   *
   * @param scaleMethodTypeCode The scale method type code
   * @param scaleMethodAuthClauseId The authorization clause ID
   * @throws BadRequestException if it has dependent records
   * @throws ResourceNotFoundException if not found
   */
  public void deleteAuthorizationClause(String scaleMethodTypeCode, Long scaleMethodAuthClauseId) {
    ScaleMethodAuthClauseRow existing =
      repository.getAuthorizationClause(scaleMethodTypeCode, scaleMethodAuthClauseId);
    if (existing == null) {
      throw new ResourceNotFoundException(
          "No authorization clause found with id " + scaleMethodAuthClauseId);
    }

    try {
      repository.deleteAuthorizationClause(scaleMethodTypeCode, scaleMethodAuthClauseId);
    } catch (DataIntegrityViolationException ex) {
      throw new BadRequestException(
          "Authorization clause has dependent records and cannot be deleted.");
    }
  }

  /**
   * Common validation logic.
   */
  private void validateRequestCommon(
      String scaleMethodTypeCode,
      String scalerAuthorizationClause,
      LocalDate effectiveDate,
      LocalDate expiryDate) {
    SCSUtils.requireText(scaleMethodTypeCode, "Scale method type is required.");
    SCSUtils.requireText(scalerAuthorizationClause, "Clause text is required.");
    // The SCALER_AUTHORIZATION_CLAUSE column is VARCHAR2(200); reject over-length input with a clean
    // domain message instead of letting it reach the DB and surface as a raw error. (The generated
    // request model also carries @Size(max=200) from the OpenAPI maxLength, which enforces the same
    // limit at request binding; this guard is the service-boundary backstop with the domain message.)
    if (scalerAuthorizationClause != null && scalerAuthorizationClause.length() > 200) {
      throw new BadRequestException("Clause can not be greater than 200 characters.");
    }
    if (effectiveDate == null) {
      throw new BadRequestException("Effective date is required.");
    }
    SCSUtils.requireDateOrder(
        effectiveDate, expiryDate, "Expiry date must be on or after Effective date.");
  }
}
