package ca.bc.gov.nrs.scs.backend.model.report;

import static ca.bc.gov.nrs.scs.backend.util.SCSUtils.upperOrNull;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.LinkedHashMap;
import java.util.Map;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ScaleSiteRegisterReportRequest extends SortableDateRangeReportRequest {

  @JsonProperty("scaleType")
  private String scaleType;

  @JsonProperty("scaleSiteNumber")
  private String scaleSiteNumber;

  @JsonProperty("siteStatus")
  private String siteStatus;

  @JsonProperty("authorizedScalersOnly")
  private Boolean authorizedScalersOnly = false;

  @Override
  public Map<String, String> buildParameters(String requester) {
    validateSorts(5, 5);
    Map<String, String> params = new LinkedHashMap<>();
    putOrgUnitDateParams(params, requester, "P_ORG_UNIT_CODE", "P_SCALE_SITE_FROM_DATE", "P_SCALE_SITE_TO_DATE");
    params.put("P_SCALE_TYPE", normalizeForJasper(scaleType));
    // Uppercased here, not just in the browser: legacy ScaleSiteReportBo.setScaleSiteNumber() folded the
    // case in its setter, so "019v" and "019V" were one filter no matter which client sent it.
    // P_SCALE_SITE_NMBR reaches the report engine verbatim and the stored numbers are uppercase, so a
    // lowercase value arriving from any caller other than the form would match nothing and silently
    // produce an empty report. Mirrors MarkSiteDesignation/DesignatedMarksException, which already
    // route their site and mark numbers through upperOrNull.
    params.put("P_SCALE_SITE_NMBR", normalizeForJasper(upperOrNull(scaleSiteNumber)));
    params.put("P_SCALE_SITE_STATUS", normalizeForJasper(siteStatus));
    params.put("P_AUTH_SCALER_ONLY", booleanToFlag(authorizedScalersOnly));
    params.put("P_PRIMARY_SORT", stringifySort(getPrimarySort().getValue()));
    params.put("P_SECONDARY_SORT", stringifySort(getSecondarySort() == null ? null : getSecondarySort().getValue()));
    return params;
  }
}
