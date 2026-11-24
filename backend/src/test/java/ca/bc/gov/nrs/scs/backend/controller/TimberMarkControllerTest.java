package ca.bc.gov.nrs.scs.backend.controller;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import ca.bc.gov.nrs.scs.backend.service.TimberMarkService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

class TimberMarkControllerTest {

  private TimberMarkService service;
  private MockMvc mockMvc;

  @BeforeEach
  void setUp() {
    service = mock(TimberMarkService.class);
    mockMvc = MockMvcBuilders.standaloneSetup(new TimberMarkController(service)).build();
  }

  @Test
  void timberMarkExists_returnsTrueForAKnownMark() throws Exception {
    when(service.timberMarkExists("AB6633")).thenReturn(true);

    mockMvc.perform(get("/timber-marks/exists").param("timberMark", "AB6633").accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.timberMark").value("AB6633"))
        .andExpect(jsonPath("$.exists").value(true));
  }

  @Test
  void timberMarkExists_returnsFalseForAnUnknownMark() throws Exception {
    when(service.timberMarkExists("A12345")).thenReturn(false);

    mockMvc.perform(get("/timber-marks/exists").param("timberMark", "A12345").accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.timberMark").value("A12345"))
        .andExpect(jsonPath("$.exists").value(false));
  }

  @Test
  void timberMarkExists_requiresTheTimberMarkParameter() throws Exception {
    mockMvc.perform(get("/timber-marks/exists").accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isBadRequest());
  }
}
