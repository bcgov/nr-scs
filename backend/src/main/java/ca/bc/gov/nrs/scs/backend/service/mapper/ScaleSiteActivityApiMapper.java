package ca.bc.gov.nrs.scs.backend.service.mapper;

import org.openapitools.jackson.nullable.JsonNullable;

import ca.bc.gov.nrs.scs.backend.domain.scalesite.ScaleSiteActivityRecord;
import ca.bc.gov.nrs.scs.backend.model.ScaleSiteActivitySummary;

public final class ScaleSiteActivityApiMapper {

  private ScaleSiteActivityApiMapper() {}

  public static ScaleSiteActivitySummary toModel(ScaleSiteActivityRecord domain) {
    if (domain == null) return null;
    ScaleSiteActivitySummary model = new ScaleSiteActivitySummary();
    model.setScaleSiteIdNmbr(domain.scaleSiteIdNmbr());
    model.setLastScaleDate(JsonNullable.of(domain.lastScaleDate()));
    model.setNumberOfSamples(JsonNullable.of(domain.numberOfSamples()));
    model.setSampleVolume(JsonNullable.of(domain.sampleVolume()));
    model.setScaledVolume(JsonNullable.of(domain.scaledVolume()));
    return model;
  }
}
