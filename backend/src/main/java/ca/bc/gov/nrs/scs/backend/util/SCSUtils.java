package ca.bc.gov.nrs.scs.backend.util;

import ca.bc.gov.nrs.scs.backend.exception.BadRequestException;
import ca.bc.gov.nrs.scs.backend.exception.ResourceNotFoundException;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.function.Function;
import java.util.UUID;
import java.util.regex.Pattern;
import org.openapitools.jackson.nullable.JsonNullable;

/**
 * Shared home for small, low-level backend helper methods that do not yet warrant a dedicated
 * utility class.
 */
public final class SCSUtils {

  /** Longest request-derived value {@link #sanitizeForLog} will emit before truncating. */
  private static final int MAX_LOGGED_VALUE_LENGTH = 200;

  private static final String LEGACY_GUID_HEX_PATTERN = "(?i)^[0-9a-f]{32}$";

  public record ParsedId(Long exactId, String wildcardPattern) {}

  private SCSUtils() {
  }

    /**
   * Trims each string in the list, removes null/empty, and returns the cleaned list.
   */
  public static List<String> normalizeStrings(List<String> values) {
    if (values == null || values.isEmpty()) return List.of();
    List<String> out = new ArrayList<>();
    for (String value : values) {
      String trimmed = trimToNull(value);
      if (trimmed != null) out.add(trimmed);
    }
    return out;
  }

  // Legacy-compatible pad: left-pad with '0' to 8 characters.
  public static String padClientNumber(String clientNumber) {
    if (clientNumber == null || clientNumber.isEmpty()) {
      return clientNumber;
    }
    final int clientNumberMaxLength = 8;
    int diff = clientNumberMaxLength - clientNumber.length();
    if (diff <= 0) {
      return clientNumber;
    }

    return "0".repeat(diff) + clientNumber;
  }

  /**
   * Client-number pad for LIKE search criteria: trims (blank → null = no filter), values
   * containing {@code %} pass through raw (the packages match with LIKE), everything else is
   * zero-padded to match stored values.
   */
  public static String padClientNumberCriterion(String clientNumber) {
    String trimmed = trimToNull(clientNumber);
    if (trimmed != null && trimmed.contains("%")) {
      return trimmed;
    }
    return padClientNumber(trimmed);
  }

  /**
   * Makes a request-derived value safe to put in a log line (java:S5145, log injection). Line
   * breaks are replaced so a caller cannot forge additional log records, other control characters
   * are neutralised, and over-long values are truncated so a single request cannot flood the log.
   * Returns {@code null} for {@code null} so placeholders still print {@code null}.
   */
  public static String sanitizeForLog(Object value) {
    if (value == null) {
      return null;
    }
    String text = value.toString().replaceAll("[\\n\\r]", "_").replaceAll("\\p{Cntrl}", "_");
    return text.length() > MAX_LOGGED_VALUE_LENGTH
        ? text.substring(0, MAX_LOGGED_VALUE_LENGTH) + "...[truncated]"
        : text;
  }

  public static boolean isBlank(String value) {
    return trimToNull(value) == null;
  }

  public static String trimToNull(String value) {
    if (value == null) {
      return null;
    }

    String normalized = value.trim();
    return normalized.isEmpty() ? null : normalized;
  }

  public static String upperOrNull(String value) {
    String normalized = trimToNull(value);
    return normalized == null ? null : normalized.toUpperCase(Locale.ROOT);
  }

  public static boolean isYesNo(String value) {
    return "Y".equalsIgnoreCase(value) || "N".equalsIgnoreCase(value);
  }

  public static boolean isUuidLike(String value) {
    String normalized = trimToNull(value);
    if (normalized == null) {
      return false;
    }

    if (normalized.matches(LEGACY_GUID_HEX_PATTERN)) {
      return true;
    }

    try {
      UUID.fromString(normalized);
      return true;
    } catch (IllegalArgumentException ex) {
      return false;
    }
  }

  public static void requireDateOrder(LocalDate fromDate, LocalDate toDate, String message) {
    if (fromDate != null && toDate != null && fromDate.isAfter(toDate)) {
      throw new BadRequestException(message);
    }
  }

  public static <T> boolean isPresent(JsonNullable<T> value) {
    return value != null && value.isPresent() && value.get() != null;
  }

  /**
   * Applies {@code mapper} to {@code value} unless it is null, in which case null is returned.
   * Useful at the API boundary for reading a nested value (e.g. a generated enum's wire value) from a
   * field that the contract marks required but that a caller may still leave unset.
   */
  public static <T, R> R mapNullable(T value, Function<T, R> mapper) {
    return value == null ? null : mapper.apply(value);
  }

  public static <T> T getNullable(JsonNullable<T> value) {
    return value != null && value.isPresent() ? value.get() : null;
  }

  public static <T> JsonNullable<T> toNullable(T value) {
    return value == null ? JsonNullable.undefined() : JsonNullable.of(value);
  }

  public static <T> T requireNotNull(T value, String message) {
    if (value == null) {
      throw new BadRequestException(message);
    }
    return value;
  }

  /**
   * Guards a column-length limit, mirroring the legacy {@code errors.maxlength} resource
   * ("{field} can not be greater than {n} characters."). Null and blank pass — this is a length
   * rule, not a required rule. The trimmed length is measured because that is what gets persisted.
   */
  public static String requireMaxLength(String value, int maxLength, String label) {
    String normalized = trimToNull(value);
    if (normalized != null && normalized.length() > maxLength) {
      throw new BadRequestException(
          label + " can not be greater than " + maxLength + " characters.");
    }
    return value;
  }

  /** Guards a required text input: throws {@link BadRequestException} (400) when null or blank. */
  public static String requireText(String value, String message) {
    if (isBlank(value)) {
      throw new BadRequestException(message);
    }
    return value;
  }

  /**
   * Guards a looked-up entity: throws {@link ResourceNotFoundException} (404) when null, otherwise
   * returns it. For service-layer reads that must resolve an existing record.
   */
  public static <T> T requireFound(T entity, String message) {
    if (entity == null) {
      throw new ResourceNotFoundException(message);
    }
    return entity;
  }

  public static void requireYesNo(String value, String message) {
    if (!"Y".equals(value) && !"N".equals(value)) {
      throw new BadRequestException(message);
    }
  }

  public static boolean matchesWildcard(String value, String pattern) {
    StringBuilder regex = new StringBuilder("^");
    for (char c : pattern.toCharArray()) {
      if (c == '%') {
        regex.append(".*");
      } else {
        regex.append(Pattern.quote(String.valueOf(c)));
      }
    }
    regex.append("$");
    return value.matches(regex.toString());
  }

  public static int resolveSort(Integer value, Set<Integer> allowed, int defaultValue) {
    int resolved = value == null ? defaultValue : value;
    if (!allowed.contains(resolved)) {
      throw new BadRequestException("Invalid sort value: " + value);
    }
    return resolved;
  }

  public static ParsedId parseRiskQuestionnaireId(String input) {
    if (input == null || input.isBlank()) return new ParsedId(null, null);
    String trimmed = input.trim();
    if (trimmed.contains("%")) return new ParsedId(null, trimmed);
    try {
      return new ParsedId(Long.parseLong(trimmed), null);
    } catch (NumberFormatException e) {
      throw new BadRequestException("Assessment ID must be a number or a wildcard pattern (e.g. 10%).");
    }
  }

  public static <T> List<T> filterByWildcardId(List<T> results, String wildcardPattern, Function<T, JsonNullable<Long>> getId) {
    if (wildcardPattern == null) return results;
    return results.stream()
        .filter(r -> {
          Long id = getNullable(getId.apply(r));
          return id != null && matchesWildcard(String.valueOf(id), wildcardPattern);
        })
        .toList();
  }
}

