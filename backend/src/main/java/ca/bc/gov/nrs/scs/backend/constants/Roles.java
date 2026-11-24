package ca.bc.gov.nrs.scs.backend.constants;

import java.util.List;
import java.util.Set;

/**
 * Defines application-wide role constants to avoid using hardcoded strings.
 * This prevents typos and centralizes role management.
 */
public final class Roles {

    private Roles() {
        // Private constructor to prevent instantiation
    }

    /**
     * System administrator. Currently the only role granted full access across the
     * portal and API; the remaining defined roles currently grant welcome-page access only.
     */
    public static final String SCS_SYS_ADMIN = "SCS_SYS_ADMIN";

    public static final String SCS_DIST_SCALING_MANAGER = "SCS_DIST_SCALING_MANAGER";
    public static final String SCS_REGIONAL_SCALING_MANAGER = "SCS_REGIONAL_SCALING_MANAGER";
    public static final String SCS_CHECK_SCALER = "SCS_CHECK_SCALER";
    public static final String SCS_CE_TECHNICIAN = "SCS_CE_TECHNICIAN";
    public static final String SCS_BRANCH_SYS_SUPPORT = "SCS_BRANCH_SYS_SUPPORT";
    public static final String SCS_CLERICAL = "SCS_CLERICAL";
    // External industry-scaler role; delivered client-scoped as SCS_INDUSTRY_SCALER_<clientNumber>
    public static final String SCS_INDUSTRY_SCALER = "SCS_INDUSTRY_SCALER";
    // External scale-site owner role; delivered client-scoped as SCS_OWNER_<clientNumber>
    public static final String SCS_OWNER = "SCS_OWNER";
    public static final String SCS_DIST_MANAGER = "SCS_DIST_MANAGER";
    public static final String SCS_REGIONAL_MANAGER = "SCS_REGIONAL_MANAGER";

    /**
     * The external roles FAM delivers forest-client-scoped as {@code <role>_<clientNumber>}. Each is
     * meaningless without a client number: the role says what the user may do, the client number says
     * whose rows they may do it to, and an external user with no client would otherwise fall through
     * to the unrestricted internal scope. So a client-scoped role held without a client number grants
     * <b>no permissions at all</b> — see {@code RolePermissions.expandAuthorities}.
     */
    public static final Set<String> CLIENT_SCOPED_ROLES = Set.of(SCS_INDUSTRY_SCALER, SCS_OWNER);

    /** Whether {@code role} is only meaningful alongside a forest client number. */
    public static boolean isClientScoped(String role) {
        return role != null && CLIENT_SCOPED_ROLES.contains(role);
    }

    /**
     * Every role defined in the system, matched exactly (case-sensitive). Used to authorize the
     * welcome page and its supporting endpoints, which are reachable by any recognized role.
     */
    public static final List<String> ALL_ROLES = List.of(
        SCS_SYS_ADMIN,
        SCS_DIST_SCALING_MANAGER,
        SCS_REGIONAL_SCALING_MANAGER,
        SCS_CHECK_SCALER,
        SCS_CE_TECHNICIAN,
        SCS_BRANCH_SYS_SUPPORT,
        SCS_CLERICAL,
        SCS_INDUSTRY_SCALER,
        SCS_OWNER,
        SCS_DIST_MANAGER,
        SCS_REGIONAL_MANAGER);
}
