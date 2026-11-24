package ca.bc.gov.nrs.scs.backend.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import ca.bc.gov.nrs.scs.backend.exception.BadRequestException;
import ca.bc.gov.nrs.scs.backend.exception.ResourceNotFoundException;
import ca.bc.gov.nrs.scs.backend.dto.ScaleMethodAuthClauseRow;
import ca.bc.gov.nrs.scs.backend.model.ScaleMethodAuthClauseCreateRequest;
import ca.bc.gov.nrs.scs.backend.model.ScaleMethodAuthClause;
import ca.bc.gov.nrs.scs.backend.model.ScaleMethodAuthClauseUpdateRequest;
import ca.bc.gov.nrs.scs.backend.repository.AuthorizationClauseRepository;
import java.time.LocalDate;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DataIntegrityViolationException;

@ExtendWith(MockitoExtension.class)
@DisplayName("AuthorizationClauseService Tests")
class AuthorizationClauseServiceTest {

  @Mock
  private AuthorizationClauseRepository repository;

  @InjectMocks
  private AuthorizationClauseService service;

  private static final String SCALE_METHOD_TYPE = "SM001";
  private static final Long CLAUSE_ID = 1L;
  private static final String CLAUSE_TEXT = "Test authorization clause text";

  private ScaleMethodAuthClauseRow createTestRow() {
    ScaleMethodAuthClauseRow row = new ScaleMethodAuthClauseRow();
    row.setScaleMethodAuthClauseId(CLAUSE_ID);
    row.setScaleMethodTypeCode(SCALE_METHOD_TYPE);
    row.setScalerAuthorizationClause(CLAUSE_TEXT);
    row.setEffectiveDate(LocalDate.of(2024, 1, 1));
    row.setExpiryDate(LocalDate.of(2025, 1, 1));
    return row;
  }

  @Nested
  @DisplayName("searchAuthorizationClauses Tests")
  class SearchTests {

    @Test
    @DisplayName("Should return list of clauses")
    void searchAuthorizationClauses_returns_list() {
      // Arrange
      List<ScaleMethodAuthClauseRow> expected = List.of(createTestRow());
      when(repository.searchAuthorizationClauses(null)).thenReturn(expected);

      // Act
      List<ScaleMethodAuthClause> result = service.searchAuthorizationClauses(null);

      // Assert
      assertEquals(1, result.size());
      assertEquals(CLAUSE_ID, result.get(0).getScaleMethodAuthClauseId());
      verify(repository, times(1)).searchAuthorizationClauses(null);
    }

    @Test
    @DisplayName("Should return filtered clauses by scale method type")
    void searchAuthorizationClauses_filtered_by_type() {
      // Arrange
      List<ScaleMethodAuthClauseRow> expected = List.of(createTestRow());
      when(repository.searchAuthorizationClauses(SCALE_METHOD_TYPE)).thenReturn(expected);

      // Act
      List<ScaleMethodAuthClause> result = service.searchAuthorizationClauses(SCALE_METHOD_TYPE);

      // Assert
      assertEquals(1, result.size());
      assertEquals(SCALE_METHOD_TYPE, result.get(0).getScaleMethodTypeCode());
      verify(repository, times(1)).searchAuthorizationClauses(SCALE_METHOD_TYPE);
    }

    @Test
    @DisplayName("Should return empty list when no clauses found")
    void searchAuthorizationClauses_returns_empty_list() {
      // Arrange
      when(repository.searchAuthorizationClauses(null)).thenReturn(List.of());

      // Act
      List<ScaleMethodAuthClause> result = service.searchAuthorizationClauses(null);

      // Assert
      assertTrue(result.isEmpty());
    }
  }

  @Nested
  @DisplayName("getAuthorizationClause Tests")
  class GetTests {

    @Test
    @DisplayName("Should return clause when found")
    void getAuthorizationClause_found() {
      // Arrange
      ScaleMethodAuthClauseRow expected = createTestRow();
      when(repository.getAuthorizationClause(SCALE_METHOD_TYPE, CLAUSE_ID))
          .thenReturn(expected);

      // Act
          ScaleMethodAuthClause result =
            service.getAuthorizationClause(SCALE_METHOD_TYPE, CLAUSE_ID);

      // Assert
      assertNotNull(result);
      assertEquals(CLAUSE_ID, result.getScaleMethodAuthClauseId());
      assertEquals(SCALE_METHOD_TYPE, result.getScaleMethodTypeCode());
    }

    @Test
    @DisplayName("Should throw ResourceNotFoundException when clause not found")
    void getAuthorizationClause_not_found() {
      // Arrange
      when(repository.getAuthorizationClause(SCALE_METHOD_TYPE, CLAUSE_ID)).thenReturn(null);

      // Act & Assert
      ResourceNotFoundException exception =
          assertThrows(
              ResourceNotFoundException.class,
              () -> service.getAuthorizationClause(SCALE_METHOD_TYPE, CLAUSE_ID));
      assertTrue(exception.getMessage().contains("No authorization clause found"));
    }
  }

  @Nested
  @DisplayName("createAuthorizationClause Tests")
  class CreateTests {

    @Test
    @DisplayName("Should create clause successfully")
    void createAuthorizationClause_success() {
      // Arrange
      ScaleMethodAuthClauseCreateRequest request = new ScaleMethodAuthClauseCreateRequest();
      request.setScaleMethodTypeCode(SCALE_METHOD_TYPE);
      request.setScalerAuthorizationClause(CLAUSE_TEXT);
      request.setEffectiveDate(LocalDate.of(2024, 1, 1));

      ScaleMethodAuthClauseRow expected = createTestRow();
      when(repository.createAuthorizationClause(request)).thenReturn(expected);

      // Act
      ScaleMethodAuthClause result = service.createAuthorizationClause(request);

      // Assert
      assertNotNull(result);
      assertEquals(CLAUSE_ID, result.getScaleMethodAuthClauseId());
      verify(repository, times(1)).createAuthorizationClause(request);
    }

    @Test
    @DisplayName("Should throw BadRequestException when scale method type is empty")
    void createAuthorizationClause_missing_scale_method_type() {
      // Arrange
      ScaleMethodAuthClauseCreateRequest request = new ScaleMethodAuthClauseCreateRequest();
      request.setScaleMethodTypeCode("");
      request.setScalerAuthorizationClause(CLAUSE_TEXT);
      request.setEffectiveDate(LocalDate.of(2024, 1, 1));

      // Act & Assert
      BadRequestException exception =
          assertThrows(BadRequestException.class, () -> service.createAuthorizationClause(request));
      assertTrue(exception.getMessage().contains("Scale method type is required"));
    }

    @Test
    @DisplayName("Should throw BadRequestException when clause text is empty")
    void createAuthorizationClause_missing_clause_text() {
      // Arrange
      ScaleMethodAuthClauseCreateRequest request = new ScaleMethodAuthClauseCreateRequest();
      request.setScaleMethodTypeCode(SCALE_METHOD_TYPE);
      request.setScalerAuthorizationClause("");
      request.setEffectiveDate(LocalDate.of(2024, 1, 1));

      // Act & Assert
      BadRequestException exception =
          assertThrows(BadRequestException.class, () -> service.createAuthorizationClause(request));
      assertTrue(exception.getMessage().contains("Clause text is required"));
    }

    @Test
    @DisplayName("Should throw BadRequestException when effective date is missing")
    void createAuthorizationClause_missing_effective_date() {
      // Arrange
      ScaleMethodAuthClauseCreateRequest request = new ScaleMethodAuthClauseCreateRequest();
      request.setScaleMethodTypeCode(SCALE_METHOD_TYPE);
      request.setScalerAuthorizationClause(CLAUSE_TEXT);
      request.setEffectiveDate(null);

      // Act & Assert
      BadRequestException exception =
          assertThrows(BadRequestException.class, () -> service.createAuthorizationClause(request));
      assertTrue(exception.getMessage().contains("Effective date is required"));
    }

    @Test
    @DisplayName("Should throw BadRequestException when expiry date is before effective date")
    void createAuthorizationClause_expiry_before_effective() {
      // Arrange
      ScaleMethodAuthClauseCreateRequest request = new ScaleMethodAuthClauseCreateRequest();
      request.setScaleMethodTypeCode(SCALE_METHOD_TYPE);
      request.setScalerAuthorizationClause(CLAUSE_TEXT);
      request.setEffectiveDate(LocalDate.of(2024, 12, 31));
      request.setExpiryDate(LocalDate.of(2024, 1, 1));

      // Act & Assert
      BadRequestException exception =
          assertThrows(BadRequestException.class, () -> service.createAuthorizationClause(request));
      assertTrue(
          exception.getMessage().contains("Expiry date must be on or after Effective date"));
    }

    @Test
    @DisplayName("Should throw BadRequestException when repository returns null")
    void createAuthorizationClause_repository_returns_null() {
      // Arrange
      ScaleMethodAuthClauseCreateRequest request = new ScaleMethodAuthClauseCreateRequest();
      request.setScaleMethodTypeCode(SCALE_METHOD_TYPE);
      request.setScalerAuthorizationClause(CLAUSE_TEXT);
      request.setEffectiveDate(LocalDate.of(2024, 1, 1));

      when(repository.createAuthorizationClause(request)).thenReturn(null);

      // Act & Assert
      BadRequestException exception =
          assertThrows(BadRequestException.class, () -> service.createAuthorizationClause(request));
      assertTrue(exception.getMessage().contains("could not be created"));
    }

    @Test
    @DisplayName("Should throw BadRequestException when clause text exceeds 200 characters")
    void createAuthorizationClause_clause_too_long() {
      // Arrange
      ScaleMethodAuthClauseCreateRequest request = new ScaleMethodAuthClauseCreateRequest();
      request.setScaleMethodTypeCode(SCALE_METHOD_TYPE);
      request.setScalerAuthorizationClause("X".repeat(201));
      request.setEffectiveDate(LocalDate.of(2024, 1, 1));

      // Act & Assert
      BadRequestException exception =
          assertThrows(BadRequestException.class, () -> service.createAuthorizationClause(request));
      assertTrue(
          exception.getMessage().contains("Clause can not be greater than 200 characters"));
    }

    @Test
    @DisplayName("Should accept clause text of exactly 200 characters")
    void createAuthorizationClause_clause_exactly_200_ok() {
      // Arrange
      ScaleMethodAuthClauseCreateRequest request = new ScaleMethodAuthClauseCreateRequest();
      request.setScaleMethodTypeCode(SCALE_METHOD_TYPE);
      request.setScalerAuthorizationClause("X".repeat(200));
      request.setEffectiveDate(LocalDate.of(2024, 1, 1));
      when(repository.createAuthorizationClause(request)).thenReturn(createTestRow());

      // Act & Assert
      assertDoesNotThrow(() -> service.createAuthorizationClause(request));
      verify(repository, times(1)).createAuthorizationClause(request);
    }
  }

  @Nested
  @DisplayName("updateAuthorizationClause Tests")
  class UpdateTests {

    @Test
    @DisplayName("Should update clause successfully")
    void updateAuthorizationClause_success() {
      // Arrange
      ScaleMethodAuthClauseUpdateRequest request = new ScaleMethodAuthClauseUpdateRequest();
      request.setScaleMethodTypeCode(SCALE_METHOD_TYPE);
      request.setScalerAuthorizationClause("Updated clause text");
      request.setEffectiveDate(LocalDate.of(2024, 1, 1));

      ScaleMethodAuthClauseRow existing = createTestRow();
      ScaleMethodAuthClauseRow updated = createTestRow();
      updated.setScalerAuthorizationClause("Updated clause text");

      when(repository.getAuthorizationClause(SCALE_METHOD_TYPE, CLAUSE_ID))
          .thenReturn(existing);
      when(repository.updateAuthorizationClause(SCALE_METHOD_TYPE, CLAUSE_ID, request))
          .thenReturn(updated);

      // Act
          ScaleMethodAuthClause result =
            service.updateAuthorizationClause(SCALE_METHOD_TYPE, CLAUSE_ID, request);

      // Assert
      assertNotNull(result);
      assertEquals("Updated clause text", result.getScalerAuthorizationClause());
      verify(repository, times(1)).updateAuthorizationClause(SCALE_METHOD_TYPE, CLAUSE_ID, request);
    }

    @Test
    @DisplayName("Should throw ResourceNotFoundException when clause not found on update")
    void updateAuthorizationClause_not_found() {
      // Arrange
      ScaleMethodAuthClauseUpdateRequest request = new ScaleMethodAuthClauseUpdateRequest();
      request.setScaleMethodTypeCode(SCALE_METHOD_TYPE);
      request.setScalerAuthorizationClause(CLAUSE_TEXT);
      request.setEffectiveDate(LocalDate.of(2024, 1, 1));

      when(repository.getAuthorizationClause(SCALE_METHOD_TYPE, CLAUSE_ID)).thenReturn(null);

      // Act & Assert
      ResourceNotFoundException exception =
          assertThrows(
              ResourceNotFoundException.class,
              () -> service.updateAuthorizationClause(SCALE_METHOD_TYPE, CLAUSE_ID, request));
      assertTrue(exception.getMessage().contains("No authorization clause found"));
    }

    @Test
    @DisplayName("Should throw BadRequestException when clause text is empty on update")
    void updateAuthorizationClause_missing_clause_text() {
      // Arrange
      ScaleMethodAuthClauseUpdateRequest request = new ScaleMethodAuthClauseUpdateRequest();
      request.setScaleMethodTypeCode(SCALE_METHOD_TYPE);
      request.setScalerAuthorizationClause("");
      request.setEffectiveDate(LocalDate.of(2024, 1, 1));

      // Act & Assert
      BadRequestException exception =
          assertThrows(
              BadRequestException.class,
              () -> service.updateAuthorizationClause(SCALE_METHOD_TYPE, CLAUSE_ID, request));
      assertTrue(exception.getMessage().contains("Clause text is required"));
    }

    @Test
    @DisplayName("Should throw BadRequestException when clause text exceeds 200 characters on update")
    void updateAuthorizationClause_clause_too_long() {
      // Arrange
      ScaleMethodAuthClauseUpdateRequest request = new ScaleMethodAuthClauseUpdateRequest();
      request.setScaleMethodTypeCode(SCALE_METHOD_TYPE);
      request.setScalerAuthorizationClause("X".repeat(201));
      request.setEffectiveDate(LocalDate.of(2024, 1, 1));

      // Act & Assert (validation runs before the record is loaded)
      BadRequestException exception =
          assertThrows(
              BadRequestException.class,
              () -> service.updateAuthorizationClause(SCALE_METHOD_TYPE, CLAUSE_ID, request));
      assertTrue(
          exception.getMessage().contains("Clause can not be greater than 200 characters"));
    }
  }

  @Nested
  @DisplayName("deleteAuthorizationClause Tests")
  class DeleteTests {

    @Test
    @DisplayName("Should delete clause successfully")
    void deleteAuthorizationClause_success() {
      // Arrange
      ScaleMethodAuthClauseRow existing = createTestRow();
      when(repository.getAuthorizationClause(SCALE_METHOD_TYPE, CLAUSE_ID))
          .thenReturn(existing);

      // Act
      assertDoesNotThrow(
          () -> service.deleteAuthorizationClause(SCALE_METHOD_TYPE, CLAUSE_ID));

      // Assert
      verify(repository, times(1))
          .deleteAuthorizationClause(SCALE_METHOD_TYPE, CLAUSE_ID);
    }

    @Test
    @DisplayName("Should throw ResourceNotFoundException when clause not found on delete")
    void deleteAuthorizationClause_not_found() {
      // Arrange
      when(repository.getAuthorizationClause(SCALE_METHOD_TYPE, CLAUSE_ID)).thenReturn(null);

      // Act & Assert
      ResourceNotFoundException exception =
          assertThrows(
              ResourceNotFoundException.class,
              () -> service.deleteAuthorizationClause(SCALE_METHOD_TYPE, CLAUSE_ID));
      assertTrue(exception.getMessage().contains("No authorization clause found"));
    }

      @Test
      @DisplayName("Should throw BadRequestException when delete fails due to DB dependencies")
      void deleteAuthorizationClause_delete_integrity_violation() {
        // Arrange
      ScaleMethodAuthClauseRow existing = createTestRow();

        when(repository.getAuthorizationClause(SCALE_METHOD_TYPE, CLAUSE_ID))
          .thenReturn(existing);
        doThrow(new DataIntegrityViolationException("child record found"))
          .when(repository)
          .deleteAuthorizationClause(SCALE_METHOD_TYPE, CLAUSE_ID);

        // Act & Assert
        BadRequestException exception =
          assertThrows(
            BadRequestException.class,
            () -> service.deleteAuthorizationClause(SCALE_METHOD_TYPE, CLAUSE_ID));
        assertTrue(
          exception.getMessage().contains("has dependent records and cannot be deleted"));
      }
  }
}
