import { type APIRequestContext, type APIResponse, request as playwrightRequest } from '@playwright/test';

/**
 * Calls the API **as a chosen role and forest client**, so the third level of the SEC-8 suite can
 * assert what the server itself allows — independently of whether the UI ever offers the call.
 *
 * That independence is the point. The GUI and URL levels prove the app does not *offer* a denied
 * action; only this level proves the API *refuses* it. A permission model that is enforced solely in
 * React is not enforced at all — anyone can issue the request by hand, which is exactly what this
 * class does.
 *
 * The role and client travel in the same dev-only headers the frontend mock bridge sends
 * (`X-Mock-Roles` / `X-Mock-Client`, read by the backend `MockRequestFilter`), so the request is
 * authorized through the identical `RolePermissions.expandAuthorities` path a browser request takes —
 * no parallel test-only auth. The filter is wired only in LOCAL/DEV mock mode, so this cannot be
 * pointed at a deployed instance.
 *
 * Note the sentinel: an ABSENT `X-Mock-Roles` header means "default full admin access", so a probe for
 * a roleless user must send the explicit `none` value rather than omitting the header.
 */
export class ApiAccessProbe {
  /** Kept in sync with the frontend `mockRolesHeader.MOCK_ROLES_NONE` / backend `MOCK_ROLES_NONE`. */
  private static readonly NO_ROLES = 'none';

  private constructor(private readonly context: APIRequestContext) {}

  /**
   * Build a probe bound to a role set and forest client set. `roles` empty sends the explicit "no
   * roles" sentinel; `clientNumbers` empty omits the client header, i.e. an internal user.
   *
   * `activeClientNumber` sends `X-Active-Client`, the header the frontend's client switcher uses to
   * name which ONE of a multi-client user's clients the request acts as. It selects within the
   * entitled set and can widen nothing — `ActiveClientResolver` refuses a value the token does not
   * grant rather than falling back to one it does, so that a caller cannot probe which clients are
   * theirs by watching whether the response changed. Omitted means "no switcher selection", which is
   * itself a case worth asserting: the resolver then picks the lowest-numbered entitled client, sorted
   * rather than first-of-set so the default cannot vary between requests.
   */
  static async as(
    baseURL: string,
    roles: string[],
    clientNumbers: string[] = [],
    activeClientNumber?: string,
  ): Promise<ApiAccessProbe> {
    const headers: Record<string, string> = {
      'X-Mock-Roles': roles.length ? roles.join(',') : ApiAccessProbe.NO_ROLES,
    };
    if (clientNumbers.length) {
      headers['X-Mock-Client'] = clientNumbers.join(',');
    }
    if (activeClientNumber) {
      headers['X-Active-Client'] = activeClientNumber;
    }
    const context = await playwrightRequest.newContext({ baseURL, extraHTTPHeaders: headers });
    return new ApiAccessProbe(context);
  }

  /**
   * Issue one request and return only its status. Response bodies are deliberately not returned:
   * every assertion at this level is about reachability, and a suite that also asserted payloads here
   * would duplicate — and drift from — the per-screen suites that already own that.
   *
   * `body` is required for any probe whose refusal is meant to be an AUTHORIZATION outcome, because
   * `@RequiresPermission` is method security — an AOP interceptor around the handler — so request-body
   * binding and bean validation run before it. A body-less `POST`/`PUT` is rejected by the binder with
   * `400` and never reaches the permission check at all, making a "refused" assertion true for every
   * role including one that holds the permission. See `buildWriteProbeBody` for the bodies that reach
   * authorization without being able to mutate anything, and defects.md V5 for the measurement.
   *
   * `DELETE` is the exception: it carries no body, so it reaches the permission check unaided. Its
   * scenario additionally reads the record back, because a refusal reported while the row was deleted
   * anyway is the one outcome a status code cannot see.
   */
  async status(method: string, path: string, body?: unknown): Promise<number> {
    const response: APIResponse = await this.context.fetch(
      path,
      body === undefined ? { method } : { method, data: body },
    );
    return response.status();
  }

  /**
   * A GET's parsed body, for the **data-scoping** assertions only.
   *
   * The no-payloads rule above is about *reachability*: asserting response content there would duplicate
   * the per-screen suites. Scoping is the one axis where the status code cannot carry the evidence — a
   * search that binds the caller's own client answers 200 either way, so the only proof that the server
   * overrode a requested client is *which rows came back*. Without this, `ScaleSiteService`'s
   * "user messed with the form" override could be deleted and the whole suite would stay green.
   *
   * Keep its use to that: rows returned versus rows requested, never field-level payload checks.
   */
  async json<T = unknown>(path: string): Promise<T> {
    const response: APIResponse = await this.context.fetch(path, { method: 'GET' });
    if (!response.ok()) {
      throw new Error(
        `[sec] expected ${path} to succeed so its rows could be scope-checked, got HTTP ${response.status()}`,
      );
    }
    return (await response.json()) as T;
  }

  async dispose(): Promise<void> {
    await this.context.dispose();
  }
}
