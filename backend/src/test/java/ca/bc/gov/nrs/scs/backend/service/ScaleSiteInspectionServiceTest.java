package ca.bc.gov.nrs.scs.backend.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import ca.bc.gov.nrs.scs.backend.domain.shared.YesNo;
import ca.bc.gov.nrs.scs.backend.exception.BadRequestException;
import ca.bc.gov.nrs.scs.backend.exception.ConflictException;
import ca.bc.gov.nrs.scs.backend.exception.FieldValidationException;
import ca.bc.gov.nrs.scs.backend.exception.ForbiddenException;
import ca.bc.gov.nrs.scs.backend.exception.ResourceNotFoundException;
import ca.bc.gov.nrs.scs.backend.exception.UnprocessableEntityException;
import ca.bc.gov.nrs.scs.backend.service.inspection.InspectionQuestionAssembler;
import ca.bc.gov.nrs.scs.backend.service.inspection.InspectionValidator;
import ca.bc.gov.nrs.scs.backend.service.mapper.ScaleSiteInspectionApiMapper;
import ca.bc.gov.nrs.scs.backend.model.ScaleMethodTypeLov;
import ca.bc.gov.nrs.scs.backend.model.ScaleSiteInspectionCreateInitView;
import ca.bc.gov.nrs.scs.backend.model.ScaleSiteInspectionCreateRequest;
import ca.bc.gov.nrs.scs.backend.model.ScaleSiteInspectionDetail;
import ca.bc.gov.nrs.scs.backend.model.ScaleSiteInspectionEditQuestionResponse;
import ca.bc.gov.nrs.scs.backend.model.ScaleSiteInspectionEditView;
import ca.bc.gov.nrs.scs.backend.model.ScaleSiteInspectionQuestionResponseInput;
import ca.bc.gov.nrs.scs.backend.model.ScaleSiteInspectionRecipientOption;
import ca.bc.gov.nrs.scs.backend.model.ScaleSiteInspectionSearchResult;
import ca.bc.gov.nrs.scs.backend.model.ScaleSiteInspectionSummary;
import ca.bc.gov.nrs.scs.backend.model.ScaleSiteInspectionUpdateRequest;
import ca.bc.gov.nrs.scs.backend.repository.ScaleSiteInspectionRepository;
import ca.bc.gov.nrs.scs.backend.repository.ScaleSiteRepository;
import ca.bc.gov.nrs.scs.backend.domain.inspection.InspectionBase;
import ca.bc.gov.nrs.scs.backend.domain.inspection.InspectionCreateCommand;
import ca.bc.gov.nrs.scs.backend.domain.inspection.InspectionCreateParams;
import ca.bc.gov.nrs.scs.backend.domain.inspection.InspectionQuestion;
import ca.bc.gov.nrs.scs.backend.domain.inspection.InspectionResponse;
import ca.bc.gov.nrs.scs.backend.domain.inspection.InspectionSearchRef;
import ca.bc.gov.nrs.scs.backend.domain.inspection.InspectionSummary;
import ca.bc.gov.nrs.scs.backend.domain.inspection.InspectionUpdateCommand;
import ca.bc.gov.nrs.scs.backend.domain.inspection.InspectionUpdateParams;
import ca.bc.gov.nrs.scs.backend.domain.scalesite.ScaleSiteContactOption;
import ca.bc.gov.nrs.scs.backend.domain.scalesite.ScaleSiteCore;
import ca.bc.gov.nrs.scs.backend.domain.scalesite.ScaleSiteOwnerInfo;
import ca.bc.gov.nrs.scs.backend.domain.scalesite.ScaleSiteSummaryCore;
import ca.bc.gov.nrs.scs.backend.security.ClientScopeGuard;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

@ExtendWith(MockitoExtension.class)
@DisplayName("ScaleSiteInspectionService tests")
class ScaleSiteInspectionServiceTest {

  @Mock
  private ScaleSiteRepository scaleSiteRepository;

  @Mock
  private ScaleSiteInspectionRepository scaleSiteInspectionRepository;

  @Mock
  private LovService lovService;

  @Mock
  private ClientScopeGuard clientScopeGuard;

  private ScaleSiteInspectionService service;

  @BeforeEach
  void setUp() {
    // Wire the real collaborators (validation + question assembly) against the mocked repositories,
    // so this suite exercises the same end-to-end behavior after the service split as before it.
    service = new ScaleSiteInspectionService(
        scaleSiteInspectionRepository,
        scaleSiteRepository,
        lovService,
        new InspectionValidator(),
        new InspectionQuestionAssembler(scaleSiteInspectionRepository),
        clientScopeGuard);
  }

  @AfterEach
  void tearDown() {
    SecurityContextHolder.clearContext();
  }

  @Test
  void getScaleSiteInspectionSummaries_returnsLegacyAlignedListForExistingScaleSite() {
    when(scaleSiteRepository.getScaleSiteSummaryCore("SITE001")).thenReturn(
        new ScaleSiteSummaryCore(
            "SITE001",
            100L,
            "12345678",
            "00",
            "MAIN YARD",
            "Nanaimo",
            "TB-123",
            49,
            10,
            22,
            123,
            56,
            31,
            null, null, null, null, null));
    when(scaleSiteInspectionRepository.getScaleSiteInspectionSummaries("SITE001")).thenReturn(List.of(
        new InspectionSummary(
            "SITE001",
            12345L,
            "Compliance",
            "Weight Scale",
            LocalDate.of(2026, 3, 10),
            "guid-123",
            "Y")));

    List<ScaleSiteInspectionSummary> result = service.getScaleSiteInspectionSummaries(" site001 ");

    assertEquals(1, result.size());
    assertEquals(12345L, result.getFirst().getInspectionId().get());
    assertEquals("Compliance", result.getFirst().getInspectionTypeDescription().get());
    assertEquals("Weight Scale", result.getFirst().getSiteTypeDisplay().get());
    assertEquals("guid-123", result.getFirst().getInspector().get());
    assertEquals("Y", result.getFirst().getFollowUpInspectionIndicator().get());
    verify(scaleSiteRepository).getScaleSiteSummaryCore("SITE001");
    verify(scaleSiteInspectionRepository).getScaleSiteInspectionSummaries("SITE001");
  }

  @Test
  void getScaleSiteInspectionSummaries_rejectsMissingScaleSiteNumber() {
    BadRequestException ex = assertThrows(BadRequestException.class,
        () -> service.getScaleSiteInspectionSummaries("  "));

    assertEquals("Scale site number is required.", ex.getMessage());
    verify(scaleSiteRepository, never()).getScaleSiteSummaryCore(any());
  }

  @Test
  void getScaleSiteInspectionSummaries_notFoundWhenScaleSiteMissing() {
    when(scaleSiteRepository.getScaleSiteSummaryCore("SITE001")).thenReturn(null);

    ResourceNotFoundException ex = assertThrows(ResourceNotFoundException.class,
        () -> service.getScaleSiteInspectionSummaries("site001"));

    assertEquals("No scale site found with scale site number SITE001", ex.getMessage());
    verify(scaleSiteInspectionRepository, never()).getScaleSiteInspectionSummaries(any());
  }

  @Test
  void searchScaleSiteInspection_returnsUniqueValidatedMatch() {
    when(scaleSiteInspectionRepository.searchScaleSiteInspectionByInspectionId(12345L))
        .thenReturn(List.of(new InspectionSearchRef("SITE001", 12345L)));
    when(scaleSiteInspectionRepository.isInspectionViewableInCims(12345L)).thenReturn(true);

    ScaleSiteInspectionSearchResult result = service.searchScaleSiteInspection(12345L);

    assertEquals("SITE001", result.getScaleSiteIdNmbr().get());
    assertEquals(12345L, result.getInspectionId().get());
    verify(scaleSiteInspectionRepository).searchScaleSiteInspectionByInspectionId(12345L);
    verify(scaleSiteInspectionRepository).isInspectionViewableInCims(12345L);
  }

  @Test
  void searchScaleSiteInspection_rejectsMissingInspectionId() {
    BadRequestException ex = assertThrows(BadRequestException.class,
        () -> service.searchScaleSiteInspection(null));

    assertEquals("Inspection id is required.", ex.getMessage());
  }

  @Test
  void searchScaleSiteInspection_rejectsWhenNoMatch() {
    when(scaleSiteInspectionRepository.searchScaleSiteInspectionByInspectionId(12345L)).thenReturn(List.of());

    ResourceNotFoundException ex = assertThrows(ResourceNotFoundException.class,
        () -> service.searchScaleSiteInspection(12345L));

    assertEquals("No scale site inspection found with inspection id 12345", ex.getMessage());
  }

  @Test
  void searchScaleSiteInspection_rejectsWhenMultipleMatches() {
    when(scaleSiteInspectionRepository.searchScaleSiteInspectionByInspectionId(12345L)).thenReturn(List.of(
        new InspectionSearchRef("SITE001", 12345L),
        new InspectionSearchRef("SITE002", 12345L)));

    ConflictException ex = assertThrows(ConflictException.class,
        () -> service.searchScaleSiteInspection(12345L));

    assertEquals("Multiple scale site inspections found with inspection id 12345", ex.getMessage());
  }

  @Test
  void searchScaleSiteInspection_rejectsWhenNotViewableInCims() {
    when(scaleSiteInspectionRepository.searchScaleSiteInspectionByInspectionId(12345L)).thenReturn(List.of(
        new InspectionSearchRef("SITE001", 12345L)));
    when(scaleSiteInspectionRepository.isInspectionViewableInCims(12345L)).thenReturn(false);

    UnprocessableEntityException ex = assertThrows(UnprocessableEntityException.class,
        () -> service.searchScaleSiteInspection(12345L));

    assertEquals("Inspection 12345 is not viewable in CIMS.", ex.getMessage());
  }

  // ─── client scoping ─────────────────────────────────────────────────────────
  //
  // `/scale-sites/inspection/{inspectionId}` puts a literal segment before the id, so
  // ClientScopeInterceptor's path-variable match never sees it and the service has to ask the guard
  // itself. Nothing else in this suite would notice if one of those calls were deleted — which is how
  // two of them came to be missing (the read) or absent (the delete) in the first place.

  /** A minimal inspection on SITE001, for tests that care only about which site the guard is given. */
  private static InspectionBase inspectionAtSite001() {
    return new InspectionBase(
        "SITE001", "MAIN YARD", "Nanaimo", LocalDate.of(2026, 3, 10), "COM", "Compliance",
        12001L, "Jordan Smith", "Y", "guid-123", "General comments");
  }

  @Test
  @DisplayName("the inspection-number lookup is scoped on the matched inspection's own site")
  void searchScaleSiteInspection_appliesClientScopeGuardViaItsSite() {
    when(scaleSiteInspectionRepository.searchScaleSiteInspectionByInspectionId(12345L))
        .thenReturn(List.of(new InspectionSearchRef("SITE001", 12345L)));
    when(scaleSiteInspectionRepository.isInspectionViewableInCims(12345L)).thenReturn(true);

    service.searchScaleSiteInspection(12345L);

    verify(clientScopeGuard).assertRecordSiteInScope("SITE001");
  }

  /**
   * Asked before the not-found throw. Otherwise the "OR enter inspection #" box answers 404 for an id
   * that exists under another client and 404 for one that does not — the same answer, which is fine —
   * but 200 for one that does exist under another client, which is the read this closes. Guarding after
   * the throw would still leak the difference between "no such id" and "not yours".
   */
  @Test
  @DisplayName("the lookup asks the guard before reporting an unknown inspection number missing")
  void searchScaleSiteInspection_asksTheGuardBeforeReportingAnUnknownIdMissing() {
    when(scaleSiteInspectionRepository.searchScaleSiteInspectionByInspectionId(404L))
        .thenReturn(List.of());

    assertThrows(ResourceNotFoundException.class, () -> service.searchScaleSiteInspection(404L));

    verify(clientScopeGuard).assertRecordSiteInScope(null);
  }

  /**
   * The guard refuses and the read stops there — no site, owner or question rows are fetched. Asserting
   * the refusal rather than just the call also proves the guard is not swallowed on the way out.
   */
  @Test
  @DisplayName("the inspection detail read is scoped on the inspection's own site")
  void getScaleSiteInspectionDetail_appliesClientScopeGuardViaItsSite() {
    when(scaleSiteInspectionRepository.getScaleSiteInspectionDetailBase(12345L))
        .thenReturn(inspectionAtSite001());
    doThrow(new ForbiddenException("You do not have access to this record."))
        .when(clientScopeGuard).assertRecordSiteInScope("SITE001");

    assertThrows(ForbiddenException.class, () -> service.getScaleSiteInspectionDetail(12345L));

    verify(clientScopeGuard).assertRecordSiteInScope("SITE001");
    verify(scaleSiteRepository, never()).getScaleSiteSummaryCore(any());
  }

  @Test
  @DisplayName("the inspection edit read is scoped too — both reads share loadInspection")
  void getScaleSiteInspectionEdit_appliesClientScopeGuardViaItsSite() {
    when(scaleSiteInspectionRepository.getScaleSiteInspectionDetailBase(12345L))
        .thenReturn(inspectionAtSite001());
    doThrow(new ForbiddenException("You do not have access to this record."))
        .when(clientScopeGuard).assertRecordSiteInScope("SITE001");

    assertThrows(ForbiddenException.class, () -> service.getScaleSiteInspectionEdit(12345L));

    verify(clientScopeGuard).assertRecordSiteInScope("SITE001");
    verify(scaleSiteRepository, never()).getScaleSiteSummaryCore(any());
  }

  @Test
  @DisplayName("the read asks the guard before reporting an unknown inspection id missing")
  void getScaleSiteInspectionDetail_asksTheGuardBeforeReportingAnUnknownIdMissing() {
    when(scaleSiteInspectionRepository.getScaleSiteInspectionDetailBase(404L)).thenReturn(null);

    assertThrows(ResourceNotFoundException.class,
        () -> service.getScaleSiteInspectionDetail(404L));

    verify(clientScopeGuard).assertRecordSiteInScope(null);
  }

  /**
   * The update reached the guard only incidentally, through the detail read on its last line — after
   * every write had executed, so a refusal was a {@code @Transactional} rollback rather than a refusal.
   * This pins the guard ahead of the first write.
   */
  @Test
  @DisplayName("the update is scoped before it writes anything, not rolled back afterwards")
  void updateScaleSiteInspection_appliesClientScopeGuardBeforeWriting() {
    when(scaleSiteInspectionRepository.getScaleSiteInspectionDetailBase(12345L))
        .thenReturn(inspectionAtSite001());
    doThrow(new ForbiddenException("You do not have access to this record."))
        .when(clientScopeGuard).assertRecordSiteInScope("SITE001");

    assertThrows(ForbiddenException.class, () -> service.updateScaleSiteInspection(
        new InspectionUpdateCommand(12345L, LocalDate.of(2026, 3, 11), "Jordan Smith",
            YesNo.Y, "Updated comments", List.of())));

    verify(clientScopeGuard).assertRecordSiteInScope("SITE001");
    verify(scaleSiteInspectionRepository, never()).updateScaleSiteInspectionBase(any());
    verify(scaleSiteInspectionRepository, never()).insertInspectionResponse(any(), any());
    verify(scaleSiteInspectionRepository, never()).deleteInspectionResponse(any(), any(), any());
  }

  /** The delete ended in no read, so nothing incidental scoped it: it reached no guard at all. */
  @Test
  @DisplayName("the delete is scoped before it deletes anything")
  void deleteScaleSiteInspection_appliesClientScopeGuardBeforeDeleting() {
    when(scaleSiteInspectionRepository.getScaleSiteInspectionDetailBase(12345L))
        .thenReturn(inspectionAtSite001());
    doThrow(new ForbiddenException("You do not have access to this record."))
        .when(clientScopeGuard).assertRecordSiteInScope("SITE001");

    assertThrows(ForbiddenException.class, () -> service.deleteScaleSiteInspection(12345L));

    verify(clientScopeGuard).assertRecordSiteInScope("SITE001");
    verify(scaleSiteInspectionRepository, never()).deleteScaleSiteInspection(any());
  }

  @Test
  void getScaleSiteInspectionCreateInit_returnsAggregatedCreatePayload() {
    when(scaleSiteRepository.getScaleSiteSummaryCore("SITE001")).thenReturn(
        new ScaleSiteSummaryCore(
            "SITE001",
            100L,
            "12345678",
            "00",
            "MAIN YARD",
            "Nanaimo",
            "TB-123",
            49,
            10,
            22,
            123,
            56,
            31,
            null, null, null, null, null));
    when(scaleSiteRepository.getScaleSite("SITE001")).thenReturn(
        new ScaleSiteCore("SITE001", "MAIN YARD", "Nanaimo"));
    when(scaleSiteRepository.getScaleSiteOwner("SITE001")).thenReturn(
        new ScaleSiteOwnerInfo("ACME FOREST PRODUCTS LTD.", null, null));
    when(lovService.getStaticLovDescriptionMap("SCALE_SITE_INSPCTN_TYPE_CODE"))
        .thenReturn(Map.of("COM", "Compliance", "AUT", "Automated"));
    when(lovService.getScaleMethodTypeLov(null, null)).thenReturn(List.of(
        new ScaleMethodTypeLov().code("W").description("Weight Scale")));
    when(lovService.getStaticLovDescriptionMap("INSPECTION_ANSWER_CODE"))
        .thenReturn(Map.of("Y", "Yes", "N", "No"));
    when(scaleSiteInspectionRepository.getScaleSiteContactOptions("SITE001")).thenReturn(List.of(
        new ScaleSiteContactOption(77L, "Jordan Smith")));
    when(scaleSiteInspectionRepository.getInspectionQuestionIdsForInspectionType("COM"))
        .thenReturn(List.of(777L));
    when(scaleSiteInspectionRepository.getInspectionQuestionIdsForScaleMethod("W"))
        .thenReturn(List.of(777L));
    when(scaleSiteInspectionRepository.getActiveInspectionQuestions()).thenReturn(List.of(
        new InspectionQuestion(777L, "Was the scale head sealed?")));
    when(scaleSiteInspectionRepository.getActiveInspectionValidResponseCodes(777L))
        .thenReturn(List.of("Y", "N"));

    ScaleSiteInspectionCreateInitView result = service.getScaleSiteInspectionCreateInit(
        " site001 ",
        "com",
        List.of("w"));

    assertEquals("SITE001", result.getScaleSiteIdNmbr().get());
    assertEquals("Compliance", result.getInspectionTypeDescription().get());
    assertEquals(List.of("W"), result.getSiteTypeCodes());
    assertEquals("Weight Scale", result.getSiteTypeDisplay().get());
    assertEquals("ACME FOREST PRODUCTS LTD.", result.getSiteOwnerName().get());
    assertEquals("SYSTEM", result.getInspector().get());
    assertEquals(1, result.getRecipientOptions().size());
    ScaleSiteInspectionRecipientOption recipientOption = result.getRecipientOptions().getFirst();
    assertEquals("77", recipientOption.getValue());
    assertEquals("Jordan Smith", recipientOption.getLabel());
    assertEquals(1, result.getQuestionResponses().size());
    assertEquals(777L, result.getQuestionResponses().getFirst().getInspectionQuestionId());
  }

  @Test
  void getScaleSiteInspectionCreateInit_prefillsAuthenticatedLegacyHexGuid() {
    UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(
        "MOCK_CLERICAL",
        null,
        List.of());
    auth.setDetails("F5E59074276C40558FF6A17CF1AB3EC2");
    SecurityContextHolder.getContext().setAuthentication(auth);

    when(scaleSiteRepository.getScaleSiteSummaryCore("SITE001")).thenReturn(
        new ScaleSiteSummaryCore(
            "SITE001",
            100L,
            "12345678",
            "00",
            "MAIN YARD",
            "Nanaimo",
            "TB-123",
            49,
            10,
            22,
            123,
            56,
            31,
            null, null, null, null, null));
    when(scaleSiteRepository.getScaleSite("SITE001")).thenReturn(
        new ScaleSiteCore("SITE001", "MAIN YARD", "Nanaimo"));
    when(scaleSiteRepository.getScaleSiteOwner("SITE001")).thenReturn(
        new ScaleSiteOwnerInfo("ACME FOREST PRODUCTS LTD.", null, null));
    when(lovService.getStaticLovDescriptionMap("SCALE_SITE_INSPCTN_TYPE_CODE"))
        .thenReturn(Map.of("COM", "Compliance"));
    when(lovService.getScaleMethodTypeLov(null, null)).thenReturn(List.of(
        new ScaleMethodTypeLov().code("W").description("Weight Scale")));
    when(lovService.getStaticLovDescriptionMap("INSPECTION_ANSWER_CODE")).thenReturn(Map.of());
    when(scaleSiteInspectionRepository.getScaleSiteContactOptions("SITE001")).thenReturn(List.of());
    when(scaleSiteInspectionRepository.getInspectionQuestionIdsForInspectionType("COM")).thenReturn(List.of());

    ScaleSiteInspectionCreateInitView result = service.getScaleSiteInspectionCreateInit(
        "SITE001",
        "COM",
        List.of("W"));

    assertEquals("F5E59074276C40558FF6A17CF1AB3EC2", result.getInspector().get());
  }

  @Test
  void createScaleSiteInspection_createsBaseMethodsResponsesAndReturnsDetail() {
    String inspectorGuid = "22222222-2222-2222-2222-222222222222";
    ScaleSiteInspectionCreateRequest request = new ScaleSiteInspectionCreateRequest()
        .inspectionTypeCode("COM")
        .siteTypeCodes(List.of("W"))
        .inspectionDate(LocalDate.of(2026, 3, 11))
        .inspector(inspectorGuid)
        .siteOperatorPresentInd(ScaleSiteInspectionCreateRequest.SiteOperatorPresentIndEnum.Y)
        .comments("Created from staged workflow.")
        .questionResponses(List.of(new ScaleSiteInspectionQuestionResponseInput()
            .inspectionQuestionId(777L)
            .inspectionAnswerCode("N")
            .commentsText("Needs correction")
            .followUpRequiredInd(ScaleSiteInspectionQuestionResponseInput.FollowUpRequiredIndEnum.N)));

    when(scaleSiteRepository.getScaleSiteSummaryCore("SITE001")).thenReturn(
        new ScaleSiteSummaryCore(
            "SITE001",
            100L,
            "12345678",
            "00",
            "MAIN YARD",
            "Nanaimo",
            "TB-123",
            49,
            10,
            22,
            123,
            56,
            31,
            null, null, null, null, null));
    when(lovService.getStaticLovDescriptionMap("SCALE_SITE_INSPCTN_TYPE_CODE"))
        .thenReturn(Map.of("COM", "Compliance"));
    when(lovService.getScaleMethodTypeLov(null, null)).thenReturn(List.of(
        new ScaleMethodTypeLov().code("W").description("Weight Scale")));
    when(scaleSiteInspectionRepository.getInspectionQuestionIdsForInspectionType("COM"))
        .thenReturn(List.of(777L));
    when(scaleSiteInspectionRepository.getInspectionQuestionIdsForScaleMethod("W"))
        .thenReturn(List.of(777L));
    when(scaleSiteInspectionRepository.getActiveInspectionQuestions()).thenReturn(List.of(
        new InspectionQuestion(777L, "Was the scale head sealed?")));
    when(scaleSiteInspectionRepository.getActiveInspectionValidResponseCodes(777L))
        .thenReturn(List.of("Y", "N"));
    when(scaleSiteInspectionRepository.createScaleSiteInspectionBase(
        new InspectionCreateParams(
            "SITE001",
            LocalDate.of(2026, 3, 11),
            inspectorGuid,
            "Y",
            "Created from staged workflow.",
            "COM",
            null,
            null))).thenReturn(12345L);
    when(scaleSiteInspectionRepository.getScaleSiteInspectionDetailBase(12345L)).thenReturn(
        new InspectionBase(
            "SITE001",
            "MAIN YARD",
            "Nanaimo",
            LocalDate.of(2026, 3, 11),
            "COM",
            "Compliance",
            null,
            null,
            "Y",
            inspectorGuid,
            "Created from staged workflow."));
    when(scaleSiteRepository.getScaleSite("SITE001")).thenReturn(
        new ScaleSiteCore("SITE001", "MAIN YARD", "Nanaimo"));
    when(scaleSiteRepository.getScaleSiteOwner("SITE001")).thenReturn(
        new ScaleSiteOwnerInfo("ACME FOREST PRODUCTS LTD.", null, null));
    when(scaleSiteInspectionRepository.getInspectedScalingMethodCodes(12345L)).thenReturn(List.of("W"));
    when(scaleSiteInspectionRepository.getInspectionResponses(12345L)).thenReturn(List.of(
        new InspectionResponse(
            777L,
            "N",
            "Needs correction",
            null,
            null,
            "N")));
    when(scaleSiteInspectionRepository.getInspectionQuestionText(777L))
        .thenReturn("Was the scale head sealed?");
    when(lovService.getStaticLovDescriptionMap("INSPECTION_ANSWER_CODE"))
        .thenReturn(Map.of("N", "No"));

    ScaleSiteInspectionDetail result = service.createScaleSiteInspection(ScaleSiteInspectionApiMapper.toCreateCommand("site001", request));

    assertEquals(12345L, result.getInspectionId().get());
    assertEquals("SITE001", result.getScaleSiteIdNmbr().get());
    assertEquals("Created from staged workflow.", result.getComments().get());
    verify(scaleSiteInspectionRepository).insertInspectedScalingMethod(12345L, "W");
    verify(scaleSiteInspectionRepository).insertInspectionResponse(
        org.mockito.ArgumentMatchers.eq(12345L),
        any(InspectionResponse.class));
  }

  @Test
  void createScaleSiteInspection_honorsSubmittedInspectorOverAuthenticatedUser() {
    // Legacy semantics: the inspector recorded is the euser GUID submitted on the form (who performed
    // the inspection), NOT the logged-in user. Here the authenticated user (1111…) differs from the
    // submitted inspector (2222…); the submitted value must be what gets persisted.
    SecurityContextHolder.getContext().setAuthentication(
        new UsernamePasswordAuthenticationToken(
            "11111111-1111-1111-1111-111111111111",
            null,
            List.of()));

    ScaleSiteInspectionCreateRequest request = new ScaleSiteInspectionCreateRequest()
        .inspectionTypeCode("COM")
        .siteTypeCodes(List.of("W"))
        .inspectionDate(LocalDate.of(2026, 3, 11))
        .inspector("22222222-2222-2222-2222-222222222222")
        .siteOperatorPresentInd(ScaleSiteInspectionCreateRequest.SiteOperatorPresentIndEnum.Y)
        .comments("Created from staged workflow.")
        .questionResponses(List.of(new ScaleSiteInspectionQuestionResponseInput()
            .inspectionQuestionId(777L)
            .inspectionAnswerCode("N")
            .followUpRequiredInd(ScaleSiteInspectionQuestionResponseInput.FollowUpRequiredIndEnum.N)));

    when(scaleSiteRepository.getScaleSiteSummaryCore("SITE001")).thenReturn(
        new ScaleSiteSummaryCore(
            "SITE001",
            100L,
            "12345678",
            "00",
            "MAIN YARD",
            "Nanaimo",
            "TB-123",
            49,
            10,
            22,
            123,
            56,
            31,
            null, null, null, null, null));
    when(lovService.getStaticLovDescriptionMap("SCALE_SITE_INSPCTN_TYPE_CODE"))
        .thenReturn(Map.of("COM", "Compliance"));
    when(lovService.getScaleMethodTypeLov(null, null)).thenReturn(List.of(
        new ScaleMethodTypeLov().code("W").description("Weight Scale")));
    when(scaleSiteInspectionRepository.getInspectionQuestionIdsForInspectionType("COM"))
        .thenReturn(List.of(777L));
    when(scaleSiteInspectionRepository.getInspectionQuestionIdsForScaleMethod("W"))
        .thenReturn(List.of(777L));
    when(scaleSiteInspectionRepository.getActiveInspectionQuestions()).thenReturn(List.of(
        new InspectionQuestion(777L, "Was the scale head sealed?")));
    when(scaleSiteInspectionRepository.getActiveInspectionValidResponseCodes(777L))
        .thenReturn(List.of("Y", "N"));
    when(scaleSiteInspectionRepository.createScaleSiteInspectionBase(
        new InspectionCreateParams(
            "SITE001",
            LocalDate.of(2026, 3, 11),
            "22222222-2222-2222-2222-222222222222",
            "Y",
            "Created from staged workflow.",
            "COM",
            null,
            null))).thenReturn(12345L);
    when(scaleSiteInspectionRepository.getScaleSiteInspectionDetailBase(12345L)).thenReturn(
        new InspectionBase(
            "SITE001",
            "MAIN YARD",
            "Nanaimo",
            LocalDate.of(2026, 3, 11),
            "COM",
            "Compliance",
            null,
            null,
            "Y",
            "Inspector Name",
            "Created from staged workflow."));
    when(scaleSiteRepository.getScaleSite("SITE001")).thenReturn(
        new ScaleSiteCore("SITE001", "MAIN YARD", "Nanaimo"));
    when(scaleSiteRepository.getScaleSiteOwner("SITE001")).thenReturn(
        new ScaleSiteOwnerInfo("ACME FOREST PRODUCTS LTD.", null, null));
    when(scaleSiteInspectionRepository.getInspectedScalingMethodCodes(12345L)).thenReturn(List.of("W"));
    when(scaleSiteInspectionRepository.getInspectionResponses(12345L)).thenReturn(List.of(
        new InspectionResponse(
            777L,
            "N",
            null,
            null,
            null,
            "N")));
    when(scaleSiteInspectionRepository.getInspectionQuestionText(777L))
        .thenReturn("Was the scale head sealed?");
    when(lovService.getStaticLovDescriptionMap("INSPECTION_ANSWER_CODE"))
        .thenReturn(Map.of("N", "No"));

    ScaleSiteInspectionDetail result = service.createScaleSiteInspection(ScaleSiteInspectionApiMapper.toCreateCommand("SITE001", request));

    assertEquals(12345L, result.getInspectionId().get());
    verify(scaleSiteInspectionRepository).createScaleSiteInspectionBase(
        new InspectionCreateParams(
            "SITE001",
            LocalDate.of(2026, 3, 11),
            "22222222-2222-2222-2222-222222222222",
            "Y",
            "Created from staged workflow.",
            "COM",
            null,
            null));
  }

  @Test
  void createScaleSiteInspection_rejectsInvalidInspectorGuid() {
    ScaleSiteInspectionCreateRequest request = new ScaleSiteInspectionCreateRequest()
        .inspectionTypeCode("COM")
        .siteTypeCodes(List.of("W"))
        .inspectionDate(LocalDate.of(2026, 3, 11))
        .inspector("not-a-guid")
        .siteOperatorPresentInd(ScaleSiteInspectionCreateRequest.SiteOperatorPresentIndEnum.Y)
        .questionResponses(List.of());

    when(scaleSiteRepository.getScaleSiteSummaryCore("SITE001")).thenReturn(
        new ScaleSiteSummaryCore(
            "SITE001",
            100L,
            "12345678",
            "00",
            "MAIN YARD",
            "Nanaimo",
            "TB-123",
            49,
            10,
            22,
            123,
            56,
            31,
            null, null, null, null, null));
    when(lovService.getStaticLovDescriptionMap("SCALE_SITE_INSPCTN_TYPE_CODE"))
        .thenReturn(Map.of("COM", "Compliance"));
    when(lovService.getScaleMethodTypeLov(null, null)).thenReturn(List.of(
        new ScaleMethodTypeLov().code("W").description("Weight Scale")));
    when(scaleSiteInspectionRepository.getInspectionQuestionIdsForInspectionType("COM"))
        .thenReturn(List.of());

    InspectionCreateCommand command = ScaleSiteInspectionApiMapper.toCreateCommand("SITE001", request);
    BadRequestException ex = assertThrows(BadRequestException.class,
        () -> service.createScaleSiteInspection(command));

    assertEquals("A valid inspector is required. Select an inspector on the form.", ex.getMessage());
    verify(scaleSiteInspectionRepository, never()).createScaleSiteInspectionBase(any());
  }

  @Test
  void createScaleSiteInspection_acceptsLegacyHexFallbackGuid() {
    String inspectorGuid = "F5E59074276C40558FF6A17CF1AB3EC2";
    ScaleSiteInspectionCreateRequest request = new ScaleSiteInspectionCreateRequest()
        .inspectionTypeCode("COM")
        .siteTypeCodes(List.of("W"))
        .inspectionDate(LocalDate.of(2026, 3, 11))
        .inspector(inspectorGuid)
        .siteOperatorPresentInd(ScaleSiteInspectionCreateRequest.SiteOperatorPresentIndEnum.Y)
        .questionResponses(List.of());

    when(scaleSiteRepository.getScaleSiteSummaryCore("SITE001")).thenReturn(
        new ScaleSiteSummaryCore(
            "SITE001",
            100L,
            "12345678",
            "00",
            "MAIN YARD",
            "Nanaimo",
            "TB-123",
            49,
            10,
            22,
            123,
            56,
            31,
            null, null, null, null, null));
    when(lovService.getStaticLovDescriptionMap("SCALE_SITE_INSPCTN_TYPE_CODE"))
        .thenReturn(Map.of("COM", "Compliance"));
    when(lovService.getScaleMethodTypeLov(null, null)).thenReturn(List.of(
        new ScaleMethodTypeLov().code("W").description("Weight Scale")));
    when(scaleSiteInspectionRepository.getInspectionQuestionIdsForInspectionType("COM")).thenReturn(List.of());
    when(scaleSiteInspectionRepository.createScaleSiteInspectionBase(
        new InspectionCreateParams(
            "SITE001",
            LocalDate.of(2026, 3, 11),
            inspectorGuid,
            "Y",
            null,
            "COM",
            null,
            null))).thenReturn(12345L);
    when(scaleSiteInspectionRepository.getScaleSiteInspectionDetailBase(12345L)).thenReturn(
        new InspectionBase(
            "SITE001",
            "MAIN YARD",
            "Nanaimo",
            LocalDate.of(2026, 3, 11),
            "COM",
            "Compliance",
            null,
            null,
            "Y",
            inspectorGuid,
            null));
    when(scaleSiteRepository.getScaleSite("SITE001")).thenReturn(
        new ScaleSiteCore("SITE001", "MAIN YARD", "Nanaimo"));
    when(scaleSiteRepository.getScaleSiteOwner("SITE001")).thenReturn(
        new ScaleSiteOwnerInfo("ACME FOREST PRODUCTS LTD.", null, null));
    when(scaleSiteInspectionRepository.getInspectedScalingMethodCodes(12345L)).thenReturn(List.of("W"));
    when(scaleSiteInspectionRepository.getInspectionResponses(12345L)).thenReturn(List.of());
    when(lovService.getStaticLovDescriptionMap("INSPECTION_ANSWER_CODE")).thenReturn(Map.of());

    ScaleSiteInspectionDetail result = service.createScaleSiteInspection(ScaleSiteInspectionApiMapper.toCreateCommand("SITE001", request));

    assertEquals(12345L, result.getInspectionId().get());
    verify(scaleSiteInspectionRepository).createScaleSiteInspectionBase(
        new InspectionCreateParams(
            "SITE001",
            LocalDate.of(2026, 3, 11),
            inspectorGuid,
            "Y",
            null,
            "COM",
            null,
            null));
  }

  @Test
  void createScaleSiteInspection_rejectsNonExistentPreviousInspectionWithFieldError() {
    // The "Follow-up to Inspection #" field references an existing inspection. A non-existent id must be
    // caught here as an inline field error, not left to fail deep in the create proc as a generic 500.
    ScaleSiteInspectionCreateRequest request = new ScaleSiteInspectionCreateRequest()
        .inspectionTypeCode("COM")
        .siteTypeCodes(List.of("W"))
        .inspectionDate(LocalDate.of(2026, 3, 11))
        .inspector("22222222-2222-2222-2222-222222222222")
        .siteOperatorPresentInd(ScaleSiteInspectionCreateRequest.SiteOperatorPresentIndEnum.Y)
        .previousInspectionId(5L)
        .questionResponses(List.of());

    when(scaleSiteRepository.getScaleSiteSummaryCore("SITE001")).thenReturn(
        new ScaleSiteSummaryCore(
            "SITE001",
            100L,
            "12345678",
            "00",
            "MAIN YARD",
            "Nanaimo",
            "TB-123",
            49,
            10,
            22,
            123,
            56,
            31,
            null, null, null, null, null));
    when(lovService.getStaticLovDescriptionMap("SCALE_SITE_INSPCTN_TYPE_CODE"))
        .thenReturn(Map.of("COM", "Compliance"));
    when(lovService.getScaleMethodTypeLov(null, null)).thenReturn(List.of(
        new ScaleMethodTypeLov().code("W").description("Weight Scale")));
    when(scaleSiteInspectionRepository.getInspectionQuestionIdsForInspectionType("COM"))
        .thenReturn(List.of());
    when(scaleSiteInspectionRepository.searchScaleSiteInspectionByInspectionId(5L))
        .thenReturn(List.of());

    InspectionCreateCommand command = ScaleSiteInspectionApiMapper.toCreateCommand("SITE001", request);
    FieldValidationException ex = assertThrows(FieldValidationException.class,
        () -> service.createScaleSiteInspection(command));

    assertEquals(1, ex.getFieldErrors().size());
    assertEquals("previousInspectionId", ex.getFieldErrors().getFirst().field());
    assertEquals("Inspection # 5 does not exist.", ex.getFieldErrors().getFirst().message());
    verify(scaleSiteInspectionRepository, never()).createScaleSiteInspectionBase(any());
  }

  @Test
  void createScaleSiteInspection_acceptsExistingPreviousInspection() {
    // Same setup as above, but the referenced inspection exists — the create proceeds and the id is
    // threaded through to the create params.
    String inspectorGuid = "22222222-2222-2222-2222-222222222222";
    ScaleSiteInspectionCreateRequest request = new ScaleSiteInspectionCreateRequest()
        .inspectionTypeCode("COM")
        .siteTypeCodes(List.of("W"))
        .inspectionDate(LocalDate.of(2026, 3, 11))
        .inspector(inspectorGuid)
        .siteOperatorPresentInd(ScaleSiteInspectionCreateRequest.SiteOperatorPresentIndEnum.Y)
        .previousInspectionId(999L)
        .questionResponses(List.of());

    when(scaleSiteRepository.getScaleSiteSummaryCore("SITE001")).thenReturn(
        new ScaleSiteSummaryCore(
            "SITE001",
            100L,
            "12345678",
            "00",
            "MAIN YARD",
            "Nanaimo",
            "TB-123",
            49,
            10,
            22,
            123,
            56,
            31,
            null, null, null, null, null));
    when(lovService.getStaticLovDescriptionMap("SCALE_SITE_INSPCTN_TYPE_CODE"))
        .thenReturn(Map.of("COM", "Compliance"));
    when(lovService.getScaleMethodTypeLov(null, null)).thenReturn(List.of(
        new ScaleMethodTypeLov().code("W").description("Weight Scale")));
    when(scaleSiteInspectionRepository.getInspectionQuestionIdsForInspectionType("COM"))
        .thenReturn(List.of());
    when(scaleSiteInspectionRepository.searchScaleSiteInspectionByInspectionId(999L))
        .thenReturn(List.of(new InspectionSearchRef("SITE001", 999L)));
    when(scaleSiteInspectionRepository.createScaleSiteInspectionBase(
        new InspectionCreateParams(
            "SITE001",
            LocalDate.of(2026, 3, 11),
            inspectorGuid,
            "Y",
            null,
            "COM",
            999L,
            null))).thenReturn(12345L);
    when(scaleSiteInspectionRepository.getScaleSiteInspectionDetailBase(12345L)).thenReturn(
        new InspectionBase(
            "SITE001",
            "MAIN YARD",
            "Nanaimo",
            LocalDate.of(2026, 3, 11),
            "COM",
            "Compliance",
            999L,
            null,
            "Y",
            inspectorGuid,
            null));
    when(scaleSiteRepository.getScaleSite("SITE001")).thenReturn(
        new ScaleSiteCore("SITE001", "MAIN YARD", "Nanaimo"));
    when(scaleSiteRepository.getScaleSiteOwner("SITE001")).thenReturn(
        new ScaleSiteOwnerInfo("ACME FOREST PRODUCTS LTD.", null, null));
    when(scaleSiteInspectionRepository.getInspectedScalingMethodCodes(12345L)).thenReturn(List.of("W"));
    when(scaleSiteInspectionRepository.getInspectionResponses(12345L)).thenReturn(List.of());
    when(lovService.getStaticLovDescriptionMap("INSPECTION_ANSWER_CODE")).thenReturn(Map.of());

    ScaleSiteInspectionDetail result = service.createScaleSiteInspection(
        ScaleSiteInspectionApiMapper.toCreateCommand("SITE001", request));

    assertEquals(12345L, result.getInspectionId().get());
    verify(scaleSiteInspectionRepository).createScaleSiteInspectionBase(
        new InspectionCreateParams(
            "SITE001",
            LocalDate.of(2026, 3, 11),
            inspectorGuid,
            "Y",
            null,
            "COM",
            999L,
            null));
  }

  @Test
  void createScaleSiteInspection_rejectsInvalidAutomatedSiteTypeSelection() {
    ScaleSiteInspectionCreateRequest request = new ScaleSiteInspectionCreateRequest()
        .inspectionTypeCode("AUT")
        .siteTypeCodes(List.of("P"))
        .inspectionDate(LocalDate.of(2026, 3, 11))
        .inspector("guid-123")
        .siteOperatorPresentInd(ScaleSiteInspectionCreateRequest.SiteOperatorPresentIndEnum.Y)
        .questionResponses(List.of());

    when(scaleSiteRepository.getScaleSiteSummaryCore("SITE001")).thenReturn(
        new ScaleSiteSummaryCore(
            "SITE001",
            100L,
            "12345678",
            "00",
            "MAIN YARD",
            "Nanaimo",
            "TB-123",
            49,
            10,
            22,
            123,
            56,
            31,
            null, null, null, null, null));
    when(lovService.getStaticLovDescriptionMap("SCALE_SITE_INSPCTN_TYPE_CODE"))
        .thenReturn(Map.of("AUT", "Automated"));
    when(lovService.getScaleMethodTypeLov(null, null)).thenReturn(List.of(
        new ScaleMethodTypeLov().code("P").description("Piece Scale"),
        new ScaleMethodTypeLov().code("W").description("Weight Scale")));

    InspectionCreateCommand command = ScaleSiteInspectionApiMapper.toCreateCommand("SITE001", request);
    BadRequestException ex = assertThrows(BadRequestException.class,
        () -> service.createScaleSiteInspection(command));

    assertEquals("Automated inspections must use Weight Scale as the site type.", ex.getMessage());
    verify(scaleSiteInspectionRepository, never()).createScaleSiteInspectionBase(any());
  }

  @Test
  void getScaleSiteInspectionDetail_returnsAggregatedDetail() {
    when(scaleSiteInspectionRepository.getScaleSiteInspectionDetailBase(12345L)).thenReturn(
        new InspectionBase(
            "SITE001",
            "MAIN YARD",
            "Nanaimo",
            LocalDate.of(2026, 3, 10),
            "COM",
            "Compliance",
            12001L,
            "Jordan Smith",
            "Y",
            "guid-123",
            "General comments"),
        new InspectionBase(
            "SITE001",
            "MAIN YARD",
            "Nanaimo",
            LocalDate.of(2026, 3, 11),
            "COM",
            "Compliance",
            12001L,
            "Jordan Smith",
            "Y",
            "guid-123",
            "Updated after revisit."));
    when(scaleSiteRepository.getScaleSite("SITE001")).thenReturn(
        new ScaleSiteCore("SITE001", "MAIN YARD", "Nanaimo"));
    when(scaleSiteRepository.getScaleSiteOwner("SITE001")).thenReturn(
        new ScaleSiteOwnerInfo("ACME FOREST PRODUCTS LTD.", null, null));
    when(scaleSiteInspectionRepository.getInspectedScalingMethodCodes(12345L)).thenReturn(List.of("W", "P"));
    when(scaleSiteInspectionRepository.getInspectionResponses(12345L)).thenReturn(List.of(
        new InspectionResponse(
            777L,
            "Y",
            "Seal intact.",
            "Document follow-up",
            LocalDate.of(2026, 4, 1),
            "N")));
    when(scaleSiteInspectionRepository.getInspectionQuestionText(777L))
        .thenReturn("Was the scale head sealed?");
    when(lovService.getScaleMethodTypeLov(null, null)).thenReturn(List.of(
        new ScaleMethodTypeLov().code("W").description("Weight Scale"),
        new ScaleMethodTypeLov().code("P").description("Piece Scale")));
    when(lovService.getStaticLovDescriptionMap("INSPECTION_ANSWER_CODE"))
        .thenReturn(Map.of("Y", "Yes"));

    ScaleSiteInspectionDetail result = service.getScaleSiteInspectionDetail(12345L);

    assertEquals("SITE001", result.getScaleSiteIdNmbr().get());
    assertEquals("Compliance", result.getInspectionTypeDescription().get());
    assertEquals("ACME FOREST PRODUCTS LTD.", result.getSiteOwnerName().get());
    assertEquals("Weight Scale, Piece Scale", result.getSiteTypeDisplay().get());
    assertEquals("Yes", result.getSiteOperatorPresentDescription().get());
    assertEquals(1, result.getQuestionResponses().size());
    var firstQuestionResponse = result.getQuestionResponses().getFirst();
    assertEquals("Was the scale head sealed?", firstQuestionResponse.getQuestionText().get());
    assertEquals("Yes", firstQuestionResponse.getInspectionAnswerDescription().get());
    assertEquals("Yes", firstQuestionResponse.getFollowUpRequiredDescription().get());
    assertEquals("No", firstQuestionResponse.getFollowUpCompletedDescription().get());
    verify(scaleSiteInspectionRepository).getScaleSiteInspectionDetailBase(12345L);
    verify(scaleSiteRepository).getScaleSite("SITE001");
    verify(scaleSiteRepository).getScaleSiteOwner("SITE001");
    verify(scaleSiteInspectionRepository).getInspectionQuestionText(777L);
    verify(lovService, never()).getStaticLovDescriptionMap("yes/no");
  }

  @Test
  void getScaleSiteInspectionDetail_rejectsMissingInspectionId() {
    BadRequestException ex = assertThrows(BadRequestException.class,
        () -> service.getScaleSiteInspectionDetail(null));

    assertEquals("Inspection id is required.", ex.getMessage());
  }

  @Test
  void getScaleSiteInspectionDetail_notFoundWhenBaseRecordMissing() {
    when(scaleSiteInspectionRepository.getScaleSiteInspectionDetailBase(12345L)).thenReturn(null);

    ResourceNotFoundException ex = assertThrows(ResourceNotFoundException.class,
        () -> service.getScaleSiteInspectionDetail(12345L));

    assertEquals("No readable scale site inspection found with inspection id 12345", ex.getMessage());
  }

  @Test
  void getScaleSiteInspectionEdit_returnsEditPayloadWithQuestionIdsAndAnswerOptions() {
    when(scaleSiteInspectionRepository.getScaleSiteInspectionDetailBase(12345L)).thenReturn(
        new InspectionBase(
            "SITE001",
            "MAIN YARD",
            "Nanaimo",
            LocalDate.of(2026, 3, 10),
            "COM",
            "Compliance",
            12001L,
            "Jordan Smith",
            "Y",
            "guid-123",
            "General comments"),
        new InspectionBase(
            "SITE001",
            "MAIN YARD",
            "Nanaimo",
            LocalDate.of(2026, 3, 11),
            "COM",
            "Compliance",
            12001L,
            "Jordan Smith",
            "Y",
            "guid-123",
            "Updated after revisit."));
    when(scaleSiteRepository.getScaleSite("SITE001")).thenReturn(
        new ScaleSiteCore("SITE001", "MAIN YARD", "Nanaimo"));
    when(scaleSiteRepository.getScaleSiteOwner("SITE001")).thenReturn(
        new ScaleSiteOwnerInfo("ACME FOREST PRODUCTS LTD.", null, null));
    when(scaleSiteInspectionRepository.getInspectedScalingMethodCodes(12345L)).thenReturn(List.of("W"));
    when(scaleSiteInspectionRepository.getInspectionResponses(12345L)).thenReturn(List.of(
        new InspectionResponse(
            777L,
            "Y",
            "Seal intact.",
            null,
            null,
            null)));
    when(scaleSiteInspectionRepository.getInspectionQuestionText(777L))
        .thenReturn("Was the scale head sealed?");
    when(lovService.getScaleMethodTypeLov(null, null)).thenReturn(List.of(
        new ScaleMethodTypeLov().code("W").description("Weight Scale")));
    when(lovService.getStaticLovDescriptionMap("INSPECTION_ANSWER_CODE"))
        .thenReturn(Map.of("Y", "Yes", "N", "No"));
    when(scaleSiteInspectionRepository.getActiveInspectionValidResponseCodes(777L))
        .thenReturn(List.of("Y", "N"));

    ScaleSiteInspectionEditView result = service.getScaleSiteInspectionEdit(12345L);

    assertEquals("SITE001", result.getScaleSiteIdNmbr().get());
    assertEquals(1, result.getQuestionResponses().size());
    ScaleSiteInspectionEditQuestionResponse row = result.getQuestionResponses().getFirst();
    assertEquals(777L, row.getInspectionQuestionId());
    assertEquals("Was the scale head sealed?", row.getQuestionText().get());
    assertEquals(2, row.getAnswerOptions().size());
    assertEquals("Y", row.getAnswerOptions().getFirst().getCode());
  }

  @Test
  void getScaleSiteInspectionDetail_returnsApplicableQuestionsWhenNoResponsesExist() {
    when(scaleSiteInspectionRepository.getScaleSiteInspectionDetailBase(12345L)).thenReturn(
        new InspectionBase(
            "SITE001",
            "MAIN YARD",
            "Nanaimo",
            LocalDate.of(2026, 3, 10),
            "COM",
            "Compliance",
            12001L,
            "Jordan Smith",
            "Y",
            "guid-123",
            "General comments"));
    when(scaleSiteRepository.getScaleSite("SITE001")).thenReturn(
        new ScaleSiteCore("SITE001", "MAIN YARD", "Nanaimo"));
    when(scaleSiteRepository.getScaleSiteOwner("SITE001")).thenReturn(
        new ScaleSiteOwnerInfo("ACME FOREST PRODUCTS LTD.", null, null));
    when(scaleSiteInspectionRepository.getInspectedScalingMethodCodes(12345L)).thenReturn(List.of("W"));
    when(scaleSiteInspectionRepository.getInspectionResponses(12345L)).thenReturn(List.of());
    when(scaleSiteInspectionRepository.getInspectionQuestionIdsForInspectionType("COM"))
        .thenReturn(List.of(777L, 888L));
    when(scaleSiteInspectionRepository.getInspectionQuestionIdsForScaleMethod("W"))
        .thenReturn(List.of(777L));
    when(scaleSiteInspectionRepository.getActiveInspectionQuestions()).thenReturn(List.of(
        new InspectionQuestion(777L, "Was the scale head sealed?"),
        new InspectionQuestion(888L, "Unused question")));
    when(lovService.getScaleMethodTypeLov(null, null)).thenReturn(List.of(
        new ScaleMethodTypeLov().code("W").description("Weight Scale")));
    when(lovService.getStaticLovDescriptionMap("INSPECTION_ANSWER_CODE")).thenReturn(Map.of());

    ScaleSiteInspectionDetail result = service.getScaleSiteInspectionDetail(12345L);

    assertEquals(1, result.getQuestionResponses().size());
    assertEquals(
        "Was the scale head sealed?",
        result.getQuestionResponses().getFirst().getQuestionText().get());
    assertEquals(
        "No",
        result.getQuestionResponses().getFirst().getFollowUpRequiredDescription().get());
  }

  @Test
  void getScaleSiteInspectionEdit_returnsApplicableQuestionsWhenNoResponsesExist() {
    when(scaleSiteInspectionRepository.getScaleSiteInspectionDetailBase(12345L)).thenReturn(
        new InspectionBase(
            "SITE001",
            "MAIN YARD",
            "Nanaimo",
            LocalDate.of(2026, 3, 10),
            "COM",
            "Compliance",
            12001L,
            "Jordan Smith",
            "Y",
            "guid-123",
            "General comments"));
    when(scaleSiteRepository.getScaleSite("SITE001")).thenReturn(
        new ScaleSiteCore("SITE001", "MAIN YARD", "Nanaimo"));
    when(scaleSiteRepository.getScaleSiteOwner("SITE001")).thenReturn(
        new ScaleSiteOwnerInfo("ACME FOREST PRODUCTS LTD.", null, null));
    when(scaleSiteInspectionRepository.getInspectedScalingMethodCodes(12345L)).thenReturn(List.of("W"));
    when(scaleSiteInspectionRepository.getInspectionResponses(12345L)).thenReturn(List.of());
    when(scaleSiteInspectionRepository.getInspectionQuestionIdsForInspectionType("COM"))
        .thenReturn(List.of(777L));
    when(scaleSiteInspectionRepository.getInspectionQuestionIdsForScaleMethod("W"))
        .thenReturn(List.of(777L));
    when(scaleSiteInspectionRepository.getActiveInspectionQuestions()).thenReturn(List.of(
        new InspectionQuestion(777L, "Was the scale head sealed?")));
    when(scaleSiteInspectionRepository.getActiveInspectionValidResponseCodes(777L))
        .thenReturn(List.of("Y", "N"));
    when(lovService.getScaleMethodTypeLov(null, null)).thenReturn(List.of(
        new ScaleMethodTypeLov().code("W").description("Weight Scale")));
    when(lovService.getStaticLovDescriptionMap("INSPECTION_ANSWER_CODE"))
        .thenReturn(Map.of("Y", "Yes", "N", "No"));

    ScaleSiteInspectionEditView result = service.getScaleSiteInspectionEdit(12345L);

    assertEquals(1, result.getQuestionResponses().size());
    ScaleSiteInspectionEditQuestionResponse row = result.getQuestionResponses().getFirst();
    assertEquals(777L, row.getInspectionQuestionId());
    assertEquals("Was the scale head sealed?", row.getQuestionText().get());
    assertEquals(2, row.getAnswerOptions().size());
    assertEquals("Y", row.getAnswerOptions().getFirst().getCode());
    assertEquals(
        ScaleSiteInspectionEditQuestionResponse.FollowUpRequiredIndEnum.N,
        row.getFollowUpRequiredInd().get());
  }

  @Test
  void updateScaleSiteInspection_updatesBaseReplacesResponsesAndReturnsDetail() {
    ScaleSiteInspectionUpdateRequest request = new ScaleSiteInspectionUpdateRequest()
        .inspectionDate(LocalDate.of(2026, 3, 11))
        .inspector("33333333-3333-3333-3333-333333333333")
        .siteOperatorPresentInd(ScaleSiteInspectionUpdateRequest.SiteOperatorPresentIndEnum.Y)
        .comments("Updated after revisit.")
        .questionResponses(List.of(new ScaleSiteInspectionQuestionResponseInput()
            .inspectionQuestionId(777L)
            .inspectionAnswerCode("N")
            .commentsText("Needs correction")
            .followUpRequiredInd(ScaleSiteInspectionQuestionResponseInput.FollowUpRequiredIndEnum.Y)
            .followUpActionText("Issue corrective action request")
            .followUpDueDate(LocalDate.of(2026, 3, 20))
            .followUpCompletedInd(ScaleSiteInspectionQuestionResponseInput.FollowUpCompletedIndEnum.N)));

    when(scaleSiteInspectionRepository.getScaleSiteInspectionDetailBase(12345L)).thenReturn(
        new InspectionBase(
            "SITE001",
            "MAIN YARD",
            "Nanaimo",
            LocalDate.of(2026, 3, 10),
            "COM",
            "Compliance",
            12001L,
            "Jordan Smith",
            "Y",
            "guid-123",
            "General comments"),
        new InspectionBase(
            "SITE001",
            "MAIN YARD",
            "Nanaimo",
            LocalDate.of(2026, 3, 11),
            "COM",
            "Compliance",
            12001L,
            "Jordan Smith",
            "Y",
            "guid-123",
            "Updated after revisit."));
    when(scaleSiteInspectionRepository.getInspectionResponses(12345L)).thenReturn(
        List.of(new InspectionResponse(
            777L,
            "Y",
            "Old comment",
            null,
            null,
            null)))
        .thenReturn(List.of(new InspectionResponse(
            777L,
            "N",
            "Needs correction",
            "Issue corrective action request",
            LocalDate.of(2026, 3, 20),
            "N")));
    when(scaleSiteRepository.getScaleSite("SITE001")).thenReturn(
        new ScaleSiteCore("SITE001", "MAIN YARD", "Nanaimo"));
    when(scaleSiteRepository.getScaleSiteOwner("SITE001")).thenReturn(
        new ScaleSiteOwnerInfo("ACME FOREST PRODUCTS LTD.", null, null));
    when(scaleSiteInspectionRepository.getInspectedScalingMethodCodes(12345L)).thenReturn(List.of("W"));
    when(scaleSiteInspectionRepository.getInspectionQuestionText(777L))
        .thenReturn("Was the scale head sealed?");
    when(scaleSiteInspectionRepository.getActiveInspectionValidResponseCodes(777L))
        .thenReturn(List.of("Y", "N"));
    when(lovService.getScaleMethodTypeLov(null, null)).thenReturn(List.of(
        new ScaleMethodTypeLov().code("W").description("Weight Scale")));
    when(lovService.getStaticLovDescriptionMap("INSPECTION_ANSWER_CODE"))
        .thenReturn(Map.of("N", "No"));

    ScaleSiteInspectionDetail result = service.updateScaleSiteInspection(ScaleSiteInspectionApiMapper.toUpdateCommand(12345L, request));

    assertEquals("Updated after revisit.", result.getComments().get());
    assertEquals("No", result.getQuestionResponses().getFirst().getInspectionAnswerDescription().get());
    verify(scaleSiteInspectionRepository).updateScaleSiteInspectionBase(new InspectionUpdateParams(
        12345L,
        LocalDate.of(2026, 3, 11),
        "33333333-3333-3333-3333-333333333333",
        "Y",
        "Updated after revisit."));
    verify(scaleSiteInspectionRepository).deleteInspectionResponse(12345L, 777L, "Y");
    verify(scaleSiteInspectionRepository).insertInspectionResponse(
        org.mockito.ArgumentMatchers.eq(12345L),
        any(InspectionResponse.class));
    verify(scaleSiteInspectionRepository, times(2)).getScaleSiteInspectionDetailBase(12345L);
  }

  @Test
  void updateScaleSiteInspection_rejectsAnswerCodesNotValidForQuestion() {
    ScaleSiteInspectionUpdateRequest request = new ScaleSiteInspectionUpdateRequest()
        .inspectionDate(LocalDate.of(2026, 3, 11))
        .inspector("guid-123")
        .siteOperatorPresentInd(ScaleSiteInspectionUpdateRequest.SiteOperatorPresentIndEnum.Y)
        .questionResponses(List.of(new ScaleSiteInspectionQuestionResponseInput()
            .inspectionQuestionId(777L)
            .inspectionAnswerCode("NA")
            .followUpRequiredInd(ScaleSiteInspectionQuestionResponseInput.FollowUpRequiredIndEnum.N)));

    when(scaleSiteInspectionRepository.getScaleSiteInspectionDetailBase(12345L)).thenReturn(
        new InspectionBase(
            "SITE001",
            "MAIN YARD",
            "Nanaimo",
            LocalDate.of(2026, 3, 10),
            "COM",
            "Compliance",
            12001L,
            "Jordan Smith",
            "Y",
            "guid-123",
            "General comments"));
    when(scaleSiteInspectionRepository.getActiveInspectionValidResponseCodes(777L))
        .thenReturn(List.of("Y", "N"));

    InspectionUpdateCommand command = ScaleSiteInspectionApiMapper.toUpdateCommand(12345L, request);
    BadRequestException ex = assertThrows(BadRequestException.class,
        () -> service.updateScaleSiteInspection(command));

    assertEquals(
        "inspectionAnswerCode NA is not valid for inspectionQuestionId 777",
        ex.getMessage());
    verify(scaleSiteInspectionRepository, never()).updateScaleSiteInspectionBase(any(InspectionUpdateParams.class));
  }

  @Test
  void updateScaleSiteInspection_rejectsWhenSubmittedResponsesOmitExistingQuestionIds() {
    ScaleSiteInspectionUpdateRequest request = new ScaleSiteInspectionUpdateRequest()
        .inspectionDate(LocalDate.of(2026, 3, 11))
        .inspector("guid-123")
        .siteOperatorPresentInd(ScaleSiteInspectionUpdateRequest.SiteOperatorPresentIndEnum.Y)
        .questionResponses(List.of(new ScaleSiteInspectionQuestionResponseInput()
            .inspectionQuestionId(777L)
            .inspectionAnswerCode("Y")
            .followUpRequiredInd(ScaleSiteInspectionQuestionResponseInput.FollowUpRequiredIndEnum.N)));

    when(scaleSiteInspectionRepository.getScaleSiteInspectionDetailBase(12345L)).thenReturn(
        new InspectionBase(
            "SITE001",
            "MAIN YARD",
            "Nanaimo",
            LocalDate.of(2026, 3, 10),
            "COM",
            "Compliance",
            12001L,
            "Jordan Smith",
            "Y",
            "guid-123",
            "General comments"));
    when(scaleSiteInspectionRepository.getInspectionResponses(12345L)).thenReturn(List.of(
        new InspectionResponse(777L, "Y", null, null, null, null),
        new InspectionResponse(888L, "N", null, null, null, null)));

    InspectionUpdateCommand command = ScaleSiteInspectionApiMapper.toUpdateCommand(12345L, request);
    BadRequestException ex = assertThrows(BadRequestException.class,
        () -> service.updateScaleSiteInspection(command));

    assertEquals(
        "Question responses must include all required inspection questions.",
        ex.getMessage());
    verify(scaleSiteInspectionRepository, never()).updateScaleSiteInspectionBase(any(InspectionUpdateParams.class));
  }

  @Test
  void updateScaleSiteInspection_rejectsWhenFallbackQuestionsExistButSubmissionIsEmpty() {
    ScaleSiteInspectionUpdateRequest request = new ScaleSiteInspectionUpdateRequest()
        .inspectionDate(LocalDate.of(2026, 3, 11))
        .inspector("guid-123")
        .siteOperatorPresentInd(ScaleSiteInspectionUpdateRequest.SiteOperatorPresentIndEnum.Y)
        .questionResponses(List.of());

    when(scaleSiteInspectionRepository.getScaleSiteInspectionDetailBase(12345L)).thenReturn(
        new InspectionBase(
            "SITE001",
            "MAIN YARD",
            "Nanaimo",
            LocalDate.of(2026, 3, 10),
            "COM",
            "Compliance",
            12001L,
            "Jordan Smith",
            "Y",
            "guid-123",
            "General comments"));
    when(scaleSiteInspectionRepository.getInspectionResponses(12345L)).thenReturn(List.of());
    when(scaleSiteInspectionRepository.getInspectedScalingMethodCodes(12345L)).thenReturn(List.of("W"));
    when(scaleSiteInspectionRepository.getInspectionQuestionIdsForInspectionType("COM"))
        .thenReturn(List.of(777L));
    when(scaleSiteInspectionRepository.getInspectionQuestionIdsForScaleMethod("W"))
        .thenReturn(List.of(777L));
    when(scaleSiteInspectionRepository.getActiveInspectionQuestions()).thenReturn(List.of(
        new InspectionQuestion(777L, "Was the scale head sealed?")));

    InspectionUpdateCommand command = ScaleSiteInspectionApiMapper.toUpdateCommand(12345L, request);
    BadRequestException ex = assertThrows(BadRequestException.class,
        () -> service.updateScaleSiteInspection(command));

    assertEquals(
        "Question responses must be submitted for all required inspection questions.",
        ex.getMessage());
    verify(scaleSiteInspectionRepository, never()).updateScaleSiteInspectionBase(any(InspectionUpdateParams.class));
  }

  @Test
  void updateScaleSiteInspection_rejectsFollowUpFieldsWhenNotRequired() {
    ScaleSiteInspectionUpdateRequest request = new ScaleSiteInspectionUpdateRequest()
        .inspectionDate(LocalDate.of(2026, 3, 11))
        .inspector("guid-123")
        .siteOperatorPresentInd(ScaleSiteInspectionUpdateRequest.SiteOperatorPresentIndEnum.Y)
        .questionResponses(List.of(new ScaleSiteInspectionQuestionResponseInput()
            .inspectionQuestionId(777L)
            .inspectionAnswerCode("N")
            .followUpRequiredInd(ScaleSiteInspectionQuestionResponseInput.FollowUpRequiredIndEnum.N)
            .followUpActionText("Should not be present")));

    when(scaleSiteInspectionRepository.getScaleSiteInspectionDetailBase(12345L)).thenReturn(
        new InspectionBase(
            "SITE001",
            "MAIN YARD",
            "Nanaimo",
            LocalDate.of(2026, 3, 10),
            "COM",
            "Compliance",
            12001L,
            "Jordan Smith",
            "Y",
            "guid-123",
            "General comments"));
    when(scaleSiteInspectionRepository.getActiveInspectionValidResponseCodes(777L))
        .thenReturn(List.of("Y", "N"));

    InspectionUpdateCommand command = ScaleSiteInspectionApiMapper.toUpdateCommand(12345L, request);
    BadRequestException ex = assertThrows(BadRequestException.class,
        () -> service.updateScaleSiteInspection(command));

    assertEquals(
        "Follow-up action, due date, and completed indicator must be omitted when followUpRequiredInd is N for inspectionQuestionId 777",
        ex.getMessage());
    verify(scaleSiteInspectionRepository, never()).updateScaleSiteInspectionBase(any(InspectionUpdateParams.class));
  }

  @Test
  void deleteScaleSiteInspection_happyPath_callsRepository() {
    when(scaleSiteInspectionRepository.getScaleSiteInspectionDetailBase(12345L)).thenReturn(
        new InspectionBase(
            "SITE001",
            "MAIN YARD",
            "Nanaimo",
            LocalDate.of(2026, 3, 10),
            "COM",
            "Compliance",
            12001L,
            "Jordan Smith",
            "Y",
            "guid-123",
            "General comments"));

    service.deleteScaleSiteInspection(12345L);

    verify(scaleSiteInspectionRepository).deleteScaleSiteInspection(12345L);
  }

  @Test
  void deleteScaleSiteInspection_blankId_throwsBadRequest() {
    BadRequestException ex = assertThrows(BadRequestException.class,
        () -> service.deleteScaleSiteInspection(null));

    assertEquals("Inspection id is required.", ex.getMessage());
    verify(scaleSiteInspectionRepository, never()).deleteScaleSiteInspection(any());
  }

  @Test
  void deleteScaleSiteInspection_notFound_throwsResourceNotFound() {
    when(scaleSiteInspectionRepository.getScaleSiteInspectionDetailBase(12345L)).thenReturn(null);

    ResourceNotFoundException ex = assertThrows(ResourceNotFoundException.class,
        () -> service.deleteScaleSiteInspection(12345L));

    assertEquals(
        "No readable scale site inspection found with inspection id 12345",
        ex.getMessage());
    verify(scaleSiteInspectionRepository, never()).deleteScaleSiteInspection(any());
  }
}

