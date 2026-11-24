package ca.bc.gov.nrs.scs.backend.controller;

import org.springframework.beans.propertyeditors.StringTrimmerEditor;
import org.springframework.web.bind.WebDataBinder;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.InitBinder;

/**
 * Trims every {@code String} query parameter and path variable before it reaches a handler, and
 * turns a value that is nothing but whitespace into {@code null} (i.e. "filter not supplied").
 *
 * <p>Why this has to happen at binding time rather than in a service: the OpenAPI generator emits
 * the contract's {@code pattern}/{@code maxLength} onto the {@code *Api} interface parameters as
 * {@code @Pattern}/{@code @Size}, and {@code MethodValidationPostProcessor} enforces them on the
 * way in. So a pasted {@code " 00021 "} on {@code GET /clients/search?clientNumber=} failed
 * {@code ^[0-9%]{1,8}$} and came back a 400 — even though {@code SCSUtils.padClientNumberCriterion}
 * and {@code upperOrNull} would have trimmed it happily had it ever got that far. Argument
 * resolution applies the registered editors before method validation runs, so trimming here fixes
 * the whole class of "leading/trailing whitespace is a 400" bug rather than one field at a time.
 *
 * <p>Scope note: {@code @RequestBody} payloads are deserialized by Jackson, not the data binder, so
 * they are untouched — this only normalizes query/path/header/form values, where a caller's
 * surrounding whitespace is never meaningful in SCS.
 */
@ControllerAdvice
public class RequestParamTrimmingAdvice {

  @InitBinder
  public void initBinder(WebDataBinder binder) {
    binder.registerCustomEditor(String.class, new StringTrimmerEditor(true));
  }
}
