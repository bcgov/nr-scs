package ca.bc.gov.nrs.scs.backend.service.mapper;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import ca.bc.gov.nrs.scs.backend.domain.scalesite.ScaleSiteCoordinate;
import ca.bc.gov.nrs.scs.backend.domain.scalesite.ScaleSite;
import ca.bc.gov.nrs.scs.backend.domain.scalesite.ScaleSitePriorityCode;
import ca.bc.gov.nrs.scs.backend.domain.scalesite.SiteScalingMethod;
import ca.bc.gov.nrs.scs.backend.model.Coordinate;
import ca.bc.gov.nrs.scs.backend.model.ScaleSiteCreateRequest;
import ca.bc.gov.nrs.scs.backend.model.ScaleSiteSummary;
import ca.bc.gov.nrs.scs.backend.model.ScaleSiteUpdateRequest;
import ca.bc.gov.nrs.scs.backend.model.SiteScalingMethodInput;
import ca.bc.gov.nrs.scs.backend.model.SiteScalingMethodInput.ScaleSitePriorityCodeEnum;

import java.time.OffsetDateTime;
import java.util.List;
import org.junit.jupiter.api.Test;

class ScaleSiteApiMapperTest {

  @Test
  void toDomain_mapsAllFieldsAndUppercasesTimberBrand() {
    ScaleSiteCreateRequest req = new ScaleSiteCreateRequest(
        "  MAIN YARD  ",
        " 12345678 ",
        " 00 ",
        100L,
        " Nanaimo, BC ",
        List.of(
            new SiteScalingMethodInput("w", ScaleSitePriorityCodeEnum.P),
            new SiteScalingMethodInput("p", ScaleSitePriorityCodeEnum.S)));
    req.timberBrand("abc123");
    req.setLatitude(new Coordinate(49, 10, 22));
    req.setLongitude(new Coordinate(-123, 56, 31));

    ScaleSite domain = ScaleSiteApiMapper.toDomain(req);

    assertNull(domain.scaleSiteIdNmbr());
    assertEquals("MAIN YARD", domain.siteName());
    assertEquals("12345678", domain.ownerClientNumber());
    assertEquals("00", domain.ownerClientLocnCode());
    assertEquals(100L, domain.orgUnitNo());
    assertEquals("Nanaimo, BC", domain.siteLocation());
    assertEquals("ABC123", domain.timberBrand());
    assertEquals(49, domain.latitude().degrees());
    assertEquals(-123, domain.longitude().degrees());
    assertEquals(2, domain.scalingMethods().size());
    assertEquals("W", domain.scalingMethods().get(0).scaleMethodTypeCode());
    assertEquals(ScaleSitePriorityCode.PRIMARY, domain.scalingMethods().get(0).scaleSitePriorityCode());
  }

  @Test
  void toDomain_treatsBlankFieldsAsNull() {
    ScaleSiteCreateRequest req = new ScaleSiteCreateRequest(
        "  ",
        "  ",
        "  ",
        100L,
        "  ",
        List.of());

    ScaleSite domain = ScaleSiteApiMapper.toDomain(req);

    assertNull(domain.siteName());
    assertNull(domain.ownerClientNumber());
    assertNull(domain.ownerClientLocnCode());
    assertNull(domain.siteLocation());
    assertNull(domain.timberBrand());
    assertNull(domain.latitude());
    assertNull(domain.longitude());
    assertTrue(domain.scalingMethods().isEmpty());
  }

  @Test
  void toDomain_updateRequest_carriesIdAndMapsAllFields() {
    ScaleSiteUpdateRequest req = new ScaleSiteUpdateRequest(
        "  MAIN YARD  ",
        " 12345678 ",
        " 00 ",
        100L,
        " Nanaimo, BC ",
        List.of(
            new SiteScalingMethodInput("w", ScaleSitePriorityCodeEnum.P),
            new SiteScalingMethodInput("p", ScaleSitePriorityCodeEnum.S)));
    req.timberBrand("abc123");
    req.setLatitude(new Coordinate(49, 10, 22));
    req.setLongitude(new Coordinate(-123, 56, 31));

    ScaleSite domain = ScaleSiteApiMapper.toDomain(req, "SITE001");

    assertEquals("SITE001", domain.scaleSiteIdNmbr());
    assertEquals("MAIN YARD", domain.siteName());
    assertEquals("12345678", domain.ownerClientNumber());
    assertEquals("00", domain.ownerClientLocnCode());
    assertEquals(100L, domain.orgUnitNo());
    assertEquals("Nanaimo, BC", domain.siteLocation());
    assertEquals("ABC123", domain.timberBrand());
    assertEquals(49, domain.latitude().degrees());
    assertEquals(-123, domain.longitude().degrees());
    assertEquals(2, domain.scalingMethods().size());
    assertEquals("W", domain.scalingMethods().get(0).scaleMethodTypeCode());
    assertEquals(ScaleSitePriorityCode.PRIMARY, domain.scalingMethods().get(0).scaleSitePriorityCode());
  }

  @Test
  void toDomain_updateRequest_treatsBlankFieldsAsNull() {
    ScaleSiteUpdateRequest req = new ScaleSiteUpdateRequest(
        "  ",
        "  ",
        "  ",
        100L,
        "  ",
        List.of());

    ScaleSite domain = ScaleSiteApiMapper.toDomain(req, "SITE002");

    assertEquals("SITE002", domain.scaleSiteIdNmbr());
    assertNull(domain.siteName());
    assertNull(domain.ownerClientNumber());
    assertNull(domain.ownerClientLocnCode());
    assertNull(domain.siteLocation());
    assertNull(domain.timberBrand());
    assertNull(domain.latitude());
    assertNull(domain.longitude());
    assertTrue(domain.scalingMethods().isEmpty());
  }

  @Test
  void toScaleSiteSummary_projectsDomainWithFlatCoordinates() {
    ScaleSite domain = new ScaleSite(
        "SITE001",
        "MAIN YARD",
        "12345678",
        "00",
        100L,
        "Nanaimo, BC",
        "ABC123",
        new ScaleSiteCoordinate(49, 10, 22),
        new ScaleSiteCoordinate(-123, 56, 31),
        List.of(
            new SiteScalingMethod("W", ScaleSitePriorityCode.PRIMARY),
            new SiteScalingMethod("P", ScaleSitePriorityCode.SECONDARY)),
        OffsetDateTime.parse("2026-01-02T03:04:05Z"),
        "CREATOR",
        OffsetDateTime.parse("2026-02-03T04:05:06Z"),
        "UPDATER",
        7L);

    ScaleSiteSummary out = ScaleSiteApiMapper.toScaleSiteSummary(
        domain, "RKB - Selkirk Natural Resource District");

    assertTrue(out.getScaleSiteIdNmbr().isPresent());
    assertEquals("SITE001", out.getScaleSiteIdNmbr().get());
    assertTrue(out.getRegDistDisplay().isPresent());
    assertEquals("RKB - Selkirk Natural Resource District", out.getRegDistDisplay().get());
    assertTrue(out.getLatitudeDegrees().isPresent());
    assertEquals(49, out.getLatitudeDegrees().get());
    assertTrue(out.getLongitudeDegrees().isPresent());
    assertEquals(-123, out.getLongitudeDegrees().get());
    assertTrue(out.getSiteTypes().isPresent());
    assertEquals(2, out.getSiteTypes().get().size());
    assertEquals("CREATOR", out.getEntryUserid().get());
    assertEquals("UPDATER", out.getUpdateUserid().get());
    assertEquals(7L, out.getRevisionCount().get());
    assertEquals(OffsetDateTime.parse("2026-01-02T03:04:05Z"), out.getEntryTimestamp().get());
    assertEquals(OffsetDateTime.parse("2026-02-03T04:05:06Z"), out.getUpdateTimestamp().get());
  }

  @Test
  void toScaleSiteSummary_handlesMissingCoordinates() {
    ScaleSite domain = new ScaleSite(
        "SITE002", "BACKUP", "87654321", "00", 100L, "Prince George",
        null, null, null, List.of(new SiteScalingMethod("W", ScaleSitePriorityCode.PRIMARY)),
        null, null, null, null, null);

    ScaleSiteSummary out = ScaleSiteApiMapper.toScaleSiteSummary(domain, null);

    // JsonNullable wraps null, so it serializes as "field": null rather than being omitted.
    assertNull(out.getLatitudeDegrees().get());
    assertNull(out.getLongitudeDegrees().get());
    assertNull(out.getRegDistDisplay().get());
  }
}
