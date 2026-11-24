package ca.bc.gov.nrs.scs.backend.controller;

import ca.bc.gov.nrs.scs.backend.constants.Permissions;
import ca.bc.gov.nrs.scs.backend.security.annotations.RequiresPermission;

import ca.bc.gov.nrs.scs.backend.api.AuthorizationClauseApi;
import ca.bc.gov.nrs.scs.backend.model.ScaleMethodAuthClauseCreateRequest;
import ca.bc.gov.nrs.scs.backend.model.ScaleMethodAuthClause;
import ca.bc.gov.nrs.scs.backend.model.ScaleMethodAuthClauseUpdateRequest;
import ca.bc.gov.nrs.scs.backend.service.AuthorizationClauseService;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * REST Controller for Scale Method Authorization Clause operations.
 */
@RestController
public class AuthorizationClauseController implements AuthorizationClauseApi {

  private final AuthorizationClauseService authorizationClauseService;

  public AuthorizationClauseController(AuthorizationClauseService authorizationClauseService) {
    this.authorizationClauseService = authorizationClauseService;
  }

  @Override
  @RequiresPermission(Permissions.MAINTAIN_AUTHORIZATION_CLAUSES_QUERY)
  public ResponseEntity<List<ScaleMethodAuthClause>> searchAuthorizationClauses(
      @RequestParam(value = "scaleMethodTypeCode", required = false) String scaleMethodTypeCode) {
    return ResponseEntity.ok(
        authorizationClauseService.searchAuthorizationClauses(scaleMethodTypeCode));
  }

  @Override
  @RequiresPermission(Permissions.MAINTAIN_AUTHORIZATION_CLAUSES_CREATE)
  public ResponseEntity<ScaleMethodAuthClause> createAuthorizationClause(
      @RequestBody ScaleMethodAuthClauseCreateRequest request) {
    return ResponseEntity.status(HttpStatus.CREATED)
        .body(authorizationClauseService.createAuthorizationClause(request));
  }

  @Override
  @RequiresPermission(Permissions.MAINTAIN_AUTHORIZATION_CLAUSES_READ)
  public ResponseEntity<ScaleMethodAuthClause> getAuthorizationClause(
      String scaleMethodTypeCode,
      Long scaleMethodAuthClauseId) {
    return ResponseEntity.ok(
        authorizationClauseService.getAuthorizationClause(scaleMethodTypeCode, scaleMethodAuthClauseId));
  }

  @Override
  @RequiresPermission(Permissions.MAINTAIN_AUTHORIZATION_CLAUSES_UPDATE)
  public ResponseEntity<ScaleMethodAuthClause> updateAuthorizationClause(
      String scaleMethodTypeCode,
      Long scaleMethodAuthClauseId,
      @RequestBody ScaleMethodAuthClauseUpdateRequest request) {
    return ResponseEntity.ok(
        authorizationClauseService.updateAuthorizationClause(
            scaleMethodTypeCode, scaleMethodAuthClauseId, request));
  }

  @Override
  @RequiresPermission(Permissions.MAINTAIN_AUTHORIZATION_CLAUSES_DELETE)
  public ResponseEntity<Void> deleteAuthorizationClause(
      String scaleMethodTypeCode,
      Long scaleMethodAuthClauseId) {
    authorizationClauseService.deleteAuthorizationClause(scaleMethodTypeCode, scaleMethodAuthClauseId);
    return ResponseEntity.noContent().build();
  }
}
