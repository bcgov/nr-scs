package ca.bc.gov.nrs.scs.backend.controller;

import ca.bc.gov.nrs.scs.backend.constants.Permissions;
import ca.bc.gov.nrs.scs.backend.security.annotations.RequiresPermission;

import org.springframework.cache.CacheManager;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/internal")
public class InternalController {

    private final CacheManager cacheManager;

    public InternalController(CacheManager cacheManager) {
        this.cacheManager = cacheManager;
    }

  @PostMapping("/cache/evict")
  @RequiresPermission(Permissions.SYSTEM_ADMIN)
  public ResponseEntity<String> evictLovCaches() {
    cacheManager.getCacheNames().stream()
        .filter(name -> name.startsWith("lov-"))
        .forEach(name -> {
          var cache = cacheManager.getCache(name);
          if (cache != null) {
            cache.clear();
          }
        });
    return ResponseEntity.ok("All LOV caches evicted.");
  }
}
