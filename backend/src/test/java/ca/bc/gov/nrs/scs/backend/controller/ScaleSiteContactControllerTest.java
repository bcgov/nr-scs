package ca.bc.gov.nrs.scs.backend.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultHandlers.print;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.LocalDate;
import java.util.List;

import org.hamcrest.Matchers;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.openapitools.jackson.nullable.JsonNullable;
import org.openapitools.jackson.nullable.JsonNullableModule;
import org.springframework.http.MediaType;
import org.springframework.http.converter.json.MappingJackson2HttpMessageConverter;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;

import ca.bc.gov.nrs.scs.backend.exception.BadRequestException;
import ca.bc.gov.nrs.scs.backend.exception.ConflictException;
import ca.bc.gov.nrs.scs.backend.exception.GlobalApiExceptionHandler;
import ca.bc.gov.nrs.scs.backend.exception.ResourceNotFoundException;
import ca.bc.gov.nrs.scs.backend.domain.contacts.ScaleSiteContactCreateCommand;
import ca.bc.gov.nrs.scs.backend.domain.contacts.ScaleSiteContactUpdateCommand;
import ca.bc.gov.nrs.scs.backend.model.ClientContactSearchResult;
import ca.bc.gov.nrs.scs.backend.model.ScaleSiteContact;
import ca.bc.gov.nrs.scs.backend.model.ScaleSiteContactCreateRequest;
import ca.bc.gov.nrs.scs.backend.model.ScaleSiteContactUpdateRequest;
import ca.bc.gov.nrs.scs.backend.service.ScaleSiteContactService;

class ScaleSiteContactControllerTest {

  private ScaleSiteContactService service;
  private MockMvc mockMvc;
  private ObjectMapper objectMapper;

  @BeforeEach
  void setUp() {
    service = mock(ScaleSiteContactService.class);

    objectMapper = new ObjectMapper()
        .registerModule(new JsonNullableModule())
        .registerModule(new JavaTimeModule())
        .disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);

    MappingJackson2HttpMessageConverter converter = new MappingJackson2HttpMessageConverter();
    converter.setObjectMapper(objectMapper);

    mockMvc = MockMvcBuilders
        .standaloneSetup(new ScaleSiteContactController(service))
        .setControllerAdvice(new GlobalApiExceptionHandler())
        .setMessageConverters(converter)
        .build();
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  private ScaleSiteContact stubContact(Long clientContactId, String siteId) {
    ScaleSiteContact c = new ScaleSiteContact();
    c.setClientContactId(clientContactId);
    c.setScaleSiteIdNmbr(siteId);
    c.setPrimaryContactInd(ScaleSiteContact.PrimaryContactIndEnum.Y);
    c.setContactRoleDescription("Site Manager");
    c.setSiteInformationAccessInd(ScaleSiteContact.SiteInformationAccessIndEnum.Y);
    c.setEffectiveDate(LocalDate.of(2024, 1, 1));
    return c;
  }

  private ScaleSiteContactCreateRequest stubCreateRequest() {
    ScaleSiteContactCreateRequest req = new ScaleSiteContactCreateRequest();
    req.setClientContactId(12345L);
    req.setContactRoleDescription("Site Manager");
    req.setPrimaryContactInd(ScaleSiteContactCreateRequest.PrimaryContactIndEnum.Y);
    req.setSiteInformationAccessInd(ScaleSiteContactCreateRequest.SiteInformationAccessIndEnum.Y);
    req.setEffectiveDate(LocalDate.of(2024, 1, 1));
    return req;
  }

  private ScaleSiteContactUpdateRequest stubUpdateRequest() {
    ScaleSiteContactUpdateRequest req = new ScaleSiteContactUpdateRequest();
    req.setContactRoleDescription("Site Manager");
    req.setPrimaryContactInd(ScaleSiteContactUpdateRequest.PrimaryContactIndEnum.Y);
    req.setSiteInformationAccessInd(ScaleSiteContactUpdateRequest.SiteInformationAccessIndEnum.Y);
    req.setEffectiveDate(LocalDate.of(2024, 1, 1));
    return req;
  }

  private ClientContactSearchResult stubSearchResult(Long clientContactId) {
    ClientContactSearchResult r = new ClientContactSearchResult();
    r.setClientContactId(clientContactId);
    r.setContactName(JsonNullable.of("John Smith"));
    r.setBusinessPhone(JsonNullable.of("250-555-1234"));
    return r;
  }

  // ---------------------------------------------------------------------------
  // GET /scale-sites/{scaleSiteIdNmbr}/contacts
  // ---------------------------------------------------------------------------

  @Test
  void getScaleSiteContacts_returns200WithList() throws Exception {
    when(service.getContacts("1234"))
        .thenReturn(List.of(stubContact(12345L, "1234")));

    mockMvc.perform(get("/scale-sites/1234/contacts").accept(MediaType.APPLICATION_JSON))
        .andDo(print())
        .andExpect(status().isOk())
        .andExpect(content().string(Matchers.containsString("12345")));
  }

  @Test
  void getScaleSiteContacts_scaleSiteNotFound_returns404() throws Exception {
    when(service.getContacts("9999"))
        .thenThrow(new ResourceNotFoundException("No scale site found with id 9999."));

    mockMvc.perform(get("/scale-sites/9999/contacts").accept(MediaType.APPLICATION_JSON))
        .andDo(print())
        .andExpect(status().isNotFound())
        .andExpect(content().string(Matchers.containsString("No scale site found")));
  }

  // ---------------------------------------------------------------------------
  // GET /scale-sites/{scaleSiteIdNmbr}/contacts/{clientContactId}
  // ---------------------------------------------------------------------------

  @Test
  void getScaleSiteContact_returns200WithContact() throws Exception {
    when(service.getContact("1234", 12345L))
        .thenReturn(stubContact(12345L, "1234"));

    mockMvc.perform(get("/scale-sites/1234/contacts/12345").accept(MediaType.APPLICATION_JSON))
        .andDo(print())
        .andExpect(status().isOk())
        .andExpect(content().string(Matchers.containsString("12345")))
        .andExpect(content().string(Matchers.containsString("2024-01-01")));
  }

  @Test
  void getScaleSiteContact_notFound_returns404() throws Exception {
    when(service.getContact("1234", 99999L))
        .thenThrow(new ResourceNotFoundException("Contact 99999 not found on scale site 1234."));

    mockMvc.perform(get("/scale-sites/1234/contacts/99999").accept(MediaType.APPLICATION_JSON))
        .andDo(print())
        .andExpect(status().isNotFound())
        .andExpect(content().string(Matchers.containsString("not found")));
  }

  // ---------------------------------------------------------------------------
  // POST /scale-sites/{scaleSiteIdNmbr}/contacts
  // ---------------------------------------------------------------------------

  @Test
  void createScaleSiteContact_valid_returns201() throws Exception {
    when(service.createContact(eq("1234"), any(ScaleSiteContactCreateCommand.class)))
        .thenReturn(stubContact(12345L, "1234"));

    mockMvc.perform(post("/scale-sites/1234/contacts")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(stubCreateRequest()))
            .accept(MediaType.APPLICATION_JSON))
        .andDo(print())
        .andExpect(status().isCreated())
        .andExpect(content().string(Matchers.containsString("12345")));

    verify(service).createContact(eq("1234"), any(ScaleSiteContactCreateCommand.class));
  }

  @Test
  void createScaleSiteContact_missingRole_returns400() throws Exception {
    when(service.createContact(eq("1234"), any(ScaleSiteContactCreateCommand.class)))
        .thenThrow(new BadRequestException("contactRoleDescription is required."));

    mockMvc.perform(post("/scale-sites/1234/contacts")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(stubCreateRequest()))
            .accept(MediaType.APPLICATION_JSON))
        .andDo(print())
        .andExpect(status().isBadRequest())
        .andExpect(content().string(Matchers.containsString("contactRoleDescription")));
  }

  @Test
  void createScaleSiteContact_duplicateContact_returns409() throws Exception {
    when(service.createContact(eq("1234"), any(ScaleSiteContactCreateCommand.class)))
        .thenThrow(new ConflictException(
            "Contact 12345 is already associated with scale site 1234."));

    mockMvc.perform(post("/scale-sites/1234/contacts")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(stubCreateRequest()))
            .accept(MediaType.APPLICATION_JSON))
        .andDo(print())
        .andExpect(status().isConflict())
        .andExpect(content().string(Matchers.containsString("already associated")));
  }

  @Test
  void createScaleSiteContact_primaryAlreadyExists_returns409() throws Exception {
    when(service.createContact(eq("1234"), any(ScaleSiteContactCreateCommand.class)))
        .thenThrow(new ConflictException(
            "A primary contact already exists for scale site 1234."));

    mockMvc.perform(post("/scale-sites/1234/contacts")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(stubCreateRequest()))
            .accept(MediaType.APPLICATION_JSON))
        .andDo(print())
        .andExpect(status().isConflict())
        .andExpect(content().string(Matchers.containsString("primary contact already exists")));
  }

  @Test
  void createScaleSiteContact_scaleSiteNotFound_returns404() throws Exception {
    when(service.createContact(eq("9999"), any(ScaleSiteContactCreateCommand.class)))
        .thenThrow(new ResourceNotFoundException("No scale site found with id 9999."));

    mockMvc.perform(post("/scale-sites/9999/contacts")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(stubCreateRequest()))
            .accept(MediaType.APPLICATION_JSON))
        .andDo(print())
        .andExpect(status().isNotFound())
        .andExpect(content().string(Matchers.containsString("No scale site found")));
  }

  // ---------------------------------------------------------------------------
  // POST /scale-sites/{scaleSiteIdNmbr}/contacts — request contract (@Valid boundary)
  //
  // The generated request enforces clientContactId/effectiveDate @NotNull, the two indicators as
  // @NotNull enums, and contactRoleDescription @Size(max=40). These reject malformed bodies with a
  // 400 before the controller maps to a command, so the service never sees an invalid request.
  // ---------------------------------------------------------------------------

  @Test
  void createScaleSiteContact_missingClientContactId_returns400() throws Exception {
    String body = """
        {"contactRoleDescription":"Site Manager","primaryContactInd":"Y",\
        "siteInformationAccessInd":"Y","effectiveDate":"2024-01-01"}""";

    mockMvc.perform(post("/scale-sites/1234/contacts")
            .contentType(MediaType.APPLICATION_JSON)
            .content(body)
            .accept(MediaType.APPLICATION_JSON))
        .andDo(print())
        .andExpect(status().isBadRequest());

    verifyNoCreateInteraction();
  }

  @Test
  void createScaleSiteContact_missingEffectiveDate_returns400() throws Exception {
    String body = """
        {"clientContactId":12345,"contactRoleDescription":"Site Manager",\
        "primaryContactInd":"Y","siteInformationAccessInd":"Y"}""";

    mockMvc.perform(post("/scale-sites/1234/contacts")
            .contentType(MediaType.APPLICATION_JSON)
            .content(body)
            .accept(MediaType.APPLICATION_JSON))
        .andDo(print())
        .andExpect(status().isBadRequest());

    verifyNoCreateInteraction();
  }

  @Test
  void createScaleSiteContact_missingPrimaryContactInd_returns400() throws Exception {
    String body = """
        {"clientContactId":12345,"contactRoleDescription":"Site Manager",\
        "siteInformationAccessInd":"Y","effectiveDate":"2024-01-01"}""";

    mockMvc.perform(post("/scale-sites/1234/contacts")
            .contentType(MediaType.APPLICATION_JSON)
            .content(body)
            .accept(MediaType.APPLICATION_JSON))
        .andDo(print())
        .andExpect(status().isBadRequest());

    verifyNoCreateInteraction();
  }

  @Test
  void createScaleSiteContact_invalidPrimaryContactInd_returns400() throws Exception {
    String body = """
        {"clientContactId":12345,"contactRoleDescription":"Site Manager",\
        "primaryContactInd":"X","siteInformationAccessInd":"Y","effectiveDate":"2024-01-01"}""";

    mockMvc.perform(post("/scale-sites/1234/contacts")
            .contentType(MediaType.APPLICATION_JSON)
            .content(body)
            .accept(MediaType.APPLICATION_JSON))
        .andDo(print())
        .andExpect(status().isBadRequest());

    verifyNoCreateInteraction();
  }

  @Test
  void createScaleSiteContact_roleLongerThan40Characters_returns400() throws Exception {
    String body = String.format("""
        {"clientContactId":12345,"contactRoleDescription":"%s","primaryContactInd":"Y",\
        "siteInformationAccessInd":"Y","effectiveDate":"2024-01-01"}""", "x".repeat(41));

    mockMvc.perform(post("/scale-sites/1234/contacts")
            .contentType(MediaType.APPLICATION_JSON)
            .content(body)
            .accept(MediaType.APPLICATION_JSON))
        .andDo(print())
        .andExpect(status().isBadRequest());

    verifyNoCreateInteraction();
  }

  private void verifyNoCreateInteraction() {
    verify(service, never()).createContact(any(), any(ScaleSiteContactCreateCommand.class));
  }

  // ---------------------------------------------------------------------------
  // PUT /scale-sites/{scaleSiteIdNmbr}/contacts/{clientContactId}
  // ---------------------------------------------------------------------------

  @Test
  void updateScaleSiteContact_valid_returns200() throws Exception {
    when(service.updateContact(eq("1234"), eq(12345L), any(ScaleSiteContactUpdateCommand.class)))
        .thenReturn(stubContact(12345L, "1234"));

    mockMvc.perform(put("/scale-sites/1234/contacts/12345")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(stubUpdateRequest()))
            .accept(MediaType.APPLICATION_JSON))
        .andDo(print())
        .andExpect(status().isOk())
        .andExpect(content().string(Matchers.containsString("12345")));

    verify(service).updateContact(eq("1234"), eq(12345L), any(ScaleSiteContactUpdateCommand.class));
  }

  @Test
  void updateScaleSiteContact_notFound_returns404() throws Exception {
    when(service.updateContact(eq("1234"), eq(99999L), any(ScaleSiteContactUpdateCommand.class)))
        .thenThrow(new ResourceNotFoundException("Contact 99999 not found on scale site 1234."));

    mockMvc.perform(put("/scale-sites/1234/contacts/99999")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(stubUpdateRequest()))
            .accept(MediaType.APPLICATION_JSON))
        .andDo(print())
        .andExpect(status().isNotFound())
        .andExpect(content().string(Matchers.containsString("not found")));
  }

  @Test
  void updateScaleSiteContact_validationError_returns400() throws Exception {
    when(service.updateContact(eq("1234"), eq(12345L), any(ScaleSiteContactUpdateCommand.class)))
        .thenThrow(new BadRequestException("contactRoleDescription is required."));

    mockMvc.perform(put("/scale-sites/1234/contacts/12345")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(stubUpdateRequest()))
            .accept(MediaType.APPLICATION_JSON))
        .andDo(print())
        .andExpect(status().isBadRequest())
        .andExpect(content().string(Matchers.containsString("contactRoleDescription")));
  }

  @Test
  void updateScaleSiteContact_promoteToPrimaryConflict_returns409() throws Exception {
    when(service.updateContact(eq("1234"), eq(12345L), any(ScaleSiteContactUpdateCommand.class)))
        .thenThrow(new ConflictException("A primary contact already exists for scale site 1234."));

    mockMvc.perform(put("/scale-sites/1234/contacts/12345")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(stubUpdateRequest()))
            .accept(MediaType.APPLICATION_JSON))
        .andDo(print())
        .andExpect(status().isConflict())
        .andExpect(content().string(Matchers.containsString("primary contact already exists")));
  }

  // ---------------------------------------------------------------------------
  // PUT /scale-sites/{scaleSiteIdNmbr}/contacts/{clientContactId} — request contract
  //
  // The generated request enforces contactRoleDescription @NotNull/@Size(max=40), the two
  // indicators as @NotNull enums, and effectiveDate @NotNull. These reject malformed bodies with a
  // 400 before the controller maps to a command, so the service never sees an invalid request.
  // ---------------------------------------------------------------------------

  @Test
  void updateScaleSiteContact_missingRole_returns400() throws Exception {
    String body = """
        {"primaryContactInd":"Y","siteInformationAccessInd":"Y","effectiveDate":"2024-01-01"}""";

    mockMvc.perform(put("/scale-sites/1234/contacts/12345")
            .contentType(MediaType.APPLICATION_JSON)
            .content(body)
            .accept(MediaType.APPLICATION_JSON))
        .andDo(print())
        .andExpect(status().isBadRequest());

    verifyNoUpdateInteraction();
  }

  @Test
  void updateScaleSiteContact_missingEffectiveDate_returns400() throws Exception {
    String body = """
        {"contactRoleDescription":"Site Manager","primaryContactInd":"Y",\
        "siteInformationAccessInd":"Y"}""";

    mockMvc.perform(put("/scale-sites/1234/contacts/12345")
            .contentType(MediaType.APPLICATION_JSON)
            .content(body)
            .accept(MediaType.APPLICATION_JSON))
        .andDo(print())
        .andExpect(status().isBadRequest());

    verifyNoUpdateInteraction();
  }

  @Test
  void updateScaleSiteContact_missingPrimaryContactInd_returns400() throws Exception {
    String body = """
        {"contactRoleDescription":"Site Manager","siteInformationAccessInd":"Y",\
        "effectiveDate":"2024-01-01"}""";

    mockMvc.perform(put("/scale-sites/1234/contacts/12345")
            .contentType(MediaType.APPLICATION_JSON)
            .content(body)
            .accept(MediaType.APPLICATION_JSON))
        .andDo(print())
        .andExpect(status().isBadRequest());

    verifyNoUpdateInteraction();
  }

  @Test
  void updateScaleSiteContact_invalidPrimaryContactInd_returns400() throws Exception {
    String body = """
        {"contactRoleDescription":"Site Manager","primaryContactInd":"X",\
        "siteInformationAccessInd":"Y","effectiveDate":"2024-01-01"}""";

    mockMvc.perform(put("/scale-sites/1234/contacts/12345")
            .contentType(MediaType.APPLICATION_JSON)
            .content(body)
            .accept(MediaType.APPLICATION_JSON))
        .andDo(print())
        .andExpect(status().isBadRequest());

    verifyNoUpdateInteraction();
  }

  @Test
  void updateScaleSiteContact_roleLongerThan40Characters_returns400() throws Exception {
    String body = String.format("""
        {"contactRoleDescription":"%s","primaryContactInd":"Y",\
        "siteInformationAccessInd":"Y","effectiveDate":"2024-01-01"}""", "x".repeat(41));

    mockMvc.perform(put("/scale-sites/1234/contacts/12345")
            .contentType(MediaType.APPLICATION_JSON)
            .content(body)
            .accept(MediaType.APPLICATION_JSON))
        .andDo(print())
        .andExpect(status().isBadRequest());

    verifyNoUpdateInteraction();
  }

  private void verifyNoUpdateInteraction() {
    verify(service, never()).updateContact(any(), any(), any(ScaleSiteContactUpdateCommand.class));
  }

  // ---------------------------------------------------------------------------
  // DELETE /scale-sites/{scaleSiteIdNmbr}/contacts/{clientContactId}
  // ---------------------------------------------------------------------------

  @Test
  void deleteScaleSiteContact_returns204() throws Exception {
    mockMvc.perform(delete("/scale-sites/1234/contacts/12345"))
        .andDo(print())
        .andExpect(status().isNoContent());

    verify(service).deleteContact("1234", 12345L);
  }

  @Test
  void deleteScaleSiteContact_notFound_returns404() throws Exception {
    doThrow(new ResourceNotFoundException("Contact 99999 not found on scale site 1234."))
        .when(service).deleteContact("1234", 99999L);

    mockMvc.perform(delete("/scale-sites/1234/contacts/99999"))
        .andDo(print())
        .andExpect(status().isNotFound())
        .andExpect(content().string(Matchers.containsString("not found")));
  }

  // ---------------------------------------------------------------------------
  // GET /client-contacts/search
  // ---------------------------------------------------------------------------

  @Test
  void searchClientContacts_returns200WithResults() throws Exception {
    when(service.searchClientContacts(eq(12345L), isNull(), isNull(), isNull()))
        .thenReturn(List.of(stubSearchResult(12345L)));

    mockMvc.perform(get("/client-contacts/search")
            .param("clientContactId", "12345")
            .accept(MediaType.APPLICATION_JSON))
        .andDo(print())
        .andExpect(status().isOk())
        .andExpect(content().string(Matchers.containsString("12345")));
  }

  @Test
  void searchClientContacts_byClientNumberAndName_passesParamsToService() throws Exception {
    when(service.searchClientContacts(isNull(), eq("12345678"), eq("00"), eq("smith")))
        .thenReturn(List.of(stubSearchResult(12345L)));

    mockMvc.perform(get("/client-contacts/search")
            .param("clientNumber", "12345678")
            .param("clientLocnCode", "00")
            .param("contactName", "smith")
            .accept(MediaType.APPLICATION_JSON))
        .andDo(print())
        .andExpect(status().isOk())
        .andExpect(content().string(Matchers.containsString("12345")));

    verify(service).searchClientContacts(isNull(), eq("12345678"), eq("00"), eq("smith"));
  }

  @Test
  void searchClientContacts_noParams_returns200WithEmptyList() throws Exception {
    when(service.searchClientContacts(isNull(), isNull(), isNull(), isNull()))
        .thenReturn(List.of());

    mockMvc.perform(get("/client-contacts/search")
            .accept(MediaType.APPLICATION_JSON))
        .andDo(print())
        .andExpect(status().isOk())
        .andExpect(content().string("[]"));
  }
}
