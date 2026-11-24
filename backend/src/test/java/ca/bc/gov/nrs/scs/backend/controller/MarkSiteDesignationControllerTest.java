package ca.bc.gov.nrs.scs.backend.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.LocalDate;
import java.util.List;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.openapitools.jackson.nullable.JsonNullableModule;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.Resource;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.ResourceHttpMessageConverter;
import org.springframework.http.converter.json.MappingJackson2HttpMessageConverter;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;

import ca.bc.gov.nrs.scs.backend.exception.BadRequestException;
import ca.bc.gov.nrs.scs.backend.exception.GlobalApiExceptionHandler;
import ca.bc.gov.nrs.scs.backend.exception.ResourceNotFoundException;
import ca.bc.gov.nrs.scs.backend.model.MarkSiteDesignationDetail;
import ca.bc.gov.nrs.scs.backend.model.MarkSiteDesignationSearchResult;
import ca.bc.gov.nrs.scs.backend.model.MarkSiteDesignationTimberMarkLookup;
import ca.bc.gov.nrs.scs.backend.service.LetterService;
import ca.bc.gov.nrs.scs.backend.service.MarkSiteDesignationService;

class MarkSiteDesignationControllerTest {

  private MarkSiteDesignationService service;
  private LetterService letterService;
  private MockMvc mockMvc;

  @BeforeEach
  void setUp() {
    service = mock(MarkSiteDesignationService.class);
    letterService = mock(LetterService.class);

    ObjectMapper objectMapper = new ObjectMapper()
        .registerModule(new JsonNullableModule())
        .registerModule(new JavaTimeModule())
        .disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);

    MappingJackson2HttpMessageConverter converter = new MappingJackson2HttpMessageConverter();
    converter.setObjectMapper(objectMapper);

    mockMvc = MockMvcBuilders
        .standaloneSetup(new MarkSiteDesignationController(service, letterService))
        .setControllerAdvice(new GlobalApiExceptionHandler())
        .setMessageConverters(converter, new ResourceHttpMessageConverter())
        .build();
  }

  @Test
  void searchMarkSiteDesignationsByTimberMark_returns200AndBody() throws Exception {
    MarkSiteDesignationSearchResult row = new MarkSiteDesignationSearchResult();
    row.setHaulingMarkAuthorizationId(5001L);
    row.setTimberMark("AB1234");
    row.setEffectiveDate(LocalDate.of(2025, 1, 15));
    row.setExpiryDate(LocalDate.of(2027, 1, 15));
    row.setOrgUnitName("Cariboo Region");
    when(service.searchMarkSiteDesignationsByTimberMark("AB1234")).thenReturn(List.of(row));

    mockMvc.perform(get("/mark-site-designations/search")
            .param("timberMark", "AB1234")
            .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$[0].haulingMarkAuthorizationId").value(5001))
        .andExpect(jsonPath("$[0].timberMark").value("AB1234"))
        .andExpect(jsonPath("$[0].orgUnitName").value("Cariboo Region"));

    verify(service).searchMarkSiteDesignationsByTimberMark("AB1234");
  }

  @Test
  void getMarkSiteDesignation_returns200AndBody() throws Exception {
    MarkSiteDesignationDetail detail = new MarkSiteDesignationDetail()
        .haulingMarkAuthorizationId(12345L)
        .timberMark("TM123")
        .markHolderClient("00012345")
        .markHolderLoc("00")
        .markHolderName("ACME FOREST PRODUCTS LTD");

    when(service.getMarkSiteDesignation(12345L)).thenReturn(detail);

    mockMvc.perform(get("/mark-site-designations/12345")
            .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.haulingMarkAuthorizationId").value(12345))
        .andExpect(jsonPath("$.timberMark").value("TM123"))
        .andExpect(jsonPath("$.markHolderClient").value("00012345"))
        .andExpect(jsonPath("$.markHolderLoc").value("00"));
  }

  @Test
  void getMarkSiteDesignationTimberMarkLookup_returns200AndBody() throws Exception {
    when(service.lookupTimberMarkHolder("TM123"))
        .thenReturn(new MarkSiteDesignationTimberMarkLookup()
            .timberMark("TM123")
            .markHolderClient("00012345")
            .markHolderLoc("00")
            .markHolderName("ACME FOREST PRODUCTS LTD")
            .markStatus("A"));

    mockMvc.perform(get("/mark-site-designations")
            .param("timberMark", "TM123")
            .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.timberMark").value("TM123"))
        .andExpect(jsonPath("$.markHolderClient").value("00012345"))
        .andExpect(jsonPath("$.markHolderLoc").value("00"))
        .andExpect(jsonPath("$.markHolderName").value("ACME FOREST PRODUCTS LTD"))
        .andExpect(jsonPath("$.markStatus").value("A"));
  }

  @Test
  void createMarkSiteDesignation_returns201AndBody() throws Exception {
    when(service.createMarkSiteDesignation(any())).thenReturn(456L);

    String payload = """
        {
          "timberMark": "TM123",
          "effectiveDate": "2025-01-01",
          "expiryDate": "2025-12-31",
          "orgUnitNo": 100,
          "districtWideInd": "N"
        }
        """;

    mockMvc.perform(post("/mark-site-designations")
            .contentType(MediaType.APPLICATION_JSON)
            .content(payload)
            .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isCreated())
        .andExpect(jsonPath("$.haulingMarkAuthorizationId").value(456));
  }

  @Test
  void createMarkSiteDesignationLetter_acceptsShowSignatureBlockInd() throws Exception {
    when(letterService.createMarkSiteDesignationLetter(anyLong(), any()))
        .thenReturn(ResponseEntity.status(201).build());

    // The shared letter form always sends showSignatureBlockInd. The MSD report does
    // not use it, but the request DTO must still accept it so the letter POST does not
    // fail with a 400 (UnrecognizedPropertyException) under strict JSON parsing.
    String payload = """
        {
          "regDist": "DCC",
          "ccField": "cc text",
          "showSignatureBlockInd": "Y",
          "scaleSignatoryBlockId": 42,
          "outputFormat": "PDF",
          "preview": true
        }
        """;

    mockMvc.perform(post("/mark-site-designations/12345/letter")
            .contentType(MediaType.APPLICATION_JSON)
            .content(payload))
        .andExpect(status().isCreated());
  }

  @Test
  void createMarkSiteDesignationLetter_returnsInlinePdf() throws Exception {
    ResponseEntity<Resource> pdfResponse = ResponseEntity.ok()
        .contentType(MediaType.APPLICATION_PDF)
        .body(new ByteArrayResource("pdf".getBytes()));
    when(letterService.createMarkSiteDesignationLetter(anyLong(), any())).thenReturn(pdfResponse);

    String payload = """
        {
          "regDist": "DCC",
          "scaleSignatoryBlockId": 42,
          "outputFormat": "PDF",
          "preview": true
        }
        """;

    mockMvc.perform(post("/mark-site-designations/12345/letter")
            .contentType(MediaType.APPLICATION_JSON)
            .content(payload))
        .andExpect(status().isOk())
        .andExpect(content().contentType(MediaType.APPLICATION_PDF))
        .andExpect(content().bytes("pdf".getBytes()));
  }

  @Test
  void createMarkSiteDesignationLetter_letterAlreadyExists_returns400() throws Exception {
    when(letterService.createMarkSiteDesignationLetter(anyLong(), any()))
        .thenThrow(new BadRequestException("Mark site designation already has a letter."));

    String payload = """
        {
          "regDist": "DCC",
          "scaleSignatoryBlockId": 42,
          "outputFormat": "PDF",
          "preview": true
        }
        """;

    mockMvc.perform(post("/mark-site-designations/12345/letter")
            .contentType(MediaType.APPLICATION_JSON)
            .content(payload))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("BAD_REQUEST"));
  }

  @Test
  void createMarkSiteDesignationLetter_authorizationNotFound_returns404() throws Exception {
    when(letterService.createMarkSiteDesignationLetter(anyLong(), any()))
        .thenThrow(new ResourceNotFoundException("No mark site designation found with id 12345"));

    String payload = """
        {
          "regDist": "DCC",
          "scaleSignatoryBlockId": 42,
          "outputFormat": "PDF",
          "preview": true
        }
        """;

    mockMvc.perform(post("/mark-site-designations/12345/letter")
            .contentType(MediaType.APPLICATION_JSON)
            .content(payload))
        .andExpect(status().isNotFound())
        .andExpect(jsonPath("$.code").value("NOT_FOUND"));
  }

  @Test
  void getMarkSiteDesignationLetter_returnsInlinePdf() throws Exception {
    ResponseEntity<Resource> pdfResponse = ResponseEntity.ok()
        .contentType(MediaType.APPLICATION_PDF)
        .body(new ByteArrayResource("pdf".getBytes()));
    when(letterService.viewMarkSiteDesignationLetter(12345L)).thenReturn(pdfResponse);

    mockMvc.perform(get("/mark-site-designations/12345/letter")
            .accept(MediaType.APPLICATION_PDF))
        .andExpect(status().isOk())
        .andExpect(content().contentType(MediaType.APPLICATION_PDF))
        .andExpect(content().bytes("pdf".getBytes()));
  }

  @Test
  void getMarkSiteDesignationLetter_letterNotFound_returns404() throws Exception {
    when(letterService.viewMarkSiteDesignationLetter(12345L))
        .thenThrow(new ResourceNotFoundException("Mark site designation letter not found."));

    mockMvc.perform(get("/mark-site-designations/12345/letter")
            .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isNotFound())
        .andExpect(jsonPath("$.code").value("NOT_FOUND"));
  }

  @Test
  void removeMarkSiteDesignationFromWorkbench_returns204() throws Exception {
    mockMvc.perform(post("/mark-site-designations/12345/workbench/remove")
            .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isNoContent());

    verify(service).removeMarkSiteDesignationFromWorkbench(12345L);
  }

  @Test
  void removeMarkSiteDesignationFromWorkbench_notFound_returns404() throws Exception {
    org.mockito.Mockito.doThrow(new ResourceNotFoundException("No mark site designation found with id 12345"))
        .when(service)
        .removeMarkSiteDesignationFromWorkbench(12345L);

    mockMvc.perform(post("/mark-site-designations/12345/workbench/remove")
            .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isNotFound())
        .andExpect(jsonPath("$.code").value("NOT_FOUND"));
  }
}