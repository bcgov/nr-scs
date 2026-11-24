package ca.bc.gov.nrs.scs.backend.controller;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import ca.bc.gov.nrs.scs.backend.domain.checkscale.CheckScale;
import ca.bc.gov.nrs.scs.backend.domain.checkscale.CheckScaleSearchCriteria;
import ca.bc.gov.nrs.scs.backend.domain.checkscale.CheckScaleValidationCommand;
import ca.bc.gov.nrs.scs.backend.domain.checkscale.CheckScaleValidationResult;
import ca.bc.gov.nrs.scs.backend.domain.checkscale.ScaleSide;
import ca.bc.gov.nrs.scs.backend.domain.checkscale.ValidationField;
import ca.bc.gov.nrs.scs.backend.domain.checkscale.ValidationFieldError;
import ca.bc.gov.nrs.scs.backend.model.CheckScaleCreateRequest;
import ca.bc.gov.nrs.scs.backend.model.CheckScaleCreateResponse;
import ca.bc.gov.nrs.scs.backend.model.CheckScaleUpdateRequest;
import ca.bc.gov.nrs.scs.backend.model.CheckScaleValidationRequest;
import ca.bc.gov.nrs.scs.backend.model.CheckScaleValidationResponse;
import ca.bc.gov.nrs.scs.backend.model.CheckScaleAdvisoryLetterReportRequest;
import ca.bc.gov.nrs.scs.backend.service.CheckScaleService;
import ca.bc.gov.nrs.scs.backend.service.LetterService;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

class CheckScaleControllerTest {

  private CheckScaleService service;
  private LetterService letterService;
  private CheckScaleController controller;

  @BeforeEach
  void setUp() {
    service = Mockito.mock(CheckScaleService.class);
    letterService = Mockito.mock(LetterService.class);
    controller = new CheckScaleController(service, letterService);
  }

  @Test
  void createCheckScaleAdvisoryLetter_delegatesToLetterService() {
    ResponseEntity<Resource> expected =
        ResponseEntity.ok(new ByteArrayResource("pdf".getBytes()));
    CheckScaleAdvisoryLetterReportRequest request = new CheckScaleAdvisoryLetterReportRequest();
    when(letterService.createCheckScaleAdvisoryLetter(eq(55L), any())).thenReturn(expected);

    ResponseEntity<Resource> response = controller.createCheckScaleAdvisoryLetter(55L, request);

    assertEquals(HttpStatus.OK, response.getStatusCode());
    verify(letterService).createCheckScaleAdvisoryLetter(eq(55L), any());
  }

  @Test
  void deleteCheckScale_returns204AndDelegates() {
    ResponseEntity<Void> response = controller.deleteCheckScale(55L);

    assertEquals(HttpStatus.NO_CONTENT, response.getStatusCode());
    verify(service).deleteCheckScale(55L);
  }

  @Test
  void createCheckScale_returnsCreatedWithId() {
    when(service.createCheckScale(any())).thenReturn(42L);

    ResponseEntity<CheckScaleCreateResponse> response = controller.createCheckScale(buildCreateRequest());

    assertEquals(HttpStatus.CREATED, response.getStatusCode());
    assertNotNull(response.getBody());
    assertEquals(42L, response.getBody().getCheckScaleId());
  }

  @Test
  void validateCheckScale_returns200_whenValid() {
    when(service.validate(any(CheckScaleValidationCommand.class)))
        .thenReturn(new CheckScaleValidationResult(true, List.of(), null));

    ResponseEntity<CheckScaleValidationResponse> response =
        controller.validateCheckScale(new CheckScaleValidationRequest());

    assertEquals(HttpStatus.OK, response.getStatusCode());
    assertNotNull(response.getBody());
    assertEquals(Boolean.TRUE, response.getBody().getOk());
  }

  @Test
  void validateCheckScale_returns400_whenInvalid() {
    CheckScaleValidationResult bad = new CheckScaleValidationResult(
        false,
        List.of(new ValidationFieldError(ValidationField.CHECK_SCALE_DDN, "Check Scale DDN '12345' does not exist in HBS.")),
        null);
    when(service.validate(any(CheckScaleValidationCommand.class))).thenReturn(bad);

    ResponseEntity<CheckScaleValidationResponse> response =
        controller.validateCheckScale(new CheckScaleValidationRequest());

    assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
    assertNotNull(response.getBody());
    assertEquals(Boolean.FALSE, response.getBody().getOk());
    assertNotNull(response.getBody().getErrors());
    assertTrue(response.getBody().getErrors().stream()
        .anyMatch(e -> e.getMessage().contains("does not exist in HBS")));
  }

  @Test
  void updateCheckScale_returnsOkWithDetail() {
    when(service.updateCheckScale(any())).thenReturn(stubCheckScale(7L));

    ResponseEntity<ca.bc.gov.nrs.scs.backend.model.CheckScaleDetail> response =
        controller.updateCheckScale(7L, buildUpdateRequest());

    assertEquals(HttpStatus.OK, response.getStatusCode());
    assertNotNull(response.getBody());
    assertEquals(7L, response.getBody().getCheckScaleId().get());
  }

  @Test
  void searchCheckScales_returnsOkBody() {
    when(service.search(any(CheckScaleSearchCriteria.class))).thenReturn(List.of(stubCheckScale(1L), stubCheckScale(2L)));

    ResponseEntity<List<ca.bc.gov.nrs.scs.backend.model.CheckScaleDetail>> response = controller.searchCheckScales(
        null, null, null, null, null, null, null, null, null,
        null, null, null, null, null, null, null, null,
        null, null, null, null, null, null, null, null,
        null, null, null, null, null, null, null, null,
        null, null, null, null, null, null);

    assertEquals(HttpStatus.OK, response.getStatusCode());
    assertNotNull(response.getBody());
    assertEquals(2, response.getBody().size());
  }

  private static CheckScaleCreateRequest buildCreateRequest() {
    return new CheckScaleCreateRequest(
        "FIRST",
        CheckScaleCreateRequest.FollowedGoodPracticeIndEnum.Y,
        CheckScaleCreateRequest.OriginalWithinStandardIndEnum.Y,
        100.0,
        99.5);
  }

  private static CheckScaleUpdateRequest buildUpdateRequest() {
    return new CheckScaleUpdateRequest(
        "FIRST",
        CheckScaleUpdateRequest.FollowedGoodPracticeIndEnum.Y,
        CheckScaleUpdateRequest.OriginalWithinStandardIndEnum.Y,
        100.0,
        99.5);
  }

  private static CheckScale stubCheckScale(Long id) {
    ScaleSide emptySide = new ScaleSide(null, null, null, null, null, null, null);
    return new CheckScale(
        id, null, null, null, null, null, null, null, null, null,
        null, null, null, null,
        null, null, null, null, null, null, null,
        null, null, null,
        emptySide, emptySide,
        null, null, null, null, null,
        null);
  }
}
