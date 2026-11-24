package ca.bc.gov.nrs.scs.backend.domain.checkscale;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

import org.junit.jupiter.api.Test;

class ScalerCheckScaleFilterTest {

  private static final String LICENCE = "1234";

  @Test
  void all_matchesAllFourLicenceColumns() {
    ScalerCheckScaleFilter filter = ScalerCheckScaleFilter.ALL;

    assertEquals(LICENCE, filter.primOrigLicenceNo(LICENCE));
    assertEquals(LICENCE, filter.secOrigLicenceNo(LICENCE));
    assertEquals(LICENCE, filter.primCheckLicenceNo(LICENCE));
    assertEquals(LICENCE, filter.secCheckLicenceNo(LICENCE));
  }

  @Test
  void primary_matchesPrimaryOriginalOnly() {
    ScalerCheckScaleFilter filter = ScalerCheckScaleFilter.PRIMARY;

    assertEquals(LICENCE, filter.primOrigLicenceNo(LICENCE));
    assertNull(filter.secOrigLicenceNo(LICENCE));
    assertNull(filter.primCheckLicenceNo(LICENCE));
    assertNull(filter.secCheckLicenceNo(LICENCE));
  }

  @Test
  void secondary_matchesSecondaryOriginalOnly() {
    ScalerCheckScaleFilter filter = ScalerCheckScaleFilter.SECONDARY;

    assertNull(filter.primOrigLicenceNo(LICENCE));
    assertEquals(LICENCE, filter.secOrigLicenceNo(LICENCE));
    assertNull(filter.primCheckLicenceNo(LICENCE));
    assertNull(filter.secCheckLicenceNo(LICENCE));
  }

  @Test
  void primarySecondary_matchesBothOriginalColumns() {
    ScalerCheckScaleFilter filter = ScalerCheckScaleFilter.PRIMARY_SECONDARY;

    assertEquals(LICENCE, filter.primOrigLicenceNo(LICENCE));
    assertEquals(LICENCE, filter.secOrigLicenceNo(LICENCE));
    assertNull(filter.primCheckLicenceNo(LICENCE));
    assertNull(filter.secCheckLicenceNo(LICENCE));
  }

  @Test
  void check_matchesBothCheckColumns() {
    // Deliberate fix of the legacy list-query bug, which bound sec_check + sec_orig
    // both list and stats now match prim_check + sec_check.
    ScalerCheckScaleFilter filter = ScalerCheckScaleFilter.CHECK;

    assertNull(filter.primOrigLicenceNo(LICENCE));
    assertNull(filter.secOrigLicenceNo(LICENCE));
    assertEquals(LICENCE, filter.primCheckLicenceNo(LICENCE));
    assertEquals(LICENCE, filter.secCheckLicenceNo(LICENCE));
  }

  @Test
  void fromLabel_resolvesLegacyDropdownValues() {
    assertEquals(ScalerCheckScaleFilter.ALL, ScalerCheckScaleFilter.fromLabel("All"));
    assertEquals(ScalerCheckScaleFilter.PRIMARY, ScalerCheckScaleFilter.fromLabel("Primary"));
    assertEquals(ScalerCheckScaleFilter.SECONDARY, ScalerCheckScaleFilter.fromLabel("Secondary"));
    assertEquals(
        ScalerCheckScaleFilter.PRIMARY_SECONDARY,
        ScalerCheckScaleFilter.fromLabel("Primary/Secondary"));
    assertEquals(ScalerCheckScaleFilter.CHECK, ScalerCheckScaleFilter.fromLabel("Check"));
  }

  @Test
  void fromLabel_isCaseInsensitiveAndTrims() {
    assertEquals(ScalerCheckScaleFilter.CHECK, ScalerCheckScaleFilter.fromLabel(" check "));
    assertEquals(
        ScalerCheckScaleFilter.PRIMARY_SECONDARY,
        ScalerCheckScaleFilter.fromLabel("PRIMARY/SECONDARY"));
  }

  @Test
  void fromLabel_defaultsToAllLikeLegacy() {
    assertEquals(ScalerCheckScaleFilter.ALL, ScalerCheckScaleFilter.fromLabel(null));
    assertEquals(ScalerCheckScaleFilter.ALL, ScalerCheckScaleFilter.fromLabel(""));
    assertEquals(ScalerCheckScaleFilter.ALL, ScalerCheckScaleFilter.fromLabel("bogus"));
  }
}
