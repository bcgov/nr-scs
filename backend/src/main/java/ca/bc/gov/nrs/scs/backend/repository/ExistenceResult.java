package ca.bc.gov.nrs.scs.backend.repository;

public class ExistenceResult {
  private final boolean exists;
  private final String errorMessage;

  public ExistenceResult(boolean exists, String errorMessage) {
    this.exists = exists;
    this.errorMessage = errorMessage;
  }

  public boolean exists() {
    return exists;
  }

  public String getErrorMessage() {
    return errorMessage;
  }
}
