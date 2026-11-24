package ca.bc.gov.nrs.scs.backend.model.report;

import java.util.LinkedHashMap;
import java.util.Map;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ScalingExceptionReportRequest
  extends SortableDateRangeReportRequest {

  @Override
  public Map<String, String> buildParameters(String requester) {
    validateSorts(3, 3);
    Map<String, String> params = new LinkedHashMap<>();
    putOrgUnitDateParams(params, requester, "P_ORG_UNIT_CODE", "P_FROM_DATE", "P_TO_DATE");
    params.put("P_PRIMARY_SORT", stringifySort(getPrimarySort().getValue()));
    params.put("P_SECONDARY_SORT", stringifySort(getSecondarySort() == null ? null : getSecondarySort().getValue()));
    return params;
  }
}
