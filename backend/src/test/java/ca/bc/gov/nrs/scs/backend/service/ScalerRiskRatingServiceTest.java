package ca.bc.gov.nrs.scs.backend.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import ca.bc.gov.nrs.scs.backend.exception.ResourceNotFoundException;
import ca.bc.gov.nrs.scs.backend.model.ScalerRiskRatingSummary;
import ca.bc.gov.nrs.scs.backend.repository.ScalerRiskRatingRepository;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
@DisplayName("ScalerRiskRatingService tests")
class ScalerRiskRatingServiceTest {

  @Mock
  private ScalerRiskRatingRepository scalerRiskRatingRepository;

  @Mock
  private ScalerService scalerService;

  @InjectMocks
  private ScalerRiskRatingService service;

  @Test
  void getScalerRiskRatings_upperCasesLicenceForBothGuardAndQuery() {
    List<ScalerRiskRatingSummary> rows = List.of(new ScalerRiskRatingSummary().riskQuestionnaireId(1L));
    // The guard and the data query must see the SAME normalised value, else a lower-case URL for an
    // upper-case-stored scaler would 404 despite the scaler existing.
    when(scalerService.scalerExists("AB12")).thenReturn(true);
    when(scalerRiskRatingRepository.getScalerRiskRatings("AB12")).thenReturn(rows);

    List<ScalerRiskRatingSummary> result = service.getScalerRiskRatings("ab12");

    assertSame(rows, result);
    verify(scalerService).scalerExists("AB12");
    verify(scalerRiskRatingRepository).getScalerRiskRatings("AB12");
  }

  @Test
  void getScalerRiskRatings_throwsNotFoundWhenScalerMissing() {
    when(scalerService.scalerExists("9999")).thenReturn(false);

    ResourceNotFoundException ex = assertThrows(
        ResourceNotFoundException.class,
        () -> service.getScalerRiskRatings("9999"));

    assertEquals("No scaler found with licence number 9999", ex.getMessage());
    verify(scalerRiskRatingRepository, never()).getScalerRiskRatings(any());
  }
}
