package ca.bc.gov.nrs.scs.backend.model.report;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.time.LocalDate;
import java.util.Map;

import org.junit.jupiter.api.Test;

/**
 * Unit coverage for the MSD report parameter mapping. This is the ONLY viable coverage for the request
 * building: Jasper report generation returns HTTP 500 on the deployed WAR, so the end-to-end report is
 * not exercisable in the running stack (see the UC-RPT-009 defects log). buildParameters is pure.
 */
class MarkSiteDesignationReportRequestTest {

  @Test
  void buildParameters_mapsEveryJasperParameter_withNormalization() {
    MarkSiteDesignationReportRequest req = new MarkSiteDesignationReportRequest();
    req.setRegDist("1831");
    req.setMarkOrSite("MARK");
    req.setMarkExemption("EX1");
    req.setEffectiveFrom(LocalDate.of(2026, 1, 15));
    req.setExpiryTo(LocalDate.of(2027, 12, 31));
    req.setSiteMark1("ab1");   // upper-cased
    req.setSiteMark2("  ");    // blank -> upperOrNull null -> normalizeForJasper ""

    Map<String, String> params = req.buildParameters("  IDIR\\USER  ");

    assertEquals("IDIR\\USER", params.get("P_USERID"));           // trimmed
    assertEquals("1831", params.get("P_ORG_UNIT_CODE"));
    assertEquals("MARK", params.get("P_MARK_SITE"));
    assertEquals("EX1", params.get("P_MARK_EXEMPTION"));
    assertEquals("20260115", params.get("P_EFFECTIVE_DATE_FROM")); // BASIC_ISO_DATE (yyyyMMdd)
    assertEquals("", params.get("P_EFFECTIVE_DATE_TO"));           // null date -> ""
    assertEquals("", params.get("P_EXPIRY_DATE_FROM"));
    assertEquals("20271231", params.get("P_EXPIRY_DATE_TO"));
    assertEquals("AB1", params.get("P_SM1"));                     // upperOrNull
    assertEquals("", params.get("P_SM2"));                       // blank -> ""
    assertEquals("", params.get("P_SM6"));                       // unset -> ""
  }

  @Test
  void buildParameters_blankRequesterAndAllOptionalFieldsEmpty() {
    MarkSiteDesignationReportRequest req = new MarkSiteDesignationReportRequest();
    req.setRegDist("ALL");

    Map<String, String> params = req.buildParameters("  ");

    assertEquals("", params.get("P_USERID"));      // blank requester -> ""
    // "ALL" is the no-filter sentinel — normalizeForJasper maps it (case-insensitively) to "".
    assertEquals("", params.get("P_ORG_UNIT_CODE"));
    assertEquals("", params.get("P_MARK_SITE"));
    assertEquals("", params.get("P_SM1"));
    assertEquals("", params.get("P_EFFECTIVE_DATE_FROM"));
  }
}
