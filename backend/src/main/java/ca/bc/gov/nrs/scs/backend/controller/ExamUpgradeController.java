package ca.bc.gov.nrs.scs.backend.controller;

import ca.bc.gov.nrs.scs.backend.constants.Permissions;
import ca.bc.gov.nrs.scs.backend.security.annotations.RequiresPermission;

import ca.bc.gov.nrs.scs.backend.api.ExamUpgradeApi;
import ca.bc.gov.nrs.scs.backend.model.ExamUpgrade;
import ca.bc.gov.nrs.scs.backend.model.ExamUpgradeCreateRequest;
import ca.bc.gov.nrs.scs.backend.model.ExamUpgradeUpdateRequest;
import ca.bc.gov.nrs.scs.backend.service.ExamUpgradeService;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class ExamUpgradeController implements ExamUpgradeApi {
    private final ExamUpgradeService examUpgradeService;

    public ExamUpgradeController(ExamUpgradeService examUpgradeService) {
        this.examUpgradeService = examUpgradeService;
    }

    @Override
    @RequiresPermission(Permissions.MAINTAIN_EXAM_UPGRADES_QUERY)
    public ResponseEntity<List<ExamUpgrade>> listExamUpgrades(
            @RequestParam(value = "classCode", required = false) String classCode) {
        return ResponseEntity.ok(examUpgradeService.getAllExamUpgrades(classCode));
    }

    @Override
    @RequiresPermission(Permissions.MAINTAIN_EXAM_UPGRADES_READ)
    public ResponseEntity<ExamUpgrade> getExamUpgrade(
            String classCode,
            String typeId) {
        return ResponseEntity.ok(examUpgradeService.getExamUpgrade(classCode, typeId));
    }

    @Override
    @RequiresPermission(Permissions.MAINTAIN_EXAM_UPGRADES_CREATE)
    public ResponseEntity<ExamUpgrade> createExamUpgrade(
            @RequestBody ExamUpgradeCreateRequest request) {
        ExamUpgrade created = examUpgradeService.createExamUpgrade(request);
        return new ResponseEntity<>(created, HttpStatus.CREATED);
    }

    @Override
    @RequiresPermission(Permissions.MAINTAIN_EXAM_UPGRADES_UPDATE)
    public ResponseEntity<ExamUpgrade> updateExamUpgrade(
            String classCode,
            String typeId,
            @RequestBody ExamUpgradeUpdateRequest request) {
        ExamUpgrade updated = examUpgradeService.updateExamUpgrade(classCode, typeId, request);
        return ResponseEntity.ok(updated);
    }

    @Override
    @RequiresPermission(Permissions.MAINTAIN_EXAM_UPGRADES_DELETE)
    public ResponseEntity<Void> deleteExamUpgrade(
            String classCode,
            String typeId) {
        examUpgradeService.deleteExamUpgrade(classCode, typeId);
        return ResponseEntity.noContent().build();
    }
}
