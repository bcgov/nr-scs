package ca.bc.gov.nrs.scs.backend.service;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.reset;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import ca.bc.gov.nrs.scs.backend.dto.ValidLicenceAttributeRow;
import ca.bc.gov.nrs.scs.backend.model.GradingCodeAppointmentTypeLov;
import ca.bc.gov.nrs.scs.backend.model.ValidLicenceAttributeCreateRequest;
import ca.bc.gov.nrs.scs.backend.model.ValidLicenceAttributeUpdateRequest;
import ca.bc.gov.nrs.scs.backend.repository.LovRepository;
import ca.bc.gov.nrs.scs.backend.repository.ValidLicenceAttributeRepository;
import java.time.LocalDate;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.cache.concurrent.ConcurrentMapCacheManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.test.context.junit.jupiter.SpringExtension;

/**
 * Proves valid licence attribute mutations evict the two grading-code/appointment-type LOV
 * caches that back the Scaler appointment dropdowns (LovService.getGradingCodeAppointmentTypeLov
 * and ...LovMap). Without eviction a newly added attribute never reaches
 * Queries &gt; Scalers &gt; Appointments &gt; Add Appointment for the cache's 24h TTL — the
 * reported "newly added licence attributes do not appear in dropdowns" bug. Wires a real cache
 * manager plus both real services (mocked repos) so the {@code @Cacheable}/{@code @CacheEvict}
 * proxies actually run.
 */
@ExtendWith(SpringExtension.class)
class ValidLicenceAttributeCacheEvictionTest {

  private static final String LIST_CACHE = "lov-grading-code-appointment-type";
  private static final String MAP_CACHE = "lov-grading-code-appointment-type-map";
  // Not under test, but the create/update enrichment path reads it through @Cacheable,
  // and an unregistered cache name is a hard IllegalArgumentException.
  private static final String ACTING_CACHE = "lov-appointment-type-acting";

  private static final String GRADING = "B";
  private static final String APPT_TYPE = "F";

  @Configuration
  @EnableCaching
  static class TestConfig {
    @Bean
    CacheManager cacheManager() {
      return new ConcurrentMapCacheManager(LIST_CACHE, MAP_CACHE, ACTING_CACHE);
    }

    @Bean
    LovRepository lovRepository() {
      return mock(LovRepository.class);
    }

    @Bean
    ValidLicenceAttributeRepository validLicenceAttributeRepository() {
      return mock(ValidLicenceAttributeRepository.class);
    }

    @Bean
    LovService lovService(LovRepository repo) {
      return new LovService(repo);
    }

    @Bean
    ValidLicenceAttributeService validLicenceAttributeService(
        ValidLicenceAttributeRepository repo, LovService lovService) {
      return new ValidLicenceAttributeService(repo, lovService);
    }
  }

  @Autowired
  private CacheManager cacheManager;
  @Autowired
  private LovRepository lovRepository;
  @Autowired
  private ValidLicenceAttributeRepository attributeRepository;
  @Autowired
  private LovService lovService;
  @Autowired
  private ValidLicenceAttributeService attributeService;

  @BeforeEach
  void setUp() {
    // The Spring context (and its mock beans) is reused across test methods, so reset
    // invocation counts and re-stub for each test; also start each test with cold caches.
    reset(lovRepository, attributeRepository);
    cacheManager.getCache(LIST_CACHE).clear();
    cacheManager.getCache(MAP_CACHE).clear();
    cacheManager.getCache(ACTING_CACHE).clear();
    when(lovRepository.getGradingCodeAppointmentTypeLov())
        .thenReturn(List.of(new GradingCodeAppointmentTypeLov()
            .code("CF")
            .description("Forest Services - Coastal")
            .scaleGradingSystemCode("C")
            .scalerAppointmentType("F")));
  }

  private ValidLicenceAttributeRow row() {
    ValidLicenceAttributeRow row = new ValidLicenceAttributeRow();
    row.setScaleGradingSystemCode(GRADING);
    row.setScalerAppointmentType(APPT_TYPE);
    return row;
  }

  private ValidLicenceAttributeCreateRequest createRequest() {
    return new ValidLicenceAttributeCreateRequest()
        .scaleGradingSystemCode(GRADING)
        .scalerAppointmentType(APPT_TYPE)
        .effectiveDate(LocalDate.of(2026, 1, 1));
  }

  private ValidLicenceAttributeUpdateRequest updateRequest() {
    return new ValidLicenceAttributeUpdateRequest().effectiveDate(LocalDate.of(2026, 1, 1));
  }

  /** Warms both caches and asserts each one is serving hits (a single repo call between them). */
  private void warmCaches() {
    lovService.getGradingCodeAppointmentTypeLov(); // miss -> repo hit 1
    lovService.getGradingCodeAppointmentTypeLov(); // hit
    lovService.getGradingCodeAppointmentTypeLovMap(); // miss -> repo hit 2
    lovService.getGradingCodeAppointmentTypeLovMap(); // hit
    verify(lovRepository, times(2)).getGradingCodeAppointmentTypeLov();
  }

  /** Both caches must miss again -> two further repo hits, four in total. */
  private void assertBothCachesEvicted() {
    lovService.getGradingCodeAppointmentTypeLov();
    lovService.getGradingCodeAppointmentTypeLovMap();
    verify(lovRepository, times(4)).getGradingCodeAppointmentTypeLov();
  }

  @Test
  void createValidLicenceAttribute_evictsGradingCodeAppointmentTypeLovCaches() {
    warmCaches();
    when(attributeRepository.findByPk(GRADING, APPT_TYPE)).thenReturn(null);
    when(attributeRepository.insert(any(ValidLicenceAttributeCreateRequest.class))).thenReturn(row());

    attributeService.createValidLicenceAttribute(createRequest());

    assertBothCachesEvicted();
  }

  @Test
  void updateValidLicenceAttribute_evictsGradingCodeAppointmentTypeLovCaches() {
    warmCaches();
    when(attributeRepository.findByPk(GRADING, APPT_TYPE)).thenReturn(row());
    when(attributeRepository.update(
        org.mockito.ArgumentMatchers.eq(GRADING),
        org.mockito.ArgumentMatchers.eq(APPT_TYPE),
        any(ValidLicenceAttributeUpdateRequest.class))).thenReturn(row());

    attributeService.updateValidLicenceAttribute(GRADING, APPT_TYPE, updateRequest());

    assertBothCachesEvicted();
  }

  @Test
  void deleteValidLicenceAttribute_evictsGradingCodeAppointmentTypeLovCaches() {
    warmCaches();
    when(attributeRepository.findByPk(GRADING, APPT_TYPE)).thenReturn(row());
    when(attributeRepository.hasDependentAppointments(GRADING, APPT_TYPE)).thenReturn(false);

    attributeService.deleteValidLicenceAttribute(GRADING, APPT_TYPE);

    assertBothCachesEvicted();
  }

  /**
   * A rejected create must not evict: the caches still describe the committed DB state, and
   * throwing away a warm LOV on every duplicate-key attempt would be pure cache churn.
   */
  @Test
  void rejectedCreate_leavesCachesWarm() {
    warmCaches();
    when(attributeRepository.findByPk(GRADING, APPT_TYPE)).thenReturn(row()); // already exists -> 400

    try {
      attributeService.createValidLicenceAttribute(createRequest());
    } catch (RuntimeException expected) {
      // duplicate-combination rejection
    }

    lovService.getGradingCodeAppointmentTypeLov();
    lovService.getGradingCodeAppointmentTypeLovMap();
    verify(lovRepository, times(2)).getGradingCodeAppointmentTypeLov();
  }
}
