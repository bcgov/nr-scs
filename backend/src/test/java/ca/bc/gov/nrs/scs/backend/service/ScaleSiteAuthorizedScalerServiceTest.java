package ca.bc.gov.nrs.scs.backend.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import ca.bc.gov.nrs.scs.backend.domain.scalesite.ScaleSiteCore;
import ca.bc.gov.nrs.scs.backend.exception.BadRequestException;
import ca.bc.gov.nrs.scs.backend.exception.ResourceNotFoundException;
import ca.bc.gov.nrs.scs.backend.model.AuthorizedScalerSummary;
import ca.bc.gov.nrs.scs.backend.repository.ScaleSiteAuthorizedScalerRepository;
import ca.bc.gov.nrs.scs.backend.repository.ScaleSiteRepository;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class ScaleSiteAuthorizedScalerServiceTest {

  @Mock private ScaleSiteAuthorizedScalerRepository repository;
  @Mock private ScaleSiteRepository scaleSiteRepository;

  private ScaleSiteAuthorizedScalerService service;

  @BeforeEach
  void setUp() {
    service = new ScaleSiteAuthorizedScalerService(repository, scaleSiteRepository);
  }

  @Test
  void getScaleSiteAuthorizedScalers_throwsWhenIdBlank() {
    assertThrows(BadRequestException.class,
        () -> service.getScaleSiteAuthorizedScalers("  "));
    verify(repository, never()).listByScaleSite(any());
  }

  @Test
  void getScaleSiteAuthorizedScalers_throwsWhenScaleSiteNotFound() {
    when(scaleSiteRepository.getScaleSite("A12345")).thenReturn(null);

    assertThrows(ResourceNotFoundException.class,
        () -> service.getScaleSiteAuthorizedScalers("A12345"));
    verify(repository, never()).listByScaleSite(any());
  }

  @Test
  void getScaleSiteAuthorizedScalers_delegatesWhenScaleSiteExists() {
    when(scaleSiteRepository.getScaleSite("A12345"))
        .thenReturn(new ScaleSiteCore("A12345", "Main Yard", "Victoria"));
    when(repository.listByScaleSite("A12345")).thenReturn(List.of(
        new ca.bc.gov.nrs.scs.backend.domain.scalesite.AuthorizedScalerSummary(
            4001L, "1234", "DOE, JANE", "Active", "Owner", null, null, "N")));

    List<AuthorizedScalerSummary> result = service.getScaleSiteAuthorizedScalers("A12345");

    assertEquals(1, result.size());
    assertEquals("1234", result.get(0).getScalerLicenceNo());
    verify(repository).listByScaleSite("A12345");
  }
}
