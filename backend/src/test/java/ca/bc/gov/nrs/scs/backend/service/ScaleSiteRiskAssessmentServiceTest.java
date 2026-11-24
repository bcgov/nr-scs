package ca.bc.gov.nrs.scs.backend.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import ca.bc.gov.nrs.scs.backend.domain.riskassessment.RiskAssessmentCreateCommand;
import ca.bc.gov.nrs.scs.backend.domain.riskassessment.RiskAssessmentUpdateCommand;
import ca.bc.gov.nrs.scs.backend.domain.riskassessment.RiskQuestionResponseInput;
import ca.bc.gov.nrs.scs.backend.domain.scalesite.ScaleSiteTombstoneRecord;
import ca.bc.gov.nrs.scs.backend.exception.BadRequestException;
import ca.bc.gov.nrs.scs.backend.exception.ConflictException;
import ca.bc.gov.nrs.scs.backend.exception.ForbiddenException;
import ca.bc.gov.nrs.scs.backend.exception.ResourceNotFoundException;
import ca.bc.gov.nrs.scs.backend.model.ScaleSiteRiskAssessmentDetail;
import ca.bc.gov.nrs.scs.backend.model.ScaleSiteRiskAssessmentSearchResult;
import ca.bc.gov.nrs.scs.backend.domain.shared.RegionDistrict;
import ca.bc.gov.nrs.scs.backend.dto.ActiveTemplateRow;
import ca.bc.gov.nrs.scs.backend.repository.OrgUnitRepository;
import ca.bc.gov.nrs.scs.backend.repository.ScaleSiteRepository;
import ca.bc.gov.nrs.scs.backend.security.ClientScopeGuard;
import ca.bc.gov.nrs.scs.backend.repository.ScaleSiteRiskAssessmentRepository;
import ca.bc.gov.nrs.scs.backend.repository.RiskQuestionnaireRepository;
import ca.bc.gov.nrs.scs.backend.dto.QuestionnaireRow;
import ca.bc.gov.nrs.scs.backend.dto.ResponseRow;
import ca.bc.gov.nrs.scs.backend.dto.RiskRatingRow;
import ca.bc.gov.nrs.scs.backend.dto.TemplateQaRow;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
@DisplayName("ScaleSiteRiskAssessmentService tests")
class ScaleSiteRiskAssessmentServiceTest {

  @Mock private ScaleSiteRiskAssessmentRepository repository;
  @Mock private RiskQuestionnaireRepository questionnaireRepository;
  @Mock private OrgUnitRepository orgUnitRepository;
  @Mock private ScaleSiteRepository scaleSiteRepository;
  @Mock private ClientScopeGuard clientScopeGuard;

  private ScaleSiteRiskAssessmentService service;

  @BeforeEach
  void setUpService() {
    // Wire a real shared questionnaire service over the mocked repository so the existing
    // when(...)/verify(...) stubs on questionnaireRepository still drive the build/save logic.
    service =
        new ScaleSiteRiskAssessmentService(
            repository,
            new RiskQuestionnaireService(questionnaireRepository),
            orgUnitRepository,
            scaleSiteRepository,
            clientScopeGuard);
  }

  private static final long ID = 42L;
  private static final long TEMPLATE_ID = 7L;

  private ScaleSiteRiskAssessmentSearchResult stubResult(Long id, String scaleSiteIdNmbr) {
    return new ScaleSiteRiskAssessmentSearchResult()
        .riskQuestionnaireId(id)
        .scaleSiteIdNmbr(scaleSiteIdNmbr)
        .orgUnitNo(10L)
        .riskTypeCode("MEDIUM");
  }

  private QuestionnaireRow stubQuestionnaire(Long id, String comments) {
    return new QuestionnaireRow(
        id, null, null, comments, null, null, "999", null, "SCSI", TEMPLATE_ID, null, null, null,
        null, null, null, null, null);
  }

  private List<TemplateQaRow> stubTemplateQa() {
    return List.of(
        new TemplateQaRow(1L, "Values (A)", 1, 11L, "Activity Level", 1, 101L, "Low", 1, 1),
        new TemplateQaRow(1L, "Values (A)", 1, 11L, "Activity Level", 1, 102L, "High", 5, 2),
        new TemplateQaRow(2L, "Likelihood (B)", 2, 12L, "Performance Issues", 1, 201L, "00", 5, 1));
  }

  private RiskQuestionResponseInput response(long questionId, Long answerId) {
    return new RiskQuestionResponseInput(questionId, answerId);
  }

  private RiskAssessmentUpdateCommand updateCommand(
      Optional<String> comments, List<RiskQuestionResponseInput> responses) {
    return new RiskAssessmentUpdateCommand(comments, responses);
  }

  private RiskAssessmentCreateCommand createCommand(
      String comments, List<RiskQuestionResponseInput> responses) {
    return new RiskAssessmentCreateCommand(comments, responses);
  }

  @Nested
  @DisplayName("searchScaleSiteRiskAssessments")
  class Search {

    @Test
    @DisplayName("delegates normalized params to repository and returns results")
    void search_delegatesToRepository() {
      when(repository.searchScaleSiteRiskAssessments(
              eq(42L), eq("MEDIUM"), isNull(), eq("SITE01"),
              isNull(), isNull(), eq(true), eq(false), eq(false),
              any(), isNull(), isNull(), eq(1), eq(0)))
          .thenReturn(List.of(stubResult(42L, "SITE01")));

      List<ScaleSiteRiskAssessmentSearchResult> results = service.searchScaleSiteRiskAssessments(
          "42", "medium", null, "site01",
          null, List.of("W"), null, null, null, null, null);

      assertEquals(1, results.size());
      assertEquals("SITE01", results.get(0).getScaleSiteIdNmbr().get());
    }

    @Test
    @DisplayName("wildcard prefix 10% matches only IDs that start with 10")
    void search_withPrefixWildcard_filtersInMemory() {
      when(repository.searchScaleSiteRiskAssessments(
              isNull(), isNull(), isNull(), isNull(), isNull(), isNull(),
              eq(false), eq(false), eq(false), any(), isNull(), isNull(), eq(1), eq(0)))
          .thenReturn(List.of(
              stubResult(100L, "SITE-A"),
              stubResult(105L, "SITE-B"),
              stubResult(210L, "SITE-C"),
              stubResult(200L, "SITE-D")));

      List<ScaleSiteRiskAssessmentSearchResult> results = service.searchScaleSiteRiskAssessments(
          "10%", null, null, null, null, null, null, null, null, null, null);

      assertEquals(2, results.size());
      assertTrue(results.stream().allMatch(r -> {
        Long id = r.getRiskQuestionnaireId() != null ? r.getRiskQuestionnaireId().get() : null;
        return id != null && String.valueOf(id).startsWith("10");
      }));
    }

    @Test
    @DisplayName("throws BadRequestException when riskQuestionnaireId is not numeric and not a wildcard")
    void search_withInvalidAssessmentId_throwsBadRequest() {
      BadRequestException ex = assertThrows(BadRequestException.class, () ->
          service.searchScaleSiteRiskAssessments(
              "not-a-number", null, null, null, null, null, null, null, null, null, null));

      assertTrue(ex.getMessage().contains("Assessment ID must be a number"));
    }

    @Test
    @DisplayName("ignores unrecognized method type codes")
    void search_withUnknownMethodType_isIgnored() {
      when(repository.searchScaleSiteRiskAssessments(
              isNull(), isNull(), isNull(), isNull(), isNull(), isNull(),
              eq(true), eq(false), eq(false), any(), isNull(), isNull(), eq(1), eq(0)))
          .thenReturn(List.of());

      service.searchScaleSiteRiskAssessments(
          null, null, null, null, null, List.of("W", "INVALID"), null, null, null, null, null);

      verify(repository).searchScaleSiteRiskAssessments(
          isNull(), isNull(), isNull(), isNull(), isNull(), isNull(),
          eq(true), eq(false), eq(false), any(), isNull(), isNull(), eq(1), eq(0));
    }

    @Test
    @DisplayName("returns empty list when repository returns no results")
    void search_noResults_returnsEmptyList() {
      when(repository.searchScaleSiteRiskAssessments(
              any(), any(), any(), any(), any(), any(), anyBoolean(), anyBoolean(), anyBoolean(),
              any(), any(), any(), any(), any()))
          .thenReturn(List.of());

      List<ScaleSiteRiskAssessmentSearchResult> results = service.searchScaleSiteRiskAssessments(
          null, null, null, null, null, null, null, null, null, null, null);

      assertTrue(results.isEmpty());
    }
  }

  @Nested
  @DisplayName("getScaleSiteRiskAssessment")
  class GetById {

    @Test
    @DisplayName("builds a data-driven detail from the assessment's own template")
    void get_found_buildsDetail() {
      when(repository.getScaleSiteRiskAssessment(ID)).thenReturn(stubResult(ID, "SITE001"));
      when(questionnaireRepository.findQuestionnaire(ID))
          .thenReturn(stubQuestionnaire(ID, "saved comments"));
      when(questionnaireRepository.getTemplateQa(TEMPLATE_ID)).thenReturn(stubTemplateQa());
      when(questionnaireRepository.getResponses(ID))
          .thenReturn(List.of(new ResponseRow(900L, 11L, 102L)));
      when(questionnaireRepository.getRiskRatings(TEMPLATE_ID))
          .thenReturn(List.of(new RiskRatingRow("H", "High Risk", "desc", 50, 100)));
      when(orgUnitRepository.findRegionDistrict(10L))
          .thenReturn(Optional.of(new RegionDistrict("Kootenay Region", "Cranbrook District")));

      ScaleSiteRiskAssessmentDetail detail = service.getScaleSiteRiskAssessment(ID);

      assertNotNull(detail);
      assertEquals(ID, detail.getRiskQuestionnaireId().get());
      assertEquals("SITE001", detail.getScaleSiteIdNmbr().get());
      assertEquals(TEMPLATE_ID, detail.getTemplateId().get());
      assertEquals("Kootenay Region", detail.getRegionName().get());
      assertEquals("Cranbrook District", detail.getDistrictName().get());
      assertEquals("saved comments", detail.getComments().get());

      assertEquals(2, detail.getSections().size());
      var firstSection = detail.getSections().get(0);
      assertEquals("Values (A)", firstSection.getSectionDescription().get());
      var activity = firstSection.getQuestions().get(0);
      assertEquals(102L, activity.getSelectedAnswerId().get());
      assertEquals(2, activity.getAnswers().size());

      assertEquals(1, detail.getRiskRatings().size());
      assertEquals("High Risk", detail.getRiskRatings().get(0).getCodeDescription().get());
    }

    @Test
    @DisplayName("blanks a saved selection whose answer was filtered out of the template")
    void get_savedAnswerFilteredOut_blanksSelection() {
      when(repository.getScaleSiteRiskAssessment(ID)).thenReturn(stubResult(ID, "SITE001"));
      when(questionnaireRepository.findQuestionnaire(ID))
          .thenReturn(stubQuestionnaire(ID, "saved comments"));
      when(questionnaireRepository.getTemplateQa(TEMPLATE_ID)).thenReturn(stubTemplateQa());
      // Saved answer 999 is not among question 11's surviving answers (101, 102) - e.g. it became
      // obsolete or was de-duped. The detail must blank it so display/validation/save round-trip.
      when(questionnaireRepository.getResponses(ID))
          .thenReturn(List.of(new ResponseRow(900L, 11L, 999L)));
      when(questionnaireRepository.getRiskRatings(TEMPLATE_ID)).thenReturn(List.of());
      when(orgUnitRepository.findRegionDistrict(10L)).thenReturn(Optional.empty());

      ScaleSiteRiskAssessmentDetail detail = service.getScaleSiteRiskAssessment(ID);

      var activity = detail.getSections().get(0).getQuestions().get(0);
      assertNull(activity.getSelectedAnswerId().orElse(null));
      assertEquals(2, activity.getAnswers().size());
    }

    @Test
    @DisplayName("throws ResourceNotFoundException when assessment does not exist")
    void get_notFound_throwsResourceNotFoundException() {
      when(repository.getScaleSiteRiskAssessment(999L)).thenReturn(null);

      assertThrows(ResourceNotFoundException.class, () ->
          service.getScaleSiteRiskAssessment(999L));
    }

    @Test
    @DisplayName("throws BadRequestException for null or non-positive id")
    void get_invalidId_throwsBadRequest() {
      assertThrows(BadRequestException.class, () -> service.getScaleSiteRiskAssessment(null));
      assertThrows(BadRequestException.class, () -> service.getScaleSiteRiskAssessment(0L));
    }
  }

  /**
   * The client-scope seam on the id-addressed read.
   *
   * <p>{@code ClientScopeInterceptor} scopes endpoints addressed by {@code scaleSiteIdNmbr}; this one
   * is addressed by {@code riskQuestionnaireId}, which it cannot resolve, so the service has to ask
   * {@link ClientScopeGuard} itself. That call is live for external roles — the Scale Site Owner holds
   * {@code SCALE_SITE_RISK_ASSESSMENT_READ} — so without it an external user could read any client's
   * assessment by guessing an id.
   *
   * <p>The guard is mocked here, so these assert the two things the SERVICE owns: that it delegates
   * with the record's own site, and that it does so <b>before</b> the not-found check. Whether a given
   * site is in scope is the guard's own decision — see {@code deniesWithoutReadingTheQuestionnaire}.
   */
  @Nested
  @DisplayName("getScaleSiteRiskAssessment client scoping")
  class GetByIdClientScope {

    @Test
    @DisplayName("asks the guard about the assessment's own site")
    void get_appliesClientScopeGuardViaItsSite() {
      when(repository.getScaleSiteRiskAssessment(ID)).thenReturn(stubResult(ID, "SITE001"));
      when(questionnaireRepository.findQuestionnaire(ID)).thenReturn(stubQuestionnaire(ID, "c"));
      when(questionnaireRepository.getTemplateQa(TEMPLATE_ID)).thenReturn(stubTemplateQa());
      when(questionnaireRepository.getResponses(ID)).thenReturn(List.of());
      when(questionnaireRepository.getRiskRatings(TEMPLATE_ID)).thenReturn(List.of());
      when(orgUnitRepository.findRegionDistrict(10L)).thenReturn(Optional.empty());

      service.getScaleSiteRiskAssessment(ID);

      verify(clientScopeGuard).assertRecordSiteInScope("SITE001");
    }

    /**
     * The 403-before-404 rule. A restricted caller must not be able to tell "not yours" from "does not
     * exist", or the id space becomes an existence oracle — so the guard is asked with a null site,
     * which it treats as a denial, before the not-found is reported. Internal callers, for whom the
     * guard no-ops, still get the 404 asserted here.
     */
    @Test
    @DisplayName("asks the guard before reporting an unknown id missing")
    void get_asksTheGuardBeforeReportingAnUnknownIdMissing() {
      when(repository.getScaleSiteRiskAssessment(999L)).thenReturn(null);

      assertThrows(ResourceNotFoundException.class, () -> service.getScaleSiteRiskAssessment(999L));

      verify(clientScopeGuard).assertRecordSiteInScope(null);
    }

    /**
     * A denial stops the read: the questionnaire, template and responses are never fetched. Asserted
     * because the guard throwing is only half the contract — work done after it would leak timing and
     * load rows the caller is not entitled to.
     *
     * <p>The guard is stubbed to throw rather than driven by a real client-restricted context: there is
     * no {@code ClientScopeGuardTest} and no {@code mockStatic} precedent in this suite, so the
     * decision itself (which sites are in scope for which client) is unproven at unit level. See the
     * PR discussion — that gap is the guard's, not this service's.
     */
    @Test
    @DisplayName("propagates the guard's denial without reading the questionnaire")
    void get_deniesWithoutReadingTheQuestionnaire() {
      when(repository.getScaleSiteRiskAssessment(ID)).thenReturn(stubResult(ID, "SITE001"));
      doThrow(new ForbiddenException("denied"))
          .when(clientScopeGuard)
          .assertRecordSiteInScope("SITE001");

      assertThrows(ForbiddenException.class, () -> service.getScaleSiteRiskAssessment(ID));

      verify(questionnaireRepository, never()).findQuestionnaire(ID);
      verify(questionnaireRepository, never()).getTemplateQa(any());
    }

    /**
     * One read, not two. The guard and the not-found check share the row: an earlier revision fetched
     * it once for each, so a restricted caller paid a duplicate round-trip on every read.
     */
    @Test
    @DisplayName("reads the assessment header only once")
    void get_readsTheHeaderOnce() {
      when(repository.getScaleSiteRiskAssessment(ID)).thenReturn(stubResult(ID, "SITE001"));
      when(questionnaireRepository.findQuestionnaire(ID)).thenReturn(stubQuestionnaire(ID, "c"));
      when(questionnaireRepository.getTemplateQa(TEMPLATE_ID)).thenReturn(stubTemplateQa());
      when(questionnaireRepository.getResponses(ID)).thenReturn(List.of());
      when(questionnaireRepository.getRiskRatings(TEMPLATE_ID)).thenReturn(List.of());
      when(orgUnitRepository.findRegionDistrict(10L)).thenReturn(Optional.empty());

      service.getScaleSiteRiskAssessment(ID);

      verify(repository, times(1)).getScaleSiteRiskAssessment(ID);
    }
  }

  @Nested
  @DisplayName("updateScaleSiteRiskAssessment")
  class Update {

    private void stubReads() {
      when(repository.getScaleSiteRiskAssessment(ID)).thenReturn(stubResult(ID, "SITE001"));
      when(questionnaireRepository.findQuestionnaire(ID))
          .thenReturn(stubQuestionnaire(ID, "old comments"));
      when(questionnaireRepository.getTemplateQa(TEMPLATE_ID)).thenReturn(stubTemplateQa());
    }

    @Test
    @DisplayName("reconciles responses: updates a changed answer, inserts a new one, saves comments")
    void update_reconcilesResponses() {
      stubReads();
      when(questionnaireRepository.getResponses(ID))
          .thenReturn(List.of(new ResponseRow(900L, 11L, 101L)));
      when(questionnaireRepository.getRiskRatings(TEMPLATE_ID)).thenReturn(List.of());

      RiskAssessmentUpdateCommand command =
          updateCommand(Optional.of("new comments"), List.of(response(11L, 102L), response(12L, 201L)));

      service.updateScaleSiteRiskAssessment(ID, command);

      verify(questionnaireRepository).updateResponse(900L, ID, 11L, 102L);
      verify(questionnaireRepository).insertResponse(ID, 12L, 201L);
      verify(questionnaireRepository).updateComments(any(QuestionnaireRow.class), eq("new comments"));
      // The template is unchanged by a save, so it is loaded once (for validation) and reused when
      // rebuilding the returned detail - not re-fetched.
      verify(questionnaireRepository, times(1)).getTemplateQa(TEMPLATE_ID);
    }

    @Test
    @DisplayName("leaves the stored comment untouched when the request omits comments")
    void update_omittedComments_leavesCommentUnchanged() {
      stubReads();
      when(questionnaireRepository.getResponses(ID)).thenReturn(List.of());
      when(questionnaireRepository.getRiskRatings(TEMPLATE_ID)).thenReturn(List.of());

      // No comments field: the stored comment must be preserved, not coerced to "" and overwritten.
      // Every question is answered (q11, q12) because edit now requires a full save.
      RiskAssessmentUpdateCommand command =
          updateCommand(Optional.empty(), List.of(response(11L, 102L), response(12L, 201L)));

      service.updateScaleSiteRiskAssessment(ID, command);

      verify(questionnaireRepository, never()).updateComments(any(), any());
    }

    @Test
    @DisplayName("throws BadRequestException when an edit leaves any question unanswered")
    void update_notAllAnswered_throwsBadRequest() {
      stubReads();

      // Edit mirrors create: leaving even one question blank (here q12) is rejected, so a sparse edit
      // can never drop the assessment below its risk band and out of the banded view. This covers the
      // all-cleared case too - that is just the extreme of "not all answered".
      RiskAssessmentUpdateCommand command =
          updateCommand(Optional.empty(), List.of(response(11L, 102L), response(12L, null)));

      BadRequestException ex =
          assertThrows(
              BadRequestException.class, () -> service.updateScaleSiteRiskAssessment(ID, command));
      assertEquals(
          "All questions must be answered in order to save the assessment.", ex.getMessage());
      // Rejected before any write: no responses are deleted, inserted, or updated.
      verify(questionnaireRepository, never()).deleteResponse(any());
      verify(questionnaireRepository, never()).insertResponse(any(), any(), any());
      verify(questionnaireRepository, never()).updateResponse(any(), any(), any(), any());
    }

    @Test
    @DisplayName("throws BadRequestException when an answer is not valid for the question")
    void update_invalidAnswer_throwsBadRequest() {
      stubReads();

      RiskAssessmentUpdateCommand command =
          updateCommand(Optional.empty(), List.of(response(11L, 999L)));

      assertThrows(BadRequestException.class, () -> service.updateScaleSiteRiskAssessment(ID, command));
    }

    @Test
    @DisplayName("throws BadRequestException when a question is not part of the template")
    void update_unknownQuestion_throwsBadRequest() {
      stubReads();

      RiskAssessmentUpdateCommand command =
          updateCommand(Optional.empty(), List.of(response(999L, 101L)));

      assertThrows(BadRequestException.class, () -> service.updateScaleSiteRiskAssessment(ID, command));
    }

    @Test
    @DisplayName("returns the Risk Level re-read after the save, not the pre-save band")
    void update_returnsRiskLevelRecalculatedBySave() {
      // The DB view derives the Risk Level from the stored responses, so the header read before the
      // write still reports the old band. Reusing it made the PUT answer with a stale Risk Level,
      // which is what left the Risk Rating tab showing the pre-save rating until a manual refresh.
      ScaleSiteRiskAssessmentSearchResult preSave = stubResult(ID, "SITE001");
      ScaleSiteRiskAssessmentSearchResult postSave =
          stubResult(ID, "SITE001")
              .riskTypeCode("HIGH")
              .codeDescription("High")
              .riskRating(java.math.BigDecimal.valueOf(63));
      when(repository.getScaleSiteRiskAssessment(ID)).thenReturn(preSave, postSave);
      when(questionnaireRepository.findQuestionnaire(ID))
          .thenReturn(stubQuestionnaire(ID, "old comments"));
      when(questionnaireRepository.getTemplateQa(TEMPLATE_ID)).thenReturn(stubTemplateQa());
      when(questionnaireRepository.getResponses(ID)).thenReturn(List.of());
      when(questionnaireRepository.getRiskRatings(TEMPLATE_ID)).thenReturn(List.of());

      ScaleSiteRiskAssessmentDetail detail =
          service.updateScaleSiteRiskAssessment(
              ID, updateCommand(Optional.empty(), List.of(response(11L, 102L), response(12L, 201L))));

      assertEquals("HIGH", detail.getRiskTypeCode().get());
      assertEquals("High", detail.getCodeDescription().get());
      assertEquals(java.math.BigDecimal.valueOf(63), detail.getRiskRating().get());
      // Twice: once as the pre-write existence check, once to pick up the recalculated band.
      verify(repository, times(2)).getScaleSiteRiskAssessment(ID);
    }

    @Test
    @DisplayName("throws ResourceNotFoundException when assessment does not exist")
    void update_notFound_throwsResourceNotFoundException() {
      when(repository.getScaleSiteRiskAssessment(999L)).thenReturn(null);

      assertThrows(ResourceNotFoundException.class, () ->
          service.updateScaleSiteRiskAssessment(999L, updateCommand(Optional.empty(), List.of())));
    }
  }

  @Nested
  @DisplayName("getScaleSiteRiskAssessmentCreateInit")
  class CreateInit {

    @Test
    @DisplayName("builds a blank questionnaire from the active SCSI template + scale-site header")
    void createInit_buildsBlankDetail() {
      when(scaleSiteRepository.getScaleSiteTombstone("123"))
          .thenReturn(new ScaleSiteTombstoneRecord("123", "Cedar Yard", "Coast", "Cascadia"));
      when(questionnaireRepository.findActiveTemplates("SCSI"))
          .thenReturn(List.of(new ActiveTemplateRow(TEMPLATE_ID, 3L, "SCSI")));
      when(questionnaireRepository.getTemplateQa(TEMPLATE_ID)).thenReturn(stubTemplateQa());
      when(questionnaireRepository.getRiskRatings(TEMPLATE_ID))
          .thenReturn(List.of(new RiskRatingRow("H", "High Risk", "desc", 50, 100)));

      ScaleSiteRiskAssessmentDetail detail = service.getScaleSiteRiskAssessmentCreateInit("123");

      assertNull(detail.getRiskQuestionnaireId().orElse(null));
      assertEquals(TEMPLATE_ID, detail.getTemplateId().get());
      assertEquals(3L, detail.getVersionNo().get());
      assertEquals("123", detail.getScaleSiteIdNmbr().get());
      assertEquals("Cedar Yard", detail.getSiteName().get());
      assertEquals("Coast", detail.getRegionName().get());
      assertEquals("Cascadia", detail.getDistrictName().get());
      assertEquals(2, detail.getSections().size());
      // Every question starts unanswered on the create form.
      var firstQuestion = detail.getSections().get(0).getQuestions().get(0);
      assertNull(firstQuestion.getSelectedAnswerId().orElse(null));
      assertEquals(1, detail.getRiskRatings().size());
      verify(questionnaireRepository, never())
          .insertQuestionnaire(any(), any(), any(), any(), any());
    }

    @Test
    @DisplayName("throws ResourceNotFoundException when the scale site does not exist")
    void createInit_scaleSiteMissing_throwsNotFound() {
      when(scaleSiteRepository.getScaleSiteTombstone("NOPE")).thenReturn(null);

      assertThrows(ResourceNotFoundException.class,
          () -> service.getScaleSiteRiskAssessmentCreateInit("NOPE"));
    }

    @Test
    @DisplayName("throws BadRequestException when no SCSI template is active")
    void createInit_noActiveTemplate_throwsBadRequest() {
      when(scaleSiteRepository.getScaleSiteTombstone("123"))
          .thenReturn(new ScaleSiteTombstoneRecord("123", null, null, null));
      when(questionnaireRepository.findActiveTemplates("SCSI")).thenReturn(List.of());

      assertThrows(BadRequestException.class,
          () -> service.getScaleSiteRiskAssessmentCreateInit("123"));
    }

    @Test
    @DisplayName("throws ConflictException when multiple SCSI templates are active")
    void createInit_multipleActiveTemplates_throwsConflict() {
      when(scaleSiteRepository.getScaleSiteTombstone("123"))
          .thenReturn(new ScaleSiteTombstoneRecord("123", null, null, null));
      when(questionnaireRepository.findActiveTemplates("SCSI"))
          .thenReturn(List.of(
              new ActiveTemplateRow(7L, 3L, "SCSI"),
              new ActiveTemplateRow(8L, 4L, "SCSI")));

      assertThrows(ConflictException.class,
          () -> service.getScaleSiteRiskAssessmentCreateInit("123"));
    }

    @Test
    @DisplayName("throws BadRequestException when the scale site id is blank")
    void createInit_blankId_throwsBadRequest() {
      assertThrows(BadRequestException.class,
          () -> service.getScaleSiteRiskAssessmentCreateInit("   "));
    }
  }

  @Nested
  @DisplayName("createScaleSiteRiskAssessment")
  class Create {

    private static final long NEW_ID = 555L;

    private void stubActiveTemplateAndScaleSite() {
      when(scaleSiteRepository.getScaleSiteTombstone("123"))
          .thenReturn(new ScaleSiteTombstoneRecord("123", "Cedar Yard", null, null));
      when(questionnaireRepository.findActiveTemplates("SCSI"))
          .thenReturn(List.of(new ActiveTemplateRow(TEMPLATE_ID, 3L, "SCSI")));
      when(questionnaireRepository.getTemplateQa(TEMPLATE_ID)).thenReturn(stubTemplateQa());
    }

    private void stubReReadOfNewAssessment() {
      when(repository.getScaleSiteRiskAssessment(NEW_ID)).thenReturn(stubResult(NEW_ID, "123"));
      when(questionnaireRepository.findQuestionnaire(NEW_ID))
          .thenReturn(stubQuestionnaire(NEW_ID, null));
      when(questionnaireRepository.getResponses(NEW_ID))
          .thenReturn(List.of(new ResponseRow(1L, 11L, 102L), new ResponseRow(2L, 12L, 201L)));
      when(questionnaireRepository.getRiskRatings(TEMPLATE_ID)).thenReturn(List.of());
      when(orgUnitRepository.findRegionDistrict(10L)).thenReturn(Optional.empty());
    }

    @Test
    @DisplayName("inserts the questionnaire + every response and returns the new detail")
    void create_insertsQuestionnaireAndResponses() {
      stubActiveTemplateAndScaleSite();
      when(questionnaireRepository.insertQuestionnaire(null, "123", "SCSI", TEMPLATE_ID, "note"))
          .thenReturn(NEW_ID);
      stubReReadOfNewAssessment();

      RiskAssessmentCreateCommand command =
          createCommand("note", List.of(response(11L, 102L), response(12L, 201L)));

      ScaleSiteRiskAssessmentDetail detail = service.createScaleSiteRiskAssessment("123", command);

      assertEquals(NEW_ID, detail.getRiskQuestionnaireId().get());
      verify(questionnaireRepository).insertQuestionnaire(null, "123", "SCSI", TEMPLATE_ID, "note");
      verify(questionnaireRepository).insertResponse(NEW_ID, 11L, 102L);
      verify(questionnaireRepository).insertResponse(NEW_ID, 12L, 201L);
    }

    @Test
    @DisplayName("passes null comments through when none are supplied")
    void create_nullComments() {
      stubActiveTemplateAndScaleSite();
      when(questionnaireRepository.insertQuestionnaire(null, "123", "SCSI", TEMPLATE_ID, null))
          .thenReturn(NEW_ID);
      stubReReadOfNewAssessment();

      RiskAssessmentCreateCommand command =
          createCommand(null, List.of(response(11L, 102L), response(12L, 201L)));

      service.createScaleSiteRiskAssessment("123", command);

      verify(questionnaireRepository).insertQuestionnaire(null, "123", "SCSI", TEMPLATE_ID, null);
    }

    @Test
    @DisplayName("throws BadRequestException when not every question is answered")
    void create_missingAnswer_throwsBadRequest() {
      stubActiveTemplateAndScaleSite();

      // Question 12 is left unanswered - a full save requires all questions.
      RiskAssessmentCreateCommand command = createCommand(null, List.of(response(11L, 102L)));

      assertThrows(BadRequestException.class,
          () -> service.createScaleSiteRiskAssessment("123", command));
      verify(questionnaireRepository, never())
          .insertQuestionnaire(any(), any(), any(), any(), any());
    }

    @Test
    @DisplayName("throws BadRequestException for an answer that is not valid for the question")
    void create_invalidAnswer_throwsBadRequest() {
      stubActiveTemplateAndScaleSite();

      RiskAssessmentCreateCommand command =
          createCommand(null, List.of(response(11L, 999L), response(12L, 201L)));

      assertThrows(BadRequestException.class,
          () -> service.createScaleSiteRiskAssessment("123", command));
    }

    @Test
    @DisplayName("throws ResourceNotFoundException when the scale site does not exist")
    void create_scaleSiteMissing_throwsNotFound() {
      when(scaleSiteRepository.getScaleSiteTombstone("NOPE")).thenReturn(null);

      assertThrows(ResourceNotFoundException.class,
          () -> service.createScaleSiteRiskAssessment("NOPE", createCommand(null, List.of())));
    }
  }
}
