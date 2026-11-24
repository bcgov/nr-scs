package ca.bc.gov.nrs.scs.backend.model.report;

import ca.bc.gov.nrs.scs.backend.model.AuthorizationStatus;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.LinkedHashMap;
import java.util.Map;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ScalerRegisterReportRequest
  extends SortableDateRangeReportRequest {

  @JsonProperty("licenceStatus")
  private String licenceStatus;

  @JsonProperty("authStatus")
  private String authStatus;

  @JsonProperty("appointmentType")
  private String appointmentType;

  @Override
  public Map<String, String> buildParameters(String requester) {
    validateSorts(2, 2);
    Map<String, String> params = new LinkedHashMap<>();
    putOrgUnitDateParams(params, requester, "P_ORG_UNIT_CODE", "P_SCALER_AUTH_FROM_DATE", "P_SCALER_AUTH_TO_DATE");
    params.put("P_LICENSE_STATUS", normalizeForJasper(licenceStatus));
    params.put("P_APPOINTMENT_TYPES", normalizeForJasper(appointmentType));
    params.put("P_SITE_AUTH_STATUS", normalizeAuthorizationStatusForJasper(authStatus));
    params.put("P_PRIMARY_SORT", stringifySort(getPrimarySort().getValue()));
    params.put("P_SECONDARY_SORT", stringifySort(getSecondarySort() == null ? null : getSecondarySort().getValue()));
    return params;
  }

  private String normalizeAuthorizationStatusForJasper(String value) {
    String normalized = normalizeForJasper(value);
    if (normalized.isEmpty()) {
      return normalized;
    }

    AuthorizationStatus status = AuthorizationStatus.from(normalized);
    if (status != null) {
      return status.toJasperValue();
    }

    if ("SUSPENDED".equalsIgnoreCase(normalized)) {
      return "SUSPENDED";
    }

    return normalized;
  }
}
