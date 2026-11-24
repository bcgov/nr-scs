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
import ca.bc.gov.nrs.scs.backend.model.MarkSiteDesignationSummary;
import ca.bc.gov.nrs.scs.backend.repository.ScaleSiteMarkSiteDesignationRepository;
import ca.bc.gov.nrs.scs.backend.repository.ScaleSiteRepository;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class ScaleSiteMarkSiteDesignationServiceTest {

  @Mock private ScaleSiteMarkSiteDesignationRepository repository;
  @Mock private ScaleSiteRepository scaleSiteRepository;

  private ScaleSiteMarkSiteDesignationService service;

  @BeforeEach
  void setUp() {
    service = new ScaleSiteMarkSiteDesignationService(repository, scaleSiteRepository);
  }

  @Test
  void getScaleSiteMarkSiteDesignations_throwsWhenIdBlank() {
    assertThrows(BadRequestException.class,
        () -> service.getScaleSiteMarkSiteDesignations("  "));
    verify(repository, never()).listByScaleSite(any());
  }

  @Test
  void getScaleSiteMarkSiteDesignations_throwsWhenScaleSiteNotFound() {
    when(scaleSiteRepository.getScaleSite("A12345")).thenReturn(null);

    assertThrows(ResourceNotFoundException.class,
        () -> service.getScaleSiteMarkSiteDesignations("A12345"));
    verify(repository, never()).listByScaleSite(any());
  }

  @Test
  void getScaleSiteMarkSiteDesignations_delegatesWhenScaleSiteExists() {
    when(scaleSiteRepository.getScaleSite("A12345"))
        .thenReturn(new ScaleSiteCore("A12345", "Main Yard", "Victoria"));
    when(repository.listByScaleSite("A12345")).thenReturn(List.of(
        new ca.bc.gov.nrs.scs.backend.domain.scalesite.MarkSiteDesignationSummary(
            "AB1234", "A12345", "00012345")));

    List<MarkSiteDesignationSummary> result = service.getScaleSiteMarkSiteDesignations("A12345");

    assertEquals(1, result.size());
    assertEquals("AB1234", result.get(0).getTimberMark());
    verify(repository).listByScaleSite("A12345");
  }
}
