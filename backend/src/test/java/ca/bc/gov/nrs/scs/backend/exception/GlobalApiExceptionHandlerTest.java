package ca.bc.gov.nrs.scs.backend.exception;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import ca.bc.gov.nrs.scs.backend.model.Error;
import ca.bc.gov.nrs.scs.backend.model.ExamUpgradeCreateRequest;
import ca.bc.gov.nrs.scs.backend.model.FieldValidationError;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.ConstraintViolationException;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import jakarta.validation.constraints.Pattern;
import java.sql.SQLException;
import java.util.List;
import java.util.Set;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.http.HttpInputMessage;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.jdbc.UncategorizedSQLException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authorization.AuthorizationDeniedException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

/**
 * Verifies that server-side database/internal error handlers never leak raw Oracle or exception
 * messages (procedure/constraint/table names) to the client, returning generic messages instead.
 */
@DisplayName("GlobalApiExceptionHandler tests")
class GlobalApiExceptionHandlerTest {

  private final GlobalApiExceptionHandler handler = new GlobalApiExceptionHandler();

  // A representative raw Oracle message that exposes schema internals.
  private static final String LEAKY_ORACLE_MESSAGE =
      "ORA-00001: unique constraint (SCSCLERK.SCLR_UK) violated\nORA-06512: at \"SCSCLERK.PKG_SCALER\", line 142";

  private HttpServletRequest request() {
    HttpServletRequest request = Mockito.mock(HttpServletRequest.class);
    Mockito.when(request.getMethod()).thenReturn("POST");
    Mockito.when(request.getRequestURI()).thenReturn("/api/v1/scalers");
    return request;
  }

  @Test
  void databaseProcedureException_returnsGenericBodyWithoutRawMessage() {
    DatabaseProcedureException ex =
        new DatabaseProcedureException("ORA-20001", LEAKY_ORACLE_MESSAGE);

    ResponseEntity<Error> response = handler.handleDatabaseProcedureException(ex);

    assertEquals(HttpStatus.INTERNAL_SERVER_ERROR, response.getStatusCode());
    assertGenericAndNoLeak(response.getBody(), "DATABASE_ERROR");
  }

  @Test
  void sqlException_returnsGenericBodyWithoutRawMessage() {
    SQLException ex = new SQLException(LEAKY_ORACLE_MESSAGE, "23000", 1);

    ResponseEntity<Error> response = handler.handleSqlExceptions(ex, request());

    assertEquals(HttpStatus.INTERNAL_SERVER_ERROR, response.getStatusCode());
    assertGenericAndNoLeak(response.getBody(), "DATABASE_ERROR");
  }

  @Test
  void uncategorizedSqlException_returnsGenericBodyWithoutRawMessage() {
    SQLException root = new SQLException(LEAKY_ORACLE_MESSAGE, "72000", 20001);
    UncategorizedSQLException ex =
        new UncategorizedSQLException("calling PKG_SCALER.insert_rec", "{ call ... }", root);

    ResponseEntity<Error> response = handler.handleSqlExceptions(ex, request());

    assertEquals(HttpStatus.INTERNAL_SERVER_ERROR, response.getStatusCode());
    assertGenericAndNoLeak(response.getBody(), "DATABASE_ERROR");
  }

  @Test
  void duplicateKey_returns400WithCleanMessage() {
    // Legacy surfaced duplicates as a 400 "already exists" validation message; the handler mirrors that
    // (not a 409) so the duplicate-create contract is uniform across domains, with no raw Oracle leak.
    DuplicateKeyException ex = new DuplicateKeyException(LEAKY_ORACLE_MESSAGE);

    ResponseEntity<Error> response = handler.handleDuplicateKeyException(ex, request());

    assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
    assertNotNull(response.getBody());
    assertEquals("BAD_REQUEST", response.getBody().getCode());
    assertTrue(response.getBody().getMessage().contains("already exists"));
    assertTrue(!response.getBody().getMessage().contains("SCLR_UK"));
  }

  @Test
  void taskRejected_returnsServiceUnavailable() {
    org.springframework.core.task.TaskRejectedException ex =
        new org.springframework.core.task.TaskRejectedException("report executor saturated");

    ResponseEntity<Error> response = handler.handleTaskRejected(ex, request());

    assertEquals(HttpStatus.SERVICE_UNAVAILABLE, response.getStatusCode());
    assertNotNull(response.getBody());
    assertEquals("SERVICE_UNAVAILABLE", response.getBody().getCode());
  }

  @Test
  void fallback_returnsGenericBodyWithoutRawMessage() {
    Exception ex = new IllegalStateException("NPE at SCSCLERK.PKG_SCALER internal detail");

    ResponseEntity<Error> response = handler.handleFallback(ex, request());

    assertEquals(HttpStatus.INTERNAL_SERVER_ERROR, response.getStatusCode());
    assertGenericAndNoLeak(response.getBody(), "INTERNAL_SERVER_ERROR");
  }

  @Test
  void noResourceFound_forwardsDeepSpaRouteToIndex() {
    var ex = new org.springframework.web.servlet.resource.NoResourceFoundException(
        org.springframework.http.HttpMethod.GET, "scale-sites/123/inspections/view/9/extra/deep");
    HttpServletRequest req = Mockito.mock(HttpServletRequest.class);
    Mockito.when(req.getMethod()).thenReturn("GET");

    Object result = handler.handleNoResourceFoundException(ex, req);

    assertEquals("forward:/index.html", result);
  }

  @Test
  void noResourceFound_returns404ForApiAndFilePaths() {
    HttpServletRequest req = Mockito.mock(HttpServletRequest.class);
    Mockito.when(req.getMethod()).thenReturn("GET");

    for (String path : new String[] {"api/v1/unknown", "assets/missing.js", "favicon.ico"}) {
      var ex = new org.springframework.web.servlet.resource.NoResourceFoundException(
          org.springframework.http.HttpMethod.GET, path);
      Object result = handler.handleNoResourceFoundException(ex, req);
      assertTrue(result instanceof ResponseEntity,
          () -> "expected 404 ResponseEntity for '" + path + "', got: " + result);
    }
  }

  // ---------------------------------------------------------------------------------------------
  // UC-SYS-003 (Test Messages diagnostic) — modernized as "covered by tests".
  //
  // The legacy Struts "Test Messages" page was a manual QA harness: it deliberately threw
  // SCSRoleException / SQLException / WebADEException / Throwable to prove the global handler caught
  // each and rendered the standard error surface, and populated field-level errors under a key. In
  // the split architecture that guarantee is the GlobalApiExceptionHandler contract: every handled
  // exception maps to the OpenAPI { code, message } shape with the right status, and field-scoped
  // failures surface as structured fieldErrors for inline display.
  //
  //   S04 (field-level error under a key)   -> handleFieldValidationException / handleValidationExceptions
  //   S05 (role / handled client error)     -> handleBadRequest (4xx, inline surface, message preserved)
  //   S06 (SQL exception)                   -> sqlException_* tests above (500, generic, no leak)
  //   S08 (throwable)                       -> fallback_* test above (500 INTERNAL_SERVER_ERROR)
  //
  // S05 (role) and S07 (federated-identity / WebADE) have no business-exception analogue in the
  // modern stack — WebADE was replaced by FAM/Cognito and role gating moved to the JWT filter and
  // the frontend ProtectedRoute (see ProtectedRoute.browser.test.tsx). The 4xx handled-error surface
  // that the diagnostic exercised is what these tests pin down.
  // ---------------------------------------------------------------------------------------------

  @Test
  @DisplayName("UC-SYS-003 S04: field-scoped validation surfaces structured fieldErrors under their keys")
  void fieldValidationException_returnsBadRequestWithFieldScopedErrors() {
    FieldValidationException ex = new FieldValidationException(List.of(
        new FieldValidationException.FieldErrorDetail("field.error", "Field error 1")));

    ResponseEntity<Error> response = handler.handleFieldValidationException(ex);

    assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
    assertNotNull(response.getBody());
    assertEquals("VALIDATION_ERROR", response.getBody().getCode());
    // The generated Error model wraps the list in JsonNullable; unwrap to assert the field mapping.
    assertTrue(response.getBody().getFieldErrors().isPresent());
    List<FieldValidationError> fieldErrors = response.getBody().getFieldErrors().get();
    assertEquals(1, fieldErrors.size());
    assertEquals("field.error", fieldErrors.get(0).getField());
    assertEquals("Field error 1", fieldErrors.get(0).getMessage());
  }

  @Test
  @DisplayName("UC-SYS-003 S05: a handled client error is caught and rendered as the standard 4xx error surface")
  void badRequestException_returnsBadRequestWithMessagePreserved() {
    BadRequestException ex = new BadRequestException("Role exception");

    ResponseEntity<Error> response = handler.handleBadRequest(ex);

    assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
    assertNotNull(response.getBody());
    assertEquals("BAD_REQUEST", response.getBody().getCode());
    // Unlike the 5xx database/internal handlers, handled 4xx business errors preserve their message
    // so the inline error surface can show it (the diagnostic's literal-text behaviour).
    assertEquals("Role exception", response.getBody().getMessage());
  }

  @Test
  @DisplayName("UC-SYS-003: not-found is caught and rendered as the standard 404 error surface")
  void resourceNotFoundException_returnsNotFound() {
    ResponseEntity<Error> response =
        handler.handleNotFound(new ResourceNotFoundException("No such record"));

    assertEquals(HttpStatus.NOT_FOUND, response.getStatusCode());
    assertNotNull(response.getBody());
    assertEquals("NOT_FOUND", response.getBody().getCode());
    assertEquals("No such record", response.getBody().getMessage());
  }

  @Test
  @DisplayName("UC-SYS-003: conflict is caught and rendered as the standard 409 error surface")
  void conflictException_returnsConflict() {
    ResponseEntity<Error> response =
        handler.handleConflict(new ConflictException("Already exists"));

    assertEquals(HttpStatus.CONFLICT, response.getStatusCode());
    assertNotNull(response.getBody());
    assertEquals("CONFLICT", response.getBody().getCode());
    assertEquals("Already exists", response.getBody().getMessage());
  }

  @Test
  @DisplayName("a @RequiresPermission denial renders as 403, not as a server error")
  void accessDeniedException_returnsForbidden() {
    // What Spring Security's method-security interceptor actually throws when @RequiresPermission
    // denies. It runs INSIDE the dispatch, so SecurityConfig's filter-chain accessDeniedHandler never
    // sees it — without a handler here it fell through to handleFallback and answered 500.
    ResponseEntity<Error> response = handler.handleAccessDenied(
        new AuthorizationDeniedException("Access Denied"), request());

    assertEquals(HttpStatus.FORBIDDEN, response.getStatusCode());
    assertNotNull(response.getBody());
    assertEquals("FORBIDDEN", response.getBody().getCode());
    assertEquals("You do not have permission to perform this action.",
        response.getBody().getMessage());
  }

  @Test
  @DisplayName("a denial does not tell the caller which permission was missing")
  void accessDeniedException_doesNotLeakTheRequiredPermission() {
    // Spring's own message names the failed expression, so echoing ex.getMessage() would hand an
    // unauthorized caller the exact authority to go and acquire.
    ResponseEntity<Error> response = handler.handleAccessDenied(
        new AccessDeniedException("Failed to evaluate expression 'hasAuthority(''SCALE_SITE_QUERY'')'"),
        request());

    assertNotNull(response.getBody());
    String message = response.getBody().getMessage();
    assertTrue(!message.contains("SCALE_SITE_QUERY"),
        () -> "Client message must not name the required permission but was: " + message);
    assertTrue(!message.contains("hasAuthority"),
        () -> "Client message must not expose the security expression but was: " + message);
  }

  @Test
  @DisplayName("an unconvertible query parameter is a 400, not a server error")
  void methodArgumentTypeMismatch_returnsBadRequest() {
    // What Spring throws when a query/path value cannot be converted to the handler's type — e.g.
    // the scalers search sending scalarTrainingType=NaN at a Long parameter. It has no default
    // mapping, so before this handler existed it reached handleFallback and answered 500.
    MethodArgumentTypeMismatchException ex = new MethodArgumentTypeMismatchException(
        "NaN", Long.class, "scalarTrainingType", null, new NumberFormatException("For input string: \"NaN\""));

    ResponseEntity<Error> response = handler.handleMethodArgumentTypeMismatch(ex, request());

    assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
    assertNotNull(response.getBody());
    assertEquals("VALIDATION_ERROR", response.getBody().getCode());
    assertTrue(response.getBody().getMessage().contains("scalarTrainingType"),
        () -> "Message should name the offending parameter but was: " + response.getBody().getMessage());
  }

  @Test
  @DisplayName("a missing required request parameter is a 400, not a server error")
  void missingRequestParameter_returnsBadRequest() {
    // A required @RequestParam left off the request. Like the type-mismatch handler, Spring gives this
    // no default mapping, so before this handler existed it reached handleFallback and answered 500.
    MissingServletRequestParameterException ex =
        new MissingServletRequestParameterException("checkScaleId", "Long");

    ResponseEntity<Error> response = handler.handleMissingRequestParameter(ex, request());

    assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
    assertNotNull(response.getBody());
    assertEquals("VALIDATION_ERROR", response.getBody().getCode());
    assertTrue(response.getBody().getMessage().contains("checkScaleId"),
        () -> "Message should name the missing parameter but was: " + response.getBody().getMessage());
  }

  @Test
  @DisplayName("the type-mismatch message names the parameter but not the rejected value")
  void methodArgumentTypeMismatch_doesNotEchoTheSuppliedValue() {
    // The rejected value is caller-supplied text; echoing it back is a reflection surface, so the
    // value belongs in the server-side log only.
    MethodArgumentTypeMismatchException ex = new MethodArgumentTypeMismatchException(
        "<script>alert(1)</script>", Long.class, "orgUnitNo", null, new NumberFormatException());

    ResponseEntity<Error> response = handler.handleMethodArgumentTypeMismatch(ex, request());

    assertNotNull(response.getBody());
    String message = response.getBody().getMessage();
    assertTrue(!message.contains("script"),
        () -> "Client message must not echo the rejected value but was: " + message);
  }

  @Test
  @DisplayName("a query-parameter constraint violation reads in plain language, not as a regex")
  void constraintViolation_returnsReadableMessageNamingTheField() {
    // The method-validation proxy on search controllers raises this for a bad @RequestParam (e.g. a
    // non-numeric Client #). The exception's own message is developer-facing —
    // `searchClients.clientNumber: must match "^[0-9%]{1,8}$"` — so the handler must not surface it.
    Validator validator = Validation.buildDefaultValidatorFactory().getValidator();
    Set<ConstraintViolation<SearchParams>> violations = validator.validate(new SearchParams("ABC"));
    ConstraintViolationException ex = new ConstraintViolationException(violations);

    ResponseEntity<Error> response = handler.handleValidationExceptions(ex);

    assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
    Error body = response.getBody();
    assertNotNull(body);
    assertEquals("VALIDATION_ERROR", body.getCode());

    String message = body.getMessage();
    assertNotNull(message);
    // Names the field a user recognizes, humanized from the camelCase parameter.
    assertTrue(message.contains("Client Number"),
        () -> "Message should name the field in plain language but was: " + message);
    // None of the developer-facing detail leaks into the banner text.
    assertTrue(!message.contains("must match"),
        () -> "Message must not contain the raw constraint text but was: " + message);
    assertTrue(!message.contains("[0-9"),
        () -> "Message must not contain the validation regex but was: " + message);
    assertTrue(!message.contains("clientNumber"),
        () -> "Message must not contain the raw property path but was: " + message);
  }

  /** A minimal constrained bean so a real Validator produces a genuine ConstraintViolationException. */
  private static class SearchParams {
    @Pattern(regexp = "^[0-9%]{1,8}$")
    private final String clientNumber;

    SearchParams(String clientNumber) {
      this.clientNumber = clientNumber;
    }

    @SuppressWarnings("unused")
    String getClientNumber() {
      return clientNumber;
    }
  }

  private void assertGenericAndNoLeak(Error body, String expectedCode) {
    assertNotNull(body);
    assertEquals(expectedCode, body.getCode());
    String message = body.getMessage();
    assertNotNull(message);
    // None of the sensitive Oracle/schema tokens must appear in the client-facing message.
    for (String leak : new String[] {"ORA-", "SCLR_UK", "SCSCLERK", "PKG_SCALER", "constraint"}) {
      assertTrue(!message.contains(leak),
          () -> "Client message must not leak '" + leak + "' but was: " + message);
    }
  }

  /**
   * A calendar-invalid date cannot be held by LocalDate, so Jackson aborts the whole body and Spring
   * reports HttpMessageNotReadableException. Before this was handled the API answered "Request body is
   * required." — wrong (a body was sent) and unactionable (no field named). Driven through a real
   * ObjectMapper so the test pins the actual Jackson failure, not a hand-built exception.
   */
  private HttpMessageNotReadableException unreadable(String json) {
    ObjectMapper mapper = new ObjectMapper().registerModule(new JavaTimeModule());
    try {
      mapper.readValue(json, ExamUpgradeCreateRequest.class);
      throw new IllegalStateException("expected the payload to fail deserialization: " + json);
    } catch (Exception cause) {
      return new HttpMessageNotReadableException("unreadable", cause, Mockito.mock(HttpInputMessage.class));
    }
  }

  @Test
  @DisplayName("A non-existent calendar day is reported against its field, not as a missing body")
  void invalidDayIsAFieldError() {
    ResponseEntity<Error> response =
        handler.handleHttpMessageNotReadable(unreadable("{\"effectiveDate\":\"2026-02-30\"}"));

    assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
    Error body = response.getBody();
    assertNotNull(body);
    assertEquals("VALIDATION_ERROR", body.getCode());
    assertTrue(body.getFieldErrors().isPresent());
    List<FieldValidationError> fieldErrors = body.getFieldErrors().get();
    assertEquals(1, fieldErrors.size());
    assertEquals("effectiveDate", fieldErrors.get(0).getField());
    assertEquals("Effective Date is not a valid date.", fieldErrors.get(0).getMessage());
    // The caller's value is never echoed back.
    assertTrue(!body.getMessage().contains("2026-02-30"));
  }

  @Test
  @DisplayName("An out-of-range month is reported against its field")
  void invalidMonthIsAFieldError() {
    ResponseEntity<Error> response =
        handler.handleHttpMessageNotReadable(unreadable("{\"expiryDate\":\"2026-13-01\"}"));

    Error body = response.getBody();
    assertNotNull(body);
    assertEquals("VALIDATION_ERROR", body.getCode());
    List<FieldValidationError> fieldErrors = body.getFieldErrors().get();
    assertEquals("expiryDate", fieldErrors.get(0).getField());
    assertEquals("Expiry Date is not a valid date.", fieldErrors.get(0).getMessage());
  }

  @Test
  @DisplayName("A body unreadable for any other reason keeps the original message")
  void nonDateFailureIsUnchanged() {
    ResponseEntity<Error> response = handler.handleHttpMessageNotReadable(
        new HttpMessageNotReadableException("no body", Mockito.mock(HttpInputMessage.class)));

    Error body = response.getBody();
    assertNotNull(body);
    assertEquals("BAD_REQUEST", body.getCode());
    assertEquals("Request body is required.", body.getMessage());
  }
}
