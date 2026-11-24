package ca.bc.gov.nrs.scs.backend.controller;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;

import ca.bc.gov.nrs.scs.backend.model.ScalerCreate;
import jakarta.validation.Validation;
import jakarta.validation.ValidatorFactory;
import jakarta.validation.executable.ExecutableValidator;
import java.lang.reflect.Method;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * Guards against HV000151 (ConstraintDeclarationException): a controller method that {@code @Override}s
 * a generated {@code *Api} interface method must NOT re-declare parameter constraints
 * ({@code @Valid}/{@code @Size}/{@code @Min}/…) — those live only on the interface. With method
 * validation enabled (MethodValidationPostProcessor), building the executable metadata for such a
 * redefining method throws at request time. Validating parameters here exercises that same metadata
 * build, so a regression fails fast in the suite instead of in a running endpoint.
 */
@DisplayName("Controller method constraint declaration (HV000151 guard)")
class ControllerMethodConstraintTest {

  @Test
  void updateScalerBuildsMethodMetadataWithoutConstraintRedefinition() throws Exception {
    ScalerController controller = new ScalerController(null);
    Method method = ScalerController.class.getMethod("updateScaler", String.class, ScalerCreate.class);

    try (ValidatorFactory factory = Validation.buildDefaultValidatorFactory()) {
      ExecutableValidator executableValidator = factory.getValidator().forExecutables();
      assertDoesNotThrow(() ->
          executableValidator.validateParameters(
              controller, method, new Object[] {"AB12", new ScalerCreate()}));
    }
  }

  @Test
  void createScalerBuildsMethodMetadataWithoutConstraintRedefinition() throws Exception {
    ScalerController controller = new ScalerController(null);
    Method method = ScalerController.class.getMethod("createScaler", ScalerCreate.class);

    try (ValidatorFactory factory = Validation.buildDefaultValidatorFactory()) {
      ExecutableValidator executableValidator = factory.getValidator().forExecutables();
      assertDoesNotThrow(() ->
          executableValidator.validateParameters(
              controller, method, new Object[] {new ScalerCreate()}));
    }
  }
}
