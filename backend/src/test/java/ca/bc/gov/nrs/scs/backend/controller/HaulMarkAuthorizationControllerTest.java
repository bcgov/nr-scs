package ca.bc.gov.nrs.scs.backend.controller;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultHandlers.print;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import ca.bc.gov.nrs.scs.backend.model.HaulMarkAuthorization;
import ca.bc.gov.nrs.scs.backend.service.HaulMarkAuthorizationService;
import java.time.LocalDate;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

class HaulMarkAuthorizationControllerTest {

  private HaulMarkAuthorizationService service;
  private MockMvc mockMvc;

  @BeforeEach
  void setUp() {
    service = org.mockito.Mockito.mock(HaulMarkAuthorizationService.class);
    mockMvc = MockMvcBuilders.standaloneSetup(new HaulMarkAuthorizationController(service)).build();
  }

  @Test
  void searchHaulMarkAuthorizations_returns200AndBody() throws Exception {
    when(service.searchHaulMarkAuthorizations(
      12345L,
      "TMB%",
      LocalDate.of(2025, 1, 1),
      LocalDate.of(2025, 12, 31),
      "%Vancouver%",
      1,
      0))
      .thenReturn(List.of(new HaulMarkAuthorization()
        .haulingMarkAuthorizationId(12345L)
        .timberMark("TMB123")
        .effectiveDate(LocalDate.of(2025, 1, 1))
        .expiryDate(LocalDate.of(2025, 12, 31))
        .orgUnitName("Vancouver")));

    mockMvc.perform(get("/haul-mark-authorizations/search")
            .param("haulingMarkAuthorizationId", "12345")
            .param("timberMark", "TMB%")
            .param("effectiveDate", "2025-01-01")
            .param("expiryDate", "2025-12-31")
            .param("orgUnitName", "%Vancouver%")
            .param("primarySort", "1")
            .param("secondarySort", "0")
            .accept(MediaType.APPLICATION_JSON))
        .andDo(print())
        .andExpect(status().isOk())
        .andExpect(jsonPath("$[0].haulingMarkAuthorizationId.present").value(true))
        .andExpect(jsonPath("$[0].timberMark.present").value(true))
        .andExpect(jsonPath("$[0].effectiveDate.present").value(true))
        .andExpect(jsonPath("$[0].expiryDate.present").value(true))
        .andExpect(jsonPath("$[0].orgUnitName.present").value(true));
  }
}
