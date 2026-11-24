package ca.bc.gov.nrs.scs.backend.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import ca.bc.gov.nrs.scs.backend.exception.BadRequestException;
import ca.bc.gov.nrs.scs.backend.exception.GlobalApiExceptionHandler;
import ca.bc.gov.nrs.scs.backend.exception.ResourceNotFoundException;
import ca.bc.gov.nrs.scs.backend.model.ScaleMethodAuthClauseCreateRequest;
import ca.bc.gov.nrs.scs.backend.model.ScaleMethodAuthClause;
import ca.bc.gov.nrs.scs.backend.model.ScaleMethodAuthClauseUpdateRequest;
import ca.bc.gov.nrs.scs.backend.service.AuthorizationClauseService;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import java.time.LocalDate;
import java.util.List;
import org.hamcrest.Matchers;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.openapitools.jackson.nullable.JsonNullableModule;
import org.springframework.http.MediaType;
import org.springframework.http.converter.json.MappingJackson2HttpMessageConverter;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

@DisplayName("AuthorizationClauseController Tests")
class AuthorizationClauseControllerTest {

  private AuthorizationClauseService authorizationClauseService;
  private MockMvc mockMvc;
  private ObjectMapper objectMapper;

  private static final String SCALE_METHOD_TYPE = "SM001";
  private static final Long CLAUSE_ID = 1L;
  private static final String CLAUSE_TEXT = "Test authorization clause text";

  @BeforeEach
  void setUp() {
    authorizationClauseService = mock(AuthorizationClauseService.class);

    objectMapper =
        new ObjectMapper()
            .registerModule(new JsonNullableModule())
            .registerModule(new JavaTimeModule())
            .disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);

    MappingJackson2HttpMessageConverter converter = new MappingJackson2HttpMessageConverter();
    converter.setObjectMapper(objectMapper);

    mockMvc =
        MockMvcBuilders.standaloneSetup(new AuthorizationClauseController(authorizationClauseService))
            .setControllerAdvice(new GlobalApiExceptionHandler())
            .setMessageConverters(converter)
            .build();
  }

  private ScaleMethodAuthClause createTestClause() {
    ScaleMethodAuthClause detail = new ScaleMethodAuthClause();
    detail.setScaleMethodAuthClauseId(CLAUSE_ID);
    detail.setScaleMethodTypeCode(SCALE_METHOD_TYPE);
    detail.setScalerAuthorizationClause(CLAUSE_TEXT);
    detail.setEffectiveDate(LocalDate.of(2024, 1, 1));
    detail.setExpiryDate(LocalDate.of(2025, 1, 1));
    return detail;
  }

  @Nested
  @DisplayName("searchAuthorizationClauses Tests")
  class SearchTests {

    @Test
    @DisplayName("Should return 200 OK with list of clauses")
    void searchAuthorizationClauses_returns200() throws Exception {
      // Arrange
        ScaleMethodAuthClause clause = createTestClause();
      when(authorizationClauseService.searchAuthorizationClauses(null))
          .thenReturn(List.of(clause));

      // Act & Assert
      mockMvc.perform(
              get("/auth-clauses")
                  .accept(MediaType.APPLICATION_JSON))
          .andExpect(status().isOk())
          .andExpect(content().string(Matchers.containsString("SM001")))
          .andExpect(content().string(Matchers.containsString(CLAUSE_TEXT)));
    }

    @Test
    @DisplayName("Should return 200 OK with filtered clauses by scale method type")
    void searchAuthorizationClauses_filtered_returns200() throws Exception {
      // Arrange
        ScaleMethodAuthClause clause = createTestClause();
      when(authorizationClauseService.searchAuthorizationClauses(SCALE_METHOD_TYPE))
          .thenReturn(List.of(clause));

      // Act & Assert
      mockMvc.perform(
              get("/auth-clauses")
                  .param("scaleMethodTypeCode", SCALE_METHOD_TYPE)
                  .accept(MediaType.APPLICATION_JSON))
          .andExpect(status().isOk())
          .andExpect(content().string(Matchers.containsString(SCALE_METHOD_TYPE)));
    }

    @Test
    @DisplayName("Should return 200 OK with empty list when no clauses found")
    void searchAuthorizationClauses_empty_returns200() throws Exception {
      // Arrange
      when(authorizationClauseService.searchAuthorizationClauses(null))
          .thenReturn(List.of());

      // Act & Assert
      mockMvc.perform(
              get("/auth-clauses")
                  .accept(MediaType.APPLICATION_JSON))
          .andExpect(status().isOk())
          .andExpect(content().string("[]"));
    }
  }

  @Nested
  @DisplayName("createAuthorizationClause Tests")
  class CreateTests {

    @Test
    @DisplayName("Should return 201 CREATED when clause is created successfully")
    void createAuthorizationClause_returns201() throws Exception {
      // Arrange
      ScaleMethodAuthClauseCreateRequest request = new ScaleMethodAuthClauseCreateRequest();
      request.setScaleMethodTypeCode(SCALE_METHOD_TYPE);
      request.setScalerAuthorizationClause(CLAUSE_TEXT);
      request.setEffectiveDate(LocalDate.of(2024, 1, 1));

        ScaleMethodAuthClause created = createTestClause();
      when(authorizationClauseService.createAuthorizationClause(any()))
          .thenReturn(created);

      // Act & Assert
      mockMvc.perform(
              post("/auth-clauses")
                  .contentType(MediaType.APPLICATION_JSON)
                  .content(objectMapper.writeValueAsString(request))
                  .accept(MediaType.APPLICATION_JSON))
          .andExpect(status().isCreated())
          .andExpect(content().string(Matchers.containsString(CLAUSE_TEXT)));
    }

    @Test
    @DisplayName("Should return 400 BAD REQUEST when required field is missing")
    void createAuthorizationClause_missing_field_returns400() throws Exception {
      // Arrange
      ScaleMethodAuthClauseCreateRequest request = new ScaleMethodAuthClauseCreateRequest();
      request.setScaleMethodTypeCode(""); // Missing required field
      request.setScalerAuthorizationClause(CLAUSE_TEXT);
      request.setEffectiveDate(LocalDate.of(2024, 1, 1));

      when(authorizationClauseService.createAuthorizationClause(any()))
          .thenThrow(new BadRequestException("Scale method type is required."));

      // Act & Assert
      mockMvc.perform(
              post("/auth-clauses")
                  .contentType(MediaType.APPLICATION_JSON)
                  .content(objectMapper.writeValueAsString(request))
                  .accept(MediaType.APPLICATION_JSON))
          .andExpect(status().isBadRequest())
          .andExpect(content().string(Matchers.containsString("Scale method type is required")));
    }
  }

  @Nested
  @DisplayName("getAuthorizationClause Tests")
  class GetTests {

    @Test
    @DisplayName("Should return 200 OK when clause is found")
    void getAuthorizationClause_found_returns200() throws Exception {
      // Arrange
        ScaleMethodAuthClause clause = createTestClause();
      when(authorizationClauseService.getAuthorizationClause(SCALE_METHOD_TYPE, CLAUSE_ID))
          .thenReturn(clause);

      // Act & Assert
      mockMvc.perform(
              get("/auth-clauses/" + SCALE_METHOD_TYPE + "/" + CLAUSE_ID)
                  .accept(MediaType.APPLICATION_JSON))
          .andExpect(status().isOk())
          .andExpect(content().string(Matchers.containsString(CLAUSE_TEXT)));
    }

    @Test
    @DisplayName("Should return 404 NOT FOUND when clause does not exist")
    void getAuthorizationClause_not_found_returns404() throws Exception {
      // Arrange
      when(authorizationClauseService.getAuthorizationClause(SCALE_METHOD_TYPE, CLAUSE_ID))
          .thenThrow(new ResourceNotFoundException("No authorization clause found with id " + CLAUSE_ID));

      // Act & Assert
      mockMvc.perform(
              get("/auth-clauses/" + SCALE_METHOD_TYPE + "/" + CLAUSE_ID)
                  .accept(MediaType.APPLICATION_JSON))
          .andExpect(status().isNotFound())
          .andExpect(content().string(Matchers.containsString("No authorization clause found")));
    }
  }

  @Nested
  @DisplayName("updateAuthorizationClause Tests")
  class UpdateTests {

    @Test
    @DisplayName("Should return 200 OK when clause is updated successfully")
    void updateAuthorizationClause_success_returns200() throws Exception {
      // Arrange
      ScaleMethodAuthClauseUpdateRequest request = new ScaleMethodAuthClauseUpdateRequest();
      request.setScaleMethodTypeCode(SCALE_METHOD_TYPE);
      request.setScalerAuthorizationClause("Updated clause text");
      request.setEffectiveDate(LocalDate.of(2024, 1, 1));

      ScaleMethodAuthClause updated = createTestClause();
      updated.setScalerAuthorizationClause("Updated clause text");

      when(authorizationClauseService.updateAuthorizationClause(
              eq(SCALE_METHOD_TYPE), eq(CLAUSE_ID), any()))
          .thenReturn(updated);

      // Act & Assert
      mockMvc.perform(
              put("/auth-clauses/" + SCALE_METHOD_TYPE + "/" + CLAUSE_ID)
                  .contentType(MediaType.APPLICATION_JSON)
                  .content(objectMapper.writeValueAsString(request))
                  .accept(MediaType.APPLICATION_JSON))
          .andExpect(status().isOk())
          .andExpect(content().string(Matchers.containsString("Updated clause text")));
    }

    @Test
    @DisplayName("Should return 404 NOT FOUND when clause to update does not exist")
    void updateAuthorizationClause_not_found_returns404() throws Exception {
      // Arrange
      ScaleMethodAuthClauseUpdateRequest request = new ScaleMethodAuthClauseUpdateRequest();
      request.setScaleMethodTypeCode(SCALE_METHOD_TYPE);
      request.setScalerAuthorizationClause(CLAUSE_TEXT);
      request.setEffectiveDate(LocalDate.of(2024, 1, 1));

      when(authorizationClauseService.updateAuthorizationClause(
              eq(SCALE_METHOD_TYPE), eq(CLAUSE_ID), any()))
          .thenThrow(new ResourceNotFoundException("No authorization clause found with id " + CLAUSE_ID));

      // Act & Assert
      mockMvc.perform(
              put("/auth-clauses/" + SCALE_METHOD_TYPE + "/" + CLAUSE_ID)
                  .contentType(MediaType.APPLICATION_JSON)
                  .content(objectMapper.writeValueAsString(request))
                  .accept(MediaType.APPLICATION_JSON))
          .andExpect(status().isNotFound())
          .andExpect(content().string(Matchers.containsString("No authorization clause found")));
    }

    @Test
    @DisplayName("Should return 400 BAD REQUEST when validation fails on update")
    void updateAuthorizationClause_validation_fails_returns400() throws Exception {
      // Arrange
      ScaleMethodAuthClauseUpdateRequest request = new ScaleMethodAuthClauseUpdateRequest();
      request.setScaleMethodTypeCode(SCALE_METHOD_TYPE);
      request.setScalerAuthorizationClause(""); // Invalid: empty clause text
      request.setEffectiveDate(LocalDate.of(2024, 1, 1));

      when(authorizationClauseService.updateAuthorizationClause(
              eq(SCALE_METHOD_TYPE), eq(CLAUSE_ID), any()))
          .thenThrow(new BadRequestException("Clause text is required."));

      // Act & Assert
      mockMvc.perform(
              put("/auth-clauses/" + SCALE_METHOD_TYPE + "/" + CLAUSE_ID)
                  .contentType(MediaType.APPLICATION_JSON)
                  .content(objectMapper.writeValueAsString(request))
                  .accept(MediaType.APPLICATION_JSON))
          .andExpect(status().isBadRequest())
          .andExpect(content().string(Matchers.containsString("Clause text is required")));
    }
  }

  @Nested
  @DisplayName("deleteAuthorizationClause Tests")
  class DeleteTests {

    @Test
    @DisplayName("Should return 204 NO CONTENT when clause is deleted successfully")
    void deleteAuthorizationClause_success_returns204() throws Exception {
      // Arrange
      // Mock doesn't need to return anything for delete

      // Act & Assert
      mockMvc.perform(
              delete("/auth-clauses/" + SCALE_METHOD_TYPE + "/" + CLAUSE_ID))
          .andExpect(status().isNoContent());
    }

    @Test
    @DisplayName("Should return 404 NOT FOUND when clause to delete does not exist")
    void deleteAuthorizationClause_not_found_returns404() throws Exception {
      // Arrange
      doThrow(new ResourceNotFoundException("No authorization clause found with id " + CLAUSE_ID))
          .when(authorizationClauseService)
          .deleteAuthorizationClause(SCALE_METHOD_TYPE, CLAUSE_ID);

      // Act & Assert
      mockMvc.perform(
              delete("/auth-clauses/" + SCALE_METHOD_TYPE + "/" + CLAUSE_ID))
          .andExpect(status().isNotFound())
          .andExpect(content().string(Matchers.containsString("No authorization clause found")));
    }

    @Test
    @DisplayName("Should return 400 BAD REQUEST when clause has dependent children")
    void deleteAuthorizationClause_has_dependencies_returns400() throws Exception {
      // Arrange
      doThrow(new BadRequestException(
              "Authorization clause has dependent records and cannot be deleted."))
          .when(authorizationClauseService)
          .deleteAuthorizationClause(SCALE_METHOD_TYPE, CLAUSE_ID);

      // Act & Assert
      mockMvc.perform(
              delete("/auth-clauses/" + SCALE_METHOD_TYPE + "/" + CLAUSE_ID))
          .andExpect(status().isBadRequest())
          .andExpect(content().string(Matchers.containsString("has dependent records")));
    }
  }
}
