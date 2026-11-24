package ca.bc.gov.nrs.scs.backend.service;

import ca.bc.gov.nrs.scs.backend.util.SCSUtils;
import ca.bc.gov.nrs.scs.backend.exception.BadRequestException;
import ca.bc.gov.nrs.scs.backend.model.ScaleSignatoryBlock;
import ca.bc.gov.nrs.scs.backend.model.ScaleSignatoryBlockCreateRequest;
import ca.bc.gov.nrs.scs.backend.model.ScaleSignatoryBlockUpdateRequest;
import ca.bc.gov.nrs.scs.backend.repository.ScaleSignatoryBlockRepository;
import org.springframework.stereotype.Service;

import java.util.List;

import static ca.bc.gov.nrs.scs.backend.util.SCSUtils.trimToNull;

@Service
public class ScaleSignatoryBlockService {

  private static final int MAX_NAME_LENGTH = 40;

  private final ScaleSignatoryBlockRepository repository;

  public ScaleSignatoryBlockService(ScaleSignatoryBlockRepository repository) {
    this.repository = repository;
  }

  public List<ScaleSignatoryBlock> searchSignatureBlocks(
      Long scaleSignatoryBlockId,
      Long orgUnitNo,
      Long rollupRegionNo,
      String lastName,
      String firstName,
      String middleName,
      String signatureTitle) {

    List<ScaleSignatoryBlock> results = repository.searchSignatureBlocks(
        scaleSignatoryBlockId,
        orgUnitNo,
        rollupRegionNo,
        trimToNull(lastName),
        trimToNull(firstName),
        trimToNull(middleName),
        trimToNull(signatureTitle));

    results.forEach(this::applyFullName);
    return results;
  }

  public ScaleSignatoryBlock getSignatureBlock(Long scaleSignatoryBlockId) {
    ScaleSignatoryBlock block = repository.getSignatureBlock(scaleSignatoryBlockId);
    SCSUtils.requireFound(block, "No signature block found with id " + scaleSignatoryBlockId);
    applyFullName(block);
    return block;
  }

  public ScaleSignatoryBlock createSignatureBlock(ScaleSignatoryBlockCreateRequest request) {
    if (request == null) {
      throw new BadRequestException("Request body is required.");
    }

    SignatoryNames names = validateSignatoryNames(
        request.getOrgUnitNo(),
        request.getFirstName(),
        request.getMiddleName(),
        request.getLastName(),
        request.getSignatureTitle());

    ScaleSignatoryBlock created = repository.createSignatureBlock(
        request.getOrgUnitNo(),
        names.firstName(),
        names.middleName(),
        names.lastName(),
        names.signatureTitle());

    if (created == null || created.getScaleSignatoryBlockId() == null) {
      throw new BadRequestException("Signature block could not be created.");
    }

    applyFullName(created);
    return created;
  }

  public ScaleSignatoryBlock updateSignatureBlock(
      Long scaleSignatoryBlockId,
      ScaleSignatoryBlockUpdateRequest request) {
    if (request == null) {
      throw new BadRequestException("Request body is required.");
    }

    SignatoryNames names = validateSignatoryNames(
        request.getOrgUnitNo(),
        request.getFirstName(),
        request.getMiddleName(),
        request.getLastName(),
        request.getSignatureTitle());

    ScaleSignatoryBlock existing = repository.getSignatureBlock(scaleSignatoryBlockId);
    SCSUtils.requireFound(existing, "No signature block found with id " + scaleSignatoryBlockId);

    ScaleSignatoryBlock updated = repository.updateSignatureBlock(
        scaleSignatoryBlockId,
        request.getOrgUnitNo(),
        names.firstName(),
        names.middleName(),
        names.lastName(),
        names.signatureTitle());

    if (updated == null) {
      throw new BadRequestException("Signature block could not be updated.");
    }

    applyFullName(updated);
    return updated;
  }

  public void deleteSignatureBlock(Long scaleSignatoryBlockId) {
    ScaleSignatoryBlock existing = repository.getSignatureBlock(scaleSignatoryBlockId);
    SCSUtils.requireFound(existing, "No signature block found with id " + scaleSignatoryBlockId);
    repository.deleteSignatureBlock(scaleSignatoryBlockId);
  }

  private void applyFullName(ScaleSignatoryBlock block) {
    if (block == null) {
      return;
    }
    block.setFullName(buildFullName(block.getLastName(), block.getFirstName(), block.getMiddleName()));
  }

  private String buildFullName(
          String lastName,
          String firstName,
          String middleName) {
    String last = trimToNull(lastName);
    String first = trimToNull(firstName);
    String middle = trimToNull(middleName);

    StringBuilder fullName = new StringBuilder();
    if (last != null) {
      fullName.append(last);
    }
    if (first != null) {
      if (fullName.length() > 0) {
        fullName.append(", ");
      }
      fullName.append(first);
    }
    if (middle != null) {
      if (fullName.length() > 0) {
        fullName.append(" ");
      }
      fullName.append(middle);
    }
    return trimToNull(fullName.toString());
  }

  /** The trimmed name fields of a signature block create / update request, once validated. */
  private record SignatoryNames(
      String firstName, String middleName, String lastName, String signatureTitle) {}

  /**
   * Shared create / update validation: the first name, last name and position are required, the
   * middle name optional, all four at most {@value #MAX_NAME_LENGTH} characters once trimmed, and
   * the Reg / Dist must be supplied.
   */
  private SignatoryNames validateSignatoryNames(
      Long orgUnitNo,
      String firstName,
      String middleName,
      String lastName,
      String signatureTitle) {
    String first = requireTrimmed(firstName, "First Name is required.");
    String last = requireTrimmed(lastName, "Last Name is required.");
    String title = requireTrimmed(signatureTitle, "Position is required.");
    String middle = trimToNull(middleName);

    requireOrgUnit(orgUnitNo);
    validateLength(first, MAX_NAME_LENGTH, "First Name must be 40 characters or fewer.");
    validateLength(middle, MAX_NAME_LENGTH, "Middle Name must be 40 characters or fewer.");
    validateLength(last, MAX_NAME_LENGTH, "Last Name must be 40 characters or fewer.");
    validateLength(title, MAX_NAME_LENGTH, "Position must be 40 characters or fewer.");
    return new SignatoryNames(first, middle, last, title);
  }

  private void requireOrgUnit(Long orgUnitNo) {
    if (orgUnitNo == null) {
      throw new BadRequestException("Reg / Dist is required.");
    }
  }

  private void validateLength(String value, int maxLength, String message) {
    if (value != null && value.length() > maxLength) {
      throw new BadRequestException(message);
    }
  }

  private String requireTrimmed(String value, String message) {
    String normalized = trimToNull(value);
    if (normalized == null) {
      throw new BadRequestException(message);
    }
    return normalized;
  }
}
