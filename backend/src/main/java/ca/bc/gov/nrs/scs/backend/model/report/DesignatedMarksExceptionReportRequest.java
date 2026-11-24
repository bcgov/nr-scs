package ca.bc.gov.nrs.scs.backend.model.report;

import static ca.bc.gov.nrs.scs.backend.util.SCSUtils.upperOrNull;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.LinkedHashMap;
import java.util.Map;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class DesignatedMarksExceptionReportRequest extends ReportRequest {

  @JsonProperty("markRegDist")
  private String markRegDist;

  @JsonProperty("siteRegDist")
  private String siteRegDist;

  @JsonProperty("mark1")
  private String mark1;

  @JsonProperty("mark2")
  private String mark2;

  @JsonProperty("mark3")
  private String mark3;

  @JsonProperty("mark4")
  private String mark4;

  @JsonProperty("mark5")
  private String mark5;

  @JsonProperty("mark6")
  private String mark6;

  @JsonProperty("site1")
  private String site1;

  @JsonProperty("site2")
  private String site2;

  @JsonProperty("site3")
  private String site3;

  @JsonProperty("site4")
  private String site4;

  @JsonProperty("site5")
  private String site5;

  @JsonProperty("site6")
  private String site6;

  @Override
  public Map<String, String> buildParameters(String requester) {
    Map<String, String> params = new LinkedHashMap<>();
    params.put("P_USERID", normalizeUserId(requester));
    putDateRangeParams(params, "P_FROM_DATE", "P_TO_DATE");
    params.put("P_ORG_UNIT_CODE", normalizeForJasper(siteRegDist));
    params.put("P_TM_ORG_UNIT_CODE", normalizeForJasper(markRegDist));
    params.put("P_SS1", normalizeForJasper(upperOrNull(site1)));
    params.put("P_SS2", normalizeForJasper(upperOrNull(site2)));
    params.put("P_SS3", normalizeForJasper(upperOrNull(site3)));
    params.put("P_SS4", normalizeForJasper(upperOrNull(site4)));
    params.put("P_SS5", normalizeForJasper(upperOrNull(site5)));
    params.put("P_SS6", normalizeForJasper(upperOrNull(site6)));
    params.put("P_TM1", normalizeForJasper(upperOrNull(mark1)));
    params.put("P_TM2", normalizeForJasper(upperOrNull(mark2)));
    params.put("P_TM3", normalizeForJasper(upperOrNull(mark3)));
    params.put("P_TM4", normalizeForJasper(upperOrNull(mark4)));
    params.put("P_TM5", normalizeForJasper(upperOrNull(mark5)));
    params.put("P_TM6", normalizeForJasper(upperOrNull(mark6)));
    return params;
  }
}
