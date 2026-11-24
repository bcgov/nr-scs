package ca.bc.gov.nrs.scs.backend.domain.marksitedesignation;

import java.time.LocalDate;
import java.util.List;

public record MarkSiteDesignationUpdateCommand(
    String geographicLocation,
    String population,
    LocalDate effectiveDate,
    LocalDate expiryDate,
    Long orgUnitNo,
    String districtWideInd,
    Integer estimatedVolume,
    Integer estimatedTruckLoads,
    String timberDescription,
    String transportationDateDesc,
    String otherRequirements,
    List<String> scaleSites,
    List<MarkSiteDesignationSpeciesContentInput> speciesContent,
    List<MarkSiteDesignationConditionRef> conditions,
    List<String> exceptions) {}
