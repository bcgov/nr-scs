package ca.bc.gov.nrs.scs.backend.controller;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import ca.bc.gov.nrs.scs.backend.model.WelcomeSummary;
import ca.bc.gov.nrs.scs.backend.service.WelcomeService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.context.request.NativeWebRequest;

@ExtendWith(MockitoExtension.class)
class WelcomeControllerTest {

  @Mock private WelcomeService welcomeService;
  @Mock private NativeWebRequest request;

  private WelcomeController controller;

  @BeforeEach
  void setUp() {
    controller = new WelcomeController(welcomeService, request);
  }

  @Test
  void getWelcome_passesAuthorizationHeaderAndOrgUnitToService() {
    WelcomeSummary summary = new WelcomeSummary();
    when(request.getHeader("Authorization")).thenReturn("Bearer abc");
    when(welcomeService.buildWelcomeSummary(request, "Bearer abc", 101L)).thenReturn(summary);

    ResponseEntity<WelcomeSummary> response = controller.getWelcome(101L);

    assertEquals(HttpStatus.OK, response.getStatusCode());
    assertSame(summary, response.getBody());
    verify(welcomeService).buildWelcomeSummary(request, "Bearer abc", 101L);
  }

  @Test
  void getWelcome_handlesNullRequestAndNullAuthHeader() {
    WelcomeController nullRequestController = new WelcomeController(welcomeService, null);
    WelcomeSummary summary = new WelcomeSummary();
    when(welcomeService.buildWelcomeSummary(null, null, null)).thenReturn(summary);

    ResponseEntity<WelcomeSummary> response = nullRequestController.getWelcome(null);

    assertEquals(HttpStatus.OK, response.getStatusCode());
    assertSame(summary, response.getBody());
    verify(welcomeService).buildWelcomeSummary(null, null, null);
  }
}

