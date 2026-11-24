package ca.bc.gov.nrs.scs.backend.domain.shared;

/** A single {@code ORG_UNIT} row: its number, code, and name. */
public record OrgUnitRecord(Long orgUnitNo, String orgUnitCode, String orgUnitName) {}
