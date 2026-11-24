package ca.bc.gov.nrs.scs.backend.controller;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import ca.bc.gov.nrs.scs.backend.constants.Permissions;
import ca.bc.gov.nrs.scs.backend.exception.BadRequestException;
import ca.bc.gov.nrs.scs.backend.exception.GlobalApiExceptionHandler;
import ca.bc.gov.nrs.scs.backend.exception.ResourceNotFoundException;
import ca.bc.gov.nrs.scs.backend.model.ScaleSignatoryBlock;
import ca.bc.gov.nrs.scs.backend.model.ScaleSignatoryBlockCreateRequest;
import ca.bc.gov.nrs.scs.backend.model.ScaleSignatoryBlockUpdateRequest;
import ca.bc.gov.nrs.scs.backend.security.annotations.RequiresPermission;
import ca.bc.gov.nrs.scs.backend.service.ScaleSignatoryBlockService;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.openapitools.jackson.nullable.JsonNullableModule;
import org.springframework.http.MediaType;
import org.springframework.http.converter.json.MappingJackson2HttpMessageConverter;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

class SignatureBlockControllerTest {

  private ScaleSignatoryBlockService service;
  private MockMvc mockMvc;
  private ObjectMapper objectMapper;

  @BeforeEach
  void setUp() {
    service = mock(ScaleSignatoryBlockService.class);

    objectMapper = new ObjectMapper()
        .registerModule(new JsonNullableModule())
        .registerModule(new JavaTimeModule())
        .disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);

    MappingJackson2HttpMessageConverter converter = new MappingJackson2HttpMessageConverter();
    converter.setObjectMapper(objectMapper);

    mockMvc = MockMvcBuilders
        .standaloneSetup(new SignatureBlockController(service))
        .setControllerAdvice(new GlobalApiExceptionHandler())
        .setMessageConverters(converter)
        .build();
  }

  @Test
  void searchSignatureBlocks_returns200AndBody() throws Exception {
    when(service.searchSignatureBlocks(null, 12L, null, null, null, null, null))
        .thenReturn(List.of(new ScaleSignatoryBlock()
            .scaleSignatoryBlockId(7L)
            .firstName("Jane")
            .lastName("Doe")
            .signatureTitle("Manager")
            .orgUnitNo(12L)
            .fullName("Doe, Jane")));

    mockMvc.perform(get("/signature-blocks")
            .param("orgUnitNo", "12")
            .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$[0].scaleSignatoryBlockId").value(7))
        .andExpect(jsonPath("$[0].fullName").value("Doe, Jane"));
  }

  @Test
  void getSignatureBlock_returns200AndBody() throws Exception {
    when(service.getSignatureBlock(7L)).thenReturn(new ScaleSignatoryBlock()
        .scaleSignatoryBlockId(7L)
        .firstName("Jane")
        .lastName("Doe")
        .signatureTitle("Manager")
        .fullName("Doe, Jane"));

    mockMvc.perform(get("/signature-blocks/7")
            .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.scaleSignatoryBlockId").value(7))
        .andExpect(jsonPath("$.fullName").value("Doe, Jane"));
  }

  @Test
  void createSignatureBlock_returns201AndBody() throws Exception {
    ScaleSignatoryBlockCreateRequest request = new ScaleSignatoryBlockCreateRequest()
        .orgUnitNo(12L)
        .firstName("Jane")
        .lastName("Doe")
        .signatureTitle("Manager");

    when(service.createSignatureBlock(org.mockito.ArgumentMatchers.any(ScaleSignatoryBlockCreateRequest.class)))
        .thenReturn(new ScaleSignatoryBlock()
            .scaleSignatoryBlockId(7L)
            .firstName("Jane")
            .lastName("Doe")
            .signatureTitle("Manager"));

    mockMvc.perform(post("/signature-blocks")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(request))
            .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isCreated())
        .andExpect(jsonPath("$.scaleSignatoryBlockId").value(7));
  }

  @Test
  void updateSignatureBlock_returns200AndBody() throws Exception {
    ScaleSignatoryBlockUpdateRequest request = new ScaleSignatoryBlockUpdateRequest()
        .orgUnitNo(12L)
        .firstName("Jane")
        .lastName("Doe")
        .signatureTitle("Manager");

    when(service.updateSignatureBlock(org.mockito.ArgumentMatchers.eq(7L), org.mockito.ArgumentMatchers.any(ScaleSignatoryBlockUpdateRequest.class)))
        .thenReturn(new ScaleSignatoryBlock().scaleSignatoryBlockId(7L).signatureTitle("Manager"));

    mockMvc.perform(put("/signature-blocks/7")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(request))
            .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.scaleSignatoryBlockId").value(7));
  }

  @Test
  void deleteSignatureBlock_returns204() throws Exception {
    mockMvc.perform(delete("/signature-blocks/7")
            .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isNoContent());

    verify(service).deleteSignatureBlock(7L);
  }

  @Test
  void getSignatureBlock_notFound_returns404() throws Exception {
    when(service.getSignatureBlock(7L)).thenThrow(new ResourceNotFoundException("No signature block found with id 7"));

    mockMvc.perform(get("/signature-blocks/7")
            .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isNotFound())
        .andExpect(jsonPath("$.code").value("NOT_FOUND"));
  }

  @Test
  void createSignatureBlock_badRequest_returns400() throws Exception {
    ScaleSignatoryBlockCreateRequest request = new ScaleSignatoryBlockCreateRequest()
        .orgUnitNo(12L)
        .firstName("Jane")
        .lastName("Doe")
        .signatureTitle("Manager");

    when(service.createSignatureBlock(org.mockito.ArgumentMatchers.any(ScaleSignatoryBlockCreateRequest.class)))
        .thenThrow(new BadRequestException("First Name is required."));

    mockMvc.perform(post("/signature-blocks")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(request))
            .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("BAD_REQUEST"));
  }

  @Test
  void deleteSignatureBlock_notFound_returns404() throws Exception {
    doThrow(new ResourceNotFoundException("No signature block found with id 7"))
        .when(service)
        .deleteSignatureBlock(7L);

    mockMvc.perform(delete("/signature-blocks/7")
            .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isNotFound())
        .andExpect(jsonPath("$.code").value("NOT_FOUND"));
  }

  @Test
  void searchLetterSignatureBlocks_returns200AndPassesOnlyOrgUnitAndRegion() throws Exception {
    when(service.searchSignatureBlocks(null, 12L, 3L, null, null, null, null))
        .thenReturn(List.of(new ScaleSignatoryBlock()
            .scaleSignatoryBlockId(7L)
            .orgUnitNo(12L)
            .fullName("Doe, Jane")));

    // The name/title/id filters belong to the Maintenance search; the letter lookup ignores them.
    mockMvc.perform(get("/letter-signature-blocks")
            .param("orgUnitNo", "12")
            .param("rollupRegionNo", "3")
            .param("lastName", "Ignored")
            .param("scaleSignatoryBlockId", "99")
            .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$[0].scaleSignatoryBlockId").value(7))
        .andExpect(jsonPath("$[0].fullName").value("Doe, Jane"));

    verify(service).searchSignatureBlocks(null, 12L, 3L, null, null, null, null);
  }

  /**
   * The whole point of the letter lookup: it is gated on the letter authors' verb, not on §J's
   * Maintain Signatories permission, which the Check Scaler does not hold (nr-scs #286 follow-up).
   */
  @Test
  void searchLetterSignatureBlocks_isGatedOnTheLetterVerbNotMaintenance() throws Exception {
    RequiresPermission letter = SignatureBlockController.class
        .getMethod("searchLetterSignatureBlocks", Long.class, Long.class)
        .getAnnotation(RequiresPermission.class);
    assertEquals(Permissions.LETTER_SIGNATORY_QUERY, letter.value());

    RequiresPermission maintenance = SignatureBlockController.class
        .getMethod("searchSignatureBlocks",
            Long.class, Long.class, Long.class, String.class, String.class, String.class, String.class)
        .getAnnotation(RequiresPermission.class);
    assertEquals(Permissions.MAINTAIN_SIGNATORIES_QUERY, maintenance.value());
  }
}
