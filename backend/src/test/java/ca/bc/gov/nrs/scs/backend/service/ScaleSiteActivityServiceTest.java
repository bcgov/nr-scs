package ca.bc.gov.nrs.scs.backend.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import ca.bc.gov.nrs.scs.backend.domain.scalesite.ScaleSiteActivityRecord;
import ca.bc.gov.nrs.scs.backend.exception.ResourceNotFoundException;
import ca.bc.gov.nrs.scs.backend.model.ScaleSiteActivitySummary;
import ca.bc.gov.nrs.scs.backend.repository.ScaleSiteActivityRepository;
import java.math.BigDecimal;
import java.time.LocalDate;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
@DisplayName("ScaleSiteActivityService tests")
class ScaleSiteActivityServiceTest {

  @Mock
  private ScaleSiteActivityRepository activityRepository;

  @InjectMocks
  private ScaleSiteActivityService service;

  @Test
  void getActivitySummary_trimsAndUppercasesSiteIdAndMapsRow() {
    when(activityRepository.getActivityForSite("SITE001")).thenReturn(new ScaleSiteActivityRecord(
        "SITE001",
        LocalDate.of(2024, 9, 15),
        42L,
        new BigDecimal("1234.56"),
        new BigDecimal("98765.43")));

    ScaleSiteActivitySummary result = service.getActivitySummary(" site001 ");

    assertEquals("SITE001", result.getScaleSiteIdNmbr());
    assertEquals(LocalDate.of(2024, 9, 15), result.getLastScaleDate().get());
    assertEquals(42L, result.getNumberOfSamples().get());
    assertEquals(new BigDecimal("1234.56"), result.getSampleVolume().get());
    assertEquals(new BigDecimal("98765.43"), result.getScaledVolume().get());
    verify(activityRepository).getActivityForSite("SITE001");
  }

  @Test
  void getActivitySummary_notFoundWhenSiteMissing() {

    when(activityRepository.getActivityForSite("SITE001")).thenReturn(null);

    ResourceNotFoundException ex = assertThrows(ResourceNotFoundException.class,
        () -> service.getActivitySummary("site001"));

    assertEquals("No scale site found with id SITE001.", ex.getMessage());
  }

  @Test
  void getActivitySummary_notFoundWhenSiteIdBlank() {
    assertThrows(ResourceNotFoundException.class, () -> service.getActivitySummary("  "));
    verify(activityRepository, never()).getActivityForSite(any());
  }
}
