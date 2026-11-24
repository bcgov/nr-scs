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
import ca.bc.gov.nrs.scs.backend.model.ScaleSiteSoftwareSummary;
import ca.bc.gov.nrs.scs.backend.repository.ScaleSiteRepository;
import ca.bc.gov.nrs.scs.backend.repository.ScaleSiteSoftwareRepository;
import java.time.LocalDate;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class ScaleSiteSoftwareServiceTest {

  @Mock private ScaleSiteSoftwareRepository repository;
  @Mock private ScaleSiteRepository scaleSiteRepository;

  private ScaleSiteSoftwareService service;

  @BeforeEach
  void setUp() {
    service = new ScaleSiteSoftwareService(repository, scaleSiteRepository);
  }

  @Test
  void getScaleSiteSoftware_throwsWhenIdBlank() {
    assertThrows(BadRequestException.class,
        () -> service.getScaleSiteSoftware("  "));
    verify(repository, never()).listByScaleSite(any());
  }

  @Test
  void getScaleSiteSoftware_throwsWhenScaleSiteNotFound() {
    when(scaleSiteRepository.getScaleSite("A12345")).thenReturn(null);

    assertThrows(ResourceNotFoundException.class,
        () -> service.getScaleSiteSoftware("A12345"));
    verify(repository, never()).listByScaleSite(any());
  }

  @Test
  void getScaleSiteSoftware_delegatesWhenScaleSiteExists() {
    when(scaleSiteRepository.getScaleSite("A12345"))
        .thenReturn(new ScaleSiteCore("A12345", "Main Yard", "Victoria"));
    when(repository.listByScaleSite("A12345")).thenReturn(List.of(
        new ca.bc.gov.nrs.scs.backend.domain.scalesite.ScaleSiteSoftwareRecord(
            "HarvestPro", "12", "3", "Weight", 42L, LocalDate.of(2026, 6, 30))));

    List<ScaleSiteSoftwareSummary> result = service.getScaleSiteSoftware("A12345");

    assertEquals(1, result.size());
    assertEquals("HarvestPro", result.get(0).getScalingProgram());
    assertEquals(42L, result.get(0).getReturnCount());
    verify(repository).listByScaleSite("A12345");
  }
}
