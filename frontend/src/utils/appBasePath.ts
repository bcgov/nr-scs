/**
 * Determines the application's base path for routing and API calls.
 *
 * In development mode (Vite dev server), it is always '/'. In production builds it is the Vite
 * `base` (`import.meta.env.BASE_URL`, from `PUBLIC_URL` at build time) — '/' on OpenShift, where
 * the app is served from the root of its route and Caddy proxies `/api` to the backend.
 */
export const getAppBasePath = (): string => {
  // Always use '/' for local development with the Vite dev server.
  if (import.meta.env.DEV) {
    return '/';
  }

  let path = (import.meta.env.BASE_URL || '/').trim() || '/';

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
