package ca.bc.gov.nrs.scs.backend.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.web.client.RestTemplate;

@Configuration
@EnableScheduling
public class MailConfig {

  @Bean
  public RestTemplate restTemplate(
      @Value("${mail.enabled:false}") boolean enabled,
      @Value("${mail.host:}") String mailHost,
      @Value("${mail.login:}") String mailLogin) {
    if (enabled
        && (mailHost == null
            || mailHost.isBlank()
            || mailLogin == null
            || mailLogin.isBlank())) {
      throw new IllegalStateException("mail.host and mail.login must be configured when mail.enabled=true");
    }
    return new RestTemplate();
  }
}