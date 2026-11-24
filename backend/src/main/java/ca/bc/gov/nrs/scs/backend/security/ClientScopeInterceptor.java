package ca.bc.gov.nrs.scs.backend.security;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.util.Map;
import java.util.Set;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;
import org.springframework.web.servlet.HandlerMapping;

/**
 * Refuses a client-restricted (external) caller any record outside their own forest client, for every
 * endpoint addressed by a scaler licence number or scale-site id.
 *
 * <p><b>Why an interceptor.</b> SEC-7 added the per-record guard
 * ({@link SecurityContextUtils#assertClientAccess}) to three service methods, and its review recorded
 * the rest as a latent IDOR that "goes live when the {@code /api} gate opens to external roles" —
 * which is exactly what enabling {@code SCS_INDUSTRY_SCALER} does. Guarding ~34 service methods one
 * at a time would leave the same hole open for every endpoint added later, so the check lives here
 * instead: the URL design is uniform ({@code /api/scalers/{scalerLicenceNo}/…} and
 * {@code /api/scale-sites/{scaleSiteIdNmbr}/…}), so keying on the path variable covers every such
 * endpoint that exists today and every one added tomorrow, with no per-endpoint opt-in to forget.
 * {@code ClientScopeInterceptorTest} pins these variable names against the OpenAPI spec so a new
 * naming convention cannot quietly escape the guard.
 *
 * <p><b>Cost.</b> Nothing happens unless the caller is client-restricted — internal (IDIR) users take
 * an {@code instanceof} check and nothing more. For an external user, a record their own client owns
 * costs one indexed single-row lookup. A record it does not own costs the role's bridge on top, and
 * only then:
 * <ul>
 *   <li>a site an {@link ca.bc.gov.nrs.scs.backend.constants.Roles#SCS_INDUSTRY_SCALER} does not own —
 *       every licence number of the client and every authorization row for the site, intersected in
 *       Java;</li>
 *   <li>a scaler an {@link ca.bc.gov.nrs.scs.backend.constants.Roles#SCS_OWNER} does not employ — every
 *       authorization the scaler holds, then one indexed lookup per distinct site it names, stopping at
 *       the first the client owns.</li>
 * </ul>
 * Both scale with authorization history rather than being single rows — acceptable because there are on
 * the order of twenty such accounts, but not free. Neither bridge is reached by the other's role.
 *
 * <p><b>Deliberate 403-before-404.</b> A restricted caller asking for an id that does not exist gets
 * 403, not 404, because the lookup runs before the handler. That is intentional: an external user has
 * no business distinguishing "another client's record" from "no such record", and collapsing the two
 * removes an existence oracle over the whole scaler/site keyspace. Internal users are unaffected and
 * still get 404. The service-level guards SEC-7 added stay in place as defence in depth — they also
 * cover callers that do not arrive over HTTP.
 */
@Component
public class ClientScopeInterceptor implements HandlerInterceptor {

  /** Path variable naming a scaler; every scaler-scoped endpoint uses this name. */
  static final String SCALER_LICENCE_NO = "scalerLicenceNo";

  /** Path variable naming a scale site; every site-scoped endpoint uses this name. */
  static final String SCALE_SITE_ID_NMBR = "scaleSiteIdNmbr";

  /**
   * The record-identifying path variables this interceptor understands. Exposed so
   * {@code ClientScopeInterceptorTest} can assert it covers every id variable the OpenAPI spec uses
   * directly under {@code /scalers/} or {@code /scale-sites/}.
   */
  static final Set<String> SCOPED_PATH_VARIABLES = Set.of(SCALER_LICENCE_NO, SCALE_SITE_ID_NMBR);

  private final ClientScopeGuard guard;

  public ClientScopeInterceptor(ClientScopeGuard guard) {
    this.guard = guard;
  }

  @Override
  public boolean preHandle(
      @NonNull HttpServletRequest request,
      @NonNull HttpServletResponse response,
      @NonNull Object handler) {

    // Cheapest possible exit for the common case: internal users are never scoped.
    if (!SecurityContextUtils.isClientRestricted()) {
      return true;
    }

    Map<String, String> pathVariables = uriTemplateVariables(request);

    String scalerLicenceNo = pathVariables.get(SCALER_LICENCE_NO);
    if (scalerLicenceNo != null) {
      guard.assertScalerInScope(scalerLicenceNo);
    }

    String scaleSiteIdNmbr = pathVariables.get(SCALE_SITE_ID_NMBR);
    if (scaleSiteIdNmbr != null) {
      guard.assertScaleSiteInScope(scaleSiteIdNmbr);
    }

    return true;
  }

  @SuppressWarnings("unchecked")
  private static Map<String, String> uriTemplateVariables(HttpServletRequest request) {
    Object attribute = request.getAttribute(HandlerMapping.URI_TEMPLATE_VARIABLES_ATTRIBUTE);
    return attribute instanceof Map<?, ?> map ? (Map<String, String>) map : Map.of();
  }
}
