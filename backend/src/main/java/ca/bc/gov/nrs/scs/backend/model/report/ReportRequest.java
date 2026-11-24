package ca.bc.gov.nrs.scs.backend.model.report;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.Map;

@Getter
@Setter
public abstract class ReportRequest {
  @JsonProperty("outputFormat")
  private OutputFormatEnum outputFormat = OutputFormatEnum.PDF;

  @JsonProperty("emailRecipient")
  private String emailRecipient;

  @JsonProperty("preview")
  private Boolean preview = true;

  @JsonProperty("regDist")
  private String regDist;

  @JsonProperty("fromDate")
  private LocalDate fromDate;

  @JsonProperty("toDate")
  private LocalDate toDate;

  public String getOutputFormatValue() {
    return OutputFormatEnum.XLS.equals(outputFormat) ? "xls" : "pdf";
  }

  public abstract Map<String, String> buildParameters(String requester);

  protected String normalizeUserId(String username) {
    if (username == null || username.isBlank()) {
      return "";
    }
    return username.trim();
  }

  protected String normalizeForJasper(String value) {
    if (value == null) {
      return "";
    }
    String trimmed = value.trim();
    return trimmed.isEmpty() || "ALL".equalsIgnoreCase(trimmed) ? "" : trimmed;
  }

  protected String formatDate(LocalDate date) {
    return date == null ? "" : date.format(DateTimeFormatter.BASIC_ISO_DATE);
  }

  protected String stringifySort(Integer sortValue) {
    if (sortValue == null || sortValue.intValue() == 0) {
      return "";
    }
    return String.valueOf(sortValue);
  }

  protected String booleanToFlag(Boolean value) {
    return Boolean.TRUE.equals(value) ? "Y" : "";
  }

  protected void putDateRangeParams(Map<String, String> params, String fromParam, String toParam) {
    params.put(fromParam, formatDate(getFromDate()));
    params.put(toParam, formatDate(getToDate()));
  }

  protected void putOrgUnitDateParams(
      Map<String, String> params,
      String requester,
      String orgUnitParam,
      String fromParam,
      String toParam) {
    params.put("P_USERID", normalizeUserId(requester));
    params.put(orgUnitParam, normalizeOrgUnitCode(getRegDist()));
    putDateRangeParams(params, fromParam, toParam);
  }

  protected String normalizeOrgUnitCode(String value) {
    return normalizeForJasper(value);
  }
}
