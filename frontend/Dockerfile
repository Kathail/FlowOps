# syntax=docker/dockerfile:1.7

FROM node:20.18-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json* ./
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi

COPY . .
RUN npm run build

FROM nginx:1.27-alpine AS runtime

# envsubst (from gettext) renders nginx.conf.template at container start
# so BACKEND_URL + PORT can come from the Railway service env.
RUN apk add --no-cache gettext

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf.template /etc/nginx/templates/default.conf.template

# Sensible defaults for local docker-compose use; Railway overrides via env.
# NGINX_ENTRYPOINT_LOCAL_RESOLVERS=1 opts into nginx-alpine's built-in
# /docker-entrypoint.d/15-local-resolvers.envsh, which reads the system
# nameservers from /etc/resolv.conf and exports them (correctly bracketed
# for IPv6) as ${NGINX_LOCAL_RESOLVERS} for envsubst to pick up. Required
# on Railway, whose private network advertises an IPv6-only resolver
# (fd12::10) — without bracket wrapping nginx fails to start.
ENV PORT=80 \
    BACKEND_URL=http://backend:5000 \
    NGINX_ENTRYPOINT_LOCAL_RESOLVERS=1

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
    CMD wget -q --spider http://localhost:${PORT}/ || exit 1
# Note: deliberately probes /, not /healthz. /healthz proxies to backend
# — if backend is down the frontend can still serve the cached SPA shell,
# so coupling the two healthchecks would unnecessarily route traffic
# away from a working frontend.

# nginx:alpine's entrypoint runs envsubst over /etc/nginx/templates/*.template
# into /etc/nginx/conf.d/ before launching nginx — exactly what we want.
CMD ["nginx", "-g", "daemon off;"]
