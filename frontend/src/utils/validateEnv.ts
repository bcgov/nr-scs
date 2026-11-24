import { env } from '@/env';

/**
 * Validates frontend configuration at startup. Logs a clear console error (rather than hard-failing,
 * which would white-screen the app before the ErrorBoundary can mount) so a misconfigured build or
 * deployment is visible immediately.
 *
 * Auth config can come from the runtime `amplify-config.js` (`window.amplifyConfig`) or build-time
 * `VITE_USER_POOLS_*` vars; mock mode needs neither. We only warn when, in real-auth mode, none of
 * those sources are present — i.e. login genuinely cannot work.
 */
export function validateEnv(): void {
  if (env.VITE_MOCK_USER === 'true') {
    return;
  }

  const hasRuntimeAmplifyConfig = typeof window !== 'undefined' && !!window.amplifyConfig;
  const hasBuildTimeAuthVars =
    !!env.VITE_USER_POOLS_ID?.trim() && !!env.VITE_USER_POOLS_WEB_CLIENT_ID?.trim();

  if (!hasRuntimeAmplifyConfig && !hasBuildTimeAuthVars) {
    // eslint-disable-next-line no-console
    console.error(
      '[env] No Cognito auth configuration found: neither runtime amplify-config.js ' +
        '(window.amplifyConfig) nor VITE_USER_POOLS_ID / VITE_USER_POOLS_WEB_CLIENT_ID are set. ' +
        'Authentication will not work.',
    );
  }
}
