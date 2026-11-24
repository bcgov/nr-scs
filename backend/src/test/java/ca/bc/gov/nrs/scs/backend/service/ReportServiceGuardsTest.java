package ca.bc.gov.nrs.scs.backend.service;

import ca.bc.gov.nrs.scs.backend.exception.BadRequestException;
import ca.bc.gov.nrs.scs.backend.model.report.DistrictPerformanceReportRequest;
import ca.bc.gov.nrs.scs.backend.model.report.ReportDefinition;
import ca.bc.gov.nrs.scs.backend.model.report.ScalingAdministrationReportRequest;
import ca.bc.gov.nrs.scs.backend.security.JWTService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executor;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.function.BiFunction;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTimeoutPreemptively;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.same;
import static org.mockito.Mockito.doReturn;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.junit.jupiter.api.Assertions.assertInstanceOf;
import static org.mockito.Mockito.spy;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

/**
 * Guard behaviour in {@link ReportService} that the main {@code ReportServiceTest} does not reach: the
 * render-capacity semaphore, and the District Performance date rules on BOTH of the endpoints that share
 * them.
 *
 * Kept in its own class rather than appended to {@code ReportServiceTest} because the concurrency tests need
 * a real thread pool and a blocking client stub, which is a different fixture from that class's
 * run-inline {@code Runnable::run} executor.
 *
 * The endpoint pairs below are exercised with an explicit {@code for} loop over an {@code Endpoint} record
 * rather than {@code @ParameterizedTest}: {@code junit-jupiter-params} is not on this project's test
 * classpath (only {@code junit-jupiter-api} and {@code -engine} are), which is the same reason
 * {@code ReportServiceTest} loops over its own {@code reportCases()}.
 */
class ReportServiceGuardsTest {

  /** Mirrors ReportService.MAX_CONCURRENT_RENDERS — the bound under test. */
  private static final int MAX_CONCURRENT_RENDERS = 3;

  private JasperServerClient client;
  private ReportEmailService emailService;
  private JWTService jwtService;
  private ReportService service;

  @BeforeEach
  void setUp() {
    client = mock(JasperServerClient.class);
    emailService = mock(ReportEmailService.class);
    jwtService = spy(new JWTService()); // real resolveUsername over stubbed claims
    Executor inlineExecutor = Runnable::run;
    service = new ReportService(
        client, emailService, jwtService, inlineExecutor, mock(ReportReferenceValidator.class));

    doReturn("auth-user").when(jwtService).getAuthenticatedUsername();
    // buildFetchResponse feeds this into a ContentDisposition, so it must return a usable filename.
    when(emailService.buildFilename(anyString(), any())).thenReturn("report.pdf");
  }

  private static ScalingAdministrationReportRequest previewRequest() {
    ScalingAdministrationReportRequest request = new ScalingAdministrationReportRequest();
    request.setPreview(true);
    return request;
  }

  private static JasperServerClient.ReportPayload pdfPayload() {
    return new JasperServerClient.ReportPayload(
        "content".getBytes(StandardCharsets.UTF_8), MediaType.APPLICATION_PDF);
  }

  // ------------------------------------------------------------------------------- render capacity

  @Nested
  @DisplayName("render capacity semaphore")
  class RenderCapacity {

    /**
     * The semaphore exists so a burst of report requests cannot overwhelm JasperServer or pin scarce DB
     * connections for the length of a render. Asserted by holding every render inside the client stub until
     * all callers have arrived, and recording the peak number in flight: without the semaphore the peak
     * would be the number of caller threads.
     *
     * Deliberately does NOT assert the rejection path: a caller that cannot get a slot waits
     * RENDER_SLOT_TIMEOUT_SECONDS (20s) before being rejected, so a test of that arm would have to sleep 20
     * seconds of wall clock for one assertion. The bound itself is the behaviour worth having in CI; the
     * rejection is the documented consequence of it.
     */
    @Test
    void neverRunsMoreThanThreeRendersAtOnce() throws Exception {
      int callers = MAX_CONCURRENT_RENDERS * 3;
      AtomicInteger inFlight = new AtomicInteger();
      AtomicInteger peakInFlight = new AtomicInteger();
      // Released once the first wave has filled every permit, so renders overlap as much as the semaphore
      // allows rather than completing one at a time and hiding the bound.
      CountDownLatch releaseRenders = new CountDownLatch(1);
      CountDownLatch rendersStarted = new CountDownLatch(MAX_CONCURRENT_RENDERS);

      when(client.fetchReport(anyString(), anyString(), any(), anyString())).thenAnswer(invocation -> {
        int current = inFlight.incrementAndGet();
        peakInFlight.accumulateAndGet(current, Math::max);
        rendersStarted.countDown();
        try {
          releaseRenders.await(5, TimeUnit.SECONDS);
          return pdfPayload();
        } finally {
          inFlight.decrementAndGet();
        }
      });

      ExecutorService pool = Executors.newFixedThreadPool(callers);
      try {
        List<Future<?>> futures = new ArrayList<>();
        for (int i = 0; i < callers; i++) {
          futures.add(pool.submit(
              () -> service.fetchScalingAdministrationReport(previewRequest(), null)));
        }

        assertTrue(rendersStarted.await(5, TimeUnit.SECONDS),
            "the first " + MAX_CONCURRENT_RENDERS + " renders never started");
        releaseRenders.countDown();

        for (Future<?> future : futures) {
          future.get(30, TimeUnit.SECONDS);
        }
      } finally {
        releaseRenders.countDown();
        pool.shutdownNow();
      }

      assertTrue(peakInFlight.get() <= MAX_CONCURRENT_RENDERS,
          "concurrent renders peaked at " + peakInFlight.get() + ", above the bound of "
              + MAX_CONCURRENT_RENDERS);
      assertEquals(0, inFlight.get(),
          "a render was still recorded as in flight after all callers finished");
    }

    /**
     * The permit is released in a {@code finally}, so a failing render must not leak it. A leak is invisible
     * until the pool is exhausted — after MAX_CONCURRENT_RENDERS failures every later request would stall
     * for the 20-second slot timeout and then be rejected, which is why this is asserted with a timeout
     * rather than a plain call.
     */
    @Test
    void releasesItsPermitWhenTheRenderFails() {
      // doThrow/doReturn rather than when(...).thenX: re-stubbing with `when(client.fetchReport(...))`
      // would actually CALL the already-throwing stub and blow up inside the stubbing statement itself.
      doThrow(new RuntimeException("jasper exploded"))
          .when(client).fetchReport(anyString(), anyString(), any(), anyString());

      for (int attempt = 0; attempt < MAX_CONCURRENT_RENDERS; attempt++) {
        assertThrows(RuntimeException.class,
            () -> service.fetchScalingAdministrationReport(previewRequest(), null));
      }

      doReturn(pdfPayload())
          .when(client).fetchReport(anyString(), anyString(), any(), anyString());

      // If the failed renders leaked their permits this waits ~20s and then throws TaskRejectedException.
      ReportService.ReportOutcome response = assertTimeoutPreemptively(
          Duration.ofSeconds(5),
          () -> service.fetchScalingAdministrationReport(previewRequest(), null),
          "a failing render leaked its capacity permit");

      assertInstanceOf(ReportService.Rendered.class, response);
    }
  }

  // -------------------------------------------------------------- district performance date rules

  /** One of the two District Performance endpoints, so each rule can be asserted against both. */
  private record Endpoint(
      String name,
      BiFunction<ReportService, DistrictPerformanceReportRequest, ReportService.ReportOutcome> invoke) {}

  private List<Endpoint> districtEndpoints() {
    // Lambdas rather than method references: the response methods take (request, authHeader), so they do
    // not fit a BiFunction<ReportService, request, response> directly. The auth header is null here — user
    // resolution is covered in ReportServiceTest; these tests are about the date guards.
    return List.of(
        new Endpoint(
            "district-check-scale-performance",
            (svc, req) -> svc.fetchDistrictCheckScalePerformanceReport(req, null)),
        new Endpoint(
            "district-site-inspection-performance",
            (svc, req) -> svc.fetchDistrictSiteInspectionPerformanceReport(req, null)));
  }

  private static DistrictPerformanceReportRequest districtRequest() {
    DistrictPerformanceReportRequest request = new DistrictPerformanceReportRequest();
    request.setPreview(true);
    request.setFromDate(LocalDate.of(2025, 1, 1));
    request.setToDate(LocalDate.of(2025, 6, 30));
    return request;
  }

  /**
   * `validateDistrictReportRequest` is shared, but each response method calls it SEPARATELY — and the two
   * District Performance screens are otherwise byte-for-byte clones of each other (the same duplication
   * flagged in the e2e suite's UC-RPT-014 notes). So every rule is asserted against BOTH endpoints: a
   * regression that dropped the validate call from one of the two would otherwise pass.
   */
  @Nested
  @DisplayName("district performance date validation (both endpoints)")
  class DistrictDateValidation {

    @Test
    void rejectsANullRequest() {
      for (Endpoint endpoint : districtEndpoints()) {
        setUp();

        BadRequestException exception =
            assertThrows(BadRequestException.class, () -> endpoint.invoke().apply(service, null),
                endpoint.name());

        assertEquals("Report request is required.", exception.getMessage(), endpoint.name());
      }
    }

    @Test
    void requiresBothDates() {
      for (Endpoint endpoint : districtEndpoints()) {
        setUp();

        DistrictPerformanceReportRequest missingBoth = districtRequest();
        missingBoth.setFromDate(null);
        missingBoth.setToDate(null);
        DistrictPerformanceReportRequest missingTo = districtRequest();
        missingTo.setToDate(null);
        DistrictPerformanceReportRequest missingFrom = districtRequest();
        missingFrom.setFromDate(null);

        // All three arms, not just the both-missing one: the guard is a single OR, so a mistake in either
        // half would still pass a both-missing-only test.
        for (DistrictPerformanceReportRequest request : List.of(missingBoth, missingTo, missingFrom)) {
          BadRequestException exception = assertThrows(
              BadRequestException.class,
              () -> endpoint.invoke().apply(service, request),
              endpoint.name());
          assertEquals("From Date and To Date are required.", exception.getMessage(), endpoint.name());
        }
      }
    }

    @Test
    void rejectsAnInvertedWindow() {
      for (Endpoint endpoint : districtEndpoints()) {
        setUp();

        DistrictPerformanceReportRequest request = districtRequest();
        request.setFromDate(LocalDate.of(2025, 2, 2));
        request.setToDate(LocalDate.of(2025, 2, 1));

        BadRequestException exception = assertThrows(
            BadRequestException.class,
            () -> endpoint.invoke().apply(service, request),
            endpoint.name());

        assertEquals("From Date must be on or before To Date.", exception.getMessage(), endpoint.name());
      }
    }

    @Test
    void rejectsAWindowLongerThanOneYear() {
      for (Endpoint endpoint : districtEndpoints()) {
        setUp();

        DistrictPerformanceReportRequest request = districtRequest();
        request.setFromDate(LocalDate.of(2025, 1, 1));
        request.setToDate(LocalDate.of(2026, 1, 2));

        BadRequestException exception = assertThrows(
            BadRequestException.class,
            () -> endpoint.invoke().apply(service, request),
            endpoint.name());

        assertEquals("Search date range cannot be more than 1 year(s).", exception.getMessage(),
            endpoint.name());
      }
    }

    /**
     * The boundary. The rule is {@code fromDate.plusYears(1).isBefore(toDate)}, so a window of EXACTLY one
     * year is allowed — the one case that distinguishes the current rule from a stricter {@code isAfter} or
     * an off-by-one, and the case a user hits by asking for a full calendar year.
     */
    @Test
    void acceptsAWindowOfExactlyOneYear() {
      for (Endpoint endpoint : districtEndpoints()) {
        setUp();
        when(client.fetchReport(anyString(), anyString(), any(), anyString())).thenReturn(pdfPayload());

        DistrictPerformanceReportRequest request = districtRequest();
        request.setFromDate(LocalDate.of(2025, 1, 1));
        request.setToDate(LocalDate.of(2026, 1, 1));

        assertInstanceOf(ReportService.Rendered.class, endpoint.invoke().apply(service, request), endpoint.name());
      }
    }

    @Test
    void acceptsASingleDayWindow() {
      // The other end of the range rule: from == to must pass requireDateOrder's is-after check.
      for (Endpoint endpoint : districtEndpoints()) {
        setUp();
        when(client.fetchReport(anyString(), anyString(), any(), anyString())).thenReturn(pdfPayload());

        DistrictPerformanceReportRequest request = districtRequest();
        request.setFromDate(LocalDate.of(2025, 3, 15));
        request.setToDate(LocalDate.of(2025, 3, 15));

        assertInstanceOf(ReportService.Rendered.class, endpoint.invoke().apply(service, request), endpoint.name());
      }
    }

    @Test
    void validatesBeforeRenderingOrResolvingTheUser() {
      // Validation must come first so a bad request costs neither a render slot nor a JasperServer call.
      for (Endpoint endpoint : districtEndpoints()) {
        setUp();

        DistrictPerformanceReportRequest request = districtRequest();
        request.setFromDate(null);
        request.setToDate(null);

        assertThrows(BadRequestException.class, () -> endpoint.invoke().apply(service, request),
            endpoint.name());

        verifyNoInteractions(client);
      }
    }

    @Test
    void routesAValidNonPreviewRequestToTheAsyncPath() {
      for (Endpoint endpoint : districtEndpoints()) {
        setUp();
        when(client.fetchReport(anyString(), anyString(), any(), anyString())).thenReturn(pdfPayload());

        DistrictPerformanceReportRequest request = districtRequest();
        request.setPreview(false);

        ReportService.ReportOutcome response = endpoint.invoke().apply(service, request);

        assertInstanceOf(ReportService.Queued.class, response, endpoint.name());
      }
    }
  }

  // ------------------------------------------------------------------- report definition wiring

  @Nested
  @DisplayName("report definition wiring")
  class DefinitionWiring {

    /**
     * Each response method must ask JasperServer for ITS OWN report. The two District Performance endpoints
     * are the pair worth pinning: they are clones whose only meaningful difference is the report they
     * render, so a copy-paste that pointed both at SCS_REP025 would produce a plausible-looking but wrong
     * report from the site-inspection screen — and no other test in this suite would notice.
     */
    @Test
    void districtCheckScaleRendersItsOwnReport() {
      DistrictPerformanceReportRequest request = districtRequest();
      when(client.fetchReport(
              anyString(),
              eq(ReportDefinition.DISTRICT_CHECK_SCALE_PERFORMANCE.getReportName()),
              same(request),
              anyString()))
          .thenReturn(pdfPayload());

      service.fetchDistrictCheckScalePerformanceReport(request, null);

      verify(client).fetchReport(
          anyString(),
          eq(ReportDefinition.DISTRICT_CHECK_SCALE_PERFORMANCE.getReportName()),
          same(request),
          anyString());
    }

    @Test
    void districtSiteInspectionRendersItsOwnReport() {
      DistrictPerformanceReportRequest request = districtRequest();
      when(client.fetchReport(
              anyString(),
              eq(ReportDefinition.DISTRICT_SITE_INSPECTION_PERFORMANCE.getReportName()),
              same(request),
              anyString()))
          .thenReturn(pdfPayload());

      service.fetchDistrictSiteInspectionPerformanceReport(request, null);

      verify(client).fetchReport(
          anyString(),
          eq(ReportDefinition.DISTRICT_SITE_INSPECTION_PERFORMANCE.getReportName()),
          same(request),
          anyString());
    }
  }
}
