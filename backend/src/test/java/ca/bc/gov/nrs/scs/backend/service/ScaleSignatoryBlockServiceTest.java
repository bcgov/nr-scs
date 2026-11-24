package ca.bc.gov.nrs.scs.backend.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.util.List;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import ca.bc.gov.nrs.scs.backend.exception.BadRequestException;
import ca.bc.gov.nrs.scs.backend.exception.ResourceNotFoundException;
import ca.bc.gov.nrs.scs.backend.model.ScaleSignatoryBlock;
import ca.bc.gov.nrs.scs.backend.model.ScaleSignatoryBlockCreateRequest;
import ca.bc.gov.nrs.scs.backend.model.ScaleSignatoryBlockUpdateRequest;
import ca.bc.gov.nrs.scs.backend.repository.ScaleSignatoryBlockRepository;

@ExtendWith(MockitoExtension.class)
@DisplayName("ScaleSignatoryBlockService tests")
class ScaleSignatoryBlockServiceTest {

  @Mock
  private ScaleSignatoryBlockRepository repository;

  @InjectMocks
  private ScaleSignatoryBlockService service;

  private ScaleSignatoryBlockCreateRequest validCreateRequest() {
    return new ScaleSignatoryBlockCreateRequest()
        .orgUnitNo(12L)
        .firstName("Jane")
        .middleName("Q")
        .lastName("Doe")
        .signatureTitle("Manager");
  }

  private ScaleSignatoryBlockUpdateRequest validUpdateRequest() {
    return new ScaleSignatoryBlockUpdateRequest()
        .orgUnitNo(12L)
        .firstName("Jane")
        .middleName("Q")
        .lastName("Doe")
        .signatureTitle("Manager");
  }

  private ScaleSignatoryBlock block(Long id) {
    return new ScaleSignatoryBlock()
        .scaleSignatoryBlockId(id)
        .orgUnitNo(12L)
        .firstName("Jane")
        .middleName("Q")
        .lastName("Doe")
        .signatureTitle("Manager");
  }

  @Nested
  @DisplayName("searchSignatureBlocks")
  class SearchSignatureBlocks {

    @Test
    @DisplayName("sets full name on results")
    void setsFullNameOnResults() {
      when(repository.searchSignatureBlocks(null, null, null, null, null, null, null))
          .thenReturn(List.of(block(7L)));

      List<ScaleSignatoryBlock> results = service.searchSignatureBlocks(
          null, null, null, null, null, null, null);

      assertEquals(1, results.size());
        assertEquals("Doe, Jane Q", results.get(0).getFullName());
    }
  }

  @Nested
  @DisplayName("getSignatureBlock")
  class GetSignatureBlock {

    @Test
    @DisplayName("throws not found when the block is missing")
    void throwsWhenMissing() {
      when(repository.getSignatureBlock(7L)).thenReturn(null);

      ResourceNotFoundException ex = assertThrows(
          ResourceNotFoundException.class,
          () -> service.getSignatureBlock(7L));

      assertEquals("No signature block found with id 7", ex.getMessage());
    }
  }

  @Nested
  @DisplayName("createSignatureBlock")
  class CreateSignatureBlock {

    @Test
    @DisplayName("creates and returns the signature block")
    void createsSignatureBlock() {
      ScaleSignatoryBlockCreateRequest request = validCreateRequest();
      ScaleSignatoryBlock created = block(22L);
      when(repository.createSignatureBlock(12L, "Jane", "Q", "Doe", "Manager"))
          .thenReturn(created);

      ScaleSignatoryBlock result = service.createSignatureBlock(request);

      assertNotNull(result);
      assertEquals(22L, result.getScaleSignatoryBlockId());
      assertEquals("Doe, Jane Q", result.getFullName());
      verify(repository).createSignatureBlock(12L, "Jane", "Q", "Doe", "Manager");
    }

    @Test
    @DisplayName("rejects missing first name")
    void rejectsMissingFirstName() {
      ScaleSignatoryBlockCreateRequest request = new ScaleSignatoryBlockCreateRequest()
          .orgUnitNo(12L)
          .lastName("Doe")
          .signatureTitle("Manager");

      BadRequestException ex = assertThrows(
          BadRequestException.class,
          () -> service.createSignatureBlock(request));

      assertEquals("First Name is required.", ex.getMessage());
      verify(repository, never()).createSignatureBlock(12L, null, null, "Doe", "Manager");
    }

    @Test
    @DisplayName("rejects missing last name")
    void createSignatureBlock_rejectsMissingLastName() {
      ScaleSignatoryBlockCreateRequest request = new ScaleSignatoryBlockCreateRequest()
          .orgUnitNo(12L)
          .firstName("Jane")
          .signatureTitle("Manager");

      BadRequestException ex = assertThrows(
          BadRequestException.class,
          () -> service.createSignatureBlock(request));

      assertEquals("Last Name is required.", ex.getMessage());
      verifyNoInteractions(repository);
    }

    @Test
    @DisplayName("rejects missing signature title")
    void createSignatureBlock_rejectsMissingSignatureTitle() {
      ScaleSignatoryBlockCreateRequest request = new ScaleSignatoryBlockCreateRequest()
          .orgUnitNo(12L)
          .firstName("Jane")
          .lastName("Doe");

      BadRequestException ex = assertThrows(
          BadRequestException.class,
          () -> service.createSignatureBlock(request));

      assertEquals("Position is required.", ex.getMessage());
      verifyNoInteractions(repository);
    }

    @Test
    @DisplayName("rejects missing org unit")
    void createSignatureBlock_rejectsMissingOrgUnit() {
      ScaleSignatoryBlockCreateRequest request = new ScaleSignatoryBlockCreateRequest()
          .firstName("Jane")
          .middleName("Q")
          .lastName("Doe")
          .signatureTitle("Manager");

      BadRequestException ex = assertThrows(
          BadRequestException.class,
          () -> service.createSignatureBlock(request));

      assertEquals("Reg / Dist is required.", ex.getMessage());
      verifyNoInteractions(repository);
    }

    @Test
    @DisplayName("rejects any name field longer than 40 characters")
    void createSignatureBlock_rejectsNameOver40Chars() {
      String tooLong = "x".repeat(41);

      assertNameTooLong(
          new ScaleSignatoryBlockCreateRequest()
              .orgUnitNo(12L).firstName(tooLong).lastName("Doe").signatureTitle("Manager"),
          "First Name must be 40 characters or fewer.");
      assertNameTooLong(
          new ScaleSignatoryBlockCreateRequest()
              .orgUnitNo(12L).firstName("Jane").middleName(tooLong).lastName("Doe").signatureTitle("Manager"),
          "Middle Name must be 40 characters or fewer.");
      assertNameTooLong(
          new ScaleSignatoryBlockCreateRequest()
              .orgUnitNo(12L).firstName("Jane").lastName(tooLong).signatureTitle("Manager"),
          "Last Name must be 40 characters or fewer.");
      assertNameTooLong(
          new ScaleSignatoryBlockCreateRequest()
              .orgUnitNo(12L).firstName("Jane").lastName("Doe").signatureTitle(tooLong),
          "Position must be 40 characters or fewer.");
    }

    private void assertNameTooLong(ScaleSignatoryBlockCreateRequest request, String expectedMessage) {
      BadRequestException ex = assertThrows(
          BadRequestException.class, () -> service.createSignatureBlock(request));
      assertEquals(expectedMessage, ex.getMessage());
      verifyNoInteractions(repository);
    }
  }

  @Nested
  @DisplayName("updateSignatureBlock")
  class UpdateSignatureBlock {

    @Test
    @DisplayName("throws not found when the block does not exist")
    void throwsWhenMissing() {
      when(repository.getSignatureBlock(22L)).thenReturn(null);

      ResourceNotFoundException ex = assertThrows(
          ResourceNotFoundException.class,
          () -> service.updateSignatureBlock(22L, validUpdateRequest()));

      assertEquals("No signature block found with id 22", ex.getMessage());
      verify(repository, never()).updateSignatureBlock(22L, 12L, "Jane", "Q", "Doe", "Manager");
    }

    @Test
    @DisplayName("updates the block and sets the composed full name")
    void updateSignatureBlock_updatesAndSetsFullName() {
      when(repository.getSignatureBlock(22L)).thenReturn(block(22L));
      when(repository.updateSignatureBlock(22L, 12L, "Jane", "Q", "Doe", "Manager"))
          .thenReturn(block(22L));

      ScaleSignatoryBlock result = service.updateSignatureBlock(22L, validUpdateRequest());

      assertNotNull(result);
      assertEquals(22L, result.getScaleSignatoryBlockId());
      assertEquals("Doe, Jane Q", result.getFullName());
      verify(repository).updateSignatureBlock(22L, 12L, "Jane", "Q", "Doe", "Manager");
    }

    @Test
    @DisplayName("rejects a name field longer than 40 characters")
    void updateSignatureBlock_rejectsNameOver40Chars() {
      ScaleSignatoryBlockUpdateRequest request = validUpdateRequest().firstName("x".repeat(41));

      BadRequestException ex = assertThrows(
          BadRequestException.class,
          () -> service.updateSignatureBlock(22L, request));

      assertEquals("First Name must be 40 characters or fewer.", ex.getMessage());
      verifyNoInteractions(repository);
    }
  }

  @Nested
  @DisplayName("deleteSignatureBlock")
  class DeleteSignatureBlock {

    @Test
    @DisplayName("throws not found when deleting a missing block")
    void throwsWhenMissing() {
      when(repository.getSignatureBlock(22L)).thenReturn(null);

      ResourceNotFoundException ex = assertThrows(
          ResourceNotFoundException.class,
          () -> service.deleteSignatureBlock(22L));

      assertEquals("No signature block found with id 22", ex.getMessage());
      verify(repository, never()).deleteSignatureBlock(22L);
    }
  }
}
