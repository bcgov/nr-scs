package ca.bc.gov.nrs.scs.backend.service;

import ca.bc.gov.nrs.scs.backend.model.SystemStatus;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

/**
 * Exposes whether the SCS system is currently enabled.
 *
 * <p>This mirrors the legacy WebADE "application status" flag: the enable/disable state is an
 * external, operations-controlled setting resolved at deploy time from the {@code scs.app.enabled}
 * property. It is intentionally NOT stored in the SCS database and there is no in-application control
 * to toggle it, matching how the legacy system worked (the flag lived in the WebADE platform, not the
 * application). When the system is disabled, {@code SystemStatusFilter} blocks non-administrator API
 * access and the frontend renders the "temporarily disabled" interstitial for non-administrators.
 */
@Service
public class SystemStatusService {

    private static final Logger LOGGER = LoggerFactory.getLogger(SystemStatusService.class);

    private final boolean enabled;

    public SystemStatusService(@Value("${scs.app.enabled:true}") boolean enabled) {
        this.enabled = enabled;
        if (enabled) {
            LOGGER.info("SCS system is ENABLED (scs.app.enabled=true).");
        } else {
            LOGGER.warn("SCS system is DISABLED (scs.app.enabled=false). Non-administrator users will "
                + "be routed to the temporarily-disabled interstitial and blocked from the API.");
        }
    }

    /** @return true when the system is enabled and available to all users. */
    public boolean isEnabled() {
        return enabled;
    }

    public SystemStatus getStatus() {
        return new SystemStatus().enabled(enabled);
    }
}
