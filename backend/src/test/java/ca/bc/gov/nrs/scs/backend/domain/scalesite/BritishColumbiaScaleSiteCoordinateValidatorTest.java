package ca.bc.gov.nrs.scs.backend.domain.scalesite;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;

class BritishColumbiaScaleSiteCoordinateValidatorTest {

  @Test
  void vancouverIsWithinBC() {
    ScaleSiteCoordinate latitude = new ScaleSiteCoordinate(49, 16, 0);
    ScaleSiteCoordinate longitude = new ScaleSiteCoordinate(-123, 7, 0);

    assertTrue(BritishColumbiaCoordinateValidator.isWithinBritishColumbia(latitude, longitude));
  }

  @Test
  void vancouverWithPositiveLongitudeIsWithinBC() {
    // Legacy stored W longitudes as positive integers; the magnitude-based check
    // means modern users can submit either convention.
    ScaleSiteCoordinate latitude = new ScaleSiteCoordinate(49, 16, 0);
    ScaleSiteCoordinate longitude = new ScaleSiteCoordinate(123, 7, 0);

    assertTrue(BritishColumbiaCoordinateValidator.isWithinBritishColumbia(latitude, longitude));
  }

  @Test
  void princeGeorgeIsWithinBC() {
    ScaleSiteCoordinate latitude = new ScaleSiteCoordinate(53, 55, 0);
    ScaleSiteCoordinate longitude = new ScaleSiteCoordinate(-122, 45, 0);

    assertTrue(BritishColumbiaCoordinateValidator.isWithinBritishColumbia(latitude, longitude));
  }

  @Test
  void torontoIsNotWithinBC() {
    ScaleSiteCoordinate latitude = new ScaleSiteCoordinate(43, 39, 0);
    ScaleSiteCoordinate longitude = new ScaleSiteCoordinate(-79, 23, 0);

    assertFalse(BritishColumbiaCoordinateValidator.isWithinBritishColumbia(latitude, longitude));
  }

  @Test
  void halifaxIsNotWithinBC() {
    // Note: the legacy polygon is a loose BC-shaped quadrilateral that includes
    // chunks of neighbouring provinces and US states (Calgary, for example,
    // falls inside it). Halifax is far enough east and south to be excluded.
    ScaleSiteCoordinate latitude = new ScaleSiteCoordinate(44, 39, 0);
    ScaleSiteCoordinate longitude = new ScaleSiteCoordinate(-63, 35, 0);

    assertFalse(BritishColumbiaCoordinateValidator.isWithinBritishColumbia(latitude, longitude));
  }

  @Test
  void northWestCornerIsWithinBC() {
    ScaleSiteCoordinate latitude = new ScaleSiteCoordinate(60, 53, 0);
    ScaleSiteCoordinate longitude = new ScaleSiteCoordinate(142, 26, 0);

    assertTrue(BritishColumbiaCoordinateValidator.isWithinBritishColumbia(latitude, longitude));
  }

  @Test
  void southEastCornerIsWithinBC() {
    ScaleSiteCoordinate latitude = new ScaleSiteCoordinate(46, 28, 0);
    ScaleSiteCoordinate longitude = new ScaleSiteCoordinate(110, 32, 0);

    assertTrue(BritishColumbiaCoordinateValidator.isWithinBritishColumbia(latitude, longitude));
  }

  @Test
  void nullCoordinateIsNotWithinBC() {
    ScaleSiteCoordinate latitude = new ScaleSiteCoordinate(49, 16, 0);

    assertFalse(BritishColumbiaCoordinateValidator.isWithinBritishColumbia(latitude, null));
    assertFalse(BritishColumbiaCoordinateValidator.isWithinBritishColumbia(null, latitude));
    assertFalse(BritishColumbiaCoordinateValidator.isWithinBritishColumbia(null, null));
  }

  @Test
  void coordinateWithNullComponentIsNotWithinBC() {
    ScaleSiteCoordinate complete = new ScaleSiteCoordinate(49, 16, 0);
    ScaleSiteCoordinate missingDegrees = new ScaleSiteCoordinate(null, 16, 0);
    ScaleSiteCoordinate missingMinutes = new ScaleSiteCoordinate(49, null, 0);
    ScaleSiteCoordinate missingSeconds = new ScaleSiteCoordinate(49, 16, null);

    assertFalse(BritishColumbiaCoordinateValidator.isWithinBritishColumbia(missingDegrees, complete));
    assertFalse(BritishColumbiaCoordinateValidator.isWithinBritishColumbia(complete, missingMinutes));
    assertFalse(BritishColumbiaCoordinateValidator.isWithinBritishColumbia(missingSeconds, complete));
  }
}
