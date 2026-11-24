package ca.bc.gov.nrs.scs.backend.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.method.HandlerTypePredicate;
import org.springframework.web.servlet.config.annotation.PathMatchConfigurer;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;
import ca.bc.gov.nrs.scs.backend.constants.ApiConstants;

/**
 * This configuration class applies a global base path to all REST controllers.
 * It ensures that all API endpoints are consistently prefixed with "/api",
 * preventing routing conflicts with the frontend Single Page Application (SPA).
 */
@Configuration
public class ApiBasePathConfig implements WebMvcConfigurer {

    @Override
    public void configurePathMatch(PathMatchConfigurer configurer) {
        configurer.addPathPrefix(ApiConstants.API_BASE_PATH, HandlerTypePredicate.forAnnotation(org.springframework.web.bind.annotation.RestController.class));
    }
}
