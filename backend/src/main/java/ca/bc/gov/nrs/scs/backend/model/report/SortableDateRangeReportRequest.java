package ca.bc.gov.nrs.scs.backend.model.report;

import ca.bc.gov.nrs.scs.backend.model.SortOrder;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public abstract class SortableDateRangeReportRequest extends ReportRequest {

  @JsonProperty("primarySort")
  private SortOrder primarySort;

  @JsonProperty("secondarySort")
  private SortOrder secondarySort;

  protected void validateSorts(int primaryMax, int secondaryMax) {
    SortOrder primary = getPrimarySort();
    if (primary == null) {
      throw new IllegalArgumentException("Primary Sort is required.");
    }
    validateSortRange("Primary Sort", primary, 1, primaryMax);

    SortOrder secondary = getSecondarySort();
    if (secondary != null) {
      validateSortRange("Secondary Sort", secondary, 0, secondaryMax);
    }
  }

  private void validateSortRange(String label, SortOrder sort, int min, int max) {
    int value = sort.getValue();
    if (value < min || value > max) {
      throw new IllegalArgumentException(
          label + " must be between " + min + " and " + max + ".");
    }
  }
}
