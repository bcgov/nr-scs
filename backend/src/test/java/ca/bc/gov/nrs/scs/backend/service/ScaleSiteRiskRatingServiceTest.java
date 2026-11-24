package ca.bc.gov.nrs.scs.backend.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import ca.bc.gov.nrs.scs.backend.exception.ResourceNotFoundException;
import ca.bc.gov.nrs.scs.backend.model.ScaleSiteRiskRatingSummary;
import ca.bc.gov.nrs.scs.backend.repository.ScaleSiteRiskRatingRepository;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
@DisplayName("ScaleSiteRiskRatingService tests")
class ScaleSiteRiskRatingServiceTest {

  @Mock
  private ScaleSiteRiskRatingRepository scaleSiteRiskRatingRepository;

  @Mock
  private ScaleSiteService scaleSiteService;

  @InjectMocks
  private ScaleSiteRiskRatingService service;

  @Test
  void getScaleSiteRiskRatings_guardsAndQueriesTheSameValue() {
    List<ScaleSiteRiskRatingSummary> rows =
        List.of(new ScaleSiteRiskRatingSummary().riskQuestionnaireId(1L));
    // The guard and the data query must see the SAME value, else an existing scale site could 404.
    when(scaleSiteService.scaleSiteExists("A12345")).thenReturn(true);
    when(scaleSiteRiskRatingRepository.getScaleSiteRiskRatings("A12345")).thenReturn(rows);

    List<ScaleSiteRiskRatingSummary> result = service.getScaleSiteRiskRatings("A12345");

    assertSame(rows, result);
    verify(scaleSiteService).scaleSiteExists("A12345");
    verify(scaleSiteRiskRatingRepository).getScaleSiteRiskRatings("A12345");
  }

  @Test
  void getScaleSiteRiskRatings_throwsNotFoundWhenScaleSiteMissing() {
    when(scaleSiteService.scaleSiteExists("9999")).thenReturn(false);

    ResourceNotFoundException ex = assertThrows(
        ResourceNotFoundException.class,
        () -> service.getScaleSiteRiskRatings("9999"));

    assertEquals("No scale site found with number 9999", ex.getMessage());
    verify(scaleSiteRiskRatingRepository, never()).getScaleSiteRiskRatings(any());
  }

  @Test
  void getScaleSiteRiskRatings_foldsLowerCaseNumberForGuardAndQuery() {
    List<ScaleSiteRiskRatingSummary> rows =
        List.of(new ScaleSiteRiskRatingSummary().riskQuestionnaireId(1L));
    // scaleSiteExists folds case; the query must see the folded value too, else a lower-case number
    // passes the guard and then matches nothing (200 []).
    when(scaleSiteService.scaleSiteExists("019V")).thenReturn(true);
    when(scaleSiteRiskRatingRepository.getScaleSiteRiskRatings("019V")).thenReturn(rows);

    List<ScaleSiteRiskRatingSummary> result = service.getScaleSiteRiskRatings(" 019v ");

    assertSame(rows, result);
    verify(scaleSiteRiskRatingRepository).getScaleSiteRiskRatings("019V");
  }
}
