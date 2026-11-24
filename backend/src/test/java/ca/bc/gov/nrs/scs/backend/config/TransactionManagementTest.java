package ca.bc.gov.nrs.scs.backend.config;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import javax.sql.DataSource;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.embedded.EmbeddedDatabaseBuilder;
import org.springframework.jdbc.datasource.embedded.EmbeddedDatabaseType;
import org.springframework.jdbc.support.JdbcTransactionManager;
import org.springframework.test.context.junit.jupiter.SpringJUnitConfig;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.EnableTransactionManagement;
import org.springframework.transaction.annotation.Transactional;

/**
 * Verifies that the transaction infrastructure added in {@link DataSourceConfig}
 * (@EnableTransactionManagement plus a {@link JdbcTransactionManager}) actually rolls back a
 * partially-completed write when a {@code @Transactional} method throws.
 *
 * <p>The wiring here mirrors production: the transaction manager and the JdbcTemplate are bound to
 * the same {@code DataSource} instance, exercising the binding path that the original review flagged
 * as risky. An embedded H2 database stands in for Oracle because the real repositories invoke
 * Oracle-specific stored procedures.
 *
 * <p>The second test is a control: without {@code @Transactional} the connection stays in
 * auto-commit mode and the partial write survives — the exact data-integrity defect that existed
 * before a transaction manager was configured.
 */
@SpringJUnitConfig(TransactionManagementTest.Config.class)
class TransactionManagementTest {

  @Autowired
  private JdbcTemplate jdbcTemplate;

  @Autowired
  private PartialWriteService partialWriteService;

  @BeforeEach
  void resetTable() {
    jdbcTemplate.execute("CREATE TABLE IF NOT EXISTS widget (id INT PRIMARY KEY, name VARCHAR(50))");
    jdbcTemplate.update("DELETE FROM widget");
  }

  @Test
  @DisplayName("@Transactional method rolls back all inserts when it throws after a partial write")
  void transactionalWrite_rollsBackAllInserts_whenMethodThrows() {
    assertThrows(IllegalStateException.class, () -> partialWriteService.insertTwoThenThrow());

    Integer count = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM widget", Integer.class);
    assertEquals(0, count,
        "Both inserts must be rolled back when the @Transactional method throws");
  }

  @Test
  @DisplayName("Control: without @Transactional the partial write is committed (pre-fix behaviour)")
  void nonTransactionalWrite_leavesInsertsCommitted_whenMethodThrows() {
    assertThrows(IllegalStateException.class, () -> partialWriteService.insertTwoThenThrowNoTx());

    Integer count = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM widget", Integer.class);
    assertEquals(2, count,
        "Without a transaction manager, auto-commit leaves the partial write committed");
  }

  /**
   * Test service whose write methods insert two rows and then throw, so a correctly configured
   * transaction either keeps all rows or none.
   */
  static class PartialWriteService {

    private final JdbcTemplate jdbcTemplate;

    PartialWriteService(JdbcTemplate jdbcTemplate) {
      this.jdbcTemplate = jdbcTemplate;
    }

    @Transactional
    public void insertTwoThenThrow() {
      jdbcTemplate.update("INSERT INTO widget (id, name) VALUES (1, 'first')");
      jdbcTemplate.update("INSERT INTO widget (id, name) VALUES (2, 'second')");
      throw new IllegalStateException("boom after partial insert");
    }

    public void insertTwoThenThrowNoTx() {
      jdbcTemplate.update("INSERT INTO widget (id, name) VALUES (1, 'first')");
      jdbcTemplate.update("INSERT INTO widget (id, name) VALUES (2, 'second')");
      throw new IllegalStateException("boom after partial insert");
    }
  }

  @Configuration
  @EnableTransactionManagement
  static class Config {

    @Bean
    public DataSource dataSource() {
      // The transaction manager and JdbcTemplate must share this exact instance (mirrors production).
      return new EmbeddedDatabaseBuilder()
          .setType(EmbeddedDatabaseType.H2)
          .setName("txRollbackTestDb")
          .build();
    }

    @Bean
    public JdbcTemplate jdbcTemplate(DataSource dataSource) {
      return new JdbcTemplate(dataSource);
    }

    @Bean
    public PlatformTransactionManager transactionManager(DataSource dataSource) {
      return new JdbcTransactionManager(dataSource);
    }

    @Bean
    public PartialWriteService partialWriteService(JdbcTemplate jdbcTemplate) {
      return new PartialWriteService(jdbcTemplate);
    }
  }
}
