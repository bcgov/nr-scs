# Build static assets (SPA)
FROM node:24-slim AS static

# Copy, build static files; see .dockerignore for exclusions.
# `npm run build` runs `prebuild` (generate-amplify-config), which writes a localhost placeholder
# public/amplify-config.js; docker-entrypoint.sh replaces it at container start.
WORKDIR /app
COPY . ./
RUN npm ci && npm run build

# Build custom Caddy binary with Coraza WAF plugin
FROM caddy:2.11.4-builder AS caddy
# Install CA certificates for Go module downloads; libcap for setcap
RUN apk add --no-cache ca-certificates libcap
RUN xcaddy build \
    --with github.com/corazawaf/coraza-caddy/v2
# Strip file capabilities here so the final image does not need libcap
RUN setcap -r /usr/bin/caddy

# Deploy: plain Alpine with our own Caddy binary from the caddy stage.
FROM alpine:3.24.2
RUN apk add --no-cache ca-certificates

# Copy custom Caddy binary (capabilities already stripped in caddy stage; satisfies KSV022)
COPY --from=caddy /usr/bin/caddy /usr/bin/caddy

# Copy static files (Vite outDir is `build`), Caddy/Coraza config, entrypoint
COPY --from=static /app/build /srv
COPY Caddyfile /etc/caddy/Caddyfile
COPY coraza.conf /etc/caddy/coraza.conf
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh

# OpenShift uses random UIDs in the root group (GID 0). /srv/amplify-config.js is rewritten at start
# by the entrypoint, so it is group-writable; on OpenShift /srv is an emptyDir seeded from the image.
RUN chown -R 1001:0 /srv && \
    chmod -R 755 /srv && \
    chmod g+w /srv /srv/amplify-config.js && \
    chmod 755 /usr/local/bin/docker-entrypoint.sh

# Create directories for Coraza WAF with restricted permissions
RUN mkdir -p /tmp/coraza && \
    chown -R 1001:0 /tmp/coraza && \
    chmod -R 770 /tmp/coraza

RUN /usr/bin/caddy fmt /etc/caddy/Caddyfile

# Boilerplate, since there are ignored by Openshift
HEALTHCHECK --interval=30s --timeout=3s CMD wget -q -O /dev/null http://127.0.0.1:3001/health || exit 1
EXPOSE 3000 3001
USER 1001

# Startup
ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
CMD ["run", "--config", "/etc/caddy/Caddyfile", "--adapter", "caddyfile"]
