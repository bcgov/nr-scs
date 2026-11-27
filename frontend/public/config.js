// Runtime configuration placeholder for local development.
//
// In deployed containers frontend/docker-entrypoint.sh overwrites this file at start with
// `window.config = { VITE_KEYCLOAK_URL, VITE_KEYCLOAK_CLIENT_ID, VITE_ZONE }`, and src/env.ts merges
// it over import.meta.env. Locally, leave it empty and set the VITE_* values in .env.local.
globalThis.config = globalThis.config || {};
