package ca.bc.gov.nrs.scs.backend.controller;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.mockito.Mockito.mock;

import ca.bc.gov.nrs.scs.backend.service.AppointmentTypeService;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.executable.ExecutableValidator;
import java.lang.reflect.Method;
import java.time.LocalDate;
import java.util.Set;
import org.junit.jupiter.api.Test;
import org.springframework.validation.beanvalidation.LocalValidatorFactoryBean;

/**
 * Probe: confirms Hibernate Validator's {@link ExecutableValidator} honours the {@code @Size}
 * declared on the generated {@code AppointmentTypeApi} interface when validating the concrete
 * controller method. This is the mechanism a {@code MethodValidationPostProcessor} relies on.
 */
class InterfaceParamConstraintProbeTest {

  @Test
  void interfaceDeclaredSizeConstraintIsHonouredOnImplMethod() throws Exception {
    LocalValidatorFactoryBean lvfb = new LocalValidatorFactoryBean();
    lvfb.afterPropertiesSet();
    ExecutableValidator executableValidator = lvfb.getValidator().forExecutables();

    AppointmentTypeController controller =
        new AppointmentTypeController(mock(AppointmentTypeService.class));
    Method method = AppointmentTypeController.class.getMethod(
        "getAppointmentTypes", String.class, String.class, String.class, LocalDate.class,
        LocalDate.class);

    Object[] params = {"ABCDEFGHIJK", null, null, null, null}; // code is 11 chars, max is 10

    Set<ConstraintViolation<AppointmentTypeController>> violations =
        executableValidator.validateParameters(controller, method, params);

    assertFalse(violations.isEmpty(),
        "Expected @Size(max=10) from the interface to be violated by an 11-char code");
  }
}
