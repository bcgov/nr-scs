package ca.bc.gov.nrs.scs.backend.config;

import ca.bc.gov.nrs.scs.backend.service.HealthService;
import org.mockito.Mockito;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.jdbc.core.JdbcTemplate;

@Configuration
public class TestConfig {

    @Bean
    public HealthService healthService() {
        return Mockito.mock(HealthService.class);
    }

    @Bean
    public JdbcTemplate jdbcTemplate() {
        return Mockito.mock(JdbcTemplate.class);
    }
}
