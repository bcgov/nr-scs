package ca.bc.gov.nrs.scs.backend.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import ca.bc.gov.nrs.scs.backend.exception.FieldValidationException.FieldErrorDetail;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class CheckScaleReferenceValidatorTest {

  @Mock private ScalerService scalerService;
  @Mock private ScaleSiteService scaleSiteService;
  @Mock private TimberMarkService timberMarkService;

  private CheckScaleReferenceValidator validator;

  @BeforeEach
  void setUp() {
    validator = new CheckScaleReferenceValidator(
        scalerService, scaleSiteService, timberMarkService);
  }

  /** Stubs every reference to exist; individual tests override one to be missing. */
  private void stubAllExist() {
    lenient().when(scalerService.scalerExists(any())).thenReturn(true);
    lenient().when(scaleSiteService.scaleSiteExists(any())).thenReturn(true);
    lenient().when(timberMarkService.timberMarkExists(any())).thenReturn(true);
  }

  @Test
  void validate_returnsEmpty_whenAllReferencesExist() {
    stubAllExist();

    List<FieldErrorDetail> errors = validator.validate("AAAA", "BBBB", "ABC123", "0001");

    assertTrue(errors.isEmpty());
  }

  @Test
  void validate_flagsBothScalerLicences_whenNeitherExists() {
    stubAllExist();
    when(scalerService.scalerExists("AAAA")).thenReturn(false);
    when(scalerService.scalerExists("BBBB")).thenReturn(false);

    List<FieldErrorDetail> errors = validator.validate("AAAA", "BBBB", "ABC123", "0001");

    assertEquals(2, errors.size());
    assertEquals("originalScalerLicenceNo", errors.get(0).field());
    assertEquals("A Scaler # could not be found for AAAA.", errors.get(0).message());
    assertEquals("checkScalerLicenceNo", errors.get(1).field());
  }

  @Test
  void validate_flagsTimberMark_whenNotFound() {
    stubAllExist();
    when(timberMarkService.timberMarkExists("ABC123")).thenReturn(false);

    List<FieldErrorDetail> errors = validator.validate("AAAA", "BBBB", "ABC123", "0001");

    assertEquals(1, errors.size());
    assertEquals("timberMark", errors.get(0).field());
    assertEquals("A Timber Mark could not be found for ABC123.", errors.get(0).message());
  }

  @Test
  void validate_flagsScaleSite_whenNotFound() {
    stubAllExist();
    when(scaleSiteService.scaleSiteExists("0001")).thenReturn(false);

    List<FieldErrorDetail> errors = validator.validate("AAAA", "BBBB", "ABC123", "0001");

    assertEquals(1, errors.size());
    assertEquals("scaleSiteIdNmbr", errors.get(0).field());
  }

  @Test
  void validate_skipsBlankValues_andDoesNotQuery() {
    List<FieldErrorDetail> errors = validator.validate("  ", null, "", "  ");

    assertTrue(errors.isEmpty());
    verify(scalerService, never()).scalerExists(any());
    verify(scaleSiteService, never()).scaleSiteExists(any());
    verify(timberMarkService, never()).timberMarkExists(any());
  }
}
