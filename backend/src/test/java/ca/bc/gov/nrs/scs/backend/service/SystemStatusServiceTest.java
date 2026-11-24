package ca.bc.gov.nrs.scs.backend.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("SystemStatusService tests")
class SystemStatusServiceTest {

  @Test
  void reportsEnabledWhenConfiguredTrue() {
    SystemStatusService service = new SystemStatusService(true);
    assertTrue(service.isEnabled());
    assertEquals(Boolean.TRUE, service.getStatus().getEnabled());
  }

  @Test
  void reportsDisabledWhenConfiguredFalse() {
    SystemStatusService service = new SystemStatusService(false);
    assertFalse(service.isEnabled());
    assertEquals(Boolean.FALSE, service.getStatus().getEnabled());
  }
}
