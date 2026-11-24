package ca.bc.gov.nrs.scs.backend.repository;

import static org.junit.jupiter.api.Assertions.assertNotNull;

import java.io.File;
import java.nio.file.Files;
import java.nio.file.Path;
import javax.xml.parsers.DocumentBuilderFactory;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.Assumptions;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.w3c.dom.Document;
import org.w3c.dom.Element;
import org.w3c.dom.NodeList;

class ScalerRepositoryIntegrationTest {

  private static final String CONTEXT_XML_PATH =
      "C:/Apps/07-Work/NRS/nr-scs-2/backend/src/main/webapp/META-INF/context.xml";

  private static ScalerRepository repository;
  private static String licenceNo;

  @BeforeAll
  static void setUp() throws Exception {
    licenceNo = System.getProperty("scs.test.scalerLicenceNo");
    Assumptions.assumeTrue(licenceNo != null && !licenceNo.isBlank(),
        "Set -Dscs.test.scalerLicenceNo to a valid scaler licence number to run integration tests.");

    DbConfig cfg = loadDbConfig();
    Assumptions.assumeTrue(cfg != null,
        "Unable to load DB config from context.xml or system properties.");

    DriverManagerDataSource dataSource = new DriverManagerDataSource();
    dataSource.setDriverClassName("oracle.jdbc.OracleDriver");
    dataSource.setUrl(cfg.url);
    dataSource.setUsername(cfg.username);
    dataSource.setPassword(cfg.password);

    repository = new ScalerRepository(new JdbcTemplate(dataSource));
  }

  @Test
  void getScalerSummaryCore_returnsRecord() {
    var result = repository.getScalerSummaryCore(licenceNo);
    assertNotNull(result, "Expected summary core record for licence: " + licenceNo);
    if (result.clientNumber() != null) {
      String clientNumber = result.clientNumber();
      org.junit.jupiter.api.Assertions.assertEquals(8, clientNumber.length(),
          "Expected client number to be padded to 8 characters");
    }
  }

  @Test
  void getScalerSummaryLicenceTypes_returnsRows() {
    var result = repository.getScalerSummaryLicenceTypes(licenceNo);
    assertNotNull(result, "Expected licence types list for licence: " + licenceNo);
  }

  @Test
  void getScalerSummaryStatus_returnsStatus() {
    var status = repository.getScalerSummaryStatus(licenceNo);
    assertNotNull(status, "Expected licence status for licence: " + licenceNo);
  }

  private static DbConfig loadDbConfig() {
    String url = System.getProperty("scs.test.dbUrl");
    String username = System.getProperty("scs.test.dbUser");
    String password = System.getProperty("scs.test.dbPassword");

    if (isSet(url) && isSet(username) && isSet(password)) {
      return new DbConfig(url, username, password);
    }

    Path ctx = Path.of(CONTEXT_XML_PATH);
    if (!Files.exists(ctx)) {
      return null;
    }

    try {
      Document doc = DocumentBuilderFactory.newInstance()
          .newDocumentBuilder()
          .parse(new File(CONTEXT_XML_PATH));
      NodeList resources = doc.getElementsByTagName("Resource");
      for (int i = 0; i < resources.getLength(); i++) {
        Element el = (Element) resources.item(i);
        String name = el.getAttribute("name");
        if ("jdbc/SCS_CLERICAL".equals(name)) {
          url = el.getAttribute("url");
          username = el.getAttribute("username");
          password = el.getAttribute("password");
          if (isSet(url) && isSet(username) && isSet(password)) {
            return new DbConfig(url, username, password);
          }
        }
      }
    } catch (Exception e) {
      return null;
    }

    return null;
  }

  private static boolean isSet(String value) {
    return value != null && !value.isBlank();
  }

  private static final class DbConfig {
    private final String url;
    private final String username;
    private final String password;

    private DbConfig(String url, String username, String password) {
      this.url = url;
      this.username = username;
      this.password = password;
    }
  }
}
