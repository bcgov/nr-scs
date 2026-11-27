import { UserManager, WebStorageStateStore, type User } from "oidc-client-ts";

import type { IdpProviderType } from "@/context/auth/types";

import { env } from "@/env";

/**
 * BC Gov SSO (Keycloak, standard realm) client — the whole of SCS's OAuth wiring. Ported from
 * nr-cbr's `services/keycloak.ts`.
 *
 * <p>One issuer URI is the entire configuration. `oidc-client-ts` fetches the realm's
 * `.well-known/openid-configuration` and discovers the authorize, token, JWKS and end-session
 * endpoints from it, so there are no per-endpoint variables to keep in agreement — notably no
 * logout URL.
 *
 * <p>The `UserManager` is created lazily on first use rather than at module load, so nothing has to
 * run before the app boots the way `Amplify.configure` did in `main.tsx`.
 */

/**
 * Seconds before access-token expiry at which the token is treated as stale and renewed. Keycloak
 * access tokens live ~5 minutes, so the margin has to be comfortably larger than the jitter between
 * "we checked" and "the request arrives at the API".
 */
export const REFRESH_MARGIN_SECONDS = 60;

/**
 * Realm alias of the identity provider to send the user straight to, per login button.
 *
 * <p><b>`azureidir`, not `idir`.</b> A CSS integration that selects IDIR - MFA federates through
 * Azure AD, and that is the alias the standard realm publishes for it. Getting this wrong is not
 * loud: an unrecognised `kc_idp_hint` is silently ignored and Keycloak falls through to whatever
 * provider the integration has, so a wrong value still looks like it works until a second provider
 * is approved. Verify the alias against the realm rather than concluding from a successful login.
 *
 * <p>There is no environment prefix here. Cognito needed a per-environment provider name
 * (`DEV-IDIR`, `TEST-IDIR`); the Keycloak alias is the same constant in every environment.
 */
const IDP_HINTS: Record<IdpProviderType, string> = {
  IDIR: "azureidir",
  BCEIDBUSINESS: "bceidbusiness",
};

/**
 * The app's origin. Guarded because this module is also loaded outside a browser (the test
 * suite's Node global setup imports `services/APIs.ts`), where there is no `window`.
 */
function appOrigin(): string {
  return typeof window === "undefined" ? "" : window.location.origin;
}

/**
 * Where the realm returns the browser after sign-in. Derived from `window.location.origin` rather
 * than configured, which is what lets ONE built image serve PR previews, TEST and PROD. Each of
 * these exact URLs still has to be registered on the CSS integration.
 */
export const REDIRECT_URI = `${appOrigin()}/authCallback`;

/** Where the realm returns the browser after sign-out: the app root. */
export const POST_LOGOUT_REDIRECT_URI = appOrigin();

let userManager: UserManager | undefined;

/** The lazily-created singleton {@link UserManager}. */
export const getUserManager = (): UserManager => {
  userManager ??= new UserManager({
    authority: (env.VITE_KEYCLOAK_URL ?? "").trim(),
    client_id: (env.VITE_KEYCLOAK_CLIENT_ID ?? "").trim(),
    redirect_uri: REDIRECT_URI,
    post_logout_redirect_uri: POST_LOGOUT_REDIRECT_URI,
    // Authorization Code + PKCE, public client, no secret. PKCE is on by default in oidc-client-ts;
    // it is named here because it is a security property of the integration, not an incidental one.
    response_type: "code",
    scope: "openid profile email",
    // Tokens in localStorage, so every tab of the app shares one sign-in; signing out in one tab
    // signs out all of them. The sign-in redirect's own state stays per tab, so two tabs signing in
    // at once each keep their own PKCE verifier.
    userStore: new WebStorageStateStore({ store: window.localStorage }),
    stateStore: new WebStorageStateStore({ store: window.sessionStorage }),
    // Renewal is driven explicitly (ensureFreshUser / forceRenew) so API calls share one code path
    // and one debounce, rather than racing a background timer.
    automaticSilentRenew: false,
    monitorSession: false,
  });
  return userManager;
};

/** True when there is no user, or its access token is within {@link REFRESH_MARGIN_SECONDS} of expiry. */
export const needsRenewal = (user: User | null | undefined): boolean => {
  if (!user?.access_token) {
    return true;
  }
  if (typeof user.expires_at !== "number") {
    return false;
  }
  return (
    user.expires_at - Math.floor(Date.now() / 1000) <= REFRESH_MARGIN_SECONDS
  );
};

/** Minimum gap between two renewals, so concurrent callers don't each mint a new token. */
const MIN_RENEW_GAP_MS = 5_000;

let renewInFlight: Promise<User | null> | undefined;
let lastRenewAt = 0;

/**
 * Renews the session unconditionally, rotating the refresh token. Rejects when the refresh token
 * itself has expired — callers should treat that as a real expiry. Concurrent calls share one
 * in-flight renewal.
 */
export const forceRenew = async (): Promise<User | null> => {
  renewInFlight ??= getUserManager()
    .signinSilent()
    .finally(() => {
      lastRenewAt = Date.now();
      renewInFlight = undefined;
    });
  return renewInFlight;
};

/**
 * Returns a user whose access token is good for at least {@link REFRESH_MARGIN_SECONDS}, renewing
 * first if needed. Returns `null` when there is no session or the renewal fails — the caller decides
 * whether that means "sign out" or "let the request 401".
 */
export const ensureFreshUser = async (): Promise<User | null> => {
  const manager = getUserManager();
  const user = await manager.getUser();
  if (!needsRenewal(user)) {
    return user;
  }
  if (!user) {
    return null;
  }

  // Debounce: a page load fires several requests at once, and a renewal that just happened is
  // still fresh enough for all of them.
  if (Date.now() - lastRenewAt < MIN_RENEW_GAP_MS && !renewInFlight) {
    return user;
  }

  try {
    return await forceRenew();
  } catch {
    return null;
  }
};

/** Starts the sign-in redirect, sending the user straight to the chosen provider. */
export const signIn = async (provider: IdpProviderType): Promise<void> => {
  await getUserManager().signinRedirect({
    extraQueryParams: { kc_idp_hint: IDP_HINTS[provider] },
  });
};

/**
 * Ends the session at the realm, then returns to the app root.
 *
 * <p><b>Do not clear the stored user first.</b> `oidc-client-ts` reads `id_token_hint` off it to
 * tell Keycloak which session to end, and removes it itself once the redirect is under way. Clearing
 * early sends a logout the realm cannot attribute to any session: the browser comes home looking
 * logged out while the realm session is still alive, so the next sign-in walks straight back in.
 *
 * <p>If the redirect itself fails (offline, realm unreachable) the local session is cleared instead,
 * so the user is at least signed out on this device.
 */
export const signOutRedirect = async (): Promise<void> => {
  const manager = getUserManager();
  try {
    await manager.signoutRedirect();
  } catch {
    await manager.removeUser();
    window.location.assign(POST_LOGOUT_REDIRECT_URI);
  }
};

/** Clears the local session only. The realm session is untouched. */
export const clearLocalSession = async (): Promise<void> => {
  try {
    await getUserManager().removeUser();
  } catch {
    /* storage unavailable — nothing to clear */
  }
};

/**
 * Decodes a JWT's payload without verifying it — the API verifies; the SPA only needs the claims to
 * render the user. Base64url, UTF-8 safe (names with accents). `undefined` on any malformed input.
 */
export const decodeTokenClaims = (
  token: string,
): Record<string, unknown> | undefined => {
  try {
    const payload = token.split(".")[1];
    if (!payload) {
      return undefined;
    }
    const base64 = payload
      .replaceAll("-", "+")
      .replaceAll("_", "/")
      .padEnd(payload.length + ((4 - (payload.length % 4)) % 4), "=");
    const bytes = Uint8Array.from(
      atob(base64),
      (char) => char.codePointAt(0) ?? 0,
    );
    return JSON.parse(new TextDecoder().decode(bytes)) as Record<
      string,
      unknown
    >;
  } catch {
    return undefined;
  }
};
