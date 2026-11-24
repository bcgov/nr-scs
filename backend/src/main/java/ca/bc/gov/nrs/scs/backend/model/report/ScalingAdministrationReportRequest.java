package ca.bc.gov.nrs.scs.backend.model.report;

import java.util.LinkedHashMap;
import java.util.Map;

public class ScalingAdministrationReportRequest extends ReportRequest {

  @Override
  public Map<String, String> buildParameters(String requester) {
    Map<String, String> params = new LinkedHashMap<>();
    putOrgUnitDateParams(params, requester, "P_ORG_UNIT_CODE", "P_FROM_DATE", "P_TO_DATE");
    return params;
  }
}
