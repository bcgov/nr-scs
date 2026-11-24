package ca.bc.gov.nrs.scs.backend.service;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.reset;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import ca.bc.gov.nrs.scs.backend.model.ScaleAuthTemplate;
import ca.bc.gov.nrs.scs.backend.model.ScaleAuthTemplateSaveRequest;
import ca.bc.gov.nrs.scs.backend.model.StaticLov;
import ca.bc.gov.nrs.scs.backend.repository.LovRepository;
import ca.bc.gov.nrs.scs.backend.repository.ScaleAuthTemplateRepository;
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
 * Proves template mutations evict the {@code lov-template} cache that backs the template
 * dropdowns (LovService.getTemplateLov). Without eviction a deleted/created/updated template
 * lingers in those dropdowns for the cache TTL — the reported MSD / Scaler Auth / Scale Site
 * Auth stale-dropdown bug. Wires a real cache manager + both real services (mocked repos) so
 * the {@code @Cacheable}/{@code @CacheEvict} proxies actually run.
 */
@ExtendWith(SpringExtension.class)
class ScaleAuthTemplateCacheEvictionTest {

  private static final String FILTER = "SCS_SCALE_AUTH_TMPLT_LV_VW_PKG";

  @Configuration
  @EnableCaching
  static class TestConfig {
    @Bean
    CacheManager cacheManager() {
      return new ConcurrentMapCacheManager("lov-template");
    }

    @Bean
    LovRepository lovRepository() {
      return mock(LovRepository.class);
    }

    @Bean
    ScaleAuthTemplateRepository scaleAuthTemplateRepository() {
      return mock(ScaleAuthTemplateRepository.class);
    }

    @Bean
    LovService lovService(LovRepository repo) {
      return new LovService(repo);
    }

    @Bean
    ScaleAuthTemplateService scaleAuthTemplateService(ScaleAuthTemplateRepository repo) {
      return new ScaleAuthTemplateService(repo);
    }
  }

  @Autowired
  private CacheManager cacheManager;
  @Autowired
  private LovRepository lovRepository;
  @Autowired
  private ScaleAuthTemplateRepository templateRepository;
  @Autowired
  private LovService lovService;
  @Autowired
  private ScaleAuthTemplateService templateService;

  @BeforeEach
  void setUp() {
    // The Spring context (and its mock beans) is reused across test methods, so reset
    // invocation counts and re-stub for each test; also start each test with a cold cache.
    reset(lovRepository, templateRepository);
    cacheManager.getCache("lov-template").clear();
    when(lovRepository.getTemplateLov(FILTER))
        .thenReturn(List.of(new StaticLov().code("1").description("Template A")));
  }

  private ScaleAuthTemplateSaveRequest validRequest() {
    return new ScaleAuthTemplateSaveRequest()
        .scaleAuthTemplateName("Template A")
        .scaleConditionClassCode("GENERAL");
  }

  private void warmCache() {
    lovService.getTemplateLov(FILTER); // miss -> repo hit
    lovService.getTemplateLov(FILTER); // hit  -> no repo hit
    verify(lovRepository, times(1)).getTemplateLov(FILTER);
  }

  @Test
  void deleteTemplate_evictsTemplateLovCache() {
    warmCache();
    when(templateRepository.getTemplate(1L)).thenReturn(new ScaleAuthTemplate().scaleAuthTemplateId(1L));

    templateService.deleteTemplate(1L);

    lovService.getTemplateLov(FILTER); // must miss again -> second repo hit
    verify(lovRepository, times(2)).getTemplateLov(FILTER);
  }

  @Test
  void createTemplate_evictsTemplateLovCache() {
    warmCache();
    when(templateRepository.createTemplate("Template A", "GENERAL", null))
        .thenReturn(new ScaleAuthTemplate().scaleAuthTemplateId(2L));
    when(templateRepository.getTemplate(2L)).thenReturn(new ScaleAuthTemplate().scaleAuthTemplateId(2L));

    templateService.createTemplate(validRequest());

    lovService.getTemplateLov(FILTER);
    verify(lovRepository, times(2)).getTemplateLov(FILTER);
  }

  @Test
  void updateTemplate_evictsTemplateLovCache() {
    warmCache();
    when(templateRepository.getTemplate(3L)).thenReturn(new ScaleAuthTemplate().scaleAuthTemplateId(3L));
    when(templateRepository.updateTemplate(3L, "Template A", "GENERAL", null))
        .thenReturn(new ScaleAuthTemplate().scaleAuthTemplateId(3L));

    templateService.updateTemplate(3L, validRequest());

    lovService.getTemplateLov(FILTER);
    verify(lovRepository, times(2)).getTemplateLov(FILTER);
  }
}
