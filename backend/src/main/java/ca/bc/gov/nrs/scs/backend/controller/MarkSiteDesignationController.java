package ca.bc.gov.nrs.scs.backend.controller;

import ca.bc.gov.nrs.scs.backend.constants.Permissions;
import ca.bc.gov.nrs.scs.backend.security.annotations.RequiresPermission;

import java.util.List;

import org.springframework.core.io.Resource;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import ca.bc.gov.nrs.scs.backend.api.MarkSiteDesignationApi;
import ca.bc.gov.nrs.scs.backend.model.MarkSiteDesignationCreateRequest;
import ca.bc.gov.nrs.scs.backend.model.MarkSiteDesignationCreateResponse;
import ca.bc.gov.nrs.scs.backend.model.MarkSiteDesignationDetail;
import ca.bc.gov.nrs.scs.backend.model.MarkSiteDesignationLetterReportRequest;
import ca.bc.gov.nrs.scs.backend.model.MarkSiteDesignationSearchResult;
import ca.bc.gov.nrs.scs.backend.model.MarkSiteDesignationTimberMarkLookup;
import ca.bc.gov.nrs.scs.backend.model.MarkSiteDesignationUpdateRequest;
import ca.bc.gov.nrs.scs.backend.ratelimit.RateLimitCategory;
import ca.bc.gov.nrs.scs.backend.ratelimit.RateLimited;
import ca.bc.gov.nrs.scs.backend.service.LetterService;
import ca.bc.gov.nrs.scs.backend.service.MarkSiteDesignationService;
import ca.bc.gov.nrs.scs.backend.service.mapper.MarkSiteDesignationApiMapper;

@RestController
public class MarkSiteDesignationController implements MarkSiteDesignationApi {

  private final MarkSiteDesignationService service;
  private final LetterService letterService;

  public MarkSiteDesignationController(
      MarkSiteDesignationService service,
      LetterService letterService) {
    this.service = service;
    this.letterService = letterService;
  }

  @Override
  @RequiresPermission(Permissions.MSD_QUERY)
  public ResponseEntity<MarkSiteDesignationTimberMarkLookup> getMarkSiteDesignationTimberMarkLookup(
      @RequestParam(value = "timberMark") String timberMark) {

    return ResponseEntity.ok(service.lookupTimberMarkHolder(timberMark));
  }

  @Override
  @RequiresPermission(Permissions.MSD_CREATE)
  public ResponseEntity<MarkSiteDesignationCreateResponse> createMarkSiteDesignation(
      @RequestBody MarkSiteDesignationCreateRequest request) {

    Long id = service.createMarkSiteDesignation(MarkSiteDesignationApiMapper.toCreateCommand(request));
    return ResponseEntity.status(HttpStatus.CREATED)
        .body(MarkSiteDesignationApiMapper.toCreateResponse(id));
  }

  @Override
  @RequiresPermission(Permissions.MSD_READ)
  public ResponseEntity<MarkSiteDesignationDetail> getMarkSiteDesignation(
      Long authorizationId) {

    return ResponseEntity.ok(service.getMarkSiteDesignation(authorizationId));
  }

  @RateLimited(RateLimitCategory.SEARCH)
  @Override
  @RequiresPermission(Permissions.MSD_QUERY)
  public ResponseEntity<List<MarkSiteDesignationSearchResult>> searchMarkSiteDesignationsByTimberMark(
      @RequestParam(value = "timberMark") String timberMark) {
    return ResponseEntity.ok(service.searchMarkSiteDesignationsByTimberMark(timberMark));
  }

  @Override
  @RequiresPermission(Permissions.MSD_UPDATE)
  public ResponseEntity<MarkSiteDesignationDetail> updateMarkSiteDesignation(
      Long authorizationId,
      @RequestBody MarkSiteDesignationUpdateRequest markSiteDesignationUpdateRequest) {
    return ResponseEntity.ok(service.updateMarkSiteDesignation(
        authorizationId, MarkSiteDesignationApiMapper.toUpdateCommand(markSiteDesignationUpdateRequest)));
  }


  @Override
  @RequiresPermission(Permissions.WORKBENCH_UPDATE)
  public ResponseEntity<Void> removeMarkSiteDesignationFromWorkbench(
      Long authorizationId) {
    service.removeMarkSiteDesignationFromWorkbench(authorizationId);
    return ResponseEntity.noContent().build();
  }

  @Override
  @RequiresPermission(Permissions.MSD_LETTER_CREATE)
  public ResponseEntity<Resource> createMarkSiteDesignationLetter(
      Long authorizationId,
      @RequestBody MarkSiteDesignationLetterReportRequest request) {
    return letterService.createMarkSiteDesignationLetter(authorizationId, request);
  }

  @Override
  @RequiresPermission(Permissions.MSD_LETTER_VIEW)
  public ResponseEntity<Resource> getMarkSiteDesignationLetter(
      Long authorizationId) {
    return letterService.viewMarkSiteDesignationLetter(authorizationId);
  }
}
