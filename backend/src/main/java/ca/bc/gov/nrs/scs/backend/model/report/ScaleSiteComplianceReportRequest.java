package ca.bc.gov.nrs.scs.backend.model.report;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.LinkedHashMap;
import java.util.Map;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ScaleSiteComplianceReportRequest extends ReportRequest {

  @JsonProperty("inspectionId")
  private Long inspectionId;

  // SCS_REP014 declares exactly two parameters (P_USERID, P_INSPECTION_ID); its sub-reports are
  // resolved by the deployed report definition, not attached here.
  @Override
  public Map<String, String> buildParameters(String requester) {
    Map<String, String> params = new LinkedHashMap<>();
    params.put("P_USERID", normalizeUserId(requester));
    params.put("P_INSPECTION_ID", inspectionId == null ? "" : String.valueOf(inspectionId));
    return params;
  }
}
