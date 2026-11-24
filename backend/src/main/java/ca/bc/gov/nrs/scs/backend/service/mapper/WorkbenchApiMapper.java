package ca.bc.gov.nrs.scs.backend.service.mapper;

import ca.bc.gov.nrs.scs.backend.domain.workbench.MarkSiteDesignationWorkbenchEntry;
import ca.bc.gov.nrs.scs.backend.model.MarkSiteDesignationWorkbenchResult;
import ca.bc.gov.nrs.scs.backend.util.SCSUtils;

/** Maps workbench-grid domain rows to their generated API models. */
public final class WorkbenchApiMapper {

  private WorkbenchApiMapper() {}

  public static MarkSiteDesignationWorkbenchResult toMarkSiteDesignationWorkbenchResult(MarkSiteDesignationWorkbenchEntry e) {
    MarkSiteDesignationWorkbenchResult result = new MarkSiteDesignationWorkbenchResult();
    result.setHaulingMarkAuthorizationId(SCSUtils.toNullable(e.haulingMarkAuthorizationId()));
    result.setEffectiveDate(SCSUtils.toNullable(e.effectiveDate()));
    result.setExpiryDate(SCSUtils.toNullable(e.expiryDate()));
    result.setTimberMark(SCSUtils.toNullable(e.timberMark()));
    result.setRegionId(SCSUtils.toNullable(e.regionId()));
    result.setDistrictId(SCSUtils.toNullable(e.districtId()));
    return result;
  }
}
