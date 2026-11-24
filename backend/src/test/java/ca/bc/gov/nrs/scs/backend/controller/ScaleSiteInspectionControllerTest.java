package ca.bc.gov.nrs.scs.backend.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import ca.bc.gov.nrs.scs.backend.exception.BadRequestException;
import ca.bc.gov.nrs.scs.backend.exception.ConflictException;
import ca.bc.gov.nrs.scs.backend.exception.GlobalApiExceptionHandler;
import ca.bc.gov.nrs.scs.backend.exception.ResourceNotFoundException;
import ca.bc.gov.nrs.scs.backend.exception.UnprocessableEntityException;
import ca.bc.gov.nrs.scs.backend.domain.inspection.InspectionCreateCommand;
import ca.bc.gov.nrs.scs.backend.domain.inspection.InspectionUpdateCommand;
import ca.bc.gov.nrs.scs.backend.model.ScaleSiteInspectionCreateInitView;
import ca.bc.gov.nrs.scs.backend.model.ScaleSiteInspectionCreateRequest;
import ca.bc.gov.nrs.scs.backend.model.ScaleSiteInspectionDetail;
import ca.bc.gov.nrs.scs.backend.model.ScaleSiteInspectionEditView;
import ca.bc.gov.nrs.scs.backend.model.ScaleSiteInspectionQuestionResponseInput;
import ca.bc.gov.nrs.scs.backend.model.ScaleSiteInspectionRecipientOption;
import ca.bc.gov.nrs.scs.backend.model.ScaleSiteInspectionSearchResult;
import ca.bc.gov.nrs.scs.backend.model.ScaleSiteInspectionSummary;
import ca.bc.gov.nrs.scs.backend.model.ScaleSiteInspectionUpdateRequest;
import ca.bc.gov.nrs.scs.backend.service.ScaleSiteInspectionService;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import org.hamcrest.Matchers;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.openapitools.jackson.nullable.JsonNullableModule;
import org.springframework.http.MediaType;
import org.springframework.http.converter.json.MappingJackson2HttpMessageConverter;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

class ScaleSiteInspectionControllerTest {

  private ScaleSiteInspectionService scaleSiteInspectionService;
  private MockMvc mockMvc;
  private ObjectMapper objectMapper;

  @BeforeEach
  void setUp() {
    scaleSiteInspectionService = mock(ScaleSiteInspectionService.class);

    objectMapper = new ObjectMapper()
        .registerModule(new JsonNullableModule())
        .registerModule(new JavaTimeModule())
        .disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);

    MappingJackson2HttpMessageConverter converter = new MappingJackson2HttpMessageConverter();
    converter.setObjectMapper(objectMapper);

    mockMvc = MockMvcBuilders
        .standaloneSetup(new ScaleSiteInspectionController(scaleSiteInspectionService))
        .setControllerAdvice(new GlobalApiExceptionHandler())
        .setMessageConverters(converter)
        .build();
  }

  @Test
  void getScaleSiteInspectionSummaries_returns200() throws Exception {
    when(scaleSiteInspectionService.getScaleSiteInspectionSummaries("SITE001"))
        .thenReturn(List.of(new ScaleSiteInspectionSummary()
            .inspectionId(12345L)
            .inspectionTypeDescription("Compliance")
            .siteTypeDisplay("Weight Scale")
            .inspectionDate(LocalDate.of(2026, 3, 10))
            .inspector("guid-123")
            .followUpInspectionIndicator("Y")));

    mockMvc.perform(get("/scale-sites/SITE001/inspections")
            .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk())
        .andExpect(content().string(Matchers.containsString("12345")))
        .andExpect(content().string(Matchers.containsString("Compliance")));
  }

  @Test
  void getScaleSiteInspectionSummaries_notFound_returns404() throws Exception {
    when(scaleSiteInspectionService.getScaleSiteInspectionSummaries("SITE001"))
        .thenThrow(new ResourceNotFoundException("No scale site found with scale site number SITE001"));

    mockMvc.perform(get("/scale-sites/SITE001/inspections")
            .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isNotFound());
  }

  @Test
  void getScaleSiteInspectionCreateInit_returns200() throws Exception {
    when(scaleSiteInspectionService.getScaleSiteInspectionCreateInit("SITE001", "COM", List.of("W")))
        .thenReturn(new ScaleSiteInspectionCreateInitView()
            .scaleSiteIdNmbr("SITE001")
            .inspectionTypeCode("COM")
            .inspectionTypeDescription("Compliance")
            .siteTypeCodes(List.of("W"))
            .siteTypeDisplay("Weight Scale")
            .recipientOptions(List.of(new ScaleSiteInspectionRecipientOption()
                .value("77")
                .label("Jordan Smith"))));

    mockMvc.perform(get("/scale-sites/SITE001/inspections/create")
            .param("inspectionTypeCode", "COM")
            .param("siteTypeCodes", "W")
            .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk())
        .andExpect(content().string(Matchers.containsString("Compliance")))
        .andExpect(content().string(Matchers.containsString("Jordan Smith")));
  }

  @Test
  void getScaleSiteInspectionCreateInit_unprocessable_returns422() throws Exception {
    when(scaleSiteInspectionService.getScaleSiteInspectionCreateInit("SITE001", "AUT", List.of("P")))
        .thenThrow(new UnprocessableEntityException(
            "Automated inspections must use Weight Scale as the site type."));

    mockMvc.perform(get("/scale-sites/SITE001/inspections/create")
            .param("inspectionTypeCode", "AUT")
            .param("siteTypeCodes", "P")
            .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isUnprocessableEntity());
  }

  @Test
  void searchScaleSiteInspection_returns200() throws Exception {
    when(scaleSiteInspectionService.searchScaleSiteInspection(12345L))
        .thenReturn(new ScaleSiteInspectionSearchResult()
            .inspectionId(12345L)
            .scaleSiteIdNmbr("SITE001"));

    mockMvc.perform(get("/scale-sites/inspection/search")
            .param("inspectionId", "12345")
            .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk())
        .andExpect(content().string(Matchers.containsString("SITE001")));
  }

  @Test
  void getScaleSiteInspectionDetail_returns200() throws Exception {
    when(scaleSiteInspectionService.getScaleSiteInspectionDetail(12345L))
        .thenReturn(new ScaleSiteInspectionDetail()
            .inspectionId(12345L)
            .inspectionTypeDescription("Compliance")
            .inspectionDate(LocalDate.of(2026, 3, 10))
            .scaleSiteIdNmbr("SITE001")
            .siteName("MAIN YARD"));

    mockMvc.perform(get("/scale-sites/inspection/12345")
            .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk())
        .andExpect(content().string(Matchers.containsString("SITE001")))
        .andExpect(content().string(Matchers.containsString("Compliance")));
  }

  @Test
  void getScaleSiteInspectionEdit_returns200() throws Exception {
    when(scaleSiteInspectionService.getScaleSiteInspectionEdit(12345L))
        .thenReturn(new ScaleSiteInspectionEditView()
            .inspectionId(12345L)
            .inspectionTypeDescription("Compliance")
            .scaleSiteIdNmbr("SITE001")
            .comments("General comments"));

    mockMvc.perform(get("/scale-sites/inspection/12345/edit")
            .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk())
        .andExpect(content().string(Matchers.containsString("SITE001")))
        .andExpect(content().string(Matchers.containsString("Compliance")));
  }

  @Test
  void updateScaleSiteInspection_returns200() throws Exception {
    ScaleSiteInspectionUpdateRequest request = new ScaleSiteInspectionUpdateRequest()
        .inspectionDate(LocalDate.of(2026, 3, 11))
        .inspector("guid-123")
        .siteOperatorPresentInd(ScaleSiteInspectionUpdateRequest.SiteOperatorPresentIndEnum.Y)
        .questionResponses(List.of(new ScaleSiteInspectionQuestionResponseInput()
            .inspectionQuestionId(777L)
            .inspectionAnswerCode("N")
            .followUpRequiredInd(ScaleSiteInspectionQuestionResponseInput.FollowUpRequiredIndEnum.N)));

    when(scaleSiteInspectionService.updateScaleSiteInspection(any(InspectionUpdateCommand.class)))
        .thenReturn(new ScaleSiteInspectionDetail()
            .inspectionId(12345L)
            .scaleSiteIdNmbr("SITE001")
            .comments("Updated after revisit."));

    mockMvc.perform(put("/scale-sites/inspection/12345")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(request))
            .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk())
        .andExpect(content().string(Matchers.containsString("Updated after revisit.")));
  }

  @Test
  void createScaleSiteInspection_returns201() throws Exception {
    ScaleSiteInspectionCreateRequest request = new ScaleSiteInspectionCreateRequest()
        .inspectionTypeCode("COM")
        .siteTypeCodes(List.of("W"))
        .inspectionDate(LocalDate.of(2026, 3, 11))
        .inspector("guid-123")
        .siteOperatorPresentInd(ScaleSiteInspectionCreateRequest.SiteOperatorPresentIndEnum.Y)
        .questionResponses(List.of(new ScaleSiteInspectionQuestionResponseInput()
            .inspectionQuestionId(777L)
            .inspectionAnswerCode("N")
            .followUpRequiredInd(ScaleSiteInspectionQuestionResponseInput.FollowUpRequiredIndEnum.N)));

    when(scaleSiteInspectionService.createScaleSiteInspection(any(InspectionCreateCommand.class)))
        .thenReturn(new ScaleSiteInspectionDetail()
            .inspectionId(12345L)
            .scaleSiteIdNmbr("SITE001")
            .comments("Created from staged workflow."));

    mockMvc.perform(post("/scale-sites/SITE001/inspections")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(request))
            .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isCreated())
        .andExpect(content().string(Matchers.containsString("12345")))
        .andExpect(content().string(Matchers.containsString("Created from staged workflow.")));
  }

  @Test
  void createScaleSiteInspection_validationFailure_returns400() throws Exception {
    ScaleSiteInspectionCreateRequest request = new ScaleSiteInspectionCreateRequest()
        .inspectionTypeCode("COM")
        .siteTypeCodes(List.of("W"))
        .inspectionDate(LocalDate.of(2026, 3, 11))
        .inspector("guid-123")
        .siteOperatorPresentInd(ScaleSiteInspectionCreateRequest.SiteOperatorPresentIndEnum.Y)
        .questionResponses(List.of(new ScaleSiteInspectionQuestionResponseInput()
            .inspectionQuestionId(777L)
            .inspectionAnswerCode("N")
            .followUpRequiredInd(ScaleSiteInspectionQuestionResponseInput.FollowUpRequiredIndEnum.N)));

    when(scaleSiteInspectionService.createScaleSiteInspection(any(InspectionCreateCommand.class)))
        .thenThrow(new BadRequestException("Question responses must include all required inspection questions."));

    mockMvc.perform(post("/scale-sites/SITE001/inspections")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(request))
            .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isBadRequest());
  }

  @Test
  void createScaleSiteInspection_nullBody_returns400() throws Exception {
    mockMvc.perform(post("/scale-sites/SITE001/inspections")
            .contentType(MediaType.APPLICATION_JSON)
            .content("null")
            .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isBadRequest())
        .andExpect(content().string(Matchers.containsString("Request body is required.")));
  }

  @Test
  void updateScaleSiteInspection_nullBody_returns400() throws Exception {
    mockMvc.perform(put("/scale-sites/inspection/12345")
            .contentType(MediaType.APPLICATION_JSON)
            .content("null")
            .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isBadRequest())
        .andExpect(content().string(Matchers.containsString("Request body is required.")));
  }

  @Test
  void updateScaleSiteInspection_validationFailure_returns400() throws Exception {
    ScaleSiteInspectionUpdateRequest request = new ScaleSiteInspectionUpdateRequest()
        .inspectionDate(LocalDate.of(2026, 3, 11))
        .inspector("guid-123")
        .siteOperatorPresentInd(ScaleSiteInspectionUpdateRequest.SiteOperatorPresentIndEnum.Y)
        .questionResponses(List.of(new ScaleSiteInspectionQuestionResponseInput()
            .inspectionQuestionId(777L)
            .inspectionAnswerCode("N")
            .followUpRequiredInd(ScaleSiteInspectionQuestionResponseInput.FollowUpRequiredIndEnum.N)));

    when(scaleSiteInspectionService.updateScaleSiteInspection(any(InspectionUpdateCommand.class)))
        .thenThrow(new BadRequestException("inspectionDate is required."));

    mockMvc.perform(put("/scale-sites/inspection/12345")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(request))
            .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isBadRequest());
  }

  // Legacy limits (SiteInspectionValidator / InspectionResponseValidator): over-length text must be
  // refused as a 400 before it reaches the database, not fail there as a 500.

  @Test
  void updateScaleSiteInspection_commentsOver2000_returns400() throws Exception {
    ScaleSiteInspectionUpdateRequest request = validUpdateRequest().comments("x".repeat(2001));

    mockMvc.perform(put("/scale-sites/inspection/12345")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(request))
            .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isBadRequest())
        .andExpect(content().string(Matchers.containsString("\"field\":\"comments\"")));
    verify(scaleSiteInspectionService, never()).updateScaleSiteInspection(any());
  }

  @Test
  void updateScaleSiteInspection_questionCommentsOver4000_returns400() throws Exception {
    ScaleSiteInspectionUpdateRequest request = validUpdateRequest();
    request.getQuestionResponses().getFirst().commentsText("x".repeat(4001));

    mockMvc.perform(put("/scale-sites/inspection/12345")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(request))
            .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isBadRequest())
        .andExpect(content().string(Matchers.containsString("questionResponses[0].commentsText")));
    verify(scaleSiteInspectionService, never()).updateScaleSiteInspection(any());
  }

  @Test
  void updateScaleSiteInspection_followUpActionOver4000_returns400() throws Exception {
    ScaleSiteInspectionUpdateRequest request = validUpdateRequest();
    request.getQuestionResponses().getFirst()
        .followUpRequiredInd(ScaleSiteInspectionQuestionResponseInput.FollowUpRequiredIndEnum.Y)
        .followUpActionText("x".repeat(4001));

    mockMvc.perform(put("/scale-sites/inspection/12345")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(request))
            .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isBadRequest())
        .andExpect(content().string(
            Matchers.containsString("questionResponses[0].followUpActionText")));
    verify(scaleSiteInspectionService, never()).updateScaleSiteInspection(any());
  }

  @Test
  void createScaleSiteInspection_questionCommentsOver4000_returns400() throws Exception {
    ScaleSiteInspectionCreateRequest request = new ScaleSiteInspectionCreateRequest()
        .inspectionTypeCode("COM")
        .siteTypeCodes(List.of("W"))
        .inspectionDate(LocalDate.of(2026, 3, 11))
        .inspector("guid-123")
        .siteOperatorPresentInd(ScaleSiteInspectionCreateRequest.SiteOperatorPresentIndEnum.Y)
        .questionResponses(List.of(new ScaleSiteInspectionQuestionResponseInput()
            .inspectionQuestionId(777L)
            .inspectionAnswerCode("N")
            .commentsText("x".repeat(4001))
            .followUpRequiredInd(ScaleSiteInspectionQuestionResponseInput.FollowUpRequiredIndEnum.N)));

    mockMvc.perform(post("/scale-sites/SITE001/inspections")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(request))
            .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isBadRequest())
        .andExpect(content().string(Matchers.containsString("questionResponses[0].commentsText")));
    verify(scaleSiteInspectionService, never()).createScaleSiteInspection(any());
  }

  @Test
  void updateScaleSiteInspection_textAtLegacyLimits_isAccepted() throws Exception {
    ScaleSiteInspectionUpdateRequest request = validUpdateRequest().comments("x".repeat(2000));
    request.getQuestionResponses().getFirst().commentsText("x".repeat(4000));
    when(scaleSiteInspectionService.updateScaleSiteInspection(any(InspectionUpdateCommand.class)))
        .thenReturn(new ScaleSiteInspectionDetail().inspectionId(12345L));

    mockMvc.perform(put("/scale-sites/inspection/12345")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(request))
            .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk());
  }

  private static ScaleSiteInspectionUpdateRequest validUpdateRequest() {
    return new ScaleSiteInspectionUpdateRequest()
        .inspectionDate(LocalDate.of(2026, 3, 11))
        .inspector("guid-123")
        .siteOperatorPresentInd(ScaleSiteInspectionUpdateRequest.SiteOperatorPresentIndEnum.Y)
        .questionResponses(new ArrayList<>(List.of(new ScaleSiteInspectionQuestionResponseInput()
            .inspectionQuestionId(777L)
            .inspectionAnswerCode("N")
            .followUpRequiredInd(ScaleSiteInspectionQuestionResponseInput.FollowUpRequiredIndEnum.N))));
  }

  @Test
  void getScaleSiteInspectionDetail_notFound_returns404() throws Exception {
    when(scaleSiteInspectionService.getScaleSiteInspectionDetail(12345L))
        .thenThrow(new ResourceNotFoundException("No readable scale site inspection found with inspection id 12345"));

    mockMvc.perform(get("/scale-sites/inspection/12345")
            .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isNotFound());
  }

  @Test
  void searchScaleSiteInspection_notFound_returns404() throws Exception {
    when(scaleSiteInspectionService.searchScaleSiteInspection(12345L))
        .thenThrow(new ResourceNotFoundException("No scale site inspection found with inspection id 12345"));

    mockMvc.perform(get("/scale-sites/inspection/search")
            .param("inspectionId", "12345")
            .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isNotFound());
  }

  @Test
  void searchScaleSiteInspection_multipleMatches_returns409() throws Exception {
    when(scaleSiteInspectionService.searchScaleSiteInspection(12345L))
        .thenThrow(new ConflictException("Multiple scale site inspections found with inspection id 12345"));

    mockMvc.perform(get("/scale-sites/inspection/search")
            .param("inspectionId", "12345")
            .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isConflict());
  }

  @Test
  void searchScaleSiteInspection_notViewable_returns422() throws Exception {
    when(scaleSiteInspectionService.searchScaleSiteInspection(12345L))
        .thenThrow(new UnprocessableEntityException("Inspection 12345 is not viewable in CIMS."));

    mockMvc.perform(get("/scale-sites/inspection/search")
            .param("inspectionId", "12345")
            .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isUnprocessableEntity());
  }

  @Test
  void deleteScaleSiteInspection_returns204OnSuccess() throws Exception {
    mockMvc.perform(delete("/scale-sites/inspection/12345"))
        .andExpect(status().isNoContent());

    verify(scaleSiteInspectionService).deleteScaleSiteInspection(12345L);
  }

  @Test
  void deleteScaleSiteInspection_returns404WhenMissing() throws Exception {
    doThrow(new ResourceNotFoundException("No readable scale site inspection found with inspection id 12345"))
        .when(scaleSiteInspectionService).deleteScaleSiteInspection(12345L);

    mockMvc.perform(delete("/scale-sites/inspection/12345"))
        .andExpect(status().isNotFound());
  }

  @Test
  void deleteScaleSiteInspection_returns400OnBadRequest() throws Exception {
    doThrow(new BadRequestException("Inspection id is required."))
        .when(scaleSiteInspectionService).deleteScaleSiteInspection(0L);

    mockMvc.perform(delete("/scale-sites/inspection/0"))
        .andExpect(status().isBadRequest());
  }
}

