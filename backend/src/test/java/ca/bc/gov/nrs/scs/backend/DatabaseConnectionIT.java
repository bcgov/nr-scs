package ca.bc.gov.nrs.scs.backend;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.context.junit.jupiter.SpringExtension;
import ca.bc.gov.nrs.scs.backend.config.TestConfig;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;

/**
 * Integration Test to verify the database connection.
 * This test requires a running Oracle database and valid credentials
 * configured in src/test/resources/application.properties.
 */
@ExtendWith(SpringExtension.class)
@ContextConfiguration(classes = TestConfig.class)
class DatabaseConnectionIT {

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Test
    void testDatabaseConnection() {
        assertDoesNotThrow(() -> {
            Integer result = jdbcTemplate.queryForObject("SELECT 1 FROM DUAL", Integer.class);
            assertEquals(1, result);
        }, "The database connection test should not throw an exception.");
    }
}