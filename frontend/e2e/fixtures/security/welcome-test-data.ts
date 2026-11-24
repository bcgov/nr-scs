/**
 * Anchors for the welcome / landing suite (Epic SEC story SEC-1 / UC-SYS-004).
 *
 * Provenance: every value verified 2026-09-04 against the seeded Docker DB image through the running
 * backend; the probes are quoted inline. Real extracted data — re-verify on a re-extract.
 */

export const SYS_ADMIN_ROLE = 'SCS_SYS_ADMIN';
export const SCALE_SITE_OWNER_ROLE = 'SCS_OWNER';
export const INDUSTRY_SCALER_ROLE = 'SCS_INDUSTRY_SCALER';

/** The key the welcome message is stored under. Matches `admin/maintenance/system-setting-test-data`. */
export const WMSG_KEY = 'WMSG';

// ---------------------------------------------------------------- Organization: the three shapes

/**
 * An external client that RESOLVES to a company name — the acceptance criterion's happy path.
 *
 * `SCS_OWNER` + client `00001009`. Probed: `GET /api/welcome` with `X-Mock-Roles: SCS_OWNER` and
 * `X-Mock-Client: 00001009` → `userOrganization: "AINSWORTH LUMBER CO. LTD. - 00001009"`, and
 * `select company_name from scs_client_vw where client_number='00001009'` →
 * `AINSWORTH LUMBER CO. LTD.`.
 */
export const ownerClientNumber = '00001009';
export const expectedOwnerOrganization = 'AINSWORTH LUMBER CO. LTD. - 00001009';

/**
 * An external client that does NOT resolve — the documented fallback, and the reason this pair exists.
 *
 * `SCS_INDUSTRY_SCALER` + client `00048273` (the industry-scaler suite's own anchor) →
 * `userOrganization: "00048273"`, the bare number. Not a bug: `WelcomeService.resolveClientOrganization`
 * falls back to the client number when `ClientRepository.findCompanyName` finds nothing, and this client
 * is genuinely absent from `SCS_CLIENT_VW` — `select … where client_number='00048273'` returns no rows
 * against a view that holds 1550. The SCS display views are lossy by design; a client's presence in
 * `THE.CLIENT` does not put it in the supported view.
 *
 * **Asserting the pair is what makes either half mean anything.** The resolved case alone would pass on
 * a build that always echoed a name; the fallback alone would pass on a build that never resolved one.
 */
export const unresolvableClientNumber = '00048273';
export const expectedFallbackOrganization = '00048273';

/**
 * What an INTERNAL user's Organization row renders: nothing.
 *
 * `WelcomeService` resolves an internal user's org unit from the `orgUnitNo` REQUEST PARAMETER, and
 * `WelcomeService.getWelcomeSummary` is called by the frontend with no such argument
 * (`API.welcome.getWelcomeSummary(token)`), so `resolveUserOrganization(null)` returns null and the cell
 * renders empty. Probed both ways: `/api/welcome` (no param) omits `userOrganization` entirely, while
 * `/api/welcome?orgUnitNo=1` answers `"RVA - OBSOLETE - Vancouver Forest Region (RCO)"` — so the
 * capability is built and simply never invoked.
 *
 * This is a divergence from UC-SYS-004's stated goal ("view the current system message **and user
 * org-unit**") and is recorded as `defects.md` D1. Pinned as the CURRENT behaviour so it flips red the
 * day the frontend starts passing an org unit.
 */
export const expectedInternalOrganization = '';

// ---------------------------------------------------------------- Current News: the sanitizer

/**
 * The `window` property an injected payload sets if it executes, and `WelcomePage` arms and reads.
 *
 * **Exported from here, and imported by the page object, on purpose.** It appeared in two places while
 * this suite was being written — once in each payload below, once in the page object — and that is a
 * silent-false-green waiting to happen: rename it on one side and every payload stops being detectable
 * while every scenario stays green, because "nothing executed" is exactly what a payload that sets an
 * unwatched property looks like. One constant, interpolated into the payloads, removes the possibility.
 */
export const XSS_WITNESS = '__scsXssWitness';

/**
 * Stored-HTML payloads for the Current News sanitization sweep.
 *
 * **Why this is a security test and not a formatting one.** Current News is authored by one role
 * (`ADM`, through `/maintenance/system`) and rendered to EVERY role on the page they all land on, via
 * `dangerouslySetInnerHTML`. `WelcomeService` stores and returns the value untouched — there is no
 * server-side sanitizer anywhere on the path — so a single `DOMPurify.sanitize()` call in
 * `pages/Landing/index.tsx` is the entire defence for a stored-XSS surface.
 *
 * Each payload carries a distinct BENIGN MARKER as well as its attack. The marker is what makes a green
 * result meaningful: "no script ran" is also true of a sanitizer that discarded the whole value, or of a
 * page that rendered nothing at all. Asserting the marker survived proves the news was rendered and the
 * attack specifically removed.
 */
export type NewsPayload = {
  /** The name used in the Gherkin. */
  readonly attack: string;
  /** The stored value, as an administrator could type it into the Current News field. */
  readonly stored: string;
  /** Text that must SURVIVE, so a blanket-strip cannot pass as sanitization. */
  readonly marker: string;
  /** Tag that must NOT survive, lower-case. Omitted when the attack is attribute-only. */
  readonly forbiddenTag?: string;
  /** Attribute that must NOT survive, lower-case. */
  readonly forbiddenAttribute?: string;
};

export const NEWS_PAYLOADS: readonly NewsPayload[] = [
  {
    attack: 'an inline script',
    stored: `<p>Scaling notice ONE</p><script>window.${XSS_WITNESS}=true</script>`,
    marker: 'Scaling notice ONE',
    forbiddenTag: 'script',
  },
  {
    attack: 'an image error handler',
    stored: `<p>Scaling notice TWO</p><img src="x" onerror="window.${XSS_WITNESS}=true">`,
    marker: 'Scaling notice TWO',
    forbiddenAttribute: 'onerror',
  },
  {
    attack: 'an SVG load handler',
    stored: `<p>Scaling notice THREE</p><svg onload="window.${XSS_WITNESS}=true"></svg>`,
    marker: 'Scaling notice THREE',
    forbiddenAttribute: 'onload',
  },
  {
    attack: 'an iframe',
    stored: '<p>Scaling notice FOUR</p><iframe src="https://example.invalid/"></iframe>',
    marker: 'Scaling notice FOUR',
    forbiddenTag: 'iframe',
  },
] as const;

export const newsPayloadFor = (attack: string): NewsPayload => {
  const payload = NEWS_PAYLOADS.find((p) => p.attack === attack);
  if (!payload) {
    throw new Error(
      `[sec] no news payload named "${attack}" — known payloads: ` +
        `${NEWS_PAYLOADS.map((p) => p.attack).join(', ')}`,
    );
  }
  return payload;
};

/**
 * The payload the END-TO-END scenario writes to the real setting row.
 *
 * Deliberately different from every stubbed payload above: it is the one value that travels the whole
 * path (administrator write → Oracle → `WelcomeService` → the page), so it also proves what the stubbed
 * scenarios structurally cannot — that nothing on the SERVER side strips it. Its marker doubles as the
 * evidence that the value read back is the one this scenario wrote, rather than a leftover.
 */
export const roundTripNewsPayload = {
  stored: `<p>End-to-end notice</p><script>window.${XSS_WITNESS}=true</script>`,
  marker: 'End-to-end notice',
} as const;

/** Formatting an administrator may legitimately use, which must NOT be stripped. */
export const benignNewsPayload = {
  stored: '<p>Reminder: <strong>quarterly returns</strong> are due <em>Friday</em>.</p>',
  marker: 'quarterly returns',
  survivingTags: ['p', 'strong', 'em'],
} as const;
