package ca.bc.gov.nrs.scs.backend.model.report;

import ca.bc.gov.nrs.scs.backend.model.SortOrder;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * `buildParameters()` for every report request type, plus the normalization helpers on
 * {@link ReportRequest} they all share.
 *
 * WHY THIS IS THE HIGHEST-VALUE REPORT TEST IN THE BACKEND. `buildParameters()` IS the report contract:
 * the map it returns becomes the Jasper/Crystal {@code promptex-P_*} parameter set, so a wrong key name, a
 * wrong date format, or a value normalized the wrong way produces a report that renders perfectly and
 * answers the wrong question — the failure mode no HTTP-level or UI-level test can see. Before this file
 * only {@code ScaleSiteComplianceReportRequest} (2 parameters, the simplest of the nine) had any coverage.
 *
 * The normalization rules are subtle and asymmetric on purpose, so each is pinned explicitly:
 *   • {@code normalizeForJasper} collapses BOTH blank and the literal "ALL" to an EMPTY string — Jasper
 *     treats empty as "no filter", so "ALL" must not be passed through as a value to match on.
 *     That rule is UNIFORM — every report, SCS_REP025/026 included. An earlier version of this file
 *     claimed those two were a deliberate exception that sent the literal "ALL"; that was wrong, and the
 *     tests below record how it was settled against legacy.
 *   • Dates go out as BASIC_ISO_DATE ({@code yyyyMMdd}), not ISO {@code yyyy-MM-dd}.
 *   • A sort of 0 (meaning "none") goes out as empty, not "0".
 */
class ReportRequestParametersTest {

  private static final String REQUESTER = "IDIR\\jsmith";

  // ---------------------------------------------------------------- shared normalization (ReportRequest)

  @Nested
  @DisplayName("shared normalization helpers")
  class SharedNormalization {

    /** ScalingAdministration is the thinnest subclass, so it exercises the base helpers with least noise. */
    private ScalingAdministrationReportRequest request() {
      return new ScalingAdministrationReportRequest();
    }

    @Test
    void regDistAll_isSentAsEmptyMeaningNoFilter() {
      ScalingAdministrationReportRequest request = request();
      request.setRegDist("ALL");

      assertEquals("", request.buildParameters(REQUESTER).get("P_ORG_UNIT_CODE"));
    }

    @Test
    void regDistAll_isRecognizedRegardlessOfCase() {
      ScalingAdministrationReportRequest request = request();
      request.setRegDist("all");

      assertEquals("", request.buildParameters(REQUESTER).get("P_ORG_UNIT_CODE"));
    }

    @Test
    void regDistNull_isSentAsEmpty() {
      assertEquals("", request().buildParameters(REQUESTER).get("P_ORG_UNIT_CODE"));
    }

    @Test
    void regDist_isTrimmed() {
      ScalingAdministrationReportRequest request = request();
      request.setRegDist("  DCC  ");

      assertEquals("DCC", request.buildParameters(REQUESTER).get("P_ORG_UNIT_CODE"));
    }

    @Test
    void dates_areSentInBasicIsoFormat() {
      // yyyyMMdd, NOT yyyy-MM-dd — Jasper's date parameters expect the compact form.
      ScalingAdministrationReportRequest request = request();
      request.setFromDate(LocalDate.of(2024, 1, 5));
      request.setToDate(LocalDate.of(2024, 12, 31));

      Map<String, String> params = request.buildParameters(REQUESTER);

      assertEquals("20240105", params.get("P_FROM_DATE"));
      assertEquals("20241231", params.get("P_TO_DATE"));
    }

    @Test
    void absentDates_areSentAsEmptyRatherThanOmitted() {
      // The keys must still be PRESENT: Jasper rejects a run that omits a declared parameter.
      Map<String, String> params = request().buildParameters(REQUESTER);

      assertTrue(params.containsKey("P_FROM_DATE"));
      assertTrue(params.containsKey("P_TO_DATE"));
      assertEquals("", params.get("P_FROM_DATE"));
      assertEquals("", params.get("P_TO_DATE"));
    }

    @Test
    void requester_isTrimmedIntoTheUserIdParameter() {
      assertEquals("IDIR\\jsmith", request().buildParameters("  IDIR\\jsmith  ").get("P_USERID"));
    }

    @Test
    void nullRequester_becomesAnEmptyUserIdRatherThanTheStringNull() {
      assertEquals("", request().buildParameters(null).get("P_USERID"));
    }

    @Test
    void blankRequester_becomesAnEmptyUserId() {
      assertEquals("", request().buildParameters("   ").get("P_USERID"));
    }

    @Test
    void outputFormat_defaultsToPdf() {
      assertEquals(OutputFormatEnum.PDF, request().getOutputFormat());
      assertEquals("pdf", request().getOutputFormatValue());
    }

    @Test
    void outputFormat_xlsIsReportedAsLowercaseXls() {
      ScalingAdministrationReportRequest request = request();
      request.setOutputFormat(OutputFormatEnum.XLS);

      assertEquals("xls", request.getOutputFormatValue());
    }

    @Test
    void preview_defaultsToTrue() {
      // The service branches on this to choose an inline response over a queued async job, so the default
      // decides what an omitted "preview" field does.
      assertEquals(Boolean.TRUE, request().getPreview());
    }
  }

  // ---------------------------------------------------------------------------------- SCALER REGISTER

  @Nested
  @DisplayName("ScalerRegisterReportRequest (SCS_REP005)")
  class ScalerRegister {

    private ScalerRegisterReportRequest request() {
      ScalerRegisterReportRequest request = new ScalerRegisterReportRequest();
      request.setPrimarySort(SortOrder.NUMBER_1);
      return request;
    }

    @Test
    void buildsTheDocumentedParameterSet() {
      ScalerRegisterReportRequest request = request();
      request.setRegDist("DCC");
      request.setFromDate(LocalDate.of(2024, 1, 1));
      request.setToDate(LocalDate.of(2024, 6, 30));
      request.setLicenceStatus("VALID");
      request.setAppointmentType("FS");
      request.setAuthStatus("EXPIRED");
      request.setPrimarySort(SortOrder.NUMBER_2);
      request.setSecondarySort(SortOrder.NUMBER_1);

      Map<String, String> params = request.buildParameters(REQUESTER);

      assertEquals(
          Map.of(
              "P_USERID", REQUESTER,
              "P_ORG_UNIT_CODE", "DCC",
              "P_SCALER_AUTH_FROM_DATE", "20240101",
              "P_SCALER_AUTH_TO_DATE", "20240630",
              "P_LICENSE_STATUS", "VALID",
              "P_APPOINTMENT_TYPES", "FS",
              "P_SITE_AUTH_STATUS", "EXPIRED",
              "P_PRIMARY_SORT", "2",
              "P_SECONDARY_SORT", "1"),
          params);
    }

    @Test
    void allFilters_collapseToEmptyMeaningNoFilter() {
      ScalerRegisterReportRequest request = request();
      request.setRegDist("ALL");
      request.setLicenceStatus("ALL");
      request.setAppointmentType("ALL");
      request.setAuthStatus("ALL");

      Map<String, String> params = request.buildParameters(REQUESTER);

      assertEquals("", params.get("P_ORG_UNIT_CODE"));
      assertEquals("", params.get("P_LICENSE_STATUS"));
      assertEquals("", params.get("P_APPOINTMENT_TYPES"));
      assertEquals("", params.get("P_SITE_AUTH_STATUS"));
    }

    @Test
    void noSecondarySort_isSentAsEmptyRatherThanZero() {
      Map<String, String> params = request().buildParameters(REQUESTER);

      assertEquals("1", params.get("P_PRIMARY_SORT"));
      assertEquals("", params.get("P_SECONDARY_SORT"));
    }

    @Test
    void secondarySortOfZero_isAlsoSentAsEmpty() {
      // The frontend sends 0 for "None"; Jasper must receive empty, not the string "0".
      ScalerRegisterReportRequest request = request();
      request.setSecondarySort(SortOrder.NUMBER_0);

      assertEquals("", request.buildParameters(REQUESTER).get("P_SECONDARY_SORT"));
    }

    @Test
    void activeAuthorizationStatus_isCanonicalizedToValid() {
      // AuthorizationStatus.ACTIVE.toJasperValue() == "VALID" — the report only knows the VALID spelling.
      ScalerRegisterReportRequest request = request();
      request.setAuthStatus("ACTIVE");

      assertEquals("VALID", request.buildParameters(REQUESTER).get("P_SITE_AUTH_STATUS"));
    }

    @Test
    void singleLetterAuthorizationCodes_areExpandedToTheirCanonicalNames() {
      ScalerRegisterReportRequest active = request();
      active.setAuthStatus("A");
      ScalerRegisterReportRequest cancelled = request();
      cancelled.setAuthStatus("C");
      ScalerRegisterReportRequest expired = request();
      expired.setAuthStatus("E");

      assertEquals("VALID", active.buildParameters(REQUESTER).get("P_SITE_AUTH_STATUS"));
      assertEquals("CANCELLED", cancelled.buildParameters(REQUESTER).get("P_SITE_AUTH_STATUS"));
      assertEquals("EXPIRED", expired.buildParameters(REQUESTER).get("P_SITE_AUTH_STATUS"));
    }

    @Test
    void suspendedAuthorizationStatus_isPassedThroughDespiteNotBeingAnAuthorizationStatus() {
      // SUSPENDED is a LICENCE state, not an authorization state, so AuthorizationStatus.from() returns
      // null for it — the mapper has an explicit branch keeping it rather than blanking the filter.
      ScalerRegisterReportRequest request = request();
      request.setAuthStatus("suspended");

      assertEquals("SUSPENDED", request.buildParameters(REQUESTER).get("P_SITE_AUTH_STATUS"));
    }

    @Test
    void unrecognizedAuthorizationStatus_isPassedThroughUnchanged() {
      ScalerRegisterReportRequest request = request();
      request.setAuthStatus("SOMETHING_ELSE");

      assertEquals("SOMETHING_ELSE", request.buildParameters(REQUESTER).get("P_SITE_AUTH_STATUS"));
    }

    @Test
    void missingPrimarySort_isRejected() {
      ScalerRegisterReportRequest request = new ScalerRegisterReportRequest();

      IllegalArgumentException exception =
          assertThrows(IllegalArgumentException.class, () -> request.buildParameters(REQUESTER));
      assertEquals("Primary Sort is required.", exception.getMessage());
    }

    @Test
    void primarySortBeyondThisReportsTwoOptions_isRejected() {
      // This report offers exactly two sorts (Scaler Last Name, Licence #), so 3 is out of range even
      // though SortOrder itself defines up to 5.
      ScalerRegisterReportRequest request = request();
      request.setPrimarySort(SortOrder.NUMBER_3);

      IllegalArgumentException exception =
          assertThrows(IllegalArgumentException.class, () -> request.buildParameters(REQUESTER));
      assertEquals("Primary Sort must be between 1 and 2.", exception.getMessage());
    }

    @Test
    void secondarySortBeyondThisReportsTwoOptions_isRejected() {
      ScalerRegisterReportRequest request = request();
      request.setSecondarySort(SortOrder.NUMBER_5);

      IllegalArgumentException exception =
          assertThrows(IllegalArgumentException.class, () -> request.buildParameters(REQUESTER));
      assertEquals("Secondary Sort must be between 0 and 2.", exception.getMessage());
    }
  }

  // ------------------------------------------------------------------------------ SCALE SITE REGISTER

  @Nested
  @DisplayName("ScaleSiteRegisterReportRequest (SCS_REP007)")
  class ScaleSiteRegister {

    private ScaleSiteRegisterReportRequest request() {
      ScaleSiteRegisterReportRequest request = new ScaleSiteRegisterReportRequest();
      request.setPrimarySort(SortOrder.NUMBER_1);
      return request;
    }

    @Test
    void buildsTheDocumentedParameterSet() {
      ScaleSiteRegisterReportRequest request = request();
      request.setRegDist("DCC");
      request.setFromDate(LocalDate.of(2024, 1, 1));
      request.setToDate(LocalDate.of(2024, 6, 30));
      request.setScaleType("W");
      request.setScaleSiteNumber("520");
      request.setSiteStatus("VALID");
      request.setPrimarySort(SortOrder.NUMBER_4);
      request.setSecondarySort(SortOrder.NUMBER_5);

      Map<String, String> params = request.buildParameters(REQUESTER);

      assertEquals(
          Map.of(
              "P_USERID", REQUESTER,
              "P_ORG_UNIT_CODE", "DCC",
              "P_SCALE_SITE_FROM_DATE", "20240101",
              "P_SCALE_SITE_TO_DATE", "20240630",
              "P_SCALE_TYPE", "W",
              "P_SCALE_SITE_NMBR", "520",
              "P_SCALE_SITE_STATUS", "VALID",
              "P_AUTH_SCALER_ONLY", "",
              "P_PRIMARY_SORT", "4",
              "P_SECONDARY_SORT", "5"),
          params);
    }

    @Test
    void authorizedScalersOnly_defaultsToFalseAndIsSentAsEmpty() {
      // The flag is Y/blank, not Y/N — a blank means "do not restrict".
      assertEquals(Boolean.FALSE, request().getAuthorizedScalersOnly());
      assertEquals("", request().buildParameters(REQUESTER).get("P_AUTH_SCALER_ONLY"));
    }

    @Test
    void authorizedScalersOnly_isSentAsYWhenSet() {
      ScaleSiteRegisterReportRequest request = request();
      request.setAuthorizedScalersOnly(true);

      assertEquals("Y", request.buildParameters(REQUESTER).get("P_AUTH_SCALER_ONLY"));
    }

    @Test
    void authorizedScalersOnly_isSentAsEmptyWhenNull() {
      ScaleSiteRegisterReportRequest request = request();
      request.setAuthorizedScalersOnly(null);

      assertEquals("", request.buildParameters(REQUESTER).get("P_AUTH_SCALER_ONLY"));
    }

    @Test
    void scaleSiteNumber_isUppercasedForTheReportEngine() {
      // QA: "019v should match 019V". Stored numbers are uppercase and P_SCALE_SITE_NMBR is passed to the
      // report engine verbatim, so folding the case has to happen server-side — legacy did it in
      // ScaleSiteReportBo.setScaleSiteNumber(). Relying on the form to uppercase would leave any other
      // caller filtering on a value that matches nothing and getting a silently empty report back.
      ScaleSiteRegisterReportRequest request = request();
      request.setScaleSiteNumber("019v");

      assertEquals("019V", request.buildParameters(REQUESTER).get("P_SCALE_SITE_NMBR"));
    }

    @Test
    void scaleSiteNumber_isTrimmedAndBlankStaysBlank() {
      // Padding is not a filter, and an all-whitespace entry must widen the report rather than narrow it
      // to a site number of spaces.
      ScaleSiteRegisterReportRequest padded = request();
      padded.setScaleSiteNumber("  52a  ");
      assertEquals("52A", padded.buildParameters(REQUESTER).get("P_SCALE_SITE_NMBR"));

      ScaleSiteRegisterReportRequest blank = request();
      blank.setScaleSiteNumber("   ");
      assertEquals("", blank.buildParameters(REQUESTER).get("P_SCALE_SITE_NMBR"));

      assertEquals("", request().buildParameters(REQUESTER).get("P_SCALE_SITE_NMBR"));
    }

    @Test
    void allFiveSortOptions_areAccepted() {
      // This report offers five sorts, unlike the Scaler Register's two — the wider range is the point.
      ScaleSiteRegisterReportRequest request = request();
      request.setPrimarySort(SortOrder.NUMBER_5);
      request.setSecondarySort(SortOrder.NUMBER_5);

      Map<String, String> params = request.buildParameters(REQUESTER);

      assertEquals("5", params.get("P_PRIMARY_SORT"));
      assertEquals("5", params.get("P_SECONDARY_SORT"));
    }
  }

  // ------------------------------------------------------------------------- MARK SITE DESIGNATION

  @Nested
  @DisplayName("MarkSiteDesignationReportRequest (SCS_REP010)")
  class MarkSiteDesignation {

    @Test
    void buildsTheDocumentedParameterSet() {
      MarkSiteDesignationReportRequest request = new MarkSiteDesignationReportRequest();
      request.setRegDist("DCC");
      request.setMarkOrSite("MARK");
      request.setMarkExemption("EX");
      request.setEffectiveFrom(LocalDate.of(2024, 1, 1));
      request.setEffectiveTo(LocalDate.of(2024, 6, 30));
      request.setExpiryFrom(LocalDate.of(2025, 1, 1));
      request.setExpiryTo(LocalDate.of(2025, 12, 31));
      request.setSiteMark1("L44804");

      Map<String, String> params = request.buildParameters(REQUESTER);

      assertEquals("DCC", params.get("P_ORG_UNIT_CODE"));
      assertEquals("MARK", params.get("P_MARK_SITE"));
      assertEquals("EX", params.get("P_MARK_EXEMPTION"));
      assertEquals("20240101", params.get("P_EFFECTIVE_DATE_FROM"));
      assertEquals("20240630", params.get("P_EFFECTIVE_DATE_TO"));
      assertEquals("20250101", params.get("P_EXPIRY_DATE_FROM"));
      assertEquals("20251231", params.get("P_EXPIRY_DATE_TO"));
      assertEquals("L44804", params.get("P_SM1"));
    }

    @Test
    void allSixMarkSlots_areAlwaysPresentAndEmptyWhenUnset() {
      // The frontend sends only the slots the user filled; Jasper declares all six, so every key must be
      // present regardless — this is the backend half of that six-slot contract.
      MarkSiteDesignationReportRequest request = new MarkSiteDesignationReportRequest();

      Map<String, String> params = request.buildParameters(REQUESTER);

      for (int slot = 1; slot <= 6; slot++) {
        String key = "P_SM" + slot;
        assertTrue(params.containsKey(key), key + " must always be present");
        assertEquals("", params.get(key), key + " must be empty when unset");
      }
    }

    @Test
    void marksAreUppercasedAndTrimmed() {
      // Timber marks are stored upper-case; a lower-case entry would silently match nothing.
      MarkSiteDesignationReportRequest request = new MarkSiteDesignationReportRequest();
      request.setSiteMark1("  l44804  ");
      request.setSiteMark2("es20r4");

      Map<String, String> params = request.buildParameters(REQUESTER);

      assertEquals("L44804", params.get("P_SM1"));
      assertEquals("ES20R4", params.get("P_SM2"));
    }

    @Test
    void everySlotIsMappedInOrder() {
      MarkSiteDesignationReportRequest request = new MarkSiteDesignationReportRequest();
      request.setSiteMark1("M1");
      request.setSiteMark2("M2");
      request.setSiteMark3("M3");
      request.setSiteMark4("M4");
      request.setSiteMark5("M5");
      request.setSiteMark6("M6");

      Map<String, String> params = request.buildParameters(REQUESTER);

      for (int slot = 1; slot <= 6; slot++) {
        assertEquals("M" + slot, params.get("P_SM" + slot));
      }
    }

    @Test
    void siteMode_isCarriedThrough() {
      MarkSiteDesignationReportRequest request = new MarkSiteDesignationReportRequest();
      request.setMarkOrSite("SITE");

      assertEquals("SITE", request.buildParameters(REQUESTER).get("P_MARK_SITE"));
    }
  }

  // --------------------------------------------------------------------- DESIGNATED MARKS EXCEPTION

  @Nested
  @DisplayName("DesignatedMarksExceptionReportRequest (SCS_REP002)")
  class DesignatedMarksException {

    @Test
    void theTwoOrgUnitsMapToTheirOwnParametersWithoutCrossing() {
      // The site org unit goes to P_ORG_UNIT_CODE and the MARK org unit to P_TM_ORG_UNIT_CODE. Asserted
      // with two DIFFERENT values, because equal values could not detect the two being swapped.
      DesignatedMarksExceptionReportRequest request = new DesignatedMarksExceptionReportRequest();
      request.setSiteRegDist("DCC");
      request.setMarkRegDist("DMH");

      Map<String, String> params = request.buildParameters(REQUESTER);

      assertEquals("DCC", params.get("P_ORG_UNIT_CODE"));
      assertEquals("DMH", params.get("P_TM_ORG_UNIT_CODE"));
    }

    @Test
    void bothOrgUnitsCollapseAllToEmpty() {
      DesignatedMarksExceptionReportRequest request = new DesignatedMarksExceptionReportRequest();
      request.setSiteRegDist("ALL");
      request.setMarkRegDist("ALL");

      Map<String, String> params = request.buildParameters(REQUESTER);

      assertEquals("", params.get("P_ORG_UNIT_CODE"));
      assertEquals("", params.get("P_TM_ORG_UNIT_CODE"));
    }

    @Test
    void marksAndSitesFillTheirOwnSixSlotsWithoutCrossing() {
      // Filled ASYMMETRICALLY (3 marks, 2 sites) so a mapping that crossed the two families, or reused one
      // family's index for the other, would fail — an all-equal fixture could not tell them apart.
      DesignatedMarksExceptionReportRequest request = new DesignatedMarksExceptionReportRequest();
      request.setMark1("L44804");
      request.setMark2("ES20R4");
      request.setMark3("A12345");
      request.setSite1("520");
      request.setSite2("525");

      Map<String, String> params = request.buildParameters(REQUESTER);

      assertEquals("L44804", params.get("P_TM1"));
      assertEquals("ES20R4", params.get("P_TM2"));
      assertEquals("A12345", params.get("P_TM3"));
      assertEquals("", params.get("P_TM4"));
      assertEquals("520", params.get("P_SS1"));
      assertEquals("525", params.get("P_SS2"));
      assertEquals("", params.get("P_SS3"));
    }

    @Test
    void allTwelveSlots_areAlwaysPresent() {
      Map<String, String> params =
          new DesignatedMarksExceptionReportRequest().buildParameters(REQUESTER);

      for (int slot = 1; slot <= 6; slot++) {
        assertTrue(params.containsKey("P_TM" + slot), "P_TM" + slot + " must always be present");
        assertTrue(params.containsKey("P_SS" + slot), "P_SS" + slot + " must always be present");
      }
    }

    @Test
    void marksAndSitesAreUppercasedAndTrimmed() {
      DesignatedMarksExceptionReportRequest request = new DesignatedMarksExceptionReportRequest();
      request.setMark1("  l44804 ");
      request.setSite1(" 16h ");

      Map<String, String> params = request.buildParameters(REQUESTER);

      assertEquals("L44804", params.get("P_TM1"));
      assertEquals("16H", params.get("P_SS1"));
    }

    @Test
    void datesUseTheGenericFromToParameters() {
      DesignatedMarksExceptionReportRequest request = new DesignatedMarksExceptionReportRequest();
      request.setFromDate(LocalDate.of(2024, 3, 1));
      request.setToDate(LocalDate.of(2024, 3, 31));

      Map<String, String> params = request.buildParameters(REQUESTER);

      assertEquals("20240301", params.get("P_FROM_DATE"));
      assertEquals("20240331", params.get("P_TO_DATE"));
    }
  }

  // ---------------------------------------------------------------------------- SCALING EXCEPTION

  @Nested
  @DisplayName("ScalingExceptionReportRequest (SCS_REP016)")
  class ScalingException {

    private ScalingExceptionReportRequest request() {
      ScalingExceptionReportRequest request = new ScalingExceptionReportRequest();
      request.setPrimarySort(SortOrder.NUMBER_1);
      return request;
    }

    @Test
    void buildsTheDocumentedParameterSet() {
      ScalingExceptionReportRequest request = request();
      request.setRegDist("DCC");
      request.setFromDate(LocalDate.of(2024, 1, 1));
      request.setToDate(LocalDate.of(2024, 12, 31));
      request.setPrimarySort(SortOrder.NUMBER_3);
      request.setSecondarySort(SortOrder.NUMBER_2);

      Map<String, String> params = request.buildParameters(REQUESTER);

      assertEquals(
          Map.of(
              "P_USERID", REQUESTER,
              "P_ORG_UNIT_CODE", "DCC",
              "P_FROM_DATE", "20240101",
              "P_TO_DATE", "20241231",
              "P_PRIMARY_SORT", "3",
              "P_SECONDARY_SORT", "2"),
          params);
    }

    @Test
    void primarySortBeyondThisReportsThreeOptions_isRejected() {
      // Three sorts here (Date of Scale, Scaler Licence Number, Scale Site Number) — a different cap from
      // both sibling register reports, which is exactly why each is asserted separately.
      ScalingExceptionReportRequest request = request();
      request.setPrimarySort(SortOrder.NUMBER_4);

      IllegalArgumentException exception =
          assertThrows(IllegalArgumentException.class, () -> request.buildParameters(REQUESTER));
      assertEquals("Primary Sort must be between 1 and 3.", exception.getMessage());
    }
  }

  // ----------------------------------------------------------------------- DISTRICT PERFORMANCE

  @Nested
  @DisplayName("DistrictPerformanceReportRequest (SCS_REP025 / SCS_REP026)")
  class DistrictPerformance {

    @Test
    void buildsTheDocumentedParameterSet() {
      DistrictPerformanceReportRequest request = new DistrictPerformanceReportRequest();
      request.setRegDist("DCC");
      request.setFromDate(LocalDate.of(2024, 1, 1));
      request.setToDate(LocalDate.of(2024, 12, 31));

      assertEquals(
          Map.of(
              "P_USERID", REQUESTER,
              "P_ORG_UNIT_CODE", "DCC",
              "P_FROM_DATE", "20240101",
              "P_TO_DATE", "20241231"),
          request.buildParameters(REQUESTER));
    }

    /**
     * REVERSED 2026-09-18. These three tests used to assert the OPPOSITE — that SCS_REP025/026 were a
     * deliberate exception sending the literal "ALL" — and the class javadoc called unifying them "the
     * single easiest thing to 'tidy up' into a real defect". The asymmetry was itself the defect, and the
     * tests had frozen it: with "ALL" on the wire the SCS_REP025 header rendered "Reg / Dist: null".
     *
     * Why empty is right, end to end in legacy:
     *   • {@code ScsRegDistDropList:288} renders the All option as {@code <option value="">All</option>},
     *     so the browser submitted an EMPTY string.
     *   • {@code DistrictCheckScalePerformanceReportBo:75} puts {@code regDist} into the Crystal parameter
     *     array raw — no "ALL" substitution anywhere in the chain.
     *   • The SCS_REP025 jrxml header prints ": All" only when {@code P_ORG_UNIT_CODE} is null or empty;
     *     any other value that does not start with "R" prints {@code $F{ORG_UNIT_NAME}} instead, which is
     *     null when no district filter applies. Hence the reported ": null".
     *
     * Kept rather than deleted so the reversal stays visible: the three cases still pin all three ways of
     * arriving at "no org unit", they just pin the correct value now.
     */
    @Test
    void nullOrgUnit_isSentAsEmptySoTheHeaderPrintsAll() {
      assertEquals(
          "",
          new DistrictPerformanceReportRequest().buildParameters(REQUESTER).get("P_ORG_UNIT_CODE"));
    }

    @Test
    void blankOrgUnit_isSentAsEmpty() {
      DistrictPerformanceReportRequest request = new DistrictPerformanceReportRequest();
      request.setRegDist("   ");

      assertEquals("", request.buildParameters(REQUESTER).get("P_ORG_UNIT_CODE"));
    }

    @Test
    void theLiteralAll_isCollapsedToEmptyLikeEveryOtherReport() {
      DistrictPerformanceReportRequest request = new DistrictPerformanceReportRequest();
      request.setRegDist("ALL");

      assertEquals("", request.buildParameters(REQUESTER).get("P_ORG_UNIT_CODE"));
    }

    @Test
    void aChosenOrgUnitIsStillTrimmedAndPassedThrough() {
      DistrictPerformanceReportRequest request = new DistrictPerformanceReportRequest();
      request.setRegDist("  DCC  ");

      assertEquals("DCC", request.buildParameters(REQUESTER).get("P_ORG_UNIT_CODE"));
    }
  }

  // ------------------------------------------------------------------------ SCALE SITE COMPLIANCE

  @Nested
  @DisplayName("ScaleSiteComplianceReportRequest (SCS_REP014)")
  class ScaleSiteCompliance {

    @Test
    void emitsOnlyTheTwoParametersTheReportDeclares() {
      ScaleSiteComplianceReportRequest request = new ScaleSiteComplianceReportRequest();
      request.setInspectionId(322429L);

      assertEquals(Map.of("P_USERID", REQUESTER, "P_INSPECTION_ID", "322429"),
          request.buildParameters(REQUESTER));
    }

    @Test
    void aMissingInspectionIdIsSentAsEmptyRatherThanTheStringNull() {
      Map<String, String> params =
          new ScaleSiteComplianceReportRequest().buildParameters(REQUESTER);

      assertEquals("", params.get("P_INSPECTION_ID"));
    }

    @Test
    void theInspectionSubjectDoesNotPickUpTheSharedOrgUnitOrDateParameters() {
      // This report is launched in context from one inspection, so it must NOT inherit the org-unit/date
      // filter parameters the other eight share — extra parameters make Jasper reject the run.
      ScaleSiteComplianceReportRequest request = new ScaleSiteComplianceReportRequest();
      request.setInspectionId(1L);
      request.setRegDist("DCC");
      request.setFromDate(LocalDate.of(2024, 1, 1));

      Map<String, String> params = request.buildParameters(REQUESTER);

      assertEquals(2, params.size());
      assertTrue(params.containsKey("P_USERID"));
      assertTrue(params.containsKey("P_INSPECTION_ID"));
    }
  }

  // ------------------------------------------------------------------------------- enums / catalog

  @Nested
  @DisplayName("OutputFormatEnum")
  class OutputFormat {

    @Test
    void parsesItsTwoDocumentedValues() {
      assertEquals(OutputFormatEnum.PDF, OutputFormatEnum.fromValue("PDF"));
      assertEquals(OutputFormatEnum.XLS, OutputFormatEnum.fromValue("XLS"));
    }

    @Test
    void serializesToTheValueTheFrontendSends() {
      assertEquals("PDF", OutputFormatEnum.PDF.getValue());
      assertEquals("XLS", OutputFormatEnum.XLS.getValue());
      assertEquals("XLS", OutputFormatEnum.XLS.toString());
    }

    @Test
    void rejectsAnUnknownValue() {
      IllegalArgumentException exception =
          assertThrows(IllegalArgumentException.class, () -> OutputFormatEnum.fromValue("DOCX"));
      assertEquals("Unexpected value 'DOCX'", exception.getMessage());
    }

    @Test
    void isCaseSensitiveSoALowercaseValueIsRejected() {
      // Pinned because the frontend sends upper-case codes; accepting "pdf" would be a silent contract
      // widening, and rejecting it is the current (deliberate) behaviour.
      assertThrows(IllegalArgumentException.class, () -> OutputFormatEnum.fromValue("pdf"));
    }
  }

  @Nested
  @DisplayName("ReportDefinition")
  class Definitions {

    /**
     * The Jasper/Crystal report NAMES the deployed report server resolves. They are the one thing in this
     * package that cannot be re-derived from anything else — a typo here means a 500 at render time with no
     * hint of which report is wrong, so the nine Reports-tab entries are pinned literally.
     */
    @Test
    void pinsTheReportNameForEveryReportsTabScreen() {
      assertEquals("SCS_REP005.rpt", ReportDefinition.SCALER_REGISTER.getReportName());
      assertEquals("SCS_REP007.rpt", ReportDefinition.SCALE_SITE_REGISTER.getReportName());
      assertEquals("SCS_REP010.rpt", ReportDefinition.MARK_SITE_DESIGNATION.getReportName());
      assertEquals("SCS_REP002.rpt", ReportDefinition.DESIGNATED_MARKS_EXCEPTION.getReportName());
      assertEquals("SCS_REP015.rpt", ReportDefinition.SCALING_ADMINISTRATION.getReportName());
      assertEquals("SCS_REP016.rpt", ReportDefinition.SCALING_EXCEPTION.getReportName());
      assertEquals("SCS_REP025.rpt", ReportDefinition.DISTRICT_CHECK_SCALE_PERFORMANCE.getReportName());
      assertEquals(
          "SCS_REP026.rpt", ReportDefinition.DISTRICT_SITE_INSPECTION_PERFORMANCE.getReportName());
      assertEquals("SCS_REP014.rpt", ReportDefinition.SCALE_SITE_COMPLIANCE.getReportName());
    }

    @Test
    void pinsTheReportNameForEveryLetter() {
      assertEquals("SCS_REP003.rpt", ReportDefinition.SCALER_AUTHORIZATION_LETTER.getReportName());
      assertEquals("SCS_REP006.rpt", ReportDefinition.SCALE_SITE_AUTHORIZATION_LETTER.getReportName());
      assertEquals("SCS_REP011.rpt", ReportDefinition.MARK_SITE_DESIGNATION_LETTER.getReportName());
      assertEquals("SCS_REP004.rpt", ReportDefinition.CHECK_SCALE_ADVISORY_LETTER.getReportName());
    }

    @Test
    void everyDefinitionCarriesADistinctReportName() {
      long distinct = java.util.Arrays.stream(ReportDefinition.values())
          .map(ReportDefinition::getReportName)
          .distinct()
          .count();

      assertEquals(ReportDefinition.values().length, distinct,
          "two ReportDefinitions share a report name — one report would render as the other");
    }
  }
}
