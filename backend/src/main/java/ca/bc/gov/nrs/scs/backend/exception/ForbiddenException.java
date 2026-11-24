package ca.bc.gov.nrs.scs.backend.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

/**
 * Access is refused for the authenticated user — mapped to HTTP 403. Used for client-restriction
 * enforcement (an external user reaching data outside their forest client scope, or an unsupported
 * multi-client account) in the {@code { code, message }} error shape.
 */
@ResponseStatus(HttpStatus.FORBIDDEN)
public class ForbiddenException extends RuntimeException {
    public ForbiddenException(String message) {
        super(message);
    }

    public ForbiddenException(String message, Throwable cause) {
        super(message, cause);
    }
}
