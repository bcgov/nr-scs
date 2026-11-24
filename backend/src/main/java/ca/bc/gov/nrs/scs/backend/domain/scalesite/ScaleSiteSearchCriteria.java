package ca.bc.gov.nrs.scs.backend.domain.scalesite;

import java.util.List;

public record ScaleSiteSearchCriteria(
    String scaleSiteIdNmbr,
    Long orgUnitNo,
    String siteName,
    String ownerClientNumber,
    String ownerClientLocnCode,
    List<String> methodTypes,
    Integer primarySort,
    Integer secondarySort) {}
