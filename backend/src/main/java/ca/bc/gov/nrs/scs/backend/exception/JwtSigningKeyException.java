package ca.bc.gov.nrs.scs.backend.exception;

public class JwtSigningKeyException extends RuntimeException {
    public JwtSigningKeyException(String message, Throwable cause) {
        super(message, cause);
    }
}
