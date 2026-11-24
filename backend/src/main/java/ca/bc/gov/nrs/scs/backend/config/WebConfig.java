package ca.bc.gov.nrs.scs.backend.config;

import ca.bc.gov.nrs.scs.backend.constants.ApiConstants;
import ca.bc.gov.nrs.scs.backend.security.ClientScopeInterceptor;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import io.swagger.v3.oas.annotations.OpenAPIDefinition;
import io.swagger.v3.oas.annotations.info.Info;
import org.openapitools.jackson.nullable.JsonNullableModule;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.validation.beanvalidation.MethodValidationPostProcessor;
import org.springframework.http.converter.ByteArrayHttpMessageConverter;
import org.springframework.http.converter.HttpMessageConverter;
import org.springframework.http.converter.ResourceHttpMessageConverter;
import org.springframework.http.converter.json.MappingJackson2HttpMessageConverter;
import org.springframework.web.servlet.config.annotation.*;

import java.util.List;

@Configuration
// @EnableWebMvc is kept from the WAR build: it switches off Boot's MVC auto-configuration so the
// message converters below (JsonNullable + JavaTime) stay exactly as they were. Controllers and
// exception handlers are found by Boot's component scan from ScsApiApplication.
@EnableWebMvc
@OpenAPIDefinition(info = @Info(title = "SCS API", version = "v1", description = "Backend for SCS Rebuild"))
public class WebConfig implements WebMvcConfigurer {

    // NOTE: CORS is configured solely in SecurityConfig (property-driven). Spring Security's CORS
    // filter takes precedence over WebMvcConfigurer#addCorsMappings, so any mapping here would be
    // dead code that only invites dev/prod divergence.

    /**
     * Enables method-level validation on controllers. The OpenAPI generator emits {@code @Validated}
     * plus parameter constraints ({@code @Size}/{@code @Min}/{@code @Max}) onto the generated
     * {@code *Api} interfaces, but the hand-written controller methods that implement them carry no
     * annotations — and Spring's built-in method validation only inspects the concrete handler
     * method, so query/path-parameter constraints were never enforced. This post-processor proxies
     * the {@code @Validated} controllers so Hibernate Validator validates each call against the
     * interface-declared constraints; a violation surfaces as a {@code ConstraintViolationException},
     * which {@code GlobalApiExceptionHandler} maps to 400. {@code proxyTargetClass} is required so the
     * CGLIB proxy preserves the {@code @RestController} class-level request mappings.
     *
     * <p>{@code static} is load-bearing: a non-static {@code @Bean} post-processor forces this class
     * to be instantiated early, and its constructor pulls in {@link ClientScopeInterceptor} and the
     * repositories behind it before the auto-proxy creators exist — so those beans silently lose
     * their {@code @Transactional} and method-security proxies. (The WAR's root/servlet context
     * split hid this; Boot's single context exposes it.)
     */
    @Bean
    public static MethodValidationPostProcessor methodValidationPostProcessor() {
        MethodValidationPostProcessor processor = new MethodValidationPostProcessor();
        processor.setProxyTargetClass(true);
        return processor;
    }

    private final ClientScopeInterceptor clientScopeInterceptor;

    public WebConfig(ClientScopeInterceptor clientScopeInterceptor) {
        this.clientScopeInterceptor = clientScopeInterceptor;
    }

    /**
     * Applies the forest-client data-scoping guard to every API endpoint. It only acts on requests
     * that both come from a client-restricted (external) caller and address a record by
     * {@code scalerLicenceNo}/{@code scaleSiteIdNmbr}, so it is a no-op for internal users — see
     * {@link ClientScopeInterceptor} for why the check is central rather than per-service.
     */
    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(clientScopeInterceptor)
                .addPathPatterns(ApiConstants.API_BASE_PATH + "/**");
    }

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        registry.addResourceHandler("/swagger-ui/**")
                .addResourceLocations("classpath:/META-INF/resources/webjars/swagger-ui/5.17.14/");

        // Frontend build asset directories (Vite outputs to /assets, icons to /icons)
        registry.addResourceHandler("/assets/**").addResourceLocations("/assets/");
        registry.addResourceHandler("/icons/**").addResourceLocations("/icons/");
        registry.addResourceHandler("/screenshots/**").addResourceLocations("/screenshots/");

        // Handler for root-level files: index.html, favicon.ico, manifest.webmanifest, robots.txt, etc.
        // "*.*" only matches files with an extension in the root — avoids capturing SPA routes.
        registry.addResourceHandler("/*.*")
                .addResourceLocations("/", "classpath:/static/");
    }

    @Override
    public void addViewControllers(ViewControllerRegistry registry) {
        // Forward the SPA root to index.html. Deeper client-side routes are NOT enumerated here
        // (the previous per-depth patterns capped client routing at 5 segments). Instead, any
        // non-API, extensionless GET that matches no controller or static resource is served
        // index.html by GlobalApiExceptionHandler, so client-side routing works at any depth.
        registry.addViewController("/").setViewName("forward:/index.html");
    }

    @Override
    public void configureMessageConverters(List<HttpMessageConverter<?>> converters) {
        // Create a new ObjectMapper and configure it with the necessary modules.
        ObjectMapper objectMapper = new ObjectMapper()
                .registerModule(new JsonNullableModule()) // For OpenAPI generator's nullable type
                .registerModule(new JavaTimeModule()) // For Java 8+ time types like OffsetDateTime
                .disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS); // Use ISO-8601 strings for dates

        // Create a new message converter with our custom ObjectMapper.
        MappingJackson2HttpMessageConverter jacksonConverter = new MappingJackson2HttpMessageConverter();
        jacksonConverter.setObjectMapper(objectMapper);

        // Add our custom converter to the list. By adding it at the beginning,
        // we ensure it takes precedence over any default converters.
        converters.add(0, jacksonConverter);
    }
    @Override
    public void extendMessageConverters(List<HttpMessageConverter<?>> converters) {
        converters.add(new ByteArrayHttpMessageConverter());
        converters.add(new ResourceHttpMessageConverter());
    }
}
