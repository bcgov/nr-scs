package ca.bc.gov.nrs.scs.backend.model.report;

import static ca.bc.gov.nrs.scs.backend.util.SCSUtils.upperOrNull;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.Map;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class MarkSiteDesignationReportRequest extends ReportRequest {

  @JsonProperty("markOrSite")
  private String markOrSite;

  @JsonProperty("markExemption")
  private String markExemption;

  @JsonProperty("effectiveFrom")
  private LocalDate effectiveFrom;

  @JsonProperty("effectiveTo")
  private LocalDate effectiveTo;

  @JsonProperty("expiryFrom")
  private LocalDate expiryFrom;

  @JsonProperty("expiryTo")
  private LocalDate expiryTo;

  @JsonProperty("siteMark1")
  private String siteMark1;

  @JsonProperty("siteMark2")
  private String siteMark2;

  @JsonProperty("siteMark3")
  private String siteMark3;

  @JsonProperty("siteMark4")
  private String siteMark4;

  @JsonProperty("siteMark5")
  private String siteMark5;

  @JsonProperty("siteMark6")
  private String siteMark6;

  @Override
  public Map<String, String> buildParameters(String requester) {
    Map<String, String> params = new LinkedHashMap<>();
    params.put("P_USERID", normalizeUserId(requester));
    params.put("P_ORG_UNIT_CODE", normalizeForJasper(getRegDist()));
    params.put("P_MARK_SITE", normalizeForJasper(markOrSite));
    params.put("P_MARK_EXEMPTION", normalizeForJasper(markExemption));
    params.put("P_EFFECTIVE_DATE_FROM", formatDate(effectiveFrom));
    params.put("P_EFFECTIVE_DATE_TO", formatDate(effectiveTo));
    params.put("P_EXPIRY_DATE_FROM", formatDate(expiryFrom));
    params.put("P_EXPIRY_DATE_TO", formatDate(expiryTo));
    params.put("P_SM1", normalizeForJasper(upperOrNull(siteMark1)));
    params.put("P_SM2", normalizeForJasper(upperOrNull(siteMark2)));
    params.put("P_SM3", normalizeForJasper(upperOrNull(siteMark3)));
    params.put("P_SM4", normalizeForJasper(upperOrNull(siteMark4)));
    params.put("P_SM5", normalizeForJasper(upperOrNull(siteMark5)));
    params.put("P_SM6", normalizeForJasper(upperOrNull(siteMark6)));
    return params;
  }
}
