package ca.bc.gov.nrs.scs.backend.domain.scaler;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("ScalerLicenceStatus")
class ScalerLicenceStatusTest {

  @Test
  void fromCode_mapsEveryStatusCaseAndWhitespaceInsensitively() {
    assertEquals(ScalerLicenceStatus.VALID, ScalerLicenceStatus.fromCode("VALID"));
    assertEquals(ScalerLicenceStatus.EXPIRED, ScalerLicenceStatus.fromCode("expired"));
    assertEquals(ScalerLicenceStatus.CANCELLED, ScalerLicenceStatus.fromCode(" Cancelled "));
    assertEquals(ScalerLicenceStatus.SUSPENDED, ScalerLicenceStatus.fromCode("suspended"));
  }

  @Test
  void fromCode_isLenientForNullAndUnknownValues() {
    assertNull(ScalerLicenceStatus.fromCode(null));
    assertNull(ScalerLicenceStatus.fromCode(""));
    assertNull(ScalerLicenceStatus.fromCode("REVOKED"));
  }
}
