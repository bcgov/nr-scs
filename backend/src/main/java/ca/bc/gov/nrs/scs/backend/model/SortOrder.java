package ca.bc.gov.nrs.scs.backend.model;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

public enum SortOrder {
  NUMBER_0(0),
  NUMBER_1(1),
  NUMBER_2(2),
  NUMBER_3(3),
  NUMBER_4(4),
  NUMBER_5(5);

  private final Integer value;

  SortOrder(Integer value) {
    this.value = value;
  }

  @JsonValue
  public Integer getValue() {
    return value;
  }

  @Override
  public String toString() {
    return String.valueOf(value);
  }

  @JsonCreator
  public static SortOrder fromValue(Integer value) {
    for (SortOrder b : SortOrder.values()) {
      if (b.value.equals(value)) {
        return b;
      }
    }
    throw new IllegalArgumentException("Unexpected value '" + value + "'");
  }
}
