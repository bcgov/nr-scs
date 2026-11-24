package ca.bc.gov.nrs.scs.backend.domain.scalesite;

public record ScaleSiteTombstoneRecord(
    String scaleSiteIdNmbr,
    String siteName,
    String regionName,
    String districtName) {}
