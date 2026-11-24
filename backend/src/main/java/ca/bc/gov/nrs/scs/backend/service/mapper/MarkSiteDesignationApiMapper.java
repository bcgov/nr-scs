package ca.bc.gov.nrs.scs.backend.service.mapper;

import java.util.List;

import ca.bc.gov.nrs.scs.backend.domain.marksitedesignation.HaulingMarkAuthorizationDetail;
import ca.bc.gov.nrs.scs.backend.domain.marksitedesignation.MarkSiteDesignationConditionRef;
import ca.bc.gov.nrs.scs.backend.domain.marksitedesignation.MarkSiteDesignationCreateCommand;
import ca.bc.gov.nrs.scs.backend.domain.marksitedesignation.MarkSiteDesignationSpeciesContentInput;
import ca.bc.gov.nrs.scs.backend.domain.marksitedesignation.MarkSiteDesignationTimberMarkHolder;
import ca.bc.gov.nrs.scs.backend.domain.marksitedesignation.MarkSiteDesignationUpdateCommand;
import ca.bc.gov.nrs.scs.backend.model.MarkSiteDesignationCreateRequest;
import ca.bc.gov.nrs.scs.backend.model.MarkSiteDesignationCreateResponse;
import ca.bc.gov.nrs.scs.backend.model.MarkSiteDesignationDetail;
import ca.bc.gov.nrs.scs.backend.model.MarkSiteDesignationScaleSite;
import ca.bc.gov.nrs.scs.backend.model.MarkSiteDesignationSearchResult;
import ca.bc.gov.nrs.scs.backend.model.MarkSiteDesignationSpeciesContent;
import ca.bc.gov.nrs.scs.backend.model.MarkSiteDesignationTimberMarkLookup;
import ca.bc.gov.nrs.scs.backend.model.MarkSiteDesignationUpdateRequest;
import ca.bc.gov.nrs.scs.backend.model.ScaleAuthCondition;
import ca.bc.gov.nrs.scs.backend.model.ScaleAuthConditionRef;
import ca.bc.gov.nrs.scs.backend.util.SCSUtils;

public final class MarkSiteDesignationApiMapper {

  private MarkSiteDesignationApiMapper() {}

  public static MarkSiteDesignationCreateCommand toCreateCommand(MarkSiteDesignationCreateRequest req) {
    List<String> scaleSites = req.getScaleSites() == null ? List.of() : req.getScaleSites().stream()
        .map(SCSUtils::upperOrNull)
        .filter(value -> value != null && !value.isBlank())
        .distinct()
        .toList();

    List<MarkSiteDesignationSpeciesContentInput> speciesContent = req.getSpeciesContent() == null ? List.of()
        : req.getSpeciesContent().stream()
            .map(row -> new MarkSiteDesignationSpeciesContentInput(
                SCSUtils.upperOrNull(SCSUtils.getNullable(row.getScaleSpeciesCode())),
                SCSUtils.getNullable(row.getContentPercent())))
            .filter(row -> row.scaleSpeciesCode() != null && !row.scaleSpeciesCode().isBlank())
            .toList();

    List<MarkSiteDesignationConditionRef> conditions = req.getConditions() == null ? List.of()
        : req.getConditions().stream()
            .map(ref -> new MarkSiteDesignationConditionRef(
                SCSUtils.upperOrNull(ref.getScaleConditionClassCode()),
                ref.getScaleAuthConditionId()))
            .filter(ref -> ref.scaleConditionClassCode() != null
                && !ref.scaleConditionClassCode().isBlank()
                && ref.scaleAuthConditionId() != null)
            .toList();

    List<String> exceptions = normalizeCodeList(req.getExceptions());

    return new MarkSiteDesignationCreateCommand(
        SCSUtils.upperOrNull(req.getTimberMark()),
        SCSUtils.trimToNull(SCSUtils.getNullable(req.getGeographicLocation())),
        SCSUtils.upperOrNull(SCSUtils.getNullable(req.getPopulation())),
        req.getEffectiveDate(),
        req.getExpiryDate(),
        req.getOrgUnitNo(),
        req.getDistrictWideInd(),
        SCSUtils.getNullable(req.getEstimatedVolume()),
        SCSUtils.getNullable(req.getEstimatedTruckLoads()),
        SCSUtils.trimToNull(SCSUtils.getNullable(req.getTimberDescription())),
        SCSUtils.trimToNull(SCSUtils.getNullable(req.getTransportationDateDesc())),
        SCSUtils.trimToNull(SCSUtils.getNullable(req.getOtherRequirements())),
        scaleSites,
        speciesContent,
        conditions,
        exceptions);
  }

  /** Uppercases, trims out blanks, and de-duplicates a list of LOV codes (e.g. exempt mark method codes). */
  private static List<String> normalizeCodeList(List<String> raw) {
    return raw == null ? List.of() : raw.stream()
        .map(SCSUtils::upperOrNull)
        .filter(value -> value != null && !value.isBlank())
        .distinct()
        .toList();
  }

  public static MarkSiteDesignationDetail toDetail(
      HaulingMarkAuthorizationDetail detail,
      MarkSiteDesignationTimberMarkHolder holder,
      List<MarkSiteDesignationScaleSite> scaleSites,
      List<MarkSiteDesignationSpeciesContent> speciesContent,
      List<ScaleAuthCondition> conditions,
      List<String> exceptions,
      boolean letterExists) {
    MarkSiteDesignationDetail response = new MarkSiteDesignationDetail()
        .haulingMarkAuthorizationId(detail.id())
        .timberMark(detail.timberMark())
        .markHolderClient(holder == null ? null : holder.markHolderClient())
        .markHolderLoc(holder == null ? null : holder.markHolderLoc())
        .markHolderName(holder == null ? null : holder.markHolderName())
        .markStatus(holder == null ? null : holder.markStatus())
        .geographicLocation(detail.timberGeographicLocation())
        .population(detail.populationNumber())
        .effectiveDate(detail.effectiveDate())
        .expiryDate(detail.expiryDate())
        .estimatedVolume(detail.estimatedVolume())
        .estimatedTruckLoads(detail.estimatedTruckLoadNo())
        .timberDescription(detail.timberDescriptionTxt())
        .transportationDateDesc(detail.transportationDateDesc())
        .otherRequirements(detail.otherRequirementsTxt())
        .orgUnitNo(detail.orgUnitNo())
        .districtWideInd(detail.districtWideInd())
        .letterExists(letterExists)
        .entryTimestamp(detail.entryTimestamp())
        .entryUserid(detail.entryUserid())
        .updateTimestamp(detail.updateTimestamp())
        .updateUserid(detail.updateUserid())
        .revisionCount(detail.revisionCount());
    response.setScaleSites(scaleSites == null ? List.of() : scaleSites);
    response.setSpeciesContent(speciesContent == null ? List.of() : speciesContent);
    response.setConditions(conditions == null ? List.of() : conditions);
    response.setExceptions(exceptions == null ? List.of() : exceptions);
    return response;
  }

  public static MarkSiteDesignationTimberMarkLookup toMarkSiteDesignationTimberMarkLookup(MarkSiteDesignationTimberMarkHolder h) {
    return new MarkSiteDesignationTimberMarkLookup()
        .timberMark(h.timberMark())
        .markHolderClient(h.markHolderClient())
        .markHolderLoc(h.markHolderLoc())
        .markHolderName(h.markHolderName())
        .markStatus(h.markStatus());
  }

  public static MarkSiteDesignationCreateResponse toCreateResponse(Long authorizationId) {
    return new MarkSiteDesignationCreateResponse().haulingMarkAuthorizationId(authorizationId);
  }

  public static MarkSiteDesignationUpdateCommand toUpdateCommand(MarkSiteDesignationUpdateRequest req) {
    List<String> rawScaleSites = SCSUtils.getNullable(req.getScaleSites());
    List<String> scaleSites = rawScaleSites == null ? List.of() : rawScaleSites.stream()
        .map(SCSUtils::upperOrNull)
        .filter(value -> value != null && !value.isBlank())
        .distinct()
        .toList();

    List<MarkSiteDesignationSpeciesContent> rawSpeciesContent = SCSUtils.getNullable(req.getSpeciesContent());
    List<MarkSiteDesignationSpeciesContentInput> speciesContent = rawSpeciesContent == null ? List.of()
        : rawSpeciesContent.stream()
            .map(row -> new MarkSiteDesignationSpeciesContentInput(
                SCSUtils.upperOrNull(SCSUtils.getNullable(row.getScaleSpeciesCode())),
                SCSUtils.getNullable(row.getContentPercent())))
            .filter(row -> row.scaleSpeciesCode() != null && !row.scaleSpeciesCode().isBlank())
            .toList();

    List<ScaleAuthConditionRef> rawConditions = SCSUtils.getNullable(req.getConditions());
    List<MarkSiteDesignationConditionRef> conditions = rawConditions == null ? List.of()
        : rawConditions.stream()
            .map(ref -> new MarkSiteDesignationConditionRef(
                SCSUtils.upperOrNull(ref.getScaleConditionClassCode()),
                ref.getScaleAuthConditionId()))
            .filter(ref -> ref.scaleConditionClassCode() != null
                && !ref.scaleConditionClassCode().isBlank()
                && ref.scaleAuthConditionId() != null)
            .toList();

    List<String> exceptions = normalizeCodeList(SCSUtils.getNullable(req.getExceptions()));

    return new MarkSiteDesignationUpdateCommand(
        SCSUtils.trimToNull(SCSUtils.getNullable(req.getGeographicLocation())),
        SCSUtils.upperOrNull(SCSUtils.getNullable(req.getPopulation())),
        req.getEffectiveDate(),
        req.getExpiryDate(),
        SCSUtils.getNullable(req.getOrgUnitNo()),
        SCSUtils.getNullable(req.getDistrictWideInd()),
        SCSUtils.getNullable(req.getEstimatedVolume()),
        SCSUtils.getNullable(req.getEstimatedTruckLoads()),
        SCSUtils.trimToNull(SCSUtils.getNullable(req.getTimberDescription())),
        SCSUtils.trimToNull(SCSUtils.getNullable(req.getTransportationDateDesc())),
        SCSUtils.trimToNull(SCSUtils.getNullable(req.getOtherRequirements())),
        scaleSites,
        speciesContent,
        conditions,
        exceptions);
  }

  public static MarkSiteDesignationSearchResult toSearchResult(
      ca.bc.gov.nrs.scs.backend.domain.marksitedesignation.MarkSiteDesignationSearchResult domain) {
    if (domain == null) return null;
    MarkSiteDesignationSearchResult result = new MarkSiteDesignationSearchResult();
    result.setHaulingMarkAuthorizationId(domain.haulingMarkAuthorizationId());
    result.setTimberMark(domain.timberMark());
    result.setEffectiveDate(domain.effectiveDate());
    result.setExpiryDate(domain.expiryDate());
    result.setOrgUnitName(domain.orgUnitName());
    return result;
  }

  public static List<MarkSiteDesignationSearchResult> toSearchResults(
      List<ca.bc.gov.nrs.scs.backend.domain.marksitedesignation.MarkSiteDesignationSearchResult> domains) {
    if (domains == null) return List.of();
    return domains.stream().map(MarkSiteDesignationApiMapper::toSearchResult).toList();
  }

}
