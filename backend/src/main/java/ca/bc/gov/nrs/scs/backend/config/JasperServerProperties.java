package ca.bc.gov.nrs.scs.backend.config;

import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;

import java.io.IOException;
import java.io.InputStream;
import java.util.Properties;

/**
 * Manages application configuration by loading properties from a file.
 * This class loads configuration from `ilcr.properties` located on the classpath.
 * It also provides a fallback mechanism to read from environment variables.
 */
public class JasperServerProperties {
    private static final Logger log = LogManager.getLogger(JasperServerProperties.class);
    private static final String PROPS_FILE = "application.properties";
    private static final Properties properties = new Properties();

    private JasperServerProperties() {
        // Prevent instantiation
    }


    static {
        try (InputStream input = JasperServerProperties.class.getClassLoader().getResourceAsStream(PROPS_FILE)) {
            if (input == null) {
                log.warn("Unable to find " + PROPS_FILE + ". Make sure it's on the classpath. Will rely on environment variables.");
            } else {
                properties.load(input);
                log.info(PROPS_FILE + " loaded successfully.");
            }
        } catch (IOException ex) {
            log.error("Error loading " + PROPS_FILE, ex);
        }
    }

    /**
     * Gets a configuration property by its key.
     * It first looks in the loaded properties file. If not found, it attempts to
     * find a corresponding environment variable. Environment variable names are
     * expected to be uppercase with dots replaced by underscores (e.g., 'cognito.domain' becomes 'COGNITO_DOMAIN').
     *
     * @param key The property key (e.g., "cognito.domain").
     * @return The property value, or null if not found.
     */
    public static String getProperty(String key) {
        String value = properties.getProperty(key);
        if (value == null || value.trim().isEmpty()) {
            String envVarKey = key.toUpperCase().replace('.', '_').replace('-', '_');
            value = System.getenv(envVarKey);
            if (value != null) {
              log.info("Found fallback for '{}' in environment variable '{}'.", key, envVarKey);
            } else {
              log.warn(
                  "Configuration property '{}' not found in properties file or as environment variable '{}'.",
                  key, envVarKey);
            }
        }
        return value;
    }

    public static String getProperty(String key, String defaultValue) {
        String value = getProperty(key);
        return (value != null && !value.trim().isEmpty()) ? value : defaultValue;
    }
}
