/**
 * Determines the application's base path for routing and API calls.
 * 
 * In development mode (Vite dev server), it defaults to '/'.
 * In production builds, it's typically set during the build process
 * via the 'base' property in vite.config.ts, which is exposed as 
 * import.meta.env.BASE_URL.
 */

export const getAppBasePath = (): string => {
  // Always use '/' for local development with the Vite dev server.
  if (import.meta.env.DEV) {
    return '/';
  }

  // Use the context provided in the runtime Amplify config if available,
  // falling back to the build-time BASE_URL.
  const context = window.amplifyConfig?.Auth?.Cognito?.context;
  const baseUrl = import.meta.env.BASE_URL || '/';

  let path = (context && context.trim() !== '') ? context : baseUrl;

  // Ensure it starts with '/' and does not end with '/'
  if (!path.startsWith('/')) {
    path = '/' + path;
  }
  if (path.length > 1 && path.endsWith('/')) {
    path = path.slice(0, -1);
  }

  return path;
};

export const getApiBasePath = (): string => {
  if (import.meta.env.DEV) {
    return '/api';
  }

  const appBasePath = getAppBasePath();

  return appBasePath === '/' ? '/api' : `${appBasePath}/api`;
};
