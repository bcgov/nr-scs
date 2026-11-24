package ca.bc.gov.nrs.scs.backend.exception;

public class UnprocessableEntityException extends RuntimeException {

  public UnprocessableEntityException(String message) {
    super(message);
  }
}

