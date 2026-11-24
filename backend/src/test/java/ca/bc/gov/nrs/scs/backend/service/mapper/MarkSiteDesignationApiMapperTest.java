package ca.bc.gov.nrs.scs.backend.service.mapper;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.util.Arrays;
import java.util.List;

import org.junit.jupiter.api.Test;

import ca.bc.gov.nrs.scs.backend.domain.marksitedesignation.MarkSiteDesignationCreateCommand;
import ca.bc.gov.nrs.scs.backend.domain.marksitedesignation.MarkSiteDesignationUpdateCommand;
import ca.bc.gov.nrs.scs.backend.model.MarkSiteDesignationCreateRequest;
import ca.bc.gov.nrs.scs.backend.model.MarkSiteDesignationSpeciesContent;
import ca.bc.gov.nrs.scs.backend.model.MarkSiteDesignationUpdateRequest;
import ca.bc.gov.nrs.scs.backend.model.ScaleAuthConditionRef;

/**
 * Pure mapping/normalization contract for MarkSiteDesignationApiMapper. Locks the list filters the
 * frontend (and the update path) rely on: scale-site upper/blank/dedupe, species null/blank drop, and
 * condition null-class/null-id drop — plus timber-mark upper-casing.
 */
class MarkSiteDesignationApiMapperTest {

  @Test
  void toCreateCommand_normalizesTimberMark_andFiltersDedupesChildCollections() {
    MarkSiteDesignationCreateRequest req = new MarkSiteDesignationCreateRequest()
        .timberMark("es20r4")
        .scaleSites(Arrays.asList("ab1", "AB1", " ", null, "cd2"))
        .addSpeciesContentItem(new MarkSiteDesignationSpeciesContent().scaleSpeciesCode("sp1").contentPercent(50))
        .addSpeciesContentItem(new MarkSiteDesignationSpeciesContent().scaleSpeciesCode(" ").contentPercent(10))
        .addSpeciesContentItem(new MarkSiteDesignationSpeciesContent().scaleSpeciesCode(null).contentPercent(5))
        .addConditionsItem(new ScaleAuthConditionRef().scaleConditionClassCode("msd").scaleAuthConditionId(185L))
        .addConditionsItem(new ScaleAuthConditionRef().scaleConditionClassCode(" ").scaleAuthConditionId(1L))
        .addConditionsItem(new ScaleAuthConditionRef().scaleConditionClassCode("MSD").scaleAuthConditionId(null));

    MarkSiteDesignationCreateCommand cmd = MarkSiteDesignationApiMapper.toCreateCommand(req);

    assertEquals("ES20R4", cmd.timberMark());
    assertEquals(List.of("AB1", "CD2"), cmd.scaleSites()); // uppercased, blank/null dropped, de-duped
    assertEquals(1, cmd.speciesContent().size()); // blank + null species codes dropped
    assertEquals("SP1", cmd.speciesContent().get(0).scaleSpeciesCode());
    assertEquals(1, cmd.conditions().size()); // blank class + null id dropped
    assertEquals("MSD", cmd.conditions().get(0).scaleConditionClassCode());
    assertEquals(Long.valueOf(185L), cmd.conditions().get(0).scaleAuthConditionId());
  }

  @Test
  void toUpdateCommand_appliesTheSameScaleSiteAndConditionFilters() {
    MarkSiteDesignationUpdateRequest req = new MarkSiteDesignationUpdateRequest()
        .scaleSites(Arrays.asList("ab1", "AB1", " ", "cd2"))
        .addConditionsItem(new ScaleAuthConditionRef().scaleConditionClassCode("msd").scaleAuthConditionId(185L))
        .addConditionsItem(new ScaleAuthConditionRef().scaleConditionClassCode(null).scaleAuthConditionId(2L));

    MarkSiteDesignationUpdateCommand cmd = MarkSiteDesignationApiMapper.toUpdateCommand(req);

    assertEquals(List.of("AB1", "CD2"), cmd.scaleSites());
    assertEquals(1, cmd.conditions().size());
    assertEquals("MSD", cmd.conditions().get(0).scaleConditionClassCode());
  }
}
