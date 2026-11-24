#!/bin/sh
# Generate /srv/amplify-config.js from env vars at container start.
#
# index.html loads amplify-config.js before the app bundle (window.amplifyConfig). Under Polaris,
# Ansible templated this file per environment (backend/playbooks/templates/amplify-config.js.j2 in
# bcgov-c/nr-scs); here the OpenShift Deployment supplies the values, so ONE built image serves every
# PR preview, TEST and PROD.
#
# Temporary: FAM/Cognito is being replaced by Keycloak, which will change this file's shape.
set -eu

# Coraza's scratch dir is shadowed by the /tmp emptyDir on OpenShift; recreate it.
mkdir -p /tmp/coraza

CONFIG_FILE=/srv/amplify-config.js

# Escape for embedding in a single-quoted JS string. Values are URLs, ids and short labels.
escape() {
  printf '%s' "$1" | sed "s/\\\\/\\\\\\\\/g; s/'/\\\\'/g"
}

APP_URL="${APP_URL:-}"
APP_URL="${APP_URL%/}"

cat > "$CONFIG_FILE" <<CONFIG
// Generated at container start by docker-entrypoint.sh.
window.amplifyConfig = {
    appEnv: '$(escape "${APP_ENV:-dev}")',
    Auth: {
        Cognito: {
            region: '$(escape "${COGNITO_REGION:-ca-central-1}")',
            userPoolId: '$(escape "${COGNITO_USER_POOL_ID:-}")',
            userPoolClientId: '$(escape "${COGNITO_USER_POOL_CLIENT_ID:-}")',
            context: '',
            loginWith: {
                oauth: {
                    domain: '$(escape "${COGNITO_OAUTH_DOMAIN:-}")',
                    scopes: ['openid'],
                    redirectSignIn: ['$(escape "${APP_URL}")'],
                    redirectSignOut: ['$(escape "${APP_URL}/logout")'],
                    responseType: 'code',
                },
            },
        },
    },
};
CONFIG

exec /usr/bin/caddy "$@"
