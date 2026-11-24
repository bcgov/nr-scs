package ca.bc.gov.nrs.scs.backend.controller;

import ca.bc.gov.nrs.scs.backend.constants.Permissions;
import ca.bc.gov.nrs.scs.backend.security.annotations.RequiresPermission;

import ca.bc.gov.nrs.scs.backend.api.ScalerExamApi;
import ca.bc.gov.nrs.scs.backend.model.ScalerExamDetail;
import ca.bc.gov.nrs.scs.backend.model.ScalerExamRequest;
import ca.bc.gov.nrs.scs.backend.service.ScalerExamService;
import ca.bc.gov.nrs.scs.backend.service.mapper.ScalerExamApiMapper;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class ScalerExamController implements ScalerExamApi {

  private final ScalerExamService scalerExamService;

  public ScalerExamController(ScalerExamService scalerExamService) {
    this.scalerExamService = scalerExamService;
  }

  @Override
  @RequiresPermission(Permissions.SCALER_EXAM_QUERY)
  public ResponseEntity<List<ScalerExamDetail>> getScalerExams(String scalerLicenceNo) {
    return ResponseEntity.ok(scalerExamService.getScalerExams(scalerLicenceNo));
  }

  @Override
  @RequiresPermission(Permissions.SCALER_EXAM_CREATE)
  public ResponseEntity<ScalerExamDetail> createScalerExam(
      String scalerLicenceNo,
      ScalerExamRequest scalerExam
  ) {
    return ResponseEntity.status(HttpStatus.CREATED)
        .body(scalerExamService.createScalerExam(
            scalerLicenceNo, ScalerExamApiMapper.toCommand(scalerExam)));
  }

  @Override
  @RequiresPermission(Permissions.SCALER_EXAM_UPDATE)
  public ResponseEntity<ScalerExamDetail> updateScalerExam(
      String scalerLicenceNo,
      String scalerTrainingTypeId,
      ScalerExamRequest scalerExam
  ) {
    return ResponseEntity.ok(scalerExamService.updateScalerExam(
        scalerLicenceNo, scalerTrainingTypeId, ScalerExamApiMapper.toCommand(scalerExam)));
  }

  @Override
  @RequiresPermission(Permissions.SCALER_EXAM_DELETE)
  public ResponseEntity<Void> deleteScalerExam(String scalerLicenceNo, String scalerTrainingTypeId) {
    scalerExamService.deleteScalerExam(scalerLicenceNo, scalerTrainingTypeId);
    return ResponseEntity.noContent().build();
  }
}
