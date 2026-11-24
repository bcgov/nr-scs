package ca.bc.gov.nrs.scs.backend.exception;

import static ca.bc.gov.nrs.scs.backend.util.SCSUtils.sanitizeForLog;

import ca.bc.gov.nrs.scs.backend.model.Error;
import ca.bc.gov.nrs.scs.backend.model.FieldValidationError;
import com.fasterxml.jackson.databind.JsonMappingException.Reference;
import com.fasterxml.jackson.databind.exc.InvalidFormatException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.ConstraintViolationException;
import java.sql.SQLException;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.util.List;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.jdbc.UncategorizedSQLException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.method.annotation.HandlerMethodValidationException;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

/**
 * Centralized exception mapping for REST APIs.
 *
 * <p>This project uses Spring MVC without Spring Boot, so we provide our own {@code @ControllerAdvice}
 * to ensure errors are returned in the OpenAPI-defined shape:
 * {@code { "code": string, "message": string }}.
 */
@ControllerAdvice
public class GlobalApiExceptionHandler {

  private static final Logger log = LogManager.getLogger(GlobalApiExceptionHandler.class);
  private static final String CONFLICT_CODE = "CONFLICT";
  private static final String DUPLICATE_KEY_MESSAGE =
      "A record already exists with the same unique key.";

  // Generic, client-safe responses for server-side errors. Raw database/exception messages can leak
  // Oracle procedure, constraint, and table names, so the detail is logged server-side only.
  private static final String DATABASE_ERROR_CODE = "DATABASE_ERROR";
  private static final String GENERIC_DATABASE_MESSAGE = "An error occurred while processing your request.";
  private static final String INTERNAL_ERROR_CODE = "INTERNAL_SERVER_ERROR";
  private static final String GENERIC_INTERNAL_MESSAGE =
      "An unexpected error occurred. Please try again later.";
  private static final String PERMISSION_DENIED_MESSAGE =
      "You do not have permission to perform this action.";

  @ExceptionHandler(DatabaseProcedureException.class)
  public ResponseEntity<Error> handleDatabaseProcedureException(DatabaseProcedureException ex) {
    // Typically corresponds to PL/SQL-raised errors. The raw message may contain procedure/constraint
    // names, so log it server-side and return a generic message to the caller.
    log.error("Database procedure error [{}]: {}", ex.getErrorCode(), ex.getMessage(), ex);
    return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
        .body(new Error().code(DATABASE_ERROR_CODE).message(GENERIC_DATABASE_MESSAGE));
  }

  @ExceptionHandler({ConstraintViolationException.class, MethodArgumentNotValidException.class})
  public ResponseEntity<Error> handleValidationExceptions(Exception ex) {
    // Bean-validation failures -> 400. Surface the per-field detail as structured fieldErrors so
    // the frontend can render them inline (where field names align), not just in a banner. The
    // top-level message is always plain, non-technical text: the exceptions' own messages are
    // developer-facing (a "method.parameter" path and the raw regex, e.g.
    // `searchClients.clientNumber: must match "^[0-9%]{1,8}$"`), which is meaningless to a user.
    Error body = new Error().code("VALIDATION_ERROR").message("One or more fields are invalid.");
    if (ex instanceof MethodArgumentNotValidException manve) {
      // @RequestBody DTO validation. Field names align with the form, so keep the per-field detail.
      List<FieldValidationError> fieldErrors = manve.getBindingResult().getFieldErrors().stream()
          .map(fe -> new FieldValidationError().field(fe.getField()).message(fe.getDefaultMessage()))
          .toList();
      if (!fieldErrors.isEmpty()) {
        body.fieldErrors(fieldErrors);
      }
    } else if (ex instanceof ConstraintViolationException cve) {
      // @RequestParam/@PathVariable constraint failures (the OpenAPI-generated @Pattern/@Size on
      // search parameters) arrive here via the method-validation proxy. Name the offending field(s)
      // in plain language so the banner is actionable, without echoing the caller's value or the
      // regex. The property path is "handlerMethod.paramName", so the leaf segment is the parameter.
      List<FieldValidationError> fieldErrors = cve.getConstraintViolations().stream()
          .map(v -> {
            String path = v.getPropertyPath().toString();
            String field = path.substring(path.lastIndexOf('.') + 1);
            return new FieldValidationError().field(field).message(v.getMessage());
          })
          .toList();
      if (!fieldErrors.isEmpty()) {
        body.fieldErrors(fieldErrors);
        String fields = fieldErrors.stream()
            .map(fe -> humanizeFieldName(fe.getField()))
            .distinct()
            .collect(java.util.stream.Collectors.joining(", "));
        body.message("One or more fields are invalid: " + fields
            + ". Please check your entries and try again.");
      }
    }
    return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(body);
  }

  /**
   * Turns a camelCase parameter name into a readable label for an end-user message — e.g.
   * {@code clientNumber} -> "Client Number", {@code scalerLicenceNo} -> "Scaler Licence No". A blank
   * name falls back to the generic "field" so the composed message is never left dangling.
   */
  private static String humanizeFieldName(String field) {
    if (field == null || field.isBlank()) {
      return "field";
    }
    String spaced = field.replaceAll("([a-z0-9])([A-Z])", "$1 $2").replace('_', ' ').trim();
    return Character.toUpperCase(spaced.charAt(0)) + spaced.substring(1);
  }

  @ExceptionHandler(FieldValidationException.class)
  public ResponseEntity<Error> handleFieldValidationException(FieldValidationException ex) {
    // Server-side referential/cross-field checks that bean validation can't express -> 400 with
    // per-field messages for inline display.
    List<FieldValidationError> fieldErrors = ex.getFieldErrors().stream()
        .map(fe -> new FieldValidationError().field(fe.field()).message(fe.message()))
        .toList();
    return ResponseEntity.status(HttpStatus.BAD_REQUEST)
        .body(new Error().code("VALIDATION_ERROR").message(ex.getMessage()).fieldErrors(fieldErrors));
  }

  @ExceptionHandler(HandlerMethodValidationException.class)
  public ResponseEntity<Error> handleHandlerMethodValidation(
      HandlerMethodValidationException ex, HttpServletRequest request) {
    // Spring 6 routes failed @RequestParam/@PathVariable constraints (@Size/@Min/@Max generated from
    // the OpenAPI spec) through this exception. Without an explicit handler it falls through to the
    // catch-all and returns 500; a bad query parameter is a client error, so map it to 400. The raw
    // message can echo parameter values, so log it server-side and return a generic message.
    log.warn("Request parameter validation failed on {} {}: {}",
        request.getMethod(), request.getRequestURI(), ex.getMessage());
    return ResponseEntity.status(HttpStatus.BAD_REQUEST)
        .body(new Error().code("VALIDATION_ERROR")
            .message("One or more request parameters are invalid."));
  }

  @ExceptionHandler(MethodArgumentTypeMismatchException.class)
  public ResponseEntity<Error> handleMethodArgumentTypeMismatch(
      MethodArgumentTypeMismatchException ex, HttpServletRequest request) {
    // A query/path parameter that cannot be converted to the handler's type (a non-numeric value on
    // a Long param, an unparseable date). Like HandlerMethodValidationException above, this has no
    // default mapping and would otherwise reach the catch-all as a 500 — but the caller sent a bad
    // value, so it is a 400. Name the parameter, not the value, which can echo user input.
    log.warn("Parameter type mismatch on {} {}: parameter '{}' could not be converted to {}",
        request.getMethod(), request.getRequestURI(), ex.getName(),
        ex.getRequiredType() == null ? "the expected type" : ex.getRequiredType().getSimpleName());
    return ResponseEntity.status(HttpStatus.BAD_REQUEST)
        .body(new Error().code("VALIDATION_ERROR")
            .message("Request parameter '" + ex.getName() + "' has an invalid value."));
  }

  @ExceptionHandler(MissingServletRequestParameterException.class)
  public ResponseEntity<Error> handleMissingRequestParameter(
      MissingServletRequestParameterException ex, HttpServletRequest request) {
    // A required @RequestParam was omitted from the request. Like the type-mismatch and
    // handler-validation handlers above, Spring MVC gives this no default 4xx mapping, so without an
    // explicit handler it reaches the catch-all and returns 500 — but a missing required parameter is
    // a client error, so map it to 400. The parameter name is part of the API contract (not caller
    // input), so it is safe to name and makes the message actionable.
    log.warn("Missing required request parameter on {} {}: '{}'",
        request.getMethod(), request.getRequestURI(), ex.getParameterName());
    return ResponseEntity.status(HttpStatus.BAD_REQUEST)
        .body(new Error().code("VALIDATION_ERROR")
            .message("Required request parameter '" + ex.getParameterName() + "' is missing."));
  }

  @ExceptionHandler(DuplicateKeyException.class)
  public ResponseEntity<Error> handleDuplicateKeyException(DuplicateKeyException ex, HttpServletRequest request) {
    log.warn("Duplicate key on {} {}", sanitizeForLog(request.getMethod()), sanitizeForLog(request.getRequestURI()), ex);

    return ResponseEntity.status(HttpStatus.BAD_REQUEST)
        .body(new Error().code("BAD_REQUEST").message(DUPLICATE_KEY_MESSAGE));
  }

  @ExceptionHandler({SQLException.class, UncategorizedSQLException.class})
  public ResponseEntity<Error> handleSqlExceptions(Exception ex, HttpServletRequest request) {
    // JdbcTemplate commonly wraps SQLExceptions. The raw Oracle message can expose procedure,
    // constraint, and table names, so log the detail server-side and return a generic message.
    SQLException sqlEx = extractSqlException(ex);
    Integer oracleErrorCode = sqlEx != null ? sqlEx.getErrorCode() : null;
    log.error("Database error on {} {} [oracleErrorCode={}]",
        request.getMethod(), request.getRequestURI(), oracleErrorCode, ex);

    return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
        .body(new Error().code(DATABASE_ERROR_CODE).message(GENERIC_DATABASE_MESSAGE));
  }

  @ExceptionHandler(org.springframework.core.task.TaskRejectedException.class)
  public ResponseEntity<Error> handleTaskRejected(
      org.springframework.core.task.TaskRejectedException ex, HttpServletRequest request) {
    // Async report executor or render semaphore is saturated — signal backpressure to the caller.
    log.warn("Capacity exhausted on {} {}: {}",
        request.getMethod(), request.getRequestURI(), ex.getMessage());
    return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
        .body(new Error().code("SERVICE_UNAVAILABLE")
            .message("The server is busy processing requests. Please try again shortly."));
  }

  @ExceptionHandler(TooManyRequestsException.class)
  public ResponseEntity<Error> handleTooManyRequests(
      TooManyRequestsException ex, HttpServletRequest request) {
    // Caller exceeded the per-user request rate for a throttled endpoint (search/reports).
    log.warn("Rate limit exceeded on {} {} (retry after {}s)",
        request.getMethod(), request.getRequestURI(), ex.getRetryAfterSeconds());
    return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
        .header(HttpHeaders.RETRY_AFTER, Long.toString(ex.getRetryAfterSeconds()))
        .body(new Error().code("TOO_MANY_REQUESTS").message(ex.getMessage()));
  }

  @ExceptionHandler(ResourceNotFoundException.class)
  public ResponseEntity<Error> handleNotFound(ResourceNotFoundException ex) {
    return ResponseEntity.status(HttpStatus.NOT_FOUND)
        .body(new Error().code("NOT_FOUND").message(ex.getMessage()));
  }

  @ExceptionHandler(ConflictException.class)
  public ResponseEntity<Error> handleConflict(ConflictException ex) {
    return ResponseEntity.status(HttpStatus.CONFLICT)
        .body(new Error().code(CONFLICT_CODE).message(ex.getMessage()));
  }

  @ExceptionHandler(BadRequestException.class)
  public ResponseEntity<Error> handleBadRequest(BadRequestException ex) {
    return ResponseEntity.status(HttpStatus.BAD_REQUEST)
        .body(new Error().code("BAD_REQUEST").message(ex.getMessage()));
  }

  @ExceptionHandler(ForbiddenException.class)
  public ResponseEntity<Error> handleForbidden(ForbiddenException ex) {
    return ResponseEntity.status(HttpStatus.FORBIDDEN)
        .body(new Error().code("FORBIDDEN").message(ex.getMessage()));
  }

  /**
   * A {@code @RequiresPermission} denial. Needed here even though {@code SecurityConfig} registers an
   * {@code accessDeniedHandler}: that one is wired into the security filter chain, so it only sees an
   * {@link AccessDeniedException} that escapes the {@code DispatcherServlet}. Method security runs
   * <i>inside</i> the dispatch, so without this handler the denial fell to
   * {@link #handleFallback} and the caller got 500 — an authorization decision reported as a server
   * fault, which also meant the frontend's 403 access-denied card never rendered for it and every
   * routine refusal was logged at {@code error} with a stack trace.
   *
   * <p>Logged at {@code warn}, matching the filter-chain handler: a refusal is an expected outcome,
   * not a fault. The message is fixed rather than taken from the exception — Spring's text names the
   * failed expression and therefore the permission, which tells an unauthorized caller what to go and
   * acquire.
   */
  @ExceptionHandler(AccessDeniedException.class)
  public ResponseEntity<Error> handleAccessDenied(
      AccessDeniedException ex, HttpServletRequest request) {
    log.warn("Access denied: {} {} - {}", sanitizeForLog(request.getMethod()),
        sanitizeForLog(request.getRequestURI()), ex.getMessage());
    return ResponseEntity.status(HttpStatus.FORBIDDEN)
        .body(new Error().code("FORBIDDEN").message(PERMISSION_DENIED_MESSAGE));
  }

  @ExceptionHandler(HttpMessageNotReadableException.class)
  public ResponseEntity<Error> handleHttpMessageNotReadable(HttpMessageNotReadableException ex) {
    // A calendar-invalid date (e.g. 2026-02-30, 2026-13-01) cannot be held by LocalDate, so Jackson
    // fails to deserialize the whole body and it arrives here rather than as a bean-validation error.
    // Without the branch below every such request answered "Request body is required." — which is both
    // wrong (a body WAS sent) and unactionable (it names no field). Return the same VALIDATION_ERROR
    // shape the other validation handlers use, so the frontend can render it inline on the offending
    // field. The caller's value is never echoed back, matching the sanitising rule the DB handler follows.
    String dateField = invalidDateField(ex);
    if (dateField != null) {
      Error body = new Error()
          .code("VALIDATION_ERROR")
          .message("One or more fields are invalid: " + humanizeFieldName(dateField)
              + ". Please check your entries and try again.")
          .fieldErrors(List.of(new FieldValidationError()
              .field(dateField)
              .message(humanizeFieldName(dateField) + " is not a valid date.")));
      return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(body);
    }
    return ResponseEntity.status(HttpStatus.BAD_REQUEST)
        .body(new Error().code("BAD_REQUEST").message("Request body is required."));
  }

  /**
   * The request field whose value could not be read as a date, or null when the unreadable body was
   * caused by anything else.
   *
   * <p>Jackson reports this as an {@link InvalidFormatException} whose target type is one of the
   * {@code java.time} date types; its reference path names the field. Only the leaf segment is used —
   * the path can be nested, and the frontend keys its inline errors on the plain field name.
   */
  private static String invalidDateField(HttpMessageNotReadableException ex) {
    if (!(ex.getCause() instanceof InvalidFormatException ife)) {
      return null;
    }
    Class<?> target = ife.getTargetType();
    if (target == null
        || !(LocalDate.class.isAssignableFrom(target)
            || LocalDateTime.class.isAssignableFrom(target)
            || OffsetDateTime.class.isAssignableFrom(target))) {
      return null;
    }
    List<Reference> path = ife.getPath();
    if (path == null || path.isEmpty()) {
      return null;
    }
    return path.get(path.size() - 1).getFieldName();
  }

  @ExceptionHandler(UnprocessableEntityException.class)
  public ResponseEntity<Error> handleUnprocessableEntity(UnprocessableEntityException ex) {
    return ResponseEntity.status(HttpStatus.UNPROCESSABLE_ENTITY)
        .body(new Error().code("UNPROCESSABLE_ENTITY").message(ex.getMessage()));
  }

  @ExceptionHandler(org.springframework.web.servlet.resource.NoResourceFoundException.class)
  public Object handleNoResourceFoundException(org.springframework.web.servlet.resource.NoResourceFoundException ex, HttpServletRequest request) {
    // A non-API, extensionless GET that matched no controller or static resource is treated as a
    // client-side (React Router) route — serve the SPA shell so deep-links/refresh work at any
    // depth. Everything else (API misses, missing files) returns the standard 404.
    if (isSpaNavigationRequest(request, ex.getResourcePath())) {
      return "forward:/index.html";
    }
    log.warn("Static resource not found: {} - {}", ex.getResourcePath(), ex.getMessage());
    return ResponseEntity.status(HttpStatus.NOT_FOUND)
        .body(new Error().code("NOT_FOUND").message("The requested resource was not found."));
  }

  /**
   * True when the request looks like a client-side SPA route: a GET for a path that is not under the
   * API base and has no file extension in its last segment. A dotted last segment (e.g. index.html,
   * main.js) is treated as a file request so a missing asset still 404s rather than looping.
   */
  private boolean isSpaNavigationRequest(HttpServletRequest request, String resourcePath) {
    if (!"GET".equalsIgnoreCase(request.getMethod()) || resourcePath == null) {
      return false;
    }
    if (resourcePath.equals("api") || resourcePath.startsWith("api/")) {
      return false;
    }
    String lastSegment = resourcePath.substring(resourcePath.lastIndexOf('/') + 1);
    return !lastSegment.contains(".");
  }

  @ExceptionHandler(Exception.class)
  public ResponseEntity<Error> handleFallback(Exception ex, HttpServletRequest request) {
    // The raw exception message can leak internal details; log it and return a generic message.
    log.error("Unhandled error on {} {}", sanitizeForLog(request.getMethod()), sanitizeForLog(request.getRequestURI()), ex);
    return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
        .body(new Error().code(INTERNAL_ERROR_CODE).message(GENERIC_INTERNAL_MESSAGE));
  }

  private SQLException extractSqlException(Exception ex) {
    if (ex instanceof UncategorizedSQLException uex) {
      return uex.getSQLException();
    }
    if (ex instanceof SQLException sqlEx) {
      return sqlEx;
    }
    return null;
  }
}
