package ca.bc.gov.nrs.scs.backend.service;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.reset;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import ca.bc.gov.nrs.scs.backend.dto.ExamUpgradeRow;
import ca.bc.gov.nrs.scs.backend.model.ExamUpgradeCreateRequest;
import ca.bc.gov.nrs.scs.backend.model.ExamUpgradeUpdateRequest;
import ca.bc.gov.nrs.scs.backend.model.ScalerTrainingTypeLov;
import ca.bc.gov.nrs.scs.backend.repository.ExamUpgradeRepository;
import ca.bc.gov.nrs.scs.backend.repository.LovRepository;
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
 * Proves Exam/Upgrade (ScalerTrainingType) mutations evict the {@code lov-scaler-training-type}
 * cache that backs the Exam/Upgrade dropdowns (LovService.getScalerTrainingTypeLov). Without
 * eviction an admin-created/updated/deleted type lingers in — or never reaches — the Scaler edit,
 * Scaler Exams/Upgrades create, and Scaler query dropdowns for the cache's 24h TTL: the reported
 * "admin-maintained types don't appear in the dropdowns" bug. Wires a real cache manager + both
 * real services (mocked repos) so the {@code @Cacheable}/{@code @CacheEvict} proxies actually run.
 */
@ExtendWith(SpringExtension.class)
class ExamUpgradeCacheEvictionTest {

  @Configuration
  @EnableCaching
  static class TestConfig {
    @Bean
    CacheManager cacheManager() {
      return new ConcurrentMapCacheManager("lov-scaler-training-type");
    }

    @Bean
    LovRepository lovRepository() {
      return mock(LovRepository.class);
    }

    @Bean
    ExamUpgradeRepository examUpgradeRepository() {
      return mock(ExamUpgradeRepository.class);
    }

    @Bean
    LovService lovService(LovRepository repo) {
      return new LovService(repo);
    }

    @Bean
    ExamUpgradeService examUpgradeService(ExamUpgradeRepository repo) {
      return new ExamUpgradeService(repo);
    }
  }

  @Autowired
  private CacheManager cacheManager;
  @Autowired
  private LovRepository lovRepository;
  @Autowired
  private ExamUpgradeRepository examUpgradeRepository;
  @Autowired
  private LovService lovService;
  @Autowired
  private ExamUpgradeService examUpgradeService;

  @BeforeEach
  void setUp() {
    // The Spring context (and its mock beans) is reused across test methods, so reset invocation
    // counts and re-stub for each test; also start each test with a cold cache.
    reset(lovRepository, examUpgradeRepository);
    cacheManager.getCache("lov-scaler-training-type").clear();
    when(lovRepository.getScalerTrainingTypeLov())
        .thenReturn(List.of(new ScalerTrainingTypeLov().code("001").description("Type A")));
  }

  private ExamUpgradeRow row() {
    ExamUpgradeRow r = new ExamUpgradeRow();
    r.setScalerTrainingClassCode("EXAM");
    r.setScalerTrainingTypeId("001");
    r.setLicenceAccreditInd("Y");
    r.setDescription("desc");
    r.setEffectiveDate(LocalDate.of(2025, 1, 1));
    return r;
  }

  private ExamUpgradeCreateRequest createRequest() {
    ExamUpgradeCreateRequest req = new ExamUpgradeCreateRequest();
    req.setScalerTrainingClassCode("EXAM");
    req.setLicenceAccreditInd("Y");
    req.setDescription("desc");
    req.setEffectiveDate(LocalDate.of(2025, 1, 1));
    return req;
  }

  private ExamUpgradeUpdateRequest updateRequest() {
    ExamUpgradeUpdateRequest req = new ExamUpgradeUpdateRequest();
    req.setLicenceAccreditInd("Y");
    req.setDescription("desc");
    req.setEffectiveDate(LocalDate.of(2025, 1, 1));
    return req;
  }

  private void warmCache() {
    lovService.getScalerTrainingTypeLov(); // miss -> repo hit
    lovService.getScalerTrainingTypeLov(); // hit  -> no repo hit
    verify(lovRepository, times(1)).getScalerTrainingTypeLov();
  }

  @Test
  void createExamUpgrade_evictsTrainingTypeLovCache() {
    warmCache();
    when(examUpgradeRepository.save(any())).thenReturn(row());

    examUpgradeService.createExamUpgrade(createRequest());

    lovService.getScalerTrainingTypeLov(); // must miss again -> second repo hit
    verify(lovRepository, times(2)).getScalerTrainingTypeLov();
  }

  @Test
  void updateExamUpgrade_evictsTrainingTypeLovCache() {
    warmCache();
    when(examUpgradeRepository.update(eq("EXAM"), eq("001"), any())).thenReturn(row());

    examUpgradeService.updateExamUpgrade("EXAM", "001", updateRequest());

    lovService.getScalerTrainingTypeLov();
    verify(lovRepository, times(2)).getScalerTrainingTypeLov();
  }

  @Test
  void deleteExamUpgrade_evictsTrainingTypeLovCache() {
    warmCache();
    doNothing().when(examUpgradeRepository).delete("EXAM", "001");

    examUpgradeService.deleteExamUpgrade("EXAM", "001");

    lovService.getScalerTrainingTypeLov();
    verify(lovRepository, times(2)).getScalerTrainingTypeLov();
  }
}
