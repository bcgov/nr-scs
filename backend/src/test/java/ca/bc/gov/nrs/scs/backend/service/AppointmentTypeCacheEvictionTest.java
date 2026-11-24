package ca.bc.gov.nrs.scs.backend.service;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.reset;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import ca.bc.gov.nrs.scs.backend.model.AppointmentType;
import ca.bc.gov.nrs.scs.backend.model.AppointmentTypeCreateRequest;
import ca.bc.gov.nrs.scs.backend.model.AppointmentTypeLov;
import ca.bc.gov.nrs.scs.backend.model.AppointmentTypeUpdateRequest;
import ca.bc.gov.nrs.scs.backend.model.GradingCodeAppointmentTypeLov;
import ca.bc.gov.nrs.scs.backend.repository.AppointmentTypeRepository;
import ca.bc.gov.nrs.scs.backend.repository.LovRepository;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentMatchers;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.cache.concurrent.ConcurrentMapCacheManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.test.context.junit.jupiter.SpringExtension;

/**
 * Proves appointment-type mutations evict the LOV caches that back the appointment-type dropdowns
 * (LovService.getAppointmentTypeLov, getAppointmentTypeActingMap, getGradingCodeAppointmentTypeLov).
 * Without eviction a newly created/updated/deleted appointment type lingers in those dropdowns for
 * the cache TTL — the reported "new Appointment Type missing from the Valid Licence Attributes and
 * Queries - Scalers dropdowns" bug. Wires a real cache manager + both real services (mocked repos)
 * so the {@code @Cacheable}/{@code @CacheEvict} proxies actually run.
 *
 * <p>The three caches asserted here are each backed by a distinct repository method, so an
 * invocation count cleanly proves the miss/hit/re-miss cycle. The fourth annotated cache,
 * {@code lov-grading-code-appointment-type-map}, shares its repository method with the grading-code
 * list cache and is cleared by the same {@code allEntries=true} eviction.
 */
@ExtendWith(SpringExtension.class)
class AppointmentTypeCacheEvictionTest {

  @Configuration
  @EnableCaching
  static class TestConfig {
    @Bean
    CacheManager cacheManager() {
      return new ConcurrentMapCacheManager(
          "lov-appointment-type",
          "lov-appointment-type-acting",
          "lov-grading-code-appointment-type",
          "lov-grading-code-appointment-type-map");
    }

    @Bean
    LovRepository lovRepository() {
      return mock(LovRepository.class);
    }

    @Bean
    AppointmentTypeRepository appointmentTypeRepository() {
      return mock(AppointmentTypeRepository.class);
    }

    @Bean
    LovService lovService(LovRepository repo) {
      return new LovService(repo);
    }

    @Bean
    AppointmentTypeService appointmentTypeService(AppointmentTypeRepository repo) {
      return new AppointmentTypeService(repo);
    }
  }

  @Autowired
  private CacheManager cacheManager;
  @Autowired
  private LovRepository lovRepository;
  @Autowired
  private AppointmentTypeRepository appointmentTypeRepository;
  @Autowired
  private LovService lovService;
  @Autowired
  private AppointmentTypeService appointmentTypeService;

  @BeforeEach
  void setUp() {
    // The Spring context (and its mock beans) is reused across test methods, so reset invocation
    // counts and re-stub for each test; also start each test with a cold cache.
    reset(lovRepository, appointmentTypeRepository);
    cacheManager.getCacheNames().forEach(name -> cacheManager.getCache(name).clear());
    when(lovRepository.getAppointmentTypeLov(null, null))
        .thenReturn(List.of(new AppointmentTypeLov().code("A").description("Alpha")));
    when(lovRepository.getAppointmentTypeActingMap()).thenReturn(Map.of("A", "N"));
    when(lovRepository.getGradingCodeAppointmentTypeLov())
        .thenReturn(List.of(new GradingCodeAppointmentTypeLov()
            .code("A").description("Alpha").scaleGradingSystemCode("C").scalerAppointmentType("A")));
  }

  private AppointmentTypeCreateRequest validCreateRequest() {
    return new AppointmentTypeCreateRequest()
        .code("ABCD")
        .description("Description")
        .actingInd(AppointmentTypeCreateRequest.ActingIndEnum.N)
        .effectiveDate(LocalDate.of(2026, 1, 1))
        .expiryDate(LocalDate.of(2026, 12, 31));
  }

  private AppointmentTypeUpdateRequest validUpdateRequest() {
    return new AppointmentTypeUpdateRequest()
        .description("Description")
        .actingInd(AppointmentTypeUpdateRequest.ActingIndEnum.N)
        .effectiveDate(LocalDate.of(2026, 1, 1))
        .expiryDate(LocalDate.of(2026, 12, 31));
  }

  private void warmCaches() {
    lovService.getAppointmentTypeLov(null, null); // miss -> repo hit
    lovService.getAppointmentTypeLov(null, null); // hit  -> no repo hit
    lovService.getAppointmentTypeActingMap();
    lovService.getAppointmentTypeActingMap();
    lovService.getGradingCodeAppointmentTypeLov();
    lovService.getGradingCodeAppointmentTypeLov();
    verify(lovRepository, times(1)).getAppointmentTypeLov(null, null);
    verify(lovRepository, times(1)).getAppointmentTypeActingMap();
    verify(lovRepository, times(1)).getGradingCodeAppointmentTypeLov();
  }

  private void assertCachesEvicted() {
    lovService.getAppointmentTypeLov(null, null); // must miss again -> second repo hit
    lovService.getAppointmentTypeActingMap();
    lovService.getGradingCodeAppointmentTypeLov();
    verify(lovRepository, times(2)).getAppointmentTypeLov(null, null);
    verify(lovRepository, times(2)).getAppointmentTypeActingMap();
    verify(lovRepository, times(2)).getGradingCodeAppointmentTypeLov();
  }

  @Test
  void createAppointmentType_evictsAppointmentTypeLovCaches() {
    warmCaches();
    when(appointmentTypeRepository.findByCode("ABCD")).thenReturn(null);
    when(appointmentTypeRepository.create(ArgumentMatchers.any(AppointmentTypeCreateRequest.class)))
        .thenReturn(new AppointmentType().code("ABCD"));

    appointmentTypeService.createAppointmentType(validCreateRequest());

    assertCachesEvicted();
  }

  @Test
  void updateAppointmentType_evictsAppointmentTypeLovCaches() {
    warmCaches();
    when(appointmentTypeRepository.findByCode("ABCD")).thenReturn(new AppointmentType().code("ABCD"));
    when(appointmentTypeRepository.update(
        ArgumentMatchers.eq("ABCD"), ArgumentMatchers.any(AppointmentTypeUpdateRequest.class)))
        .thenReturn(new AppointmentType().code("ABCD"));

    appointmentTypeService.updateAppointmentType("ABCD", validUpdateRequest());

    assertCachesEvicted();
  }

  @Test
  void deleteAppointmentType_evictsAppointmentTypeLovCaches() {
    warmCaches();
    when(appointmentTypeRepository.findByCode("ABCD")).thenReturn(new AppointmentType().code("ABCD"));
    when(appointmentTypeRepository.hasDependentScalerAppointments("ABCD")).thenReturn(false);

    appointmentTypeService.deleteAppointmentType("ABCD");

    assertCachesEvicted();
  }
}
