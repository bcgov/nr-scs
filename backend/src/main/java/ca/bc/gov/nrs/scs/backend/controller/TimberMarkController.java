package ca.bc.gov.nrs.scs.backend.controller;

import ca.bc.gov.nrs.scs.backend.api.TimberMarkApi;
import ca.bc.gov.nrs.scs.backend.constants.Permissions;
import ca.bc.gov.nrs.scs.backend.model.TimberMarkExistsResponse;
import ca.bc.gov.nrs.scs.backend.ratelimit.RateLimitCategory;
import ca.bc.gov.nrs.scs.backend.ratelimit.RateLimited;
import ca.bc.gov.nrs.scs.backend.security.annotations.RequiresPermission;
import ca.bc.gov.nrs.scs.backend.service.TimberMarkService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;

/**
 * Timber-mark existence lookup for the Mark Site Designation and Designated Marks Exception report screens,
 * which flag an unknown mark against its field before submitting (the report endpoints enforce the same
 * rule server-side).
 *
 * <p>Gated on {@link Permissions#REPORT_READ} — the permission of the only screens that call it — rather
 * than {@link Permissions#MSD_QUERY}, which the haul-mark-authorization search the screens used before
 * requires: a timber mark's existence is report-form validation here, not an MSD query.
 */
@RestController
public class TimberMarkController implements TimberMarkApi {

  private final TimberMarkService service;

  public TimberMarkController(TimberMarkService service) {
    this.service = service;
  }

  @RateLimited(RateLimitCategory.SEARCH)
  @Override
  @RequiresPermission(Permissions.REPORT_READ)
  public ResponseEntity<TimberMarkExistsResponse> timberMarkExists(String timberMark) {
    return ResponseEntity.ok(new TimberMarkExistsResponse(timberMark, service.timberMarkExists(timberMark)));
  }
}
