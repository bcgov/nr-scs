package ca.bc.gov.nrs.scs.backend.controller;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.cache.Cache;
import org.springframework.cache.CacheManager;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

class InternalControllerTest {

  private CacheManager cacheManager;
  private MockMvc mockMvc;

  @BeforeEach
  void setUp() {
    cacheManager = mock(CacheManager.class);
    mockMvc = MockMvcBuilders
        .standaloneSetup(new InternalController(cacheManager))
        .build();
  }

  @Test
  void evictCaches_returns200AndEvictsAllLovCaches() throws Exception {
    Cache regionCache = mock(Cache.class);
    Cache appointmentCache = mock(Cache.class);

    when(cacheManager.getCacheNames()).thenReturn(List.of("lov-region-district", "lov-appointment-type", "some-other-cache"));
    when(cacheManager.getCache("lov-region-district")).thenReturn(regionCache);
    when(cacheManager.getCache("lov-appointment-type")).thenReturn(appointmentCache);

    mockMvc.perform(post("/api/internal/cache/evict"))
        .andExpect(status().isOk())
        .andExpect(content().string("All LOV caches evicted."));

    verify(regionCache).clear();
    verify(appointmentCache).clear();
    verify(cacheManager, never()).getCache("some-other-cache");
  }

  @Test
  void evictCaches_skipsNonLovCacheNames() throws Exception {
    when(cacheManager.getCacheNames()).thenReturn(List.of("some-other-cache", "report-cache"));

    mockMvc.perform(post("/api/internal/cache/evict"))
        .andExpect(status().isOk());

    verify(cacheManager, never()).getCache("some-other-cache");
    verify(cacheManager, never()).getCache("report-cache");
  }

  @Test
  void evictCaches_toleratesNullCacheReference() throws Exception {
    when(cacheManager.getCacheNames()).thenReturn(List.of("lov-region-district"));
    when(cacheManager.getCache("lov-region-district")).thenReturn(null);

    mockMvc.perform(post("/api/internal/cache/evict"))
        .andExpect(status().isOk());
  }
}
