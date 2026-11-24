package ca.bc.gov.nrs.scs.backend.service.mapper;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import ca.bc.gov.nrs.scs.backend.domain.scalesite.ScaleSiteActivityRecord;
import ca.bc.gov.nrs.scs.backend.model.ScaleSiteActivitySummary;
import java.math.BigDecimal;
import java.time.LocalDate;
import org.junit.jupiter.api.Test;

class ScaleSiteActivityApiMapperTest {

  @Test
  void toModel_mapsAllFields() {
    ScaleSiteActivitySummary model = ScaleSiteActivityApiMapper.toModel(new ScaleSiteActivityRecord(
        "SITE001",
        LocalDate.of(2024, 9, 15),
        42L,
        new BigDecimal("1234.56"),
        new BigDecimal("98765.43")));

    assertEquals("SITE001", model.getScaleSiteIdNmbr());
    assertEquals(LocalDate.of(2024, 9, 15), model.getLastScaleDate().get());
    assertEquals(42L, model.getNumberOfSamples().get());
    assertEquals(new BigDecimal("1234.56"), model.getSampleVolume().get());
    assertEquals(new BigDecimal("98765.43"), model.getScaledVolume().get());
  }

  @Test
  void toModel_wrapsNullMetricsAsPresentNulls() {
    ScaleSiteActivitySummary model = ScaleSiteActivityApiMapper.toModel(
        new ScaleSiteActivityRecord("SITE001", null, null, null, null));

    assertEquals("SITE001", model.getScaleSiteIdNmbr());
    assertTrue(model.getLastScaleDate().isPresent());
    assertNull(model.getLastScaleDate().get());
    assertNull(model.getNumberOfSamples().get());
    assertNull(model.getSampleVolume().get());
    assertNull(model.getScaledVolume().get());
  }

  @Test
  void toModel_nullDomainReturnsNull() {
    assertNull(ScaleSiteActivityApiMapper.toModel(null));
  }
}
