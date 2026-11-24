package ca.bc.gov.nrs.scs.backend.model.report;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

public enum OutputFormatEnum {
  PDF("PDF"),
  XLS("XLS");

  private final String value;

  OutputFormatEnum(String value) {
    this.value = value;
  }

  @JsonValue
  public String getValue() {
    return value;
  }

  @Override
  public String toString() {
    return String.valueOf(value);
  }

  @JsonCreator
  public static OutputFormatEnum fromValue(String value) {
    for (OutputFormatEnum b : OutputFormatEnum.values()) {
      if (b.value.equals(value)) {
        return b;
      }
    }
    throw new IllegalArgumentException("Unexpected value '" + value + "'");
  }
}
