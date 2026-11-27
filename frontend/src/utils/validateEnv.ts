import { env } from '@/env';

/**
 * Validates frontend configuration at startup. Logs a clear console error (rather than hard-failing,
 * which would white-screen the app before the ErrorBoundary can mount) so a misconfigured build or
 * deployment is visible immediately.
 *
 * Real auth needs the BC Gov SSO (Keycloak) issuer and client id — `VITE_KEYCLOAK_URL` and
 * `VITE_KEYCLOAK_CLIENT_ID`, from the runtime `config.js` the container writes (merged into `env`)
 * or from `.env.local` in development. Mock mode needs neither.
 */
export function validateEnv(): void {
  if (env.VITE_MOCK_USER === 'true') {
    return;
  }

  const missing = ['VITE_KEYCLOAK_URL', 'VITE_KEYCLOAK_CLIENT_ID'].filter(
    (name) => !env[name]?.trim(),
  );

  if (missing.length > 0) {
    // eslint-disable-next-line no-console
    console.error(
      `[env] No Keycloak auth configuration found: ${missing.join(' and ')} not set. ` +
        'Authentication will not work.',
    );
  }
}
