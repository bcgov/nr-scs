package ca.bc.gov.nrs.scs.backend.service;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.context.ApplicationContext;
import org.springframework.context.event.ContextRefreshedEvent;

@DisplayName("LovCacheWarmer")
class LovCacheWarmerTest {

  private LovService lovService;
  private LovCacheWarmer warmer;

  @BeforeEach
  void setUp() {
    lovService = mock(LovService.class);
    warmer = new LovCacheWarmer(lovService);
  }

  @Test
  @DisplayName("ignores the refresh event of a child (dispatcher servlet) context")
  void ignoresChildContextEvents() {
    ApplicationContext child = mock(ApplicationContext.class);
    when(child.getParent()).thenReturn(mock(ApplicationContext.class));

    warmer.onApplicationEvent(new ContextRefreshedEvent(child));

    verifyNoInteractions(lovService);
  }

  @Test
  @DisplayName("warms every LOV cache exactly once, even when the root context refreshes twice")
  void warmsEachCacheOnceForTheRootContext() {
    ContextRefreshedEvent rootRefresh = new ContextRefreshedEvent(rootContext());

    warmer.onApplicationEvent(rootRefresh);
    warmer.onApplicationEvent(rootRefresh);

    verify(lovService, times(1)).getRegionDistrictLov(null, null);
    verify(lovService, times(1)).getRegionDistrictRollupLov(null, null, null);
    verify(lovService, times(1)).getAppointmentTypeLov(null, null);
    verify(lovService, times(1)).getScaleMethodTypeLov(null, null);
    verify(lovService, times(1)).getGradingCodeAppointmentTypeLov();
    verify(lovService, times(1)).getGradingCodeAppointmentTypeLovMap();
    verify(lovService, times(1)).getScalerTrainingTypeLov();
    verify(lovService, times(1)).getAppointmentTypeActingMap();
    verify(lovService, times(1)).getSpeciesProductGradeXref();
    verify(lovService, times(1)).getStaticLov(null);
    verify(lovService, times(1)).getTemplateLov(null);
  }

  @Test
  @DisplayName("a failing loader is logged and skipped; the remaining caches still warm")
  void keepsWarmingWhenOneLoaderFails() {
    when(lovService.getStaticLov(null)).thenThrow(new IllegalStateException("LOV table offline"));

    warmer.onApplicationEvent(new ContextRefreshedEvent(rootContext()));

    verify(lovService).getStaticLov(null);
    verify(lovService).getTemplateLov(null);
  }

  private static ApplicationContext rootContext() {
    ApplicationContext root = mock(ApplicationContext.class);
    when(root.getParent()).thenReturn(null);
    return root;
  }
}
