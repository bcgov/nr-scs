package ca.bc.gov.nrs.scs.backend.model.report;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * SCS_REP025 / SCS_REP026.
 *
 * <p>These use the SAME org-unit convention as every other report: "no filter" goes out as an EMPTY
 * string, never the literal "ALL". This class previously overrode {@code normalizeOrgUnitCode} to send
 * "ALL", which broke the report two ways — the SCS_REP025 header expression prints ": All" only when
 * {@code P_ORG_UNIT_CODE} is null or empty, and otherwise falls through to {@code $F{ORG_UNIT_NAME}},
 * a result-set field that is null with no district filter, so the header rendered ": null"; and the
 * value was also handed to {@code PRC_REP025} as a real org-unit code to match on.
 *
 * <p>Legacy evidence: {@code ScsRegDistDropList} renders the All option as
 * {@code <option value="">All</option>} and {@code DistrictCheckScalePerformanceReportBo} passes
 * {@code regDist} through raw, so legacy sent an empty string here.
 */
public class DistrictPerformanceReportRequest extends ReportRequest {
  @Override
  public Map<String, String> buildParameters(String requester) {
    Map<String, String> params = new LinkedHashMap<>();
    putOrgUnitDateParams(params, requester, "P_ORG_UNIT_CODE", "P_FROM_DATE", "P_TO_DATE");
    return params;
  }
}
