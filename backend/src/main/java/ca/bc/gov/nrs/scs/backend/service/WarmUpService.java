package ca.bc.gov.nrs.scs.backend.service;

import jakarta.annotation.PostConstruct;
import javax.sql.DataSource;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

/**
 * Service to perform startup warm-up tasks, such as priming the database connection pool.
 */
@Service
public class WarmUpService {

    private static final Logger LOGGER = LoggerFactory.getLogger(WarmUpService.class);

    @Autowired
    @Qualifier("scsDataSource")
    private DataSource dataSource;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @PostConstruct
    public void warmUp() {
        LOGGER.info("Starting data loading warm up...");
        long startTime = System.currentTimeMillis();

        try {
            // Perform a simple query to prime the connection pool.
            Integer result = jdbcTemplate.queryForObject("SELECT 1 FROM DUAL", Integer.class);
            long duration = System.currentTimeMillis() - startTime;
            LOGGER.info("Database warm up successful (result: {}, duration: {}ms)", result, duration);
        } catch (Exception e) {
            // Log the whole cause chain, not just the top message: Spring wraps every connection failure
            // as "Failed to obtain JDBC Connection", and the actionable part (ORA-01017 bad credentials,
            // ORA-12514 unknown service, a TCPS/trust-store handshake failure, connection refused) is in
            // the nested Oracle/JDK exceptions. The stack trace stays at DEBUG.
            LOGGER.error("Database warm up failed: {}", describeCauses(e));
            LOGGER.debug("Database warm up failure stack trace", e);
            // We don't want to fail startup if warm up fails, as it might be a temporary DB issue
            // or we might be in a mock environment.
        }
    }

    /** {@code Type: message <- Type: message ...} from the outermost exception to the root cause. */
    static String describeCauses(Throwable error) {
        StringBuilder chain = new StringBuilder();
        java.util.Set<Throwable> seen = java.util.Collections.newSetFromMap(new java.util.IdentityHashMap<>());
        for (Throwable current = error; current != null && seen.add(current); current = current.getCause()) {
            if (!chain.isEmpty()) {
                chain.append(" <- ");
            }
            chain.append(current.getClass().getSimpleName()).append(": ").append(current.getMessage());
        }
        return chain.toString();
    }
}
