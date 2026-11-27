#!/bin/sh
# Generate /srv/config.js from VITE_* env vars at container start.
#
# index.html loads config.js before the app bundle; src/env.ts merges window.config over
# import.meta.env, so these runtime values win. That is what lets ONE built image serve every PR
# preview, TEST and PROD, with the environment's values supplied by the OpenShift Deployment
# (frontend/openshift.deploy.yml) rather than baked in at build time. Same pattern as nr-cbr.
set -eu

# Coraza's scratch dir is shadowed by the /tmp emptyDir on OpenShift; recreate it.
mkdir -p /tmp/coraza

CONFIG_FILE=/srv/config.js

# JSON-escape for embedding in a double-quoted JS string. The values are URLs, ids and short
# labels, so handling \ and " is sufficient.
escape() {
  printf '%s' "$1" | sed 's/\\/\\\\/g; s/"/\\"/g'
}

cat > "$CONFIG_FILE" <<CONFIG
// Generated at container start by docker-entrypoint.sh from VITE_* env vars.
window.config = {
  VITE_KEYCLOAK_URL: "$(escape "${VITE_KEYCLOAK_URL:-}")",
  VITE_KEYCLOAK_CLIENT_ID: "$(escape "${VITE_KEYCLOAK_CLIENT_ID:-}")",
  VITE_ZONE: "$(escape "${VITE_ZONE:-dev}")"
};
CONFIG

exec /usr/bin/caddy "$@"
