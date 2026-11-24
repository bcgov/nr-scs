package ca.bc.gov.nrs.scs.backend.config;

import java.util.concurrent.Executor;
import java.util.concurrent.ThreadPoolExecutor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;
import org.springframework.validation.beanvalidation.LocalValidatorFactoryBean;

/**
 * Application-wide beans. Component scanning and property loading ({@code application.yml}, then
 * environment variables) are Spring Boot's, from {@link ca.bc.gov.nrs.scs.backend.ScsApiApplication}.
 */
@Configuration
public class AppConfig {

    @Bean
    public LocalValidatorFactoryBean validator() {
        return new LocalValidatorFactoryBean();
    }

    @Bean(name = "reportExecutor")
    public Executor reportExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(2);
        executor.setMaxPoolSize(4);
        executor.setQueueCapacity(100);
        executor.setThreadNamePrefix("report-");
        // Backpressure: once core threads, the queue, and max threads are all saturated, reject the
        // task (surfaced as a 503 to the caller) instead of the default CallerRunsPolicy, which would
        // run the report on the HTTP request thread and block the servlet container.
        executor.setRejectedExecutionHandler(new ThreadPoolExecutor.AbortPolicy());
        executor.initialize();
        return executor;
    }
}
