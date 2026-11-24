package ca.bc.gov.nrs.scs.backend.config;

import com.zaxxer.hikari.HikariDataSource;
import javax.sql.DataSource;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.jdbc.DataSourceProperties;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.JdbcTransactionManager;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.EnableTransactionManagement;

/**
 * The SCS Oracle connection pool.
 *
 * <p>The WAR looked the pool up from Tomcat ({@code java:comp/env/jdbc/SCS_CLERICAL}, defined in
 * the Ansible-templated {@code context.xml}). Under Spring Boot the pool is a HikariCP instance
 * built from {@code spring.datasource.*} — URL, credentials and TCPS trust store come from
 * environment variables (see {@code application.yml} and {@code backend/openshift.deploy.yml}).
 *
 * <p>The bean keeps its {@code scsDataSource} name because {@code WarmUpService} qualifies on it.
 * Stale-connection protection is Hikari's own (it validates a connection with
 * {@code Connection.isValid} before handing it out), replacing Tomcat JDBC's
 * {@code testOnBorrow} + {@code validationQuery}.
 */
@Configuration
@EnableTransactionManagement
public class DataSourceConfig {

    private static final Logger log = LoggerFactory.getLogger(DataSourceConfig.class);

    @Bean
    @Primary
    @ConfigurationProperties("spring.datasource")
    public DataSourceProperties scsDataSourceProperties() {
        return new DataSourceProperties();
    }

    /**
     * Primary DataSource for all reads and writes. Pool tuning binds from
     * {@code spring.datasource.hikari.*}.
     */
    @Bean(name = "scsDataSource")
    @Primary
    @ConfigurationProperties("spring.datasource.hikari")
    public HikariDataSource scsDataSource(DataSourceProperties scsDataSourceProperties) {
        log.info("Creating SCS DataSource (HikariCP)");
        return scsDataSourceProperties.initializeDataSourceBuilder().type(HikariDataSource.class).build();
    }

    /**
     * Provide a JdbcTemplate wired to the primary SCS DataSource so repositories can autowire it.
     */
    @Bean
    public JdbcTemplate jdbcTemplate(DataSource scsDataSource) {
        log.debug("Creating JdbcTemplate backed by scsDataSource");
        return new JdbcTemplate(scsDataSource);
    }

    /**
     * Transaction manager for {@code @Transactional} services. Must be bound to the same
     * {@code scsDataSource} that JdbcTemplate uses, so that the thread-bound connection JdbcTemplate
     * looks up via DataSourceUtils is the transactional one.
     */
    @Bean
    public PlatformTransactionManager transactionManager(DataSource scsDataSource) {
        log.debug("Creating JdbcTransactionManager backed by scsDataSource");
        return new JdbcTransactionManager(scsDataSource);
    }
}
