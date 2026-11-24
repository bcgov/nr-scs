package ca.bc.gov.nrs.scs.backend.controller;

import ca.bc.gov.nrs.scs.backend.constants.Permissions;
import ca.bc.gov.nrs.scs.backend.security.annotations.RequiresPermission;

import ca.bc.gov.nrs.scs.backend.api.SignatureBlockApi;
import ca.bc.gov.nrs.scs.backend.model.ScaleSignatoryBlock;
import ca.bc.gov.nrs.scs.backend.model.ScaleSignatoryBlockCreateRequest;
import ca.bc.gov.nrs.scs.backend.model.ScaleSignatoryBlockUpdateRequest;
import ca.bc.gov.nrs.scs.backend.service.ScaleSignatoryBlockService;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class SignatureBlockController implements SignatureBlockApi {

  private final ScaleSignatoryBlockService service;

  public SignatureBlockController(ScaleSignatoryBlockService service) {
    this.service = service;
  }

  @Override
  @RequiresPermission(Permissions.MAINTAIN_SIGNATORIES_QUERY)
  public ResponseEntity<List<ScaleSignatoryBlock>> searchSignatureBlocks(
      @RequestParam(value = "scaleSignatoryBlockId", required = false) Long scaleSignatoryBlockId,
      @RequestParam(value = "orgUnitNo", required = false) Long orgUnitNo,
      @RequestParam(value = "rollupRegionNo", required = false) Long rollupRegionNo,
      @RequestParam(value = "lastName", required = false) String lastName,
      @RequestParam(value = "firstName", required = false) String firstName,
      @RequestParam(value = "middleName", required = false) String middleName,
      @RequestParam(value = "signatureTitle", required = false) String signatureTitle) {
    return ResponseEntity.ok(service.searchSignatureBlocks(
        scaleSignatoryBlockId,
        orgUnitNo,
        rollupRegionNo,
        lastName,
        firstName,
        middleName,
        signatureTitle));
  }

  /**
   * The letter pages' signatory picker. Same package call as {@link #searchSignatureBlocks}, but
   * narrowed to the district/region criteria the picker uses and gated on
   * {@link Permissions#LETTER_SIGNATORY_QUERY}, so a letter author who holds no Maintain Signatories
   * permission (the Check Scaler) can still choose who signs.
   */
  @Override
  @RequiresPermission(Permissions.LETTER_SIGNATORY_QUERY)
  public ResponseEntity<List<ScaleSignatoryBlock>> searchLetterSignatureBlocks(
      @RequestParam(value = "orgUnitNo", required = false) Long orgUnitNo,
      @RequestParam(value = "rollupRegionNo", required = false) Long rollupRegionNo) {
    return ResponseEntity.ok(service.searchSignatureBlocks(
        null, orgUnitNo, rollupRegionNo, null, null, null, null));
  }

  @Override
  @RequiresPermission(Permissions.MAINTAIN_SIGNATORIES_READ)
  public ResponseEntity<ScaleSignatoryBlock> getSignatureBlock(
      Long scaleSignatoryBlockId) {
    return ResponseEntity.ok(service.getSignatureBlock(scaleSignatoryBlockId));
  }

  @Override
  @RequiresPermission(Permissions.MAINTAIN_SIGNATORIES_CREATE)
  public ResponseEntity<ScaleSignatoryBlock> createSignatureBlock(
      @RequestBody ScaleSignatoryBlockCreateRequest request) {
    return ResponseEntity.status(HttpStatus.CREATED)
        .body(service.createSignatureBlock(request));
  }

  @Override
  @RequiresPermission(Permissions.MAINTAIN_SIGNATORIES_UPDATE)
  public ResponseEntity<ScaleSignatoryBlock> updateSignatureBlock(
      Long scaleSignatoryBlockId,
      @RequestBody ScaleSignatoryBlockUpdateRequest request) {
    return ResponseEntity.ok(service.updateSignatureBlock(scaleSignatoryBlockId, request));
  }

  @Override
  @RequiresPermission(Permissions.MAINTAIN_SIGNATORIES_DELETE)
  public ResponseEntity<Void> deleteSignatureBlock(
      Long scaleSignatoryBlockId) {
    service.deleteSignatureBlock(scaleSignatoryBlockId);
    return ResponseEntity.noContent().build();
  }
}
